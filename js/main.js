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
  var fadeObserver = null;
  if ('IntersectionObserver' in window) {
    fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.dataset.delay || 0, 10);
        setTimeout(function () { el.classList.add('visible'); }, delay);
        fadeObserver.unobserve(el);
      });
    }, { threshold: 0.1 });
  }

  function prepareFadeElements(elements) {
    Array.prototype.forEach.call(elements, function (el) {
      if (!fadeObserver) {
        el.classList.add('visible');
        return;
      }
      el.classList.add('fade-ready');
      fadeObserver.observe(el);
      // Browser extensions or observer quirks must never leave content hidden.
      setTimeout(function () { el.classList.add('visible'); }, 3000);
    });
  }

  prepareFadeElements(document.querySelectorAll('.fade-up'));

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

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderServicesGrid(items) {
    if (!servicesGrid) return;
    servicesGrid.innerHTML = items.map(function(s, i){
      return '<div class="service-card fade-up">'
        + '<div class="service-card__num">0' + (i+1) + '</div>'
        + '<h3 class="service-card__title">' + escHtml(s.title) + '</h3>'
        + '<p class="service-card__text">' + escHtml(s.text) + '</p>'
        + '</div>';
    }).join('');
    prepareFadeElements(servicesGrid.querySelectorAll('.fade-up'));
  }

  function renderStrengthsGrid(items) {
    if (!strengthsGrid) return;
    strengthsGrid.innerHTML = items.map(function(s, i){
      return '<div class="strength-item fade-up">'
        + '<div class="strength-item__num">0' + (i+1) + '</div>'
        + '<h3 class="strength-item__title">' + escHtml(s.title) + '</h3>'
        + '<p class="strength-item__text">' + escHtml(s.text) + '</p>'
        + '</div>';
    }).join('');
    prepareFadeElements(strengthsGrid.querySelectorAll('.fade-up'));
  }

  function renderBadgeList(items) {
    if (!badgeList) return;
    badgeList.innerHTML = items.map(function(b){
      return '<span class="profile__badge">' + escHtml(b.label) + '</span>';
    }).join('');
  }

  // ===== Services グリッド =====
  var servicesGrid = document.getElementById('servicesGrid');
  if (servicesGrid) {
    var DEFAULT_SERVICES = [
      {title: '経営コーチング',  text: '定期的な1on1セッションを通じ、経営者が自らの思考を整理し、意思決定の質を高めます。外部の視点と問いかけで、見えていなかった課題に気づくきっかけを提供します。'},
      {title: '組織診断・改善', text: '現状の組織課題を多角的に診断し、改善計画を立案・実行支援します。社内コミュニケーション、チームビルディング、マネジメント層の強化まで幅広く対応します。'},
      {title: '人事制度設計',   text: '評価制度・給与体系・採用戦略など、組織の成長を支える人事の仕組みをゼロから構築・見直します。人が活きる環境づくりをサポートします。'}
    ];
    var cachedSvc = localStorage.getItem('kanata_services');
    if (cachedSvc) {
      try { renderServicesGrid(JSON.parse(cachedSvc)); } catch(_){ renderServicesGrid(DEFAULT_SERVICES); }
    } else {
      renderServicesGrid(DEFAULT_SERVICES);
    }
    if (!cachedSvc) {
      fetch('/services.json?_=' + Date.now())
        .then(function(r){ if (!r.ok) throw new Error('not ok'); return r.json(); })
        .then(function(items){ renderServicesGrid(items); })
        .catch(function(){});
    }
  }

  // ===== Strengths グリッド =====
  var strengthsGrid = document.getElementById('strengthsGrid');
  if (strengthsGrid) {
    var DEFAULT_STRENGTHS = [
      {title: '論理的アプローチ×コーチング', text: '技術士として培った論理的・体系的な思考で、感覚ではなく構造で組織課題を整理。コーチングの問いかけと組み合わせることで、再現性のある改善策を導き出します。'},
      {title: '経営者との対話を最優先に',     text: '答えを押しつけず、問いかけと傾聴で経営者自身の気づきを引き出すスタイル。信頼関係に基づいた長期的なパートナーシップが、持続的な組織変革を生み出します。'},
      {title: '現場を知る実践知',             text: '大手企業での豊富なプロジェクト経験をもとに、理論だけでなく実際に機能する施策を提案。経営者の現場感覚に合わせた、地に足のついた支援を行います。'}
    ];
    var cachedStr = localStorage.getItem('kanata_strengths');
    if (cachedStr) {
      try { renderStrengthsGrid(JSON.parse(cachedStr)); } catch(_){ renderStrengthsGrid(DEFAULT_STRENGTHS); }
    } else {
      renderStrengthsGrid(DEFAULT_STRENGTHS);
    }
    if (!cachedStr) {
      fetch('/strengths.json?_=' + Date.now())
        .then(function(r){ if (!r.ok) throw new Error('not ok'); return r.json(); })
        .then(function(items){ renderStrengthsGrid(items); })
        .catch(function(){});
    }
  }

  // ===== Badges リスト =====
  var badgeList = document.getElementById('badgeList');
  if (badgeList) {
    var DEFAULT_BADGE_ITEMS = [
      {label: '技術士（電気電子部門）'},
      {label: '経営コンサルタント'},
      {label: '組織開発ファシリテーター'},
      {label: 'MBA(グロービス経営大学院)'}
    ];
    // まずlocalStorageのカスタムデータがあれば即時表示
    var cachedBdg = localStorage.getItem('kanata_badges');
    if (cachedBdg) {
      try { renderBadgeList(JSON.parse(cachedBdg)); } catch(_){ renderBadgeList(DEFAULT_BADGE_ITEMS); }
    } else {
      // キャッシュなしならデフォルトで先行表示
      renderBadgeList(DEFAULT_BADGE_ITEMS);
    }
    // badges.jsonで常に上書き（管理画面で更新された場合はlocalStorageが優先されるためここでは上書きしない）
    // ただしlocalStorageがない場合はJSONから取得
    if (!cachedBdg) {
      fetch('/badges.json?_=' + Date.now())
        .then(function(r){ if (!r.ok) throw new Error('not ok'); return r.json(); })
        .then(function(items){ renderBadgeList(items); })
        .catch(function(){}); // デフォルト表示のまま
    }
  }

  // ===== data-editable をlocalStorageから反映 =====
  (function applyEditableOverrides(){
    var stored = localStorage.getItem('kanata_editable');
    if (!stored) return;
    try {
      var data = JSON.parse(stored);
      Object.keys(data).forEach(function(key){
        document.querySelectorAll('[data-editable="' + key + '"]').forEach(function(el){
          el.innerHTML = data[key];
        });
      });
    } catch(_){}
  })();

  // ===== Profile photo =====
  var profileFrame = document.getElementById('profilePhotoFrame');
  if (profileFrame) {
    var sharedImg = new Image();
    sharedImg.onload = function () {
      profileFrame.innerHTML = '';
      profileFrame.appendChild(sharedImg);
    };
    sharedImg.src = '/.netlify/functions/profile-photo?_=' + Date.now();

    var testImg = new Image();
    testImg.onload = function () {
      if (profileFrame.querySelector('img')) return;
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

    // 管理サーバー（/api/contact）が存在するか確認してから送信を切り替える
    async function tryAdminApi() {
      var payload = {
        name:    formData.get('name')    || '',
        company: formData.get('company') || '',
        email:   formData.get('email')   || '',
        tel:     formData.get('tel')     || '',
        subject: formData.get('subject') || '',
        message: formData.get('message') || ''
      };
      var res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res;
    }

    async function tryNetlify() {
      var res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });
      return res;
    }

    try {
      var res;
      // まず /api/ping で管理サーバーの存在を確認
      try {
        var ping = await fetch('/api/ping', { method: 'GET' });
        if (ping.ok) {
          res = await tryAdminApi();
        } else {
          res = await tryNetlify();
        }
      } catch (_) {
        // 管理サーバーが起動していない場合はNetlifyフォームへフォールバック
        res = await tryNetlify();
      }

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
