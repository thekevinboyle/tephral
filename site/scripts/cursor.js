/* ═══════════════════════════════════════════════════════════════════════════
   TEPHRAL MARKETING SITE — CURSOR TRAIL
   Subtle orange particles following the cursor
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const MAX_PARTICLES = 20;
  const PARTICLE_LIFETIME = 500; // ms
  const THROTTLE_MS = 50; // Spawn rate limit

  let container;
  let particles = [];
  let lastSpawnTime = 0;
  let mouseX = 0;
  let mouseY = 0;
  let isEnabled = true;

  // ───────────────────────────────────────────────────────────────────────────
  // Initialize
  // ───────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    container = document.getElementById('cursorTrail');
    if (!container) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isEnabled = false;
      return;
    }

    // Track mouse position
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Clean up particles periodically
    setInterval(cleanupParticles, 100);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Mouse Move Handler
  // ───────────────────────────────────────────────────────────────────────────
  function handleMouseMove(e) {
    if (!isEnabled) return;

    mouseX = e.clientX;
    mouseY = e.clientY;

    const now = Date.now();
    if (now - lastSpawnTime >= THROTTLE_MS) {
      spawnParticle(mouseX, mouseY);
      lastSpawnTime = now;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Spawn Particle
  // ───────────────────────────────────────────────────────────────────────────
  function spawnParticle(x, y) {
    // Remove oldest if at max
    if (particles.length >= MAX_PARTICLES) {
      const oldest = particles.shift();
      if (oldest && oldest.element && oldest.element.parentNode) {
        oldest.element.remove();
      }
    }

    // Create particle element
    const particle = document.createElement('div');
    particle.className = 'cursor-particle';

    // Random offset for more organic feel
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;

    particle.style.left = (x + offsetX) + 'px';
    particle.style.top = (y + offsetY) + 'px';

    // Random size variation
    const size = 3 + Math.random() * 3;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';

    // Random opacity
    particle.style.opacity = 0.4 + Math.random() * 0.4;

    container.appendChild(particle);

    // Track particle
    particles.push({
      element: particle,
      createdAt: Date.now()
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cleanup Old Particles
  // ───────────────────────────────────────────────────────────────────────────
  function cleanupParticles() {
    const now = Date.now();

    particles = particles.filter(particle => {
      const age = now - particle.createdAt;

      if (age >= PARTICLE_LIFETIME) {
        if (particle.element && particle.element.parentNode) {
          particle.element.remove();
        }
        return false;
      }

      return true;
    });
  }

})();
