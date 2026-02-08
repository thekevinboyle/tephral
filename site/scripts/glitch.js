/* ═══════════════════════════════════════════════════════════════════════════
   TEPHRAL MARKETING SITE — GLITCH EFFECTS
   Text glitch and visual distortion effects
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // Initialize
  // ───────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    initRandomGlitch();
    initHoverGlitch();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Random Periodic Glitch on Logo/Brand
  // ───────────────────────────────────────────────────────────────────────────
  function initRandomGlitch() {
    const brandElements = document.querySelectorAll('.nav__logo, .footer__brand');

    function triggerRandomGlitch() {
      brandElements.forEach(el => {
        // Random chance to glitch
        if (Math.random() < 0.3) {
          el.classList.add('glitching');

          // Add temporary visual distortion
          const originalText = el.textContent;
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

          // Quick character scramble
          let iterations = 0;
          const maxIterations = 5;
          const interval = setInterval(() => {
            el.textContent = originalText
              .split('')
              .map((char, index) => {
                if (index < iterations) {
                  return originalText[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
              })
              .join('');

            iterations += 1 / 3;

            if (iterations >= maxIterations) {
              clearInterval(interval);
              el.textContent = originalText;
              el.classList.remove('glitching');
            }
          }, 30);
        }
      });

      // Schedule next random glitch (between 5-15 seconds)
      const nextDelay = 5000 + Math.random() * 10000;
      setTimeout(triggerRandomGlitch, nextDelay);
    }

    // Start after initial load
    setTimeout(triggerRandomGlitch, 3000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Enhanced Hover Glitch for Cards
  // ───────────────────────────────────────────────────────────────────────────
  function initHoverGlitch() {
    const glitchTitles = document.querySelectorAll('.card__title.glitch-hover');

    glitchTitles.forEach(title => {
      const originalText = title.textContent;

      title.addEventListener('mouseenter', () => {
        let iterations = 0;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        const interval = setInterval(() => {
          title.textContent = originalText
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' ';
              if (index < iterations) {
                return originalText[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');

          if (iterations >= originalText.length) {
            clearInterval(interval);
            title.textContent = originalText;
          }

          iterations += 1 / 2;
        }, 30);
      });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Export for potential external use
  // ───────────────────────────────────────────────────────────────────────────
  window.SegfaultGlitch = {
    glitchText: function(element, duration = 500) {
      const originalText = element.textContent;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          clearInterval(interval);
          element.textContent = originalText;
          return;
        }

        element.textContent = originalText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            const charProgress = index / originalText.length;
            if (charProgress < progress) {
              return originalText[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
      }, 30);
    }
  };

})();
