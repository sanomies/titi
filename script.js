(() => {
  const containers = document.querySelectorAll('.bento');
  if (!containers.length) return;

  const getGap = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--gap');
    return parseInt(v, 10) || 6;
  };

  const getCols = (container) => {
    const w = window.innerWidth;
    const max = parseInt(container.dataset.cols, 10) || 4;
    if (w <= 480) return 1;
    if (w <= 800) return Math.min(2, max);
    if (w <= 1200) return Math.min(3, max);
    return max;
  };

  const layoutOne = (container) => {
    const gap = getGap();
    const cols = getCols(container);
    const cs = getComputedStyle(container);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const containerWidth = container.clientWidth - padL - padR;
    const colWidth = (containerWidth - gap * (cols - 1)) / cols;
    const colHeights = new Array(cols).fill(0);

    const cells = container.querySelectorAll('.cell');
    cells.forEach(cell => {
      const img = cell.querySelector('img');
      const nW = img.naturalWidth || 600;
      const nH = img.naturalHeight || 600;
      const cellHeight = (colWidth / nW) * nH;

      let minIdx = 0;
      for (let i = 1; i < cols; i++) {
        if (colHeights[i] < colHeights[minIdx]) minIdx = i;
      }

      cell.style.position = 'absolute';
      cell.style.left = (padL + minIdx * (colWidth + gap)) + 'px';
      cell.style.top = colHeights[minIdx] + 'px';
      cell.style.width = colWidth + 'px';

      colHeights[minIdx] += cellHeight + gap;
    });

    container.style.position = 'relative';
    container.style.height = (Math.max(...colHeights) - gap) + 'px';
  };

  const layoutAll = () => containers.forEach(layoutOne);

  containers.forEach(container => {
    container.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', layoutAll);
        img.addEventListener('error', layoutAll);
      }
    });
  });

  layoutAll();

  // Sync body padding-bottom to the reveal panel's height so the user can scroll past
  // main content and uncover the fixed-bottom reveal.
  const reveal = document.querySelector('.reveal');
  const syncReveal = () => {
    if (!reveal) return;
    document.body.style.paddingBottom = reveal.offsetHeight + 'px';
  };
  syncReveal();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layoutAll(); syncReveal(); onScroll(); }, 80);
  });

  // Fade cells in (random order) once their image has loaded and they enter the viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = Math.random() * 500;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });

  containers.forEach(container => {
    container.querySelectorAll('.cell').forEach(cell => {
      const img = cell.querySelector('img');
      const start = () => observer.observe(cell);
      if (img.complete && img.naturalWidth) start();
      else {
        img.addEventListener('load', start, { once: true });
        img.addEventListener('error', start, { once: true });
      }
    });
  });

  // Burger menu toggle
  const burger = document.querySelector('.burger');
  if (burger) {
    const setOpen = (open) => {
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('menu-open'));
    });
    document.querySelectorAll('.nav a').forEach(a => {
      a.addEventListener('click', () => setOpen(false));
    });
  }

  // Links into the fixed-bottom reveal panel can't be anchor-scrolled to —
  // the targets are inside a position:fixed ancestor. Scroll to page bottom
  // instead so the reveal is fully uncovered.
  const scrollToReveal = (e) => {
    if (e) e.preventDefault();
    // Make sure body padding-bottom is up to date before measuring.
    syncReveal();
    const maxScroll = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ) - window.innerHeight;
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
  };
  document.querySelectorAll('a[href="#about"], a[href="#contact"], a[href="#clients"]').forEach(a => {
    a.addEventListener('click', scrollToReveal);
  });

  // Floating CTAs: contact + back-to-top appear together once the user scrolls.
  // Hide the contact button when the reveal starts uncovering; pin back-to-top to
  // the bottom edge of the dark area (rises as the reveal is uncovered).
  const btn = document.getElementById('back-to-top');
  const cta = document.querySelector('.contact-cta');
  const onScroll = () => {
    const scrolled = window.scrollY > 400;
    const revealH = reveal ? reveal.offsetHeight : 0;
    const distanceToBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    const revealVisible = Math.max(0, Math.min(revealH, revealH - distanceToBottom));

    if (cta) cta.classList.toggle('visible', scrolled && revealVisible === 0);
    if (btn) {
      btn.classList.toggle('visible', scrolled);
      const maxBottom = window.innerHeight - btn.offsetHeight - 16;
      btn.style.bottom = Math.min(24 + revealVisible, maxBottom) + 'px';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Track which section is currently in view and mark its nav link .active.
  const navByHash = {};
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) navByHash[href.slice(1)] = a;
  });
  const updateActiveNav = () => {
    const projects = document.querySelectorAll('.project');
    const stickyTop = window.innerWidth <= 800 ? 0 : 68;
    let activeId = null;
    let bestDelta = Infinity;
    projects.forEach(p => {
      const title = p.querySelector('.section-title');
      if (!title) return;
      const r = title.getBoundingClientRect();
      if (r.top > stickyTop + 40) return;
      if (r.bottom < stickyTop) return;
      const delta = Math.abs(r.top - stickyTop);
      if (delta < bestDelta) {
        bestDelta = delta;
        activeId = p.id;
      }
    });
    Object.entries(navByHash).forEach(([id, a]) => {
      a.classList.toggle('active', id === activeId);
    });
  };
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();
  if (btn) {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Cycle through logo SVGs as the mouse moves. Each LOGO_STEP_PX of accumulated
  // movement advances to the next logo in the sequence.
  const logoImg = document.querySelector('.site-logo img');
  if (logoImg) {
    const logoFiles = ['01.svg', '2.svg', '3.svg', '4.svg', '5.svg', '6.svg'];
    // Preload so swaps are instant
    logoFiles.forEach(f => { const i = new Image(); i.src = 'assets/logo/' + f; });

    const LOGO_STEP_PX = 120;
    let logoIdx = 0;
    let lastX, lastY;
    let accumulated = 0;
    window.addEventListener('mousemove', (e) => {
      if (lastX !== undefined) {
        accumulated += Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (accumulated >= LOGO_STEP_PX) {
          accumulated = 0;
          logoIdx = (logoIdx + 1) % logoFiles.length;
          logoImg.src = 'assets/logo/' + logoFiles[logoIdx];
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
    }, { passive: true });
  }

})();

