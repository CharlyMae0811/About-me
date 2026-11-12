/* =====================================================================
   main.js — HUD, chapters, props, inventory, modals, sudoku, easter eggs
   ===================================================================== */

/* ---------- sudoku puzzle (medium). '.' = empty ---------- */
window.SUDOKU = {
  puzzle:   '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
  solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
};

(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (msg, ms = 2400) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  };
  const achieved = new Set();
  const achieve = (id, label) => {
    if (achieved.has(id)) return;
    achieved.add(id);
    toast(`achievement · ${label}`);
  };

  /* ---------- HUD clock + level ---------- */
  const clockEl = $('#clock'), levelEl = $('#level');
  const chapters = $$('.chapter');
  const chapterAt = () => {
    const mid = scrollY + innerHeight / 2;
    let best = chapters[0];
    for (const c of chapters) if (c.offsetTop <= mid) best = c;
    return best;
  };
  Scene.onChange.push(() => {
    clockEl.textContent = Scene.timeString();
    const c = chapterAt();
    levelEl.textContent = `LEVEL ${String(c.dataset.chapter).padStart(2, '0')} · ${c.dataset.label}`;
  });
  clockEl.addEventListener('click', () => {
    const c = chapterAt();
    const next = chapters[Math.min(chapters.length - 1, chapters.indexOf(c) + 1)];
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- panel reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  $$('.panel').forEach(p => io.observe(p));

  /* ---------- props: tips, modals, inventory ---------- */
  const PROPS = {
    photo:   { label: 'photo frame · about', title: 'Graduation, 2025', body: '<p>M.Sc. Computer Science with honours, University of Bonn, GPA 1.3. Cybersecurity focus, thesis on how people judge physical vs digital surveillance.</p><img class="modal-photo" src="images/graduation.jpg" alt="Charlotte at her graduation" onerror="this.remove()">' },
    fencing: { label: 'fencing mask', modal: 'modal-fencing' },
    award:   { label: 'award', title: 'Awards & certifications', body: '<p><strong>FS-ISAC Scholarship</strong>, Women in Cybersecurity, 2023.</p><p><strong>Hans-Riegel-Fachpreis</strong>, 2nd place in Physics, University of Bonn, 2017.</p><p><strong>AWS Certified AI Practitioner</strong> and <strong>AWS Certified AI Business Strategist</strong>.</p>' },
    cooking: { label: 'the pan · cooking', title: 'Cooking', body: '<p>Cooking blog is work in progress. Current status: fermenting.</p>' },
    sudoku:  { label: 'newspaper · sudoku', modal: 'modal-sudoku' },
    laptop:  { label: 'laptop · data', title: 'The laptop', body: '<p>Thesis analysis lives here: preregistered survey, n = 982, 12 confirmatory + 16 exploratory hypotheses, pandas, scipy, a lot of Likert scales.</p><p><a href="https://github.com/CharlyMae0811/MasterThesis-StatisticalAnalysis" target="_blank" rel="noopener">Notebook on GitHub →</a></p><p class="small">The full interactive chart is in the 12:30 chapter.</p>' },
    poetry:  { label: 'notebook · poetry', title: 'Quiet Syntax', body: '<p>Poetry is where I put the thoughts that don\'t belong in spreadsheets. Tiny scenes, strange metaphors, half-finished thoughts that sound better in the dark.</p><p><a href="https://charlymae0811.github.io/PoetryBlog/" target="_blank" rel="noopener">Open the notebook →</a></p>' },
  };
  const inventory = new Set();
  const invSlots = $('#invSlots'), invCount = $('#invCount');
  const propKeys = Object.keys(PROPS);
  const renderInventory = () => {
    invSlots.innerHTML = propKeys.map(k => inventory.has(k) ? `<span title="${k}">${k[0].toUpperCase()}</span>` : '<span class="empty"></span>').join('');
    invCount.textContent = `${inventory.size}/${propKeys.length}`;
  };
  renderInventory();
  const collect = (key) => {
    if (inventory.has(key)) return;
    inventory.add(key);
    renderInventory();
    $(`.prop[data-prop="${key}"]`)?.classList.add('collected');
    if (inventory.size === propKeys.length) {
      setTimeout(() => openGeneric('ALL ITEMS COLLECTED', 'You looked at everything.', '<p class="placeholder">Hidden poem goes here. Something short about desks and cats and the hour when the city is quiet.</p>'), 600);
    }
  };

  const generic = $('#modal-generic');
  const openGeneric = (label, title, body) => {
    $('#genericLabel').textContent = label;
    $('#genericTitle').textContent = title;
    $('#genericBody').innerHTML = body;
    generic.showModal();
  };
  const openProp = (key) => {
    const p = PROPS[key];
    if (!p) return;
    collect(key);
    if (p.modal) $('#' + p.modal).showModal();
    else openGeneric(p.label, p.title, p.body);
  };
  window.__openProp = openProp; window.__toast = toast; window.__achieve = achieve;

  const tip = $('#tip');
  $$('.prop').forEach(node => {
    const key = node.dataset.prop;
    node.addEventListener('click', () => openProp(key));
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProp(key); } });
    node.addEventListener('pointerenter', () => { tip.textContent = PROPS[key].label; tip.classList.add('show'); });
    node.addEventListener('pointermove', e => { tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; });
    node.addEventListener('pointerleave', () => tip.classList.remove('show'));
  });
  $$('.modal .close').forEach(b => b.addEventListener('click', e => { e.preventDefault(); b.closest('dialog').close(); }));
  $$('.modal').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ---------- sudoku ---------- */
  const grid = $('#sudokuGrid'), msg = $('#sudokuMsg');
  const { puzzle, solution } = window.SUDOKU;
  const buildSudoku = () => {
    grid.innerHTML = '';
    for (let i = 0; i < 81; i++) {
      const inp = document.createElement('input');
      inp.maxLength = 1; inp.inputMode = 'numeric'; inp.dataset.i = i;
      if (puzzle[i] !== '.') { inp.value = puzzle[i]; inp.readOnly = true; inp.tabIndex = -1; }
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[^1-9]/g, '');
        inp.classList.remove('wrong');
        if (inp.value) { const n = grid.children[i + 1]; n?.focus(); }
        if ([...grid.children].every((c, j) => c.value === solution[j])) {
          msg.textContent = 'solved. go outside.';
          achieve('sudoku', 'finished the sudoku');
        }
      });
      inp.addEventListener('keydown', e => {
        const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key];
        if (move) { e.preventDefault(); grid.children[i + move]?.focus(); }
      });
      grid.appendChild(inp);
    }
    msg.textContent = '';
  };
  buildSudoku();
  $('#sudokuCheck').addEventListener('click', () => {
    let wrong = 0;
    [...grid.children].forEach((c, j) => { if (c.value && c.value !== solution[j]) { c.classList.add('wrong'); wrong++; } });
    msg.textContent = wrong ? `${wrong} wrong` : 'nothing wrong so far';
  });
  $('#sudokuReset').addEventListener('click', buildSudoku);

  /* ---------- cats ---------- */
  let catClicks = { caruso: 0, ddos: 0 };
  const CAT_LINES = {
    ddos:   ['Ddos is asleep. Ddos is always asleep.', 'Ddos opened one eye.', 'Ddos has decided you are not food.', 'Ddos is ignoring you now.', 'That\'s a denial of service.'],
    caruso: ['Caruso is watching the city.', 'Caruso allowed one pat.', 'Caruso has moved slightly away.', 'Caruso is thinking about pigeons.', 'Caruso is done.'],
  };
  ['caruso', 'ddos'].forEach(id => {
    $('#' + id).addEventListener('click', () => {
      const n = catClicks[id]++;
      toast(CAT_LINES[id][Math.min(n, CAT_LINES[id].length - 1)]);
      if (n === 0) achieve('cat-' + id, `woke ${id}`);
    });
  });

  /* ---------- name: click 5× → Charly ---------- */
  const nameEl = $('#name');
  let nameClicks = 0;
  nameEl.addEventListener('click', () => {
    if (++nameClicks === 5) { nameEl.innerHTML = 'Charly'; achieve('charly', 'found the nickname'); }
  });

  /* ---------- typed words: "poetry" ---------- */
  const POEM_LINES = [
    'The station wakes in watercolour light,',
    'There are touches that never land on skin yet still make the body shiver',
    'a doorway I only noticed after walking through it',
    'how do you name a person, really, when so much of them lives unseen?',
    'Oh I love the rain, how it tickles the skin',
  ];
  let typed = '';
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    typed = (typed + e.key).slice(-6);
    if (typed === 'poetry') { toast(POEM_LINES[Math.floor(Math.random() * POEM_LINES.length)], 4000); achieve('poetry', 'summoned a line'); }
    kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) { kIdx = 0; enGarde(); }
  });
  let touche = 0;
  function enGarde() {
    document.body.classList.toggle('en-garde');
    if (document.body.classList.contains('en-garde')) {
      achieve('engarde', 'en garde');
      toast('en garde. click anything.');
      addEventListener('click', toucheHandler);
    } else { removeEventListener('click', toucheHandler); toast('salute.'); }
  }
  function toucheHandler() { toast(`touché · ${++touche}`); }

  /* ---------- 8:15am ---------- */
  $$('.clock-egg').forEach(n => {
    n.addEventListener('pointerenter', () => { tip.textContent = '🕣 the tutorial started. nobody was awake.'; tip.classList.add('show'); });
    n.addEventListener('pointermove', e => { tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; });
    n.addEventListener('pointerleave', () => tip.classList.remove('show'));
  });

  /* ---------- ?s=N isolates chapter N (visual testing) ---------- */
  const jump = parseInt(new URLSearchParams(location.search).get('s'));
  if (!Number.isNaN(jump)) {
    document.documentElement.classList.add('no-anim');
    chapters.forEach((c, i) => { if (i !== jump) c.style.display = 'none'; });
    $$('.panel').forEach(p => p.classList.add('in'));
    const times = [0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.78, 0.86, 1];
    Scene.force && Scene.force(times[jump] ?? 0);
  }

  /* ---------- console ---------- */
  console.log(`%c
   /\\_/\\      one day — charlotte mädler
  ( o.o )     plain html/css/js, no build step.
   > ^ <      try ↑↑↓↓←→←→BA. or type "poetry".
`, 'font-family: monospace; color: #e0472b');
})();
