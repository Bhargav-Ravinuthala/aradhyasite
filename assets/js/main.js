/* Aaradhya Heights : interactions, animations, language switching */
(function () {
  "use strict";

  var I18N = window.AH_I18N, FLATS = window.AH_FLATS;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = typeof gsap !== "undefined";
  var hasST = hasGsap && typeof ScrollTrigger !== "undefined";
  var hasSplit = hasGsap && typeof SplitText !== "undefined";
  var PHONE = "919705277555";

  if (reduce || !hasGsap) html.classList.add("no-motion");
  if (hasGsap) {
    if (hasST) gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(SplitText);
  }

  var state = { lang: "en", gateDone: false, flat: 1, splits: [], heroSplit: null, lenis: null, featuresReady: false };

  /* ------------------------------------------------------------------ i18n */
  function t(key) {
    var d = I18N[state.lang] || I18N.en;
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    if (Object.prototype.hasOwnProperty.call(I18N.en, key)) return I18N.en[key];
    return key;
  }

  function applyLang(lang, opts) {
    opts = opts || {};
    if (!I18N[lang]) lang = "en";
    state.lang = lang;
    html.setAttribute("lang", lang);
    try { localStorage.setItem("ah-lang", lang); } catch (e) {}

    /* revert any live SplitText instances first, otherwise a later revert() would restore the old language */
    clearSplits();
    revertHero();

    document.title = t("meta.title");
    var md = $('meta[name="description"]'); if (md) md.setAttribute("content", t("meta.desc"));

    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $$("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"); if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    $$("[data-lang]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-lang") === lang); });

    buildMarquee();
    buildLandmarks();
    buildFlatOptions();
    renderFlat(state.flat, false);

    if (!opts.silent) {
      resplitTitles(true);
      if (state.gateDone) replayHero();
    }
  }

  function buildMarquee() {
    var track = $("#marquee-track"); if (!track) return;
    var items = t("marquee"); if (!Array.isArray(items)) return;
    var set = items.map(function (s) { return '<span class="marquee__item">' + s + "</span>"; }).join("");
    track.innerHTML = set + set + set + set;
  }

  function buildLandmarks() {
    var box = $("#landmarks"); if (!box) return;
    var items = t("loc.lm"); if (!Array.isArray(items)) return;
    box.innerHTML = items.map(function (s) { return '<span class="chip">' + s + "</span>"; }).join("");
  }

  function buildFlatOptions() {
    var sel = $("#f-flat"); if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="any">' + t("form.any") + "</option>" + [1, 2, 3, 4].map(function (n) {
      return '<option value="' + n + '">' + t("plans.flat") + " " + n + " · " + FLATS[n].superb + " " + t("plans.sqft") + "</option>";
    }).join("");
    sel.value = cur || "any";
  }

  /* ------------------------------------------------------------ floor plans */
  function renderFlat(n, animate) {
    var f = FLATS[n]; if (!f) return;
    state.flat = n;
    var name = $("#flat-name"); if (name) name.textContent = t("plans.flat") + " " + n;
    var plinth = $("#flat-plinth"); if (plinth) plinth.textContent = f.plinth.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var sup = $("#flat-super"); if (sup) sup.textContent = f.superb;
    var com = $("#flat-common"); if (com) com.textContent = f.common;
    var park = $("#flat-parking"); if (park) park.textContent = f.parking;
    var rooms = $("#flat-rooms");
    if (rooms) rooms.innerHTML = f.rooms.map(function (r) { return "<li><span>" + t(r[0]) + "</span><span>" + r[1] + "</span></li>"; }).join("");
    var balc = $("#flat-balc"); if (balc) balc.textContent = t(f.balc);

    $$(".tab").forEach(function (b) { var on = +b.getAttribute("data-flat") === n; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    $$(".hotspot").forEach(function (b) { b.classList.toggle("is-active", +b.getAttribute("data-flat") === n); });
    $$("tr[data-row]").forEach(function (r) { r.classList.toggle("is-active", +r.getAttribute("data-row") === n); });

    var hl = $("#plan-hl");
    if (hl) { hl.style.left = f.box[0] + "%"; hl.style.top = f.box[1] + "%"; hl.style.width = f.box[2] + "%"; hl.style.height = f.box[3] + "%"; }

    if (animate && hasGsap && !reduce) {
      gsap.fromTo("#flat-card", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .55, ease: "power3.out", overwrite: true });
      var pin = $('.hotspot[data-flat="' + n + '"]');
      if (pin) gsap.fromTo(pin, { scale: .7 }, { scale: 1, duration: .6, ease: "back.out(2)" });
    }
  }

  function initPlans() {
    $$(".tab, .hotspot").forEach(function (b) {
      b.addEventListener("click", function () { renderFlat(+b.getAttribute("data-flat"), true); });
    });
    renderFlat(1, false);
  }

  /* ------------------------------------------------------------- lightbox */
  function initLightbox() {
    var lb = $("#lightbox"), img = $("#lightbox-img"), cap = $("#lightbox-cap");
    if (!lb) return;
    function open(src, key) {
      img.src = src; img.alt = key ? t(key) : ""; cap.textContent = key ? t(key) : "";
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
      lockScroll(true);
    }
    function close() { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); lockScroll(false); img.src = ""; }
    $$("[data-lightbox]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); open(b.getAttribute("data-lightbox"), b.getAttribute("data-caption-key")); });
    });
    $(".lightbox__close", lb).addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("is-open")) close(); });
  }

  function lockScroll(on) {
    document.body.classList.toggle("is-locked", on);
    if (state.lenis) { on ? state.lenis.stop() : state.lenis.start(); }
  }

  /* ----------------------------------------------------- smooth scrolling */
  function initLenis() {
    if (reduce || typeof Lenis === "undefined" || !hasGsap) return;
    try {
      var lenis = new Lenis({ lerp: .09, smoothWheel: true, wheelMultiplier: 1 });
      state.lenis = lenis;
      if (hasST) lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { state.lenis = null; }
  }

  function scrollToTarget(target) {
    var el = typeof target === "string" ? $(target) : target; if (!el) return;
    var offset = -(parseInt(getComputedStyle(html).getPropertyValue("--nav-h")) || 80) + 10;
    if (state.lenis) state.lenis.scrollTo(el, { offset: offset, duration: 1.5, easing: function (x) { return 1 - Math.pow(1 - x, 4); } });
    else {
      var top = el.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
    }
  }

  function initAnchors() {
    $$("a[data-scroll]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href"); if (!href || href.charAt(0) !== "#") return;
        e.preventDefault(); closeMenu(); scrollToTarget(href);
        if (history.replaceState) history.replaceState(null, "", href);
      });
    });
  }

  /* ------------------------------------------------------------------ nav */
  function initNav() {
    var nav = $("#nav"), burger = $(".burger"), menu = $("#mobile-menu");
    function onScroll() { nav.classList.toggle("is-scrolled", (window.pageYOffset || document.documentElement.scrollTop) > 40); }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    if (burger) burger.addEventListener("click", function () {
      var open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open); burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false"); menu.setAttribute("aria-hidden", open ? "false" : "true");
      lockScroll(open);
    });
    if (hasST) {
      $$("main section[id]").forEach(function (sec) {
        ScrollTrigger.create({
          trigger: sec, start: "top 45%", end: "bottom 45%",
          onToggle: function (self) {
            if (!self.isActive) return;
            $$(".nav__links a").forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + sec.id); });
          }
        });
      });
    }
  }
  function closeMenu() {
    var burger = $(".burger"), menu = $("#mobile-menu");
    if (menu && menu.classList.contains("is-open")) {
      menu.classList.remove("is-open"); burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false"); menu.setAttribute("aria-hidden", "true"); lockScroll(false);
    }
  }

  /* ------------------------------------------------------- split titles */
  function fontsReady(cb) {
    var done = false; function go() { if (!done) { done = true; cb(); } }
    var timer = setTimeout(go, 1800);
    if (document.fonts && document.fonts.load) {
      var loads = state.lang === "te"
        ? [document.fonts.load("600 1em 'Noto Serif Telugu'"), document.fonts.load("400 1em 'Noto Sans Telugu'")]
        : [document.fonts.load("600 1em 'Cormorant Garamond'"), document.fonts.load("400 1em 'Manrope'")];
      Promise.all(loads.concat([document.fonts.ready])).then(function () { clearTimeout(timer); go(); }, go);
    } else go();
  }

  function clearSplits() {
    state.splits.forEach(function (s) { try { if (s.anim) s.anim.kill(); s.split.revert(); } catch (e) {} });
    state.splits = [];
  }

  function splitTitles() {
    $$("[data-split]").forEach(function (el) {
      if (!hasSplit || reduce) { el.classList.add("is-ready"); el.setAttribute("data-revealed", "1"); return; }
      var split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "line" });
      el.classList.add("is-ready");
      var rec = { el: el, split: split, anim: null };
      if (el.getAttribute("data-revealed") === "1") {
        gsap.set(split.lines, { yPercent: 0 });
      } else {
        rec.anim = gsap.from(split.lines, {
          yPercent: 110, duration: 1.1, ease: "power4.out", stagger: .1, paused: !hasST,
          scrollTrigger: hasST ? { trigger: el, start: "top 86%", once: true, onEnter: function () { el.setAttribute("data-revealed", "1"); } } : null
        });
        if (!hasST) { el.setAttribute("data-revealed", "1"); rec.anim.play(); }
      }
      state.splits.push(rec);
    });
  }

  function resplitTitles(afterLangChange) {
    clearSplits();
    fontsReady(function () { splitTitles(); if (hasST) ScrollTrigger.refresh(); });
  }

  /* ------------------------------------------------------------ hero intro */
  function heroElements() { return $$("[data-hero]"); }

  function revertHero() {
    if (state.heroSplit) { try { state.heroSplit.revert(); } catch (e) {} state.heroSplit = null; }
  }

  function splitHero() {
    var title = $("#hero-title"); if (!title) return null;
    revertHero();
    if (!hasSplit || reduce) { title.classList.add("is-ready"); return null; }
    state.heroSplit = new SplitText(title, { type: "words,lines", mask: "lines", linesClass: "line" });
    title.classList.add("is-ready");
    return state.heroSplit;
  }

  function playHeroIntro(fast) {
    var title = $("#hero-title");
    fontsReady(function () {
      var split = splitHero();
      if (!hasGsap || reduce) { gsap && gsap.set(heroElements(), { opacity: 1, y: 0 }); return; }
      var tl = gsap.timeline();
      if (split) tl.from(split.words, { yPercent: 115, rotate: 1.5, duration: fast ? .9 : 1.25, ease: "power4.out", stagger: fast ? .035 : .06 }, 0);
      else tl.from(title, { opacity: 0, y: 30, duration: 1, ease: "power3.out" }, 0);
      tl.fromTo(heroElements(), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: .09, overwrite: true }, fast ? .1 : .35);
      runCounters($("#home"));
    });
  }

  function replayHero() { playHeroIntro(true); }

  /* -------------------------------------------------------------- counters */
  function animateCounter(el) {
    if (el.getAttribute("data-counted") === "1") return;
    el.setAttribute("data-counted", "1");
    var target = parseFloat(el.getAttribute("data-count")) || 0, pad = parseInt(el.getAttribute("data-pad")) || 0;
    var fmt = function (v) { var s = String(Math.round(v)); while (s.length < pad) s = "0" + s; return s; };
    if (!hasGsap || reduce) { el.textContent = fmt(target); return; }
    var o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.6, ease: "power3.out", onUpdate: function () { el.textContent = fmt(o.v); } });
  }
  function runCounters(scope) { $$("[data-count]", scope).forEach(animateCounter); }

  /* --------------------------------------------------- scroll driven effects */
  function initScrollFeatures() {
    if (state.featuresReady) return; state.featuresReady = true;
    if (!hasGsap) { $$("[data-reveal],[data-reveal-group] > *").forEach(function (el) { el.style.opacity = 1; el.style.transform = "none"; }); return; }

    if (reduce || !hasST) {
      gsap.set("[data-reveal],[data-reveal-group] > *", { opacity: 1, y: 0 });
      $$("[data-count]").forEach(animateCounter);
      $$(".tt__row").forEach(function (r) { var b = $(".tt__bar i", r); if (b) b.style.width = Math.min(100, (+r.getAttribute("data-min") / 20) * 100) + "%"; });
      var fill = $("#spec-line-fill"); if (fill) fill.style.transform = "scaleY(1)";
      return;
    }

    /* generic reveals */
    $$("[data-reveal]").forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", delay: parseFloat(el.getAttribute("data-delay")) || 0,
        scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    $$("[data-reveal-group]").forEach(function (g) {
      gsap.to(g.children, { opacity: 1, y: 0, duration: .9, ease: "power3.out", stagger: .08,
        scrollTrigger: { trigger: g, start: "top 88%", once: true } });
    });

    /* counters outside the hero */
    $$("[data-count]").forEach(function (el) {
      if ($("#home") && $("#home").contains(el)) return;
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () { animateCounter(el); } });
    });

    /* hero parallax */
    gsap.to(".hero__img", { yPercent: 14, ease: "none", scrollTrigger: { trigger: "#home", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__content, .hero__stats", { yPercent: -8, opacity: .25, ease: "none", scrollTrigger: { trigger: "#home", start: "55% top", end: "bottom top", scrub: true } });

    /* about arch reveal + inner parallax */
    var arch = $("[data-arch]");
    if (arch) {
      gsap.to(arch, { clipPath: "inset(0% 0 0 0 round 999px 999px 28px 28px)", duration: 1.6, ease: "power4.inOut",
        scrollTrigger: { trigger: arch, start: "top 82%", once: true } });
      gsap.fromTo($("img", arch), { yPercent: -8 }, { yPercent: 2, ease: "none", scrollTrigger: { trigger: arch, start: "top bottom", end: "bottom top", scrub: true } });
    }

    /* specs progress line */
    var fill = $("#spec-line-fill");
    if (fill) gsap.to(fill, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "#spec-list", start: "top 65%", end: "bottom 65%", scrub: .4 } });

    /* travel time bars */
    $$(".tt__row").forEach(function (r) {
      var bar = $(".tt__bar i", r); if (!bar) return;
      var pct = Math.min(100, (+r.getAttribute("data-min") / 20) * 100);
      gsap.to(bar, { width: pct + "%", duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: r, start: "top 90%", once: true } });
    });

    /* cta band parallax */
    var ctaBg = $(".cta-band__bg img");
    if (ctaBg) gsap.fromTo(ctaBg, { yPercent: -12 }, { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".cta-band", start: "top bottom", end: "bottom top", scrub: true } });

    /* gallery items: subtle scale-in */
    gsap.utils.toArray(".gal img").forEach(function (img) {
      gsap.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: img, start: "top 92%", once: true } });
    });

    splitTitles();
    ScrollTrigger.refresh();
  }

  /* ----------------------------------------------------- pointer effects */
  function initPointerEffects() {
    if (!finePointer || reduce || !hasGsap) return;

    /* custom cursor */
    var cur = $(".cursor");
    if (cur) {
      var dot = $(".cursor__dot", cur), ring = $(".cursor__ring", cur);
      var dx = gsap.quickTo(dot, "x", { duration: .08, ease: "power3" }), dy = gsap.quickTo(dot, "y", { duration: .08, ease: "power3" });
      var rx = gsap.quickTo(ring, "x", { duration: .35, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .35, ease: "power3" });
      window.addEventListener("mousemove", function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.remove("is-hidden"); });
      document.addEventListener("mouseleave", function () { cur.classList.add("is-hidden"); });
      document.addEventListener("mouseover", function (e) { if (e.target.closest("a, button, [data-lightbox], .tab, .hotspot")) cur.classList.add("is-hover"); });
      document.addEventListener("mouseout", function (e) { if (e.target.closest("a, button, [data-lightbox], .tab, .hotspot")) cur.classList.remove("is-hover"); });
    }

    /* magnetic buttons */
    $$(".magnetic").forEach(function (b) {
      var xTo = gsap.quickTo(b, "x", { duration: .5, ease: "power3" }), yTo = gsap.quickTo(b, "y", { duration: .5, ease: "power3" });
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .28); yTo((e.clientY - (r.top + r.height / 2)) * .28);
      });
      b.addEventListener("mouseleave", function () { gsap.to(b, { x: 0, y: 0, duration: .9, ease: "elastic.out(1,.45)" }); });
    });

    /* tilt cards */
    $$(".tilt").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100) + "%"); card.style.setProperty("--my", (py * 100) + "%");
        gsap.to(card, { rotateY: (px - .5) * 10, rotateX: (.5 - py) * 10, transformPerspective: 900, duration: .6, ease: "power3.out" });
      });
      card.addEventListener("mouseleave", function () { gsap.to(card, { rotateY: 0, rotateX: 0, duration: .9, ease: "power3.out" }); });
    });
  }

  /* ------------------------------------------------------------------ form */
  function initForm() {
    var form = $("#visit-form"); if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#f-name").value.trim(), phone = $("#f-phone").value.trim(), flat = $("#f-flat").value, msg = $("#f-msg").value.trim();
      var digits = phone.replace(/\D/g, "");
      var err = $("#form-err");
      var ok = name.length > 1 && digits.length >= 10;
      $("#f-name").classList.toggle("is-invalid", name.length <= 1);
      $("#f-phone").classList.toggle("is-invalid", digits.length < 10);
      err.hidden = ok;
      if (!ok) return;
      var flatLabel = flat === "any" ? t("form.any") : (t("plans.flat") + " " + flat);
      var text = t("form.waMsg").replace("{name}", name).replace("{phone}", phone).replace("{flat}", flatLabel).replace("{msg}", msg).trim();
      var url = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(text);
      var win = null;
      try { win = window.open(url, "_blank", "noopener"); } catch (e2) { win = null; }
      if (!win) window.location.href = url;
    });
  }

  /* ------------------------------------------------------------------ gate */
  function initGate() {
    var gate = $("#gate");
    var params = new URLSearchParams(window.location.search);
    var stored = null;
    try { stored = params.get("lang") || localStorage.getItem("ah-lang"); } catch (e) { stored = params.get("lang"); }

    if (!gate) { applyLang(stored === "te" ? "te" : "en", { silent: true }); finishGate(); return; }
    lockScroll(true);

    if (stored === "en" || stored === "te") {
      gate.classList.add("is-quiet");
      applyLang(stored, { silent: true });
      setTimeout(openGate, reduce ? 50 : 650);
    } else {
      applyLang("en", { silent: true });
      $$(".gate__btn", gate).forEach(function (b) {
        b.addEventListener("click", function () {
          applyLang(b.getAttribute("data-pick"), { silent: true });
          openGate();
        });
      });
    }
  }

  function openGate() {
    var gate = $("#gate"); if (!gate || gate.getAttribute("data-opening")) return;
    gate.setAttribute("data-opening", "1");
    if (!hasGsap || reduce) { gate.remove(); finishGate(); return; }

    var tl = gsap.timeline({ onComplete: function () { gate.remove(); } });
    tl.to(".gate__content", { opacity: 0, y: -24, duration: .45, ease: "power2.in" })
      .to(".gate__door--l", { xPercent: -102, duration: 1.25, ease: "power4.inOut" }, "-=0.1")
      .to(".gate__door--r", { xPercent: 102, duration: 1.25, ease: "power4.inOut" }, "<")
      .fromTo(".hero__img", { scale: 1.2 }, { scale: 1, duration: 2.4, ease: "power3.out" }, "<0.05")
      .add(function () { finishGate(); }, "<0.35");
  }

  function finishGate() {
    if (state.gateDone) return;
    state.gateDone = true;
    lockScroll(false);
    $("#nav").classList.add("is-in");
    playHeroIntro(false);
    initScrollFeatures();
  }

  /* ----------------------------------------------------------- language ui */
  function initLangButtons() {
    $$("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        var l = b.getAttribute("data-lang");
        if (l === state.lang) return;
        applyLang(l);
        closeMenu();
      });
    });
  }

  /* ---------------------------------------------------------------- resize */
  function initResize() {
    var w = window.innerWidth, timer;
    window.addEventListener("resize", function () {
      if (Math.abs(window.innerWidth - w) < 40) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        w = window.innerWidth;
        if (state.featuresReady) { resplitTitles(); if (state.gateDone) { splitHero(); } }
      }, 260);
    });
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    if (hasGsap) gsap.set("[data-hero]", { opacity: 0 });
    initLenis();
    initPlans();
    initLightbox();
    initAnchors();
    initNav();
    initForm();
    initLangButtons();
    initPointerEffects();
    initResize();
    initGate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
