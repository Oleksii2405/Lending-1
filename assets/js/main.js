(function () {
  "use strict";

  /* ============ Product / pricing data (джерело правди для всіх розрахунків) ============ */
  var PRODUCT = {
    name: "Летюча дрифт-машинка 2 в 1",
    id: "flying-drift-car-2in1",
    oldPrice: 1380,
    currency: "UAH"
  };

  var QTY_OPTIONS = [
    { qty: 1, total: 949, each: 949, discount: 0, popular: false },
    { qty: 2, total: 1803, each: 902, discount: 5, popular: true },
    { qty: 3, total: 2562, each: 854, discount: 10, popular: false },
    { qty: 4, total: 3226, each: 807, discount: 15, popular: false }
  ];

  var state = {
    qty: 1,
    submitting: false,
    initiateCheckoutFired: false
  };

  function fmt(n) {
    return n.toLocaleString("uk-UA") + " грн";
  }

  function getOption(qty) {
    for (var i = 0; i < QTY_OPTIONS.length; i++) {
      if (QTY_OPTIONS[i].qty === qty) return QTY_OPTIONS[i];
    }
    return QTY_OPTIONS[0];
  }

  /* ============ Render: bundle grid (блок 6) ============ */
  function renderBundleGrid() {
    var grid = document.getElementById("bundleGrid");
    var tpl = document.getElementById("qtyCardTpl");
    if (!grid || !tpl) return;
    grid.innerHTML = "";
    QTY_OPTIONS.forEach(function (opt) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.qty = opt.qty;
      node.classList.toggle("is-active", opt.qty === state.qty);
      var pop = node.querySelector(".qty-badge-pop");
      if (opt.popular) {
        pop.hidden = false;
      } else {
        pop.remove();
      }
      node.querySelector(".qty-count").textContent = opt.qty + " шт";
      var savings = PRODUCT.oldPrice ? null : null;
      var saveText = opt.discount > 0
        ? "Економія " + fmt(opt.qty * QTY_OPTIONS[0].total - opt.total)
        : "Без знижки";
      node.querySelector(".qty-save").textContent = saveText;
      node.querySelector(".qty-total").innerHTML = fmt(opt.total) +
        (opt.discount > 0 ? '<span class="qty-off">−' + opt.discount + "%</span>" : "");
      node.querySelector(".qty-each").textContent = opt.qty > 1 ? fmt(opt.each) + " за штуку" : "";
      node.addEventListener("click", function () {
        setQty(opt.qty);
      });
      grid.appendChild(node);
    });
  }

  /* ============ Render: order form qty pills (блок 8) ============ */
  function renderOrderQtyPills() {
    var grid = document.getElementById("orderQtyGrid");
    if (!grid) return;
    grid.innerHTML = "";
    QTY_OPTIONS.forEach(function (opt) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "qty-pill js-qty-pill";
      pill.dataset.qty = opt.qty;
      pill.innerHTML = opt.qty + " шт" + (opt.discount > 0 ? "<small>−" + opt.discount + "%</small>" : "<small>&nbsp;</small>");
      pill.classList.toggle("is-active", opt.qty === state.qty);
      pill.addEventListener("click", function () {
        setQty(opt.qty);
      });
      grid.appendChild(pill);
    });
  }

  /* ============ State sync across the whole page ============ */
  function setQty(qty) {
    state.qty = qty;
    var opt = getOption(qty);

    document.querySelectorAll(".js-qty-card").forEach(function (el) {
      el.classList.toggle("is-active", Number(el.dataset.qty) === qty);
    });
    document.querySelectorAll(".js-qty-pill").forEach(function (el) {
      el.classList.toggle("is-active", Number(el.dataset.qty) === qty);
    });

    var orderTotal = document.getElementById("orderTotal");
    if (orderTotal) orderTotal.textContent = fmt(opt.total);

    var stickyPrice = document.getElementById("stickyPrice");
    if (stickyPrice) stickyPrice.textContent = fmt(opt.total);

    var fQty = document.getElementById("fQty");
    var fTotal = document.getElementById("fTotal");
    if (fQty) fQty.value = opt.qty;
    if (fTotal) fTotal.value = opt.total;
  }

  /* ============ Reveal on scroll ============ */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || items.length === 0) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ============ Sticky bottom CTA ============ */
  function initStickyCta() {
    var sticky = document.getElementById("stickyCta");
    var hero = document.getElementById("top");
    var order = document.getElementById("order");
    if (!sticky || !hero || !order) return;

    var pastHero = false;
    var inOrder = false;

    function update() {
      sticky.classList.toggle("is-visible", pastHero && !inOrder);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { pastHero = !e.isIntersecting; });
        update();
      }, { threshold: 0 }).observe(hero);

      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { inOrder = e.isIntersecting; });
        update();
      }, { threshold: 0.15 }).observe(order);
    } else {
      window.addEventListener("scroll", function () {
        pastHero = window.scrollY > hero.offsetHeight * 0.6;
        update();
      });
    }
  }

  /* ============ Phone mask +380 ============ */
  function formatPhone(raw) {
    var digits = raw.replace(/\D/g, "");
    if (digits.startsWith("380")) digits = digits.slice(3);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 9);

    var out = "+380";
    if (digits.length > 0) out += " (" + digits.slice(0, 2);
    if (digits.length >= 2) out += ")";
    if (digits.length > 2) out += " " + digits.slice(2, 5);
    if (digits.length > 5) out += "-" + digits.slice(5, 7);
    if (digits.length > 7) out += "-" + digits.slice(7, 9);
    return { formatted: out, digits: digits };
  }

  function initPhoneMask() {
    var input = document.getElementById("fPhone");
    if (!input) return;
    input.addEventListener("focus", function () {
      if (!input.value) input.value = "+380 (";
    });
    input.addEventListener("input", function () {
      var res = formatPhone(input.value);
      input.value = res.formatted;
      input.dataset.digits = res.digits;
    });
  }

  function isPhoneValid(input) {
    var digits = (input.dataset.digits || input.value.replace(/\D/g, "").replace(/^380/, ""));
    return digits.length === 9;
  }

  /* ============ Pixel helpers (без PII, безпечні no-op заглушки) ============ */
  function safeFbq() { if (typeof window.fbq === "function") window.fbq.apply(null, arguments); }
  function safeTtq() { if (window.ttq && typeof window.ttq.track === "function") window.ttq.track.apply(null, [].slice.call(arguments, 1)); }
  function safeGtag() { if (typeof window.gtag === "function") window.gtag.apply(null, arguments); }

  function trackViewContent() {
    safeFbq("track", "ViewContent", { content_ids: [PRODUCT.id], content_name: PRODUCT.name, currency: PRODUCT.currency, value: QTY_OPTIONS[0].total });
    safeTtq("track", "ViewContent", { content_id: PRODUCT.id, content_name: PRODUCT.name, currency: PRODUCT.currency, value: QTY_OPTIONS[0].total });
    safeGtag("event", "view_item", { currency: PRODUCT.currency, value: QTY_OPTIONS[0].total, items: [{ item_id: PRODUCT.id, item_name: PRODUCT.name }] });
  }

  function trackInitiateCheckout() {
    if (state.initiateCheckoutFired) return;
    state.initiateCheckoutFired = true;
    var opt = getOption(state.qty);
    safeFbq("track", "InitiateCheckout", { content_ids: [PRODUCT.id], currency: PRODUCT.currency, value: opt.total, num_items: opt.qty });
    safeTtq("track", "InitiateCheckout", { content_id: PRODUCT.id, currency: PRODUCT.currency, value: opt.total });
    safeGtag("event", "begin_checkout", { currency: PRODUCT.currency, value: opt.total });
  }

  function trackLead(opt) {
    safeFbq("track", "Lead", { content_ids: [PRODUCT.id], currency: PRODUCT.currency, value: opt.total });
    safeTtq("track", "CompletePayment", { content_id: PRODUCT.id, currency: PRODUCT.currency, value: opt.total });
    safeGtag("event", "generate_lead", { currency: PRODUCT.currency, value: opt.total });
  }

  function initCtaTracking() {
    document.querySelectorAll(".js-cta").forEach(function (btn) {
      btn.addEventListener("click", trackInitiateCheckout);
    });
  }

  /* ============ Order form ============ */
  function setFieldError(input, errorEl, message) {
    input.classList.toggle("is-invalid", !!message);
    errorEl.textContent = message || "";
  }

  function showStatus(message, type) {
    var el = document.getElementById("formStatus");
    el.className = "form-status" + (type ? " is-" + type : "");
    el.textContent = message;
  }

  function initOrderForm() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var nameInput = document.getElementById("fName");
    var nameError = document.getElementById("fNameError");
    var phoneInput = document.getElementById("fPhone");
    var phoneError = document.getElementById("fPhoneError");
    var submitBtn = document.getElementById("submitBtn");
    var submitBtnText = document.getElementById("submitBtnText");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (state.submitting) return;

      var valid = true;
      var nameVal = nameInput.value.trim();
      if (nameVal.length < 2) {
        setFieldError(nameInput, nameError, "Вкажіть, будь ласка, ваше ім'я (мінімум 2 символи)");
        valid = false;
      } else {
        setFieldError(nameInput, nameError, "");
      }

      if (!isPhoneValid(phoneInput)) {
        setFieldError(phoneInput, phoneError, "Перевірте номер телефону — потрібно 9 цифр після +380");
        valid = false;
      } else {
        setFieldError(phoneInput, phoneError, "");
      }

      // honeypot: якщо заповнене ботом — тихо ігноруємо
      var honeypot = document.getElementById("fHoneypot");
      if (honeypot && honeypot.value) return;

      showStatus("", "");
      if (!valid) {
        showStatus("Будь ласка, виправте помилки у формі.", "error");
        return;
      }

      var opt = getOption(state.qty);
      var payload = {
        name: nameVal,
        phone: "+380" + (phoneInput.dataset.digits || ""),
        qty: opt.qty,
        total: opt.total,
        product: PRODUCT.name,
        source: "landing"
      };

      state.submitting = true;
      submitBtn.disabled = true;
      submitBtnText.textContent = "Надсилаємо…";

      fetch("api/order.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (resp) {
          return resp.json().catch(function () { return {}; }).then(function (data) {
            return { ok: resp.ok, data: data };
          });
        })
        .then(function (result) {
          state.submitting = false;
          submitBtn.disabled = false;
          submitBtnText.textContent = "ОФОРМИТИ ЗАМОВЛЕННЯ";

          if (result.ok && result.data && result.data.success) {
            document.getElementById("orderFormInner").classList.add("is-hidden");
            document.getElementById("orderSuccess").classList.add("is-visible");
            trackLead(opt);
          } else {
            var msg = (result.data && result.data.message) ||
              "Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте нам напряму.";
            showStatus(msg, "error");
          }
        })
        .catch(function () {
          state.submitting = false;
          submitBtn.disabled = false;
          submitBtnText.textContent = "ОФОРМИТИ ЗАМОВЛЕННЯ";
          showStatus("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.", "error");
        });
    });
  }

  /* ============ Misc ============ */
  function initYear() {
    var el = document.getElementById("yearNow");
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    renderBundleGrid();
    renderOrderQtyPills();
    setQty(1);
    initReveal();
    initStickyCta();
    initPhoneMask();
    initCtaTracking();
    initOrderForm();
    initYear();
    trackViewContent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
