/* ============================================
   Centaur Studios — Main JavaScript
   Star field, scroll animations, navigation,
   i18n language switching
   ============================================ */

(function () {
  'use strict';

  // ---------- Translations ----------
  const translations = {
    en: {
      // Nav
      'nav.products': 'Products',
      'nav.about': 'About Me',
      'nav.contact': 'Contact',
      'nav.privacy': 'Privacy',

      // Hero
      'hero.title_before': 'Crafting ',
      'hero.title_gradient': 'Digital Experiences',
      'hero.subtitle': "We build premium mobile apps and web experiences that people love to use. From fitness tracking to gaming — we push the boundaries of what's possible.",
      'hero.cta_explore': 'Explore Our Work',
      'hero.cta_contact': 'Get in Touch',

      // Products
      'products.badge': '🚀 Our Products',
      'products.title': "Apps & Platforms We've Built",
      'products.description': 'Each product is crafted with attention to detail, performance, and user delight.',

      // GrindLog
      'products.grindlog.platform': 'iOS — App Store',
      'products.grindlog.desc': 'The smartest way to reach your fitness goals. Track your workouts, monitor your progress with detailed analytics, earn badges, and stay motivated with a gamified experience.',
      'products.grindlog.f1': 'Workout Tracking',
      'products.grindlog.f2': 'Analytics',
      'products.grindlog.f3': 'Gamification',
      'products.grindlog.f4': 'PRO Subscription',

      // Reels Çarkı
      'products.reels.platform': 'Android — Google Play',
      'products.reels.desc': "Can't decide what to watch? Spin the wheel and let fate decide! A fun, engaging way to discover your next favorite content with a beautifully animated spin wheel.",
      'products.reels.f1': 'Spin Wheel',
      'products.reels.f2': 'Entertainment',
      'products.reels.f3': 'Customizable',
      'products.reels.f4': 'Fun',

      // LoL Trivia
      'products.lol.platform': 'Android — Google Play',
      'products.lol.desc': 'Think you know League of Legends? Test your knowledge with hundreds of challenging trivia questions. Multiple game modes including Time Attack with dynamic difficulty.',
      'products.lol.f2': 'Trivia',
      'products.lol.f3': 'Time Attack',
      'products.lol.f4': 'Leaderboards',
      'products.lol.coming_soon': 'Coming Soon',

      // QuizBall
      'products.quizball.platform': 'Web Platform',
      'products.quizball.desc': 'The ultimate football trivia platform. Thousands of questions about teams, players, and football history. Beautiful UI, SEO-optimized, and built with Next.js for blazing-fast performance.',
      'products.quizball.f1': 'Football Trivia',
      'products.quizball.f3': 'SEO Optimized',
      'products.quizball.f4': 'Responsive',
      'products.quizball.cta': 'Visit Website',

      // About
      'about.badge': '✨ About Me',
      'about.title': 'Built with Passion',
      'about.heading': 'Who I Am',
      'about.p1': "I'm Ege Can Bilir, the founder of Centaur Studios & Development and an independent app and web developer. I create engaging mobile applications and web platforms that are not just functional, but genuinely delightful to use.",
      'about.p2': 'From fitness apps that keep you motivated, to trivia games that challenge your mind — every product I ship is crafted with care, attention to detail, and a deep understanding of what users want.',
      'about.p3': 'I work across iOS, Android, and the web, using modern technologies like React Native, Next.js, and Expo to deliver cross-platform excellence.',
      'about.stat_products': 'Products',
      'about.stat_platforms': 'Platforms',
      'about.stat_founded': 'Founded',
      'about.stat_passion': 'Passion',

      // Contact
      'contact.badge': '📬 Contact',
      'contact.title': 'Let\'s Work Together',
      'contact.description': 'Looking for a custom app, a web platform, or a creative collaboration? I\'d love to hear about your project.',
      'contact.heading': 'Get in Touch',
      'contact.text': 'Whether you need a mobile app developed from scratch, a web platform built to scale, or want to explore a partnership — I\'m always open to exciting new projects and collaborations.',
      'contact.form_name': 'Name',
      'contact.form_name_ph': 'Your name',
      'contact.form_email': 'Email',
      'contact.form_message': 'Message',
      'contact.form_message_ph': 'Your message...',
      'contact.form_submit': 'Send Message →',

      // Footer
      'footer.description': 'Crafting digital experiences that people love. Independent studio building premium apps and web platforms.',
      'footer.products': 'Products',
      'footer.legal': 'Legal',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Service',
      'footer.app_privacy': 'App Privacy',
      'footer.grindlog_privacy': 'GrindLog Privacy',
      'footer.reels_privacy': 'Reels Çarkı Privacy',
      'footer.lol_privacy': 'LoL Trivia Privacy',
      'footer.copyright': '© 2026 Centaur Studios. All rights reserved.'
    },

    tr: {
      // Nav
      'nav.products': 'Ürünler',
      'nav.about': 'Hakkımda',
      'nav.contact': 'İletişim',
      'nav.privacy': 'Gizlilik',

      // Hero
      'hero.title_before': 'Dijital ',
      'hero.title_gradient': 'Deneyimler Üretiyoruz',
      'hero.subtitle': 'Kullanıcıların severek kullandığı premium mobil uygulamalar ve web deneyimleri geliştiriyoruz. Fitness takibinden oyunlara — mümkün olanın sınırlarını zorluyoruz.',
      'hero.cta_explore': 'Çalışmalarımızı İncele',
      'hero.cta_contact': 'İletişime Geç',

      // Products
      'products.badge': '🚀 Ürünlerimiz',
      'products.title': 'Geliştirdiğimiz Uygulama ve Platformlar',
      'products.description': 'Her ürün detaylara özen gösterilerek, performans ve kullanıcı memnuniyeti ön planda tutularak geliştirildi.',

      // GrindLog
      'products.grindlog.platform': 'iOS — App Store',
      'products.grindlog.desc': 'Fitness hedeflerinize ulaşmanın en akıllı yolu. Antrenmanlarınızı takip edin, detaylı analizlerle ilerlemenizi izleyin, rozetler kazanın ve oyunlaştırılmış bir deneyimle motive kalın.',
      'products.grindlog.f1': 'Antrenman Takibi',
      'products.grindlog.f2': 'Analitik',
      'products.grindlog.f3': 'Oyunlaştırma',
      'products.grindlog.f4': 'PRO Abonelik',

      // Reels Çarkı
      'products.reels.platform': 'Android — Google Play',
      'products.reels.desc': 'Ne izleyeceğinize karar veremiyorsanız çarkı çevirin ve kaderinize bırakın! Güzel bir animasyonlu çark ile bir sonraki favori içeriğinizi keşfetmenin eğlenceli yolu.',
      'products.reels.f1': 'Çark Çevirme',
      'products.reels.f2': 'Eğlence',
      'products.reels.f3': 'Özelleştirilebilir',
      'products.reels.f4': 'Eğlenceli',

      // LoL Trivia
      'products.lol.platform': 'Android — Google Play',
      'products.lol.desc': "League of Legends'ı ne kadar bildiğinizi düşünüyorsunuz? Yüzlerce zorlu bilgi yarışması sorusuyla kendinizi test edin. Dinamik zorluklu Time Attack dahil birden fazla oyun modu.",
      'products.lol.f2': 'Bilgi Yarışması',
      'products.lol.f3': 'Zamana Karşı',
      'products.lol.f4': 'Sıralama',
      'products.lol.coming_soon': 'Yakında',

      // QuizBall
      'products.quizball.platform': 'Web Platformu',
      'products.quizball.desc': 'Nihai futbol bilgi yarışması platformu. Takımlar, oyuncular ve futbol tarihi hakkında binlerce soru. Güzel arayüz, SEO optimizasyonlu ve Next.js ile geliştirilmiş hızlı performans.',
      'products.quizball.f1': 'Futbol Bilgi Yarışması',
      'products.quizball.f3': 'SEO Optimizasyonlu',
      'products.quizball.f4': 'Duyarlı Tasarım',
      'products.quizball.cta': 'Siteyi Ziyaret Et',

      // About
      'about.badge': '✨ Hakkımda',
      'about.title': 'Tutkuyla Üretildi',
      'about.heading': 'Ben Kimim',
      'about.p1': 'Ben Ege Can Bilir, Centaur Studios & Development\'ın kurucusu ve bağımsız uygulama/web geliştiricisiyim. İlgi çekici mobil uygulamalar ve web platformları geliştiriyorum — sadece işlevsel değil, aynı zamanda kullanımı gerçekten keyifli ürünler ortaya koymayı hedefliyorum.',
      'about.p2': 'Sizi motive eden fitness uygulamalarından, zihninize meydan okuyan bilgi yarışması oyunlarına — çıkardığım her ürün özenle, detaylara dikkat edilerek ve kullanıcıların ne istediğini derinlemesine anlayarak hazırlanmıştır.',
      'about.p3': 'iOS, Android ve web genelinde React Native, Next.js ve Expo gibi modern teknolojileri kullanarak platformlar arası mükemmellik sunuyorum.',
      'about.stat_products': 'Ürün',
      'about.stat_platforms': 'Platform',
      'about.stat_founded': 'Kuruluş',
      'about.stat_passion': 'Tutku',

      // Contact
      'contact.badge': '📬 İletişim',
      'contact.title': 'Birlikte Çalışalım',
      'contact.description': 'Özel bir uygulama, web platformu veya yaratıcı bir işbirliği mi arıyorsunuz? Projenizi duymak isterim.',
      'contact.heading': 'İletişime Geçin',
      'contact.text': 'Sıfırdan bir mobil uygulama geliştirmek, ölçeklenebilir bir web platformu oluşturmak veya bir ortaklık keşfetmek istiyorsanız — heyecan verici yeni projelere ve işbirliklerine her zaman açığım.',
      'contact.form_name': 'İsim',
      'contact.form_name_ph': 'Adınız',
      'contact.form_email': 'E-posta',
      'contact.form_message': 'Mesaj',
      'contact.form_message_ph': 'Mesajınız...',
      'contact.form_submit': 'Mesaj Gönder →',

      // Footer
      'footer.description': 'İnsanların sevdiği dijital deneyimler üretiyoruz. Premium uygulamalar ve web platformları geliştiren bağımsız stüdyo.',
      'footer.products': 'Ürünler',
      'footer.legal': 'Yasal',
      'footer.privacy': 'Gizlilik Politikası',
      'footer.terms': 'Kullanım Koşulları',
      'footer.app_privacy': 'Uygulama Gizliliği',
      'footer.grindlog_privacy': 'GrindLog Gizlilik',
      'footer.reels_privacy': 'Reels Çarkı Gizlilik',
      'footer.lol_privacy': 'LoL Trivia Gizlilik',
      'footer.copyright': '© 2026 Centaur Studios. Tüm hakları saklıdır.'
    }
  };

  let currentLang = localStorage.getItem('cs-lang') || 'en';

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('cs-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang] && translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang] && translations[lang][key]) {
        el.setAttribute('placeholder', translations[lang][key]);
      }
    });

    // Update active button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  function initLanguageSwitcher() {
    const buttons = document.querySelectorAll('.lang-btn');
    if (!buttons.length) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang && lang !== currentLang) {
          setLanguage(lang);
        }
      });
    });

    // Apply saved language on load
    setLanguage(currentLang);
  }

  // ---------- Star Field Background ----------
  function initStarField() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let animationId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createStars(count) {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.3 + 0.05,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleOffset: Math.random() * Math.PI * 2
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;

      stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 10 + star.twinkleOffset);
        const opacity = star.opacity + twinkle * 0.15;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${Math.max(0.05, opacity)})`;
        ctx.fill();

        // Subtle glow for brighter stars
        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 200, 255, ${Math.max(0.01, opacity * 0.15)})`;
          ctx.fill();
        }

        // Slow drift
        star.y -= star.speed * 0.15;
        if (star.y < -5) {
          star.y = canvas.height + 5;
          star.x = Math.random() * canvas.width;
        }
      });

      animationId = requestAnimationFrame(draw);
    }

    resize();
    createStars(Math.min(200, Math.floor(canvas.width * canvas.height / 6000)));
    draw();

    window.addEventListener('resize', () => {
      resize();
      createStars(Math.min(200, Math.floor(canvas.width * canvas.height / 6000)));
    });
  }

  // ---------- Navigation Scroll Effect ----------
  function initNavigation() {
    const nav = document.getElementById('mainNav');
    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');

    if (!nav) return;

    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;

      if (scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      lastScroll = scrollY;
    }, { passive: true });

    // Mobile menu toggle
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
      });

      // Close menu on link click
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          menuBtn.classList.remove('active');
          navLinks.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
    }
  }

  // ---------- Smooth Scroll ----------
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const navHeight = document.getElementById('mainNav')?.offsetHeight || 0;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ---------- Scroll Reveal Animations ----------
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  }

  // ---------- Product Card Hover Tilt Effect ----------
  function initCardTilt() {
    const cards = document.querySelectorAll('.product-card, .web-showcase');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / centerY * -2;
        const rotateY = (x - centerX) / centerX * 2;

        card.style.transform = `translateY(-6px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ---------- Contact Form Handler ----------
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      // If no formspree ID is set, prevent default and show message
      const action = form.getAttribute('action');
      if (action.includes('YOUR_FORM_ID')) {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        const originalText = btn.textContent;
        btn.textContent = currentLang === 'tr' ? '✓ Mesajınız alındı!' : '✓ Message received!';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          form.reset();
        }, 3000);
      }
    });
  }

  // ---------- Animated Counter ----------
  function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.textContent.trim();

          // Skip non-numeric values or elements with data-no-count
          if (isNaN(parseInt(text)) || el.hasAttribute('data-no-count')) return;

          const target = parseInt(text);
          let current = 0;
          const duration = 1500;
          const increment = target / (duration / 16);

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              el.textContent = target;
              clearInterval(timer);
            } else {
              el.textContent = Math.floor(current);
            }
          }, 16);

          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  }

  // ---------- Initialize Everything ----------
  document.addEventListener('DOMContentLoaded', () => {
    initLanguageSwitcher();
    initStarField();
    initNavigation();
    initSmoothScroll();
    initScrollReveal();
    initCardTilt();
    initContactForm();
    initCounters();
  });
})();
