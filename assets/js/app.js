/* ==========================================================================
   GITOPS LAB — interaction layer
   Progressive enhancement only: the page is fully readable without this file.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Theme toggle ─────────────────────────────────────────────────── */
  (function theme() {
    var root = doc.documentElement;
    var button = doc.getElementById('theme-toggle');
    var icon = doc.getElementById('theme-icon');
    if (!button || !icon) return;

    function apply(theme, persist) {
      root.setAttribute('data-theme', theme);
      var isDark = theme === 'dark';
      icon.classList.toggle('fa-moon', isDark);
      icon.classList.toggle('fa-sun', !isDark);
      button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      if (persist) {
        try { localStorage.setItem('gitops-theme', theme); } catch (e) { /* ignore */ }
      }
    }

    // Sync the button state with whatever the inline head script already chose.
    apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);

    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next, true);
    });

    // Follow the OS only while the visitor has not made an explicit choice.
    var media = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function (event) {
      var stored = null;
      try { stored = localStorage.getItem('gitops-theme'); } catch (e) { /* ignore */ }
      if (!stored) apply(event.matches ? 'light' : 'dark', false);
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  })();

  /* ── 2. Scroll reveal ────────────────────────────────────────────────── */
  (function reveal() {
    var targets = doc.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });

    // Safety net: if the observer never fires (odd viewport, print, etc.)
    // everything becomes visible after a short delay.
    window.setTimeout(function () {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-visible'); });
    }, 2500);
  })();

  /* ── 3. Gallery filtering ────────────────────────────────────────────── */
  (function galleryFilter() {
    var buttons = Array.prototype.slice.call(doc.querySelectorAll('.filter'));
    var shots = Array.prototype.slice.call(doc.querySelectorAll('.shot'));
    if (!buttons.length || !shots.length) return;

    function select(filter) {
      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
      });
      shots.forEach(function (shot) {
        var match = filter === 'all' || shot.dataset.cat === filter;
        shot.hidden = !match;
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.dataset.filter); });
    });
  })();

  /* ── 4. Lightbox ─────────────────────────────────────────────────────── */
  (function lightbox() {
    var box = doc.getElementById('lightbox');
    var img = doc.getElementById('lightbox-img');
    var caption = doc.getElementById('lightbox-caption');
    var closeBtn = doc.getElementById('lightbox-close');
    if (!box || !img || !closeBtn) return;

    var lastFocused = null;

    function open(sourceImg, text) {
      lastFocused = doc.activeElement;
      img.src = sourceImg.currentSrc || sourceImg.src;
      img.alt = sourceImg.alt || '';
      caption.textContent = text || sourceImg.alt || '';
      box.hidden = false;
      // Force a reflow so the transition runs from the hidden state.
      void box.offsetWidth;
      box.classList.add('is-open');
      doc.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      box.classList.remove('is-open');
      doc.body.style.overflow = '';
      window.setTimeout(function () {
        box.hidden = true;
        img.src = '';
      }, prefersReducedMotion ? 0 : 240);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    // Any gallery card that contains an image opens the viewer.
    Array.prototype.forEach.call(doc.querySelectorAll('.shot'), function (shot) {
      shot.addEventListener('click', function () {
        var sourceImg = shot.querySelector('img');
        if (sourceImg) open(sourceImg, shot.dataset.caption);
      });
    });

    // The architecture figure is also zoomable.
    var figureMedia = doc.querySelector('.figure__media');
    if (figureMedia) {
      figureMedia.style.cursor = 'zoom-in';
      figureMedia.addEventListener('click', function () {
        open(figureMedia, 'Figure 1 — Development, delivery and observability planes');
      });
    }

    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (event) {
      if (event.target === box) close();
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  })();

  /* ── 5. Copy terminal snippets ───────────────────────────────────────── */
  (function copySnippets() {
    var buttons = doc.querySelectorAll('[data-copy-target]');
    if (!buttons.length) return;

    function fallbackCopy(text) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(area);
      return ok;
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var target = doc.getElementById(button.dataset.copyTarget);
        if (!target) return;

        var text = target.innerText.replace(/\u00a0/g, ' ');
        var label = button.querySelector('span');
        var icon = button.querySelector('i');
        var original = label ? label.textContent : '';

        function confirmCopy(succeeded) {
          if (label) label.textContent = succeeded ? 'Copied' : 'Failed';
          if (icon) {
            icon.classList.toggle('fa-copy', !succeeded);
            icon.classList.toggle('fa-check', succeeded);
          }
          button.classList.toggle('is-copied', succeeded);
          window.setTimeout(function () {
            if (label) label.textContent = original;
            if (icon) {
              icon.classList.add('fa-copy');
              icon.classList.remove('fa-check');
            }
            button.classList.remove('is-copied');
          }, 1800);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { confirmCopy(true); },
            function () { confirmCopy(fallbackCopy(text)); }
          );
        } else {
          confirmCopy(fallbackCopy(text));
        }
      });
    });
  })();

  /* ── 6. Active section in header nav ─────────────────────────────────── */
  (function activeNav() {
    if (!('IntersectionObserver' in window)) return;

    var links = Array.prototype.slice.call(doc.querySelectorAll('.site-nav__link'));
    if (!links.length) return;

    var map = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = doc.getElementById(id);
      if (section) { map[id] = link; sections.push(section); }
    });
    if (!sections.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (item) { item.style.color = ''; });
          link.style.color = 'var(--fg-default)';
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  })();

})();
