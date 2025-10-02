// frontend/assets/js/home.js

// Set current year in footer (no inline scripts due to CSP)
(function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Simple mobile menu behavior: toggle Login/Signup links on narrow screens
(function mobileMenu() {
  const toggle = document.getElementById('menuToggle');
  if (!toggle) return;
  let open = false;

  toggle.addEventListener('click', () => {
    open = !open;
    // Reveal/hide links with a quick class toggle by injecting a helper class on <body>
    document.body.classList.toggle('nav-open', open);
    // For a minimal approach, we’ll just redirect to /login on tap if closed:
    if (!open) return;
    // You can expand to show a real dropdown if you want later
  });
})();

// Lightweight scroll-reveal (IntersectionObserver)
(function revealOnScroll() {
  const els = document.querySelectorAll('.card, .hero-card, .testi');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.animate(
          [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 450, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' }
        );
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
})();

// Parallax-ish float on hero image (subtle)
(function heroHover() {
  const img = document.querySelector('.hero-img');
  if (!img) return;
  let raf = null;

  function onMove(e) {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const rect = img.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      img.style.transform = `translate(${dx * 8}px, ${dy * 8}px) scale(1.01)`;
    });
  }
  function reset() {
    img.style.transform = 'translate(0,0) scale(1)';
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseout', reset);
})();

// Prefetch hero image quickly for perceived performance
(function prefetch() {
  const src = '/assets/images/hero-fitness.jpg';
  const img = new Image();
  img.src = src;
})();
