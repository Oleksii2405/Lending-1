<?php
/**
 * Безпечний серверний обробник форми замовлення.
 *
 * Що робить зараз:
 *   - валідує вхідні дані;
 *   - перераховує суму на сервері (ціни беруться тут, а не з браузера клієнта —
 *     це захищає від підміни ціни на стороні клієнта);
 *   - записує замовлення у orders.log (JSON lines) поруч із цим файлом;
 *   - за наявності заповнених констант TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
 *     одразу надсилає сповіщення в Telegram.
 *
 * Що потрібно зробити перед запуском у продакшн:
 *   1. Заповнити TELEGRAM_BOT_TOKEN і TELEGRAM_CHAT_ID нижче (або підключити CRM —
 *      додайте свій виклик у функції notifyCrm()).
 *   2. Переконатися, що orders.log НЕ доступний ззовні (лежить поза document root,
 *      або закритий правилами .htaccess / nginx).
 *   3. Для реального навантаження — перенести чергу відправки в Telegram/CRM
 *      у фонову задачу (cron / queue), щоб користувач не чекав мережевого запиту.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// ---- налаштування ----
const TELEGRAM_BOT_TOKEN = ''; // напр. '123456:AA...'
const TELEGRAM_CHAT_ID   = ''; // напр. '-1001234567890'
const LOG_FILE           = __DIR__ . '/orders.log';

// ---- ціни рахуємо тут, а не довіряємо клієнту ----
const PRICE_TABLE = [
    1 => 949,
    2 => 1803,
    3 => 2562,
    4 => 3226,
];

function respond(bool $success, string $message, int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode(['success' => $success, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Метод не підтримується.', 405);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input)) {
    respond(false, 'Некоректні дані запиту.', 400);
}

// анти-бот: прихований honeypot-параметр має бути порожнім
if (!empty($input['website'])) {
    respond(true, 'OK'); // тихо "успіх" для бота, без запису
}

$name  = trim((string)($input['name'] ?? ''));
$phone = trim((string)($input['phone'] ?? ''));
$qty   = (int)($input['qty'] ?? 0);

if (mb_strlen($name) < 2) {
    respond(false, "Вкажіть, будь ласка, ваше ім'я.", 422);
}

if (!preg_match('/^\+380\d{9}$/', $phone)) {
    respond(false, 'Перевірте номер телефону — формат +380XXXXXXXXX.', 422);
}

if (!isset(PRICE_TABLE[$qty])) {
    respond(false, 'Некоректна кількість товару.', 422);
}

$total = PRICE_TABLE[$qty];

$order = [
    'created_at' => date('c'),
    'name'       => $name,
    'phone'      => $phone,
    'qty'        => $qty,
    'total'      => $total,
    'product'    => 'Летюча дрифт-машинка 2 в 1',
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
];

$written = @file_put_contents(LOG_FILE, json_encode($order, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
if ($written === false) {
    respond(false, 'Не вдалося зберегти замовлення. Спробуйте ще раз.', 500);
}

notifyTelegram($order);

respond(true, 'Замовлення прийнято.');

/**
 * Надсилає сповіщення про нове замовлення в Telegram, якщо налаштовані токен і chat_id.
 * Збій відправки в Telegram НЕ впливає на відповідь клієнту — замовлення вже збережене в лог.
 */
function notifyTelegram(array $order): void
{
    if (TELEGRAM_BOT_TOKEN === '' || TELEGRAM_CHAT_ID === '') {
        return;
    }

    $text = sprintf(
        "🆕 Нове замовлення\nТовар: %s\nІм'я: %s\nТелефон: %s\nКількість: %d шт\nСума: %d грн",
        $order['product'],
        $order['name'],
        $order['phone'],
        $order['qty'],
        $order['total']
    );

    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query(['chat_id' => TELEGRAM_CHAT_ID, 'text' => $text]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
    ]);
    curl_exec($ch);
    curl_close($ch);
}
