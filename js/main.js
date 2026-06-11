(function () {
  'use strict';

  // ===== Wind Canvas =====
  const canvas = document.getElementById('windCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    class WindStreak {
      constructor(initial) {
        this.initial = initial;
        this.reset(true);
      }

      reset(spawn) {
        const w = canvas.width;
        const h = canvas.height;
        this.len    = 50 + Math.random() * 220;
        this.speed  = 1.8 + Math.random() * 5.2;
        this.maxAlpha = 0.025 + Math.random() * 0.17;
        this.lw     = 0.3 + Math.random() * 1.6;
        this.wave   = (Math.random() - 0.5) * 60;
        this.drift  = (Math.random() - 0.5) * 0.25;
        this.y      = Math.random() * h;
        this.x      = spawn ? Math.random() * (w + this.len) - this.len : -this.len - 60;
      }

      update() {
        this.x += this.speed;
        this.y += this.drift;
        if (this.x > canvas.width + 100) this.reset(false);
      }

      draw() {
        const totalTravel = canvas.width + this.len + 160;
        const progress = (this.x + this.len + 60) / totalTravel;
        const fade = progress < 0.08 ? progress / 0.08
                   : progress > 0.92 ? (1 - progress) / 0.08
                   : 1;
        const a = this.maxAlpha * Math.max(0, Math.min(1, fade));
        if (a < 0.005) return;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.quadraticCurveTo(
          this.x + this.len * 0.5,
          this.y + this.wave,
          this.x + this.len,
          this.y
        );
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.lineWidth   = this.lw;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
    }

    class WindText {
      constructor(initial) {
        this.initial = initial;
        this.reset(true);
      }

      reset(spawn) {
        const w = canvas.width;
        const h = canvas.height;
        const pool = ['CANATA', 'CANATA', 'C', 'C'];
        this.text     = pool[Math.floor(Math.random() * pool.length)];
        this.speed    = 1.4 + Math.random() * 2.8;
        this.maxAlpha = 0.03 + Math.random() * 0.06;
        this.fontSize = 12 + Math.random() * 14;
        this.drift    = (Math.random() - 0.5) * 0.18;
        this.waveAmp  = (Math.random() - 0.5) * 28;
        this.charGap  = this.fontSize * 0.78;
        this.textWidth = this.text.length * this.charGap;
        this.y = Math.random() * h;
        this.x = spawn
          ? Math.random() * (w + this.textWidth) - this.textWidth
          : -this.textWidth - 80;
      }

      update() {
        this.x += this.speed;
        this.y += this.drift;
        if (this.x > canvas.width + 150) this.reset(false);
      }

      draw() {
        const totalTravel = canvas.width + this.textWidth + 160;
        const progress = (this.x + this.textWidth + 80) / totalTravel;
        const fade = progress < 0.08 ? progress / 0.08
                   : progress > 0.92 ? (1 - progress) / 0.08
                   : 1;
        const a = this.maxAlpha * Math.max(0, Math.min(1, fade));
        if (a < 0.004) return;

        const waveY = this.waveAmp * Math.sin(progress * Math.PI);
        ctx.save();
        ctx.font = `300 ${this.fontSize.toFixed(0)}px 'Inter', sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        let xOff = this.x;
        for (let i = 0; i < this.text.length; i++) {
          ctx.fillText(this.text[i], xOff, this.y + waveY);
          xOff += this.charGap;
        }
        ctx.restore();
      }
    }

    const streaks   = Array.from({ length: 55 }, () => new WindStreak(true));
    const textDrift = Array.from({ length: 4 },  () => new WindText(true));

    // しばちょ — 1個だけ
    const shibaccho = new WindText(true);
    shibaccho.text      = 'しばちょ';
    shibaccho.charGap   = shibaccho.fontSize * 1.05;
    shibaccho.textWidth = shibaccho.text.length * shibaccho.charGap;

    (function animateWind() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streaks.forEach(s => { s.update(); s.draw(); });
      textDrift.forEach(t => { t.update(); t.draw(); });
      shibaccho.update(); shibaccho.draw();
      requestAnimationFrame(animateWind);
    })();
  }

  // ===== Navigation scroll =====
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ===== Hamburger menu =====
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      const open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('active', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ===== Scroll fade-up =====
  var fadeObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = parseInt(el.dataset.delay || 0, 10);
      setTimeout(function () { el.classList.add('visible'); }, delay);
      fadeObserver.unobserve(el);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(function (el) {
    fadeObserver.observe(el);
  });

  // ===== Hero wind-in text =====
  function triggerHeroIn() {
    document.querySelectorAll('[data-wind-in]').forEach(function (el) {
      var delay = parseInt(el.dataset.delay || 0, 10);
      setTimeout(function () { el.classList.add('wind-animate'); }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerHeroIn);
  } else {
    triggerHeroIn();
  }

  // ===== Smooth scroll for nav links =====
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var offset = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  });

  // ===== Profile photo =====
  var profileFrame = document.getElementById('profilePhotoFrame');
  if (profileFrame) {
    var testImg = new Image();
    testImg.onload = function () {
      var img = document.createElement('img');
      img.src = '/images/profile.png?' + Date.now();
      img.alt = '柴田 朋浩';
      profileFrame.innerHTML = '';
      profileFrame.appendChild(img);
    };
    testImg.src = '/images/profile.png?' + Date.now();
  }

 // ===== Contact form =====
var contactForm = document.getElementById('contactForm');
var formSuccess = document.getElementById('formSuccess');

if (contactForm && formSuccess) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var btnText = contactForm.querySelector('.btn-text');
    var btnLoading = contactForm.querySelector('.btn-loading');

    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline';

    var formData = new FormData(contactForm);

    try {
      var res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });

      if (res.ok) {
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      } else {
        alert('送信に失敗しました。直接メールにてご連絡ください。');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
      }
    } catch (err) {
      alert('送信に失敗しました。直接メールにてご連絡ください。');
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
    }
  });
}

})();
