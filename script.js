(() => {
  'use strict';

  const doc = document;
  const body = doc.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const storage = {
    get(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        return false;
      }
      return true;
    }
  };

  const splash = doc.getElementById('splash');
  const splashKey = 'tpfgc-splash-seen';

  if (splash) {
    let splashTimer = null;

    const hideSplash = () => {
      if (splash.classList.contains('is-hidden')) return;
      splash.classList.add('is-hidden');
      splash.setAttribute('aria-hidden', 'true');
      body.classList.remove('splash-open');
      storage.set(splashKey, '1');
      if (splashTimer) window.clearTimeout(splashTimer);
    };

    if (reduceMotion || storage.get(splashKey) === '1') {
      splash.classList.add('is-hidden');
      splash.setAttribute('aria-hidden', 'true');
    } else {
      body.classList.add('splash-open');
      splashTimer = window.setTimeout(hideSplash, 2500);
      splash.addEventListener('click', hideSplash);
      doc.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') hideSplash();
      });
      window.setTimeout(hideSplash, 5000);
    }
  }

  const header = doc.getElementById('site-header');
  const progressBar = doc.querySelector('.scroll-progress');
  const backToTop = doc.querySelector('.back-to-top');
  let scrollTicking = false;

  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const maxScroll = doc.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

    if (header) header.classList.toggle('is-scrolled', scrollTop > 24);
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 600);

    scrollTicking = false;
  };

  const requestScrollUpdate = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUI);
  };

  updateScrollUI();
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  }

  const navToggle = doc.querySelector('.nav-toggle');
  const mobileNav = doc.getElementById('mobile-nav');
  let lastFocused = null;

  const openMenu = () => {
    if (!mobileNav || !navToggle) return;
    lastFocused = doc.activeElement;
    mobileNav.removeAttribute('inert');
    mobileNav.setAttribute('aria-hidden', 'false');
    mobileNav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    body.classList.add('menu-open');
    const first = mobileNav.querySelector(focusableSelector);
    if (first) window.setTimeout(() => first.focus(), 120);
  };

  const closeMenu = (restoreFocus = true) => {
    if (!mobileNav || !navToggle) return;
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    mobileNav.setAttribute('inert', '');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    body.classList.remove('menu-open');
    if (restoreFocus && lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      if (navToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu(false));
    });

    doc.addEventListener('keydown', (event) => {
      if (!mobileNav.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = [navToggle, ...mobileNav.querySelectorAll(focusableSelector)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    const desktopQuery = window.matchMedia('(min-width: 1181px)');
    const handleDesktopChange = (event) => {
      if (event.matches) closeMenu(false);
    };

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', handleDesktopChange);
    } else {
      desktopQuery.addListener(handleDesktopChange);
    }
  }

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const pageLinks = [...doc.querySelectorAll('.nav-link, .mobile-nav__list a')];

  pageLinks.forEach((link) => {
    const href = (link.getAttribute('href') || '').split('#')[0] || 'index.html';
    const active = href === currentFile || (currentFile === '' && href === 'index.html');
    link.classList.toggle('active', active);
    link.classList.toggle('is-active', active);
    if (active) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const revealElements = doc.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const animateCounter = (element) => {
    const target = Number.parseInt(element.dataset.count, 10);
    if (Number.isNaN(target)) return;

    if (reduceMotion) {
      element.textContent = String(target);
      return;
    }

    const duration = 1400;
    const start = window.performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));

      if (progress < 1) window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  };

  const counters = doc.querySelectorAll('[data-count]');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  const slider = doc.querySelector('[data-slider]');

  if (slider) {
    const slides = [...slider.querySelectorAll('.testimony')];
    const dots = [...slider.querySelectorAll('.slider-dot')];
    const prevButton = slider.querySelector('[data-prev]');
    const nextButton = slider.querySelector('[data-next]');
    let index = 0;
    let timer = null;
    let paused = false;

    const stopAuto = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const goTo = (nextIndex, fromUser = false) => {
      if (!slides.length) return;
      index = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });

      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
        dot.tabIndex = active ? 0 : -1;
      });

      if (fromUser) stopAuto();
    };

    if (prevButton) prevButton.addEventListener('click', () => goTo(index - 1, true));
    if (nextButton) nextButton.addEventListener('click', () => goTo(index + 1, true));

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener('click', () => goTo(dotIndex, true));
    });

    slider.addEventListener('mouseenter', () => { paused = true; });
    slider.addEventListener('mouseleave', () => { paused = false; });
    slider.addEventListener('focusin', () => { paused = true; });
    slider.addEventListener('focusout', () => { paused = false; });

    slider.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1, true);
        if (dots[index]) dots[index].focus();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1, true);
        if (dots[index]) dots[index].focus();
      }
    });

    goTo(0);

    if (!reduceMotion && slides.length > 1) {
      timer = window.setInterval(() => {
        if (!paused) goTo(index + 1);
      }, 7000);
    }
  }

  const lightbox = doc.getElementById('lightbox');
  const galleryItems = [...doc.querySelectorAll('.gallery-item')];

  if (lightbox && galleryItems.length) {
    const lightboxImage = lightbox.querySelector('[data-lightbox-img]');
    const lightboxCaption = lightbox.querySelector('[data-lightbox-caption]');
    const closeButton = lightbox.querySelector('[data-close]');
    const prevButton = lightbox.querySelector('[data-prev]');
    const nextButton = lightbox.querySelector('[data-next]');
    const images = galleryItems.map((button) => {
      const image = button.querySelector('img');
      return {
        src: button.dataset.full || (image ? image.getAttribute('src') : ''),
        caption: button.dataset.caption || '',
        alt: image ? image.alt : ''
      };
    });
    let currentIndex = 0;
    let lastGalleryFocus = null;

    const renderLightbox = () => {
      const image = images[currentIndex];
      if (!image || !lightboxImage) return;
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      if (lightboxCaption) lightboxCaption.textContent = image.caption;
    };

    const openLightbox = (index) => {
      currentIndex = index;
      lastGalleryFocus = doc.activeElement;
      renderLightbox();
      lightbox.classList.add('is-open');
      lightbox.removeAttribute('inert');
      lightbox.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
      if (closeButton) window.setTimeout(() => closeButton.focus(), 60);
    };

    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.setAttribute('inert', '');
      body.classList.remove('lightbox-open');
      if (lastGalleryFocus instanceof HTMLElement) lastGalleryFocus.focus();
    };

    const stepLightbox = (direction) => {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      renderLightbox();
    };

    galleryItems.forEach((button, index) => {
      button.addEventListener('click', () => openLightbox(index));
    });

    if (closeButton) closeButton.addEventListener('click', closeLightbox);
    if (prevButton) prevButton.addEventListener('click', () => stepLightbox(-1));
    if (nextButton) nextButton.addEventListener('click', () => stepLightbox(1));

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    doc.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepLightbox(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepLightbox(1);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = [closeButton, prevButton, nextButton].filter(Boolean);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  const toast = doc.querySelector('.toast');
  let toastTimer = null;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 4200);
  };

  doc.querySelectorAll('.play-btn, [data-media]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('Full messages are coming soon. Please contact us for recordings.');
    });
  });

  doc.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy || '';
      if (!value) return;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const input = doc.createElement('textarea');
          input.value = value;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          body.appendChild(input);
          input.select();
          doc.execCommand('copy');
          input.remove();
        }
        showToast(`Copied: ${value}`);
      } catch {
        showToast('Copy is unavailable in this browser. Please select the details manually.');
      }
    });
  });

  doc.querySelectorAll('[data-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const status = form.querySelector('[data-status]');
      const submitButton = form.querySelector('button[type="submit"]');
      const originalMarkup = submitButton ? submitButton.innerHTML : '';

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      window.setTimeout(() => {
        form.reset();

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalMarkup;
        }

        if (status) {
          status.textContent = form.dataset.success || 'Thank you. Your message has been received.';
          status.classList.add('is-visible');
          window.setTimeout(() => status.classList.remove('is-visible'), 9000);
        }
      }, 800);
    });
  });

  doc.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  doc.documentElement.dataset.ready = 'true';
})();
