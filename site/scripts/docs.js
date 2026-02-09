/* ═══════════════════════════════════════════════════════════════════════════
   SEG_F4ULT DOCUMENTATION SCRIPTS
   Scroll-spy navigation and smooth scrolling
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // SCROLL-SPY: Highlight active sidebar link based on scroll position
  // ─────────────────────────────────────────────────────────────────────────
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.doc-section');

  function updateActiveLink() {
    const scrollY = window.scrollY;
    const offset = 100; // Account for fixed nav

    let currentSection = null;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - offset;
      const sectionHeight = section.offsetHeight;

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSection = section.id;
      }
    });

    // If we're at the very bottom, highlight the last section
    if (window.innerHeight + scrollY >= document.body.offsetHeight - 50) {
      currentSection = sections[sections.length - 1]?.id;
    }

    sidebarLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${currentSection}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Throttle scroll events for performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Initial check
  updateActiveLink();

  // ─────────────────────────────────────────────────────────────────────────
  // SMOOTH SCROLL: Handle sidebar link clicks
  // ─────────────────────────────────────────────────────────────────────────
  sidebarLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);

      if (target) {
        const offset = 80; // Account for fixed nav
        const targetPosition = target.offsetTop - offset;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });

        // Update URL hash without jumping
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLE INITIAL HASH: Scroll to section if URL has hash
  // ─────────────────────────────────────────────────────────────────────────
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    const target = document.getElementById(targetId);

    if (target) {
      // Wait for page to fully load
      setTimeout(() => {
        const offset = 80;
        const targetPosition = target.offsetTop - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }, 100);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DETAILS STATE: Remember open/closed state of details elements
  // ─────────────────────────────────────────────────────────────────────────
  const detailsElements = document.querySelectorAll('.doc-details');

  // Restore state from localStorage
  detailsElements.forEach((details, index) => {
    const key = `docs-details-${index}`;
    const isOpen = localStorage.getItem(key) === 'true';
    if (isOpen) {
      details.open = true;
    }

    // Save state when toggled
    details.addEventListener('toggle', () => {
      localStorage.setItem(key, details.open);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION TABS: Handle Overview/Guidelines/Specs tab switching
  // ─────────────────────────────────────────────────────────────────────────
  const tabContainers = document.querySelectorAll('.section-tabs');

  tabContainers.forEach((container) => {
    const section = container.dataset.section;
    const tabs = container.querySelectorAll('.section-tab');
    const contents = document.querySelectorAll(`.tab-content[data-section="${section}"]`);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Update active tab
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Update visible content
        contents.forEach((content) => {
          if (content.dataset.tabContent === targetTab) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });

        // Save state to localStorage
        localStorage.setItem(`docs-tab-${section}`, targetTab);
      });
    });

    // Restore saved tab state
    const savedTab = localStorage.getItem(`docs-tab-${section}`);
    if (savedTab) {
      const targetTabButton = container.querySelector(`.section-tab[data-tab="${savedTab}"]`);
      if (targetTabButton) {
        targetTabButton.click();
      }
    }
  });

})();
