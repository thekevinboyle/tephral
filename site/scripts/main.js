/* ═══════════════════════════════════════════════════════════════════════════
   TEPHRAL MARKETING SITE — MAIN SCRIPT
   Scroll animations, intersection observers, parallax
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Ready
  // ───────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initPageLoadSequence();
    initScrollObservers();
    initNavScroll();
    initParallax();
    initStrandConnections();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Page Load Animation Sequence
  // ───────────────────────────────────────────────────────────────────────────
  function initPageLoadSequence() {
    const elements = [
      { selector: '.hero__headline', delay: 0 },
      { selector: '.hero__divider', delay: 100 },
      { selector: '.hero__subhead', delay: 200 },
      { selector: '.hero__ctas', delay: 300 },
      { selector: '.hero__screenshot', delay: 400 },
    ];

    elements.forEach(({ selector, delay }) => {
      const el = document.querySelector(selector);
      if (el) {
        setTimeout(() => {
          el.classList.add('animate');
        }, delay);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scroll-triggered Animations (Intersection Observer)
  // ───────────────────────────────────────────────────────────────────────────
  function initScrollObservers() {
    // Options for different animation types
    const sectionOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const itemOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };

    // Section observer - reveals entire sections
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, stop observing
          sectionObserver.unobserve(entry.target);
        }
      });
    }, sectionOptions);

    // Item observer - reveals individual items with stagger
    const itemObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          itemObserver.unobserve(entry.target);
        }
      });
    }, itemOptions);

    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
      sectionObserver.observe(section);
    });

    // Observe effect cards
    document.querySelectorAll('.effect-card').forEach(card => {
      itemObserver.observe(card);
    });

    // Observe capability rows
    document.querySelectorAll('.capability-row').forEach(row => {
      itemObserver.observe(row);
    });

    // Observe tech cards
    document.querySelectorAll('.tech-card').forEach(card => {
      itemObserver.observe(card);
    });

    // Observe docs blocks
    document.querySelectorAll('.docs-block').forEach(block => {
      itemObserver.observe(block);
    });

    // Observe screenshots in grid
    document.querySelectorAll('.screenshots-grid .screenshot').forEach(screenshot => {
      itemObserver.observe(screenshot);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation Scroll Effect
  // ───────────────────────────────────────────────────────────────────────────
  function initNavScroll() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateNav() {
      const scrollY = window.scrollY;

      if (scrollY > 100) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateNav);
        ticking = true;
      }
    }, { passive: true });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Parallax Effect
  // ───────────────────────────────────────────────────────────────────────────
  function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');
    if (parallaxElements.length === 0) return;

    let ticking = false;

    function updateParallax() {
      const scrollY = window.scrollY;

      parallaxElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        const elementCenter = elementTop + rect.height / 2;
        const viewportCenter = scrollY + window.innerHeight / 2;
        const distance = viewportCenter - elementCenter;
        const parallaxAmount = distance * 0.1;

        el.style.transform = `translateY(${parallaxAmount}px)`;
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    // Initial call
    updateParallax();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Strand Connections (SVG lines between cards on hover)
  // ───────────────────────────────────────────────────────────────────────────
  function initStrandConnections() {
    const grid = document.querySelector('.effects-grid');
    const svg = document.querySelector('.strand-connections');
    const cards = document.querySelectorAll('.effect-card');

    if (!grid || !svg || cards.length < 2) return;

    // Update SVG size
    function updateSVGSize() {
      const rect = grid.getBoundingClientRect();
      svg.setAttribute('width', rect.width);
      svg.setAttribute('height', rect.height);
      svg.style.width = rect.width + 'px';
      svg.style.height = rect.height + 'px';
    }

    updateSVGSize();
    window.addEventListener('resize', updateSVGSize);

    // Draw connection lines on hover
    cards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        drawConnections(card, index);
      });

      card.addEventListener('mouseleave', () => {
        clearConnections();
      });
    });

    function drawConnections(hoveredCard, hoveredIndex) {
      clearConnections();

      const gridRect = grid.getBoundingClientRect();
      const hoveredRect = hoveredCard.getBoundingClientRect();
      const hoveredX = hoveredRect.left - gridRect.left + hoveredRect.width / 2;
      const hoveredY = hoveredRect.top - gridRect.top + hoveredRect.height / 2;

      // Connect to adjacent cards
      cards.forEach((card, index) => {
        if (index === hoveredIndex) return;

        // Only connect to immediate neighbors
        const diff = Math.abs(index - hoveredIndex);
        if (diff > 2) return;

        const rect = card.getBoundingClientRect();
        const x = rect.left - gridRect.left + rect.width / 2;
        const y = rect.top - gridRect.top + rect.height / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('strand-line');

        // Create bezier curve
        const midX = (hoveredX + x) / 2;
        const midY = (hoveredY + y) / 2;
        const controlOffset = 30;

        const d = `M ${hoveredX} ${hoveredY} Q ${midX} ${midY - controlOffset} ${x} ${y}`;
        path.setAttribute('d', d);
        path.style.opacity = '0.6';
        path.style.strokeDasharray = '8 4';

        svg.appendChild(path);
      });
    }

    function clearConnections() {
      const paths = svg.querySelectorAll('.strand-line');
      paths.forEach(path => path.remove());
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Smooth scroll for anchor links
  // ───────────────────────────────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

})();
