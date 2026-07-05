/* Sai Signature – landing page logic
   All behaviour lives here (no inline handlers) so the CSP can block injected scripts. */
(function () {
  'use strict';

  var WA_NUMBER = '919820987799';
  var BROCHURE_URL = 'brochure.pdf';
  // TODO: paste your Google Apps Script Web App URL here (see google-sheet-setup.txt).
  // Until filled, leads still reach you on WhatsApp; only the Sheet stays empty.
  var SHEET_ENDPOINT = '';

  var LEAD_KEY = 'ss_lead_done';    // '1' once a customer submits any form
  var DELAY_KEY = 'ss_popup_delay'; // seconds before the next auto popup (10 -> 20 -> 30...)

  function leadDone() { try { return localStorage.getItem(LEAD_KEY) === '1'; } catch (e) { return false; } }

  /* ---- Header: solid on scroll ---- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () { navLinks.classList.toggle('open'); });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }

  /* ---- Brochure modal ---- */
  var modal = document.getElementById('brochureModal');
  function openBrochure() { if (modal) modal.classList.add('open'); }
  function closeBrochure() { if (modal) modal.classList.remove('open'); }
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeBrochure(); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBrochure(); });

  /* ---- Delegated data-action clicks ---- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'open-brochure') { e.preventDefault(); openBrochure(); }
    else if (action === 'close-brochure') { e.preventDefault(); closeBrochure(); }
  });

  /* ---- Hero flat-size tabs (663/716/739) ---- */
  var flatTabs = Array.prototype.slice.call(document.querySelectorAll('#flatTabs .h-tab'));
  var flatInput = document.querySelector('.h-card input[name="Flat"]');
  flatTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      flatTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      if (flatInput) flatInput.value = tab.getAttribute('data-flat') || '';
    });
  });

  /* ---- Pricing tabs ---- */
  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var tables = Array.prototype.slice.call(document.querySelectorAll('.price-table'));
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = parseInt(btn.getAttribute('data-plan'), 10) || 0;
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      tables.forEach(function (t, idx) { t.classList.toggle('active', idx === i); });
    });
  });

  /* ---- Conversion tracking (fill in once IDs are added in <head>) ---- */
  function trackLead(type) {
    // if (window.fbq)  fbq('track', 'Lead', { content_name: type });
    // if (window.gtag) gtag('event', 'generate_lead', { event_label: type });
  }

  /* ---- Save lead to Google Sheet (silent) ---- */
  function saveToSheet(type, data) {
    if (!SHEET_ENDPOINT) return;
    var payload = {};
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
    payload.type = type;
    payload.page = 'Sai Signature - Nerul';
    payload.time = new Date().toLocaleString();
    try {
      fetch(SHEET_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      }).catch(function () {});
    } catch (e) {}
  }

  function downloadBrochure() {
    var a = document.createElement('a');
    a.href = BROCHURE_URL;
    a.download = 'Sai-Signature-Brochure.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleLead(form, type) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      v = String(v).trim().slice(0, 300); // cap length (basic abuse guard)
      if (v) data[k] = v;
    });

    // Honeypot: real users never fill the hidden "Website" field
    if (data.Website) { form.reset(); return; }

    // Minimal validation (browser also enforces required/pattern)
    if (!data.Name) { alert('Please enter your name.'); return; }
    var digits = (data.Mobile || '').replace(/\D/g, '');
    if (digits.length < 10) { alert('Please enter a valid 10-digit mobile number.'); return; }
    delete data.Website;

    saveToSheet(type, data);
    trackLead(type);
    try { localStorage.setItem(LEAD_KEY, '1'); } catch (e) {}

    // Friendly message from the customer's side on WhatsApp
    var name = data.Name ? (' I am ' + data.Name + '.') : '';
    var msg = 'Hi,' + name + ' I am interested in Sai Signature (1 BHK, Sector 13, Nerul). Please share me the project details.';
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');

    if (type === 'Brochure Request') {
      downloadBrochure();
      closeBrochure();
      alert('Thank you! Your brochure is downloading — please send the WhatsApp message to get full details.');
    } else {
      alert('Thank you! Please send the WhatsApp message and our team will share the details.');
    }
    form.reset();
  }

  Array.prototype.slice.call(document.querySelectorAll('form[data-lead-type]')).forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      handleLead(f, f.getAttribute('data-lead-type'));
    });
  });

  /* ---- Auto brochure popup: 10s first visit, then +10s each visit, until details given ---- */
  function scheduleAutoPopup() {
    if (leadDone()) return;
    var delay = 10;
    try { delay = parseInt(localStorage.getItem(DELAY_KEY) || '10', 10); } catch (e) {}
    setTimeout(function () {
      if (leadDone()) return;
      openBrochure();
      try { localStorage.setItem(DELAY_KEY, String(delay + 10)); } catch (e) {}
    }, delay * 1000);
  }
  scheduleAutoPopup();

  /* ---- Reveal-on-scroll animation ----
     IntersectionObserver + a cheap scroll/rect fallback so reveals never get stuck
     (some embedded/preview browsers throttle IO callbacks). */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function markIn(el) { el.classList.add('in'); }
  function pending() { return revealEls.filter(function (el) { return !el.classList.contains('in'); }); }
  function rectCheck() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    pending().forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh - 60 && r.bottom > 0) markIn(el);
    });
    if (!pending().length) {
      window.removeEventListener('scroll', rectCheck);
      window.removeEventListener('resize', rectCheck);
    }
  }
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { markIn(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  }
  window.addEventListener('scroll', rectCheck, { passive: true });
  window.addEventListener('resize', rectCheck, { passive: true });
  rectCheck();
})();
