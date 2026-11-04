/* =====================================================================
   widgets.js — content interactions: thesis chart, tabs, roles, skills
   lens, statistics toys, contact bits. No dependencies.
   ===================================================================== */
(() => {
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------------- thesis chart (numbers from the analysis notebook) ---------------- */
  const VIEWS = {
    overt: {
      note: 'Mean acceptability on a 1–5 scale, n = 982. Paired t = 24.3, p < .001. Telling people they are being watched buys almost a full point.',
      max: 5, unit: '',
      bars: [{ l: 'Overt (informed)', v: 3.78, c: 'a' }, { l: 'Covert (uninformed)', v: 2.81, c: 'b' }]
    },
    medium: {
      note: 'Mean acceptability, 1–5. Physical edges digital (t = −7.9, p < .001). Yet digital is seen as more common (7.3 vs 6.5 out of 10) and often as more effective.',
      max: 5, unit: '',
      bars: [{ l: 'Physical surveillance', v: 3.38, c: 'a' }, { l: 'Digital surveillance', v: 3.21, c: 'b' }]
    },
    predict: {
      note: 'Spearman ρ with acceptance. People accept what they believe works and what they trust the operator of. How invasive it feels matters far less. Perceived crime: nothing.',
      max: 0.6, unit: 'ρ',
      bars: [
        { l: 'Perceived effectiveness', v: 0.47, c: 'a' },
        { l: 'Trust in government', v: 0.47, c: 'a' },
        { l: 'Trust in law enforcement', v: 0.46, c: 'a' },
        { l: 'Trust in companies', v: 0.37, c: 'a' },
        { l: 'Perceived invasiveness', v: 0.145, c: 'b' },
        { l: 'Perceived crime level', v: 0.0, c: 'b' },
      ]
    },
    me: {
      note: 'Mean acceptance (1–5) by whether people believe surveillance has increased and whether it affects them personally. Kruskal–Wallis H = 141, p < .001. "Common, but not for me" is the comfortable position.',
      max: 5, unit: '',
      bars: [
        { l: 'Increased · affects me', v: 2.92, c: 'b', n: 451 },
        { l: 'Increased · a little', v: 3.54, c: 'a', n: 322 },
        { l: 'Increased · not me', v: 3.82, c: 'a', n: 125 },
      ]
    }
  };
  const chart = $('#thesisChart');
  if (chart) {
    const svg = $('svg', chart), note = $('#chartNote');
    const W = 560, H = 220, L = 190, R = 30, T = 14;
    let current = null;
    const draw = (key) => {
      const v = VIEWS[key];
      note.textContent = v.note;
      const rowH = v.bars.length > 3 ? 34 : 44;
      svg.setAttribute('viewBox', `0 0 ${W} ${T * 2 + rowH * v.bars.length}`);
      const scale = (x) => L + (x / v.max) * (W - L - R);
      // reuse rows if same count for a smooth transition
      const sameShape = current && svg.querySelectorAll('.row').length === v.bars.length;
      if (!sameShape) {
        svg.innerHTML = '';
        v.bars.forEach((b, i) => {
          const y = T + i * rowH;
          const g = el('g', { class: 'row' }, svg);
          el('text', { x: L - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'bar-label' }, g, b.l);
          el('rect', { x: L, y: y + rowH * 0.2, width: 0, height: rowH * 0.6, rx: 3, class: `bar-fill ${b.c}` }, g);
          el('text', { x: L + 6, y: y + rowH / 2 + 4, class: 'bar-val' }, g, '');
        });
      }
      [...svg.querySelectorAll('.row')].forEach((g, i) => {
        const b = v.bars[i];
        const rect = g.querySelector('rect'), val = g.querySelector('.bar-val'), lab = g.querySelector('.bar-label');
        lab.textContent = b.l;
        rect.setAttribute('class', `bar-fill ${b.c}`);
        const w = Math.max(2, scale(b.v) - L);
        requestAnimationFrame(() => rect.setAttribute('width', w));
        val.textContent = (v.unit ? `${v.unit} = ` : '') + b.v.toFixed(2).replace(/0$/, '') + (b.n ? `  (n = ${b.n})` : '');
        val.setAttribute('x', L + w + 8);
      });
      current = key;
    };
    $$('.ctab', chart).forEach(btn => btn.addEventListener('click', () => {
      $$('.ctab', chart).forEach(b => b.classList.toggle('is-on', b === btn));
      draw(btn.dataset.view);
    }));
    draw('overt');
  }

  /* ---------------- generic tabs ---------------- */
  $$('.tabs').forEach(tabs => {
    $$('.tab', tabs).forEach(btn => btn.addEventListener('click', () => {
      $$('.tab', tabs).forEach(b => b.classList.toggle('is-on', b === btn));
      $$('.tab-pane', tabs).forEach(p => p.classList.toggle('is-on', p.dataset.pane === btn.dataset.tab));
    }));
  });

  /* ---------------- roles accordion ---------------- */
  $$('.role-head').forEach(btn => btn.addEventListener('click', () => {
    const li = btn.closest('.role');
    const open = li.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
    $('.role-toggle', btn).textContent = open ? '−' : '+';
  }));

  /* ---------------- skills lens ---------------- */
  const skills = $('#skills');
  if (skills) {
    const tip = $('#tip');
    const apply = (lens) => {
      $$('.skill', skills).forEach(s => {
        if (lens === 'all') { s.style.setProperty('--w', 1); s.classList.remove('dim'); return; }
        const m = s.dataset.w.match(new RegExp(`${lens}:(\\d)`));
        const w = m ? +m[1] : 0;
        s.style.setProperty('--w', (0.35 + w * 0.22).toFixed(2));
        s.classList.toggle('dim', w === 0);
        s.classList.toggle('hot', w === 3);
      });
    };
    $$('.ltab').forEach(btn => btn.addEventListener('click', () => {
      $$('.ltab').forEach(b => b.classList.toggle('is-on', b === btn));
      apply(btn.dataset.lens);
    }));
    $$('.skill', skills).forEach(s => {
      s.addEventListener('pointerenter', () => { tip.textContent = s.dataset.tip; tip.classList.add('show', 'wrap'); });
      s.addEventListener('pointermove', e => { tip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + 'px'; tip.style.top = e.clientY + 14 + 'px'; });
      s.addEventListener('pointerleave', () => tip.classList.remove('show', 'wrap'));
    });
    apply('all');
  }

  /* ---------------- stats: reveal buttons ---------------- */
  $$('[data-reveal]').forEach(btn => btn.addEventListener('click', () => {
    const t = $(`[data-reveal-target="${btn.dataset.reveal}"]`);
    t.classList.toggle('is-on'); btn.textContent = t.classList.contains('is-on') ? 'hide it again' : 'show the confounder';
  }));

  /* ---------------- stats: Simpson's paradox (Charig et al. 1986 kidney stones) ---------------- */
  const simpson = $('#simpson');
  if (simpson) {
    const data = {
      all: [{ l: 'Treatment A (open surgery)', v: 78, n: 350 }, { l: 'Treatment B (small incision)', v: 83, n: 350 }],
      split: [
        { l: 'Small stones · A', v: 93, n: 87 }, { l: 'Small stones · B', v: 87, n: 270 },
        { l: 'Large stones · A', v: 73, n: 263 }, { l: 'Large stones · B', v: 69, n: 80 },
      ]
    };
    const box = $('.simpson-bars', simpson), btn = $('#simpsonToggle');
    let split = false;
    const render = () => {
      const rows = split ? data.split : data.all;
      box.innerHTML = rows.map(r => `<div class="sbar"><span class="sbar-l">${r.l}</span><span class="sbar-track"><span class="sbar-fill ${r.l.includes('A') ? 'a' : 'b'}" style="width:${r.v}%"></span></span><span class="sbar-v">${r.v}% <small>n=${r.n}</small></span></div>`).join('');
      btn.textContent = split ? 'merge again' : 'split by stone size';
    };
    btn.addEventListener('click', () => { split = !split; render(); });
    render();
  }

  /* ---------------- stats: base rate ---------------- */
  const base = $('#baseRate');
  if (base) {
    const out = $('#baseOut'), post = $('#basePost');
    const upd = () => {
      const N = Math.round(Math.pow(10, +base.value));
      const p = 1 / N, sens = 0.99, spec = 0.99;
      const ppv = (sens * p) / (sens * p + (1 - spec) * (1 - p));
      out.textContent = N.toLocaleString('en-US');
      post.textContent = ppv >= 0.995 ? '>99%' : (ppv * 100).toFixed(ppv < 0.1 ? 1 : 0) + '%';
    };
    base.addEventListener('input', upd); upd();
  }

  /* ---------------- stats: Monty Hall ---------------- */
  const monty = $('#monty');
  if (monty) {
    const doors = $$('.door', monty), msg = $('#montyMsg'), stay = $('#montyStay'), sw = $('#montySwitch'), tallyEl = $('#montyTally');
    let car, pick, opened, tally = { stay: [0, 0], switch: [0, 0] };
    const reset = () => {
      car = Math.floor(Math.random() * 3); pick = null; opened = null;
      doors.forEach(d => { d.className = 'door'; d.disabled = false; d.textContent = +d.dataset.door + 1; });
      stay.disabled = sw.disabled = true; msg.textContent = 'pick a door';
    };
    const finish = (choice, final) => {
      const win = final === car;
      tally[choice][1]++; if (win) tally[choice][0]++;
      doors.forEach((d, i) => { d.disabled = true; d.textContent = i === car ? '🚗' : '🐐'; d.classList.toggle('win', i === car); });
      msg.textContent = win ? `${choice}: a car. ` : `${choice}: a goat. `;
      const f = (k) => `${k} ${tally[k][0]}/${tally[k][1]}`;
      tallyEl.textContent = `${f('stay')} · ${f('switch')}`;
      const total = tally.stay[1] + tally.switch[1];
      if (total >= 10 && window.__achieve) window.__achieve('monty', 'played ten rounds of monty hall');
      stay.disabled = sw.disabled = true;
      setTimeout(reset, 1400);
    };
    doors.forEach(d => d.addEventListener('click', () => {
      if (pick !== null) return;
      pick = +d.dataset.door; d.classList.add('picked');
      const options = [0, 1, 2].filter(i => i !== pick && i !== car);
      opened = options[Math.floor(Math.random() * options.length)];
      doors[opened].textContent = '🐐'; doors[opened].classList.add('open'); doors[opened].disabled = true;
      msg.textContent = `door ${opened + 1} is a goat. stay with ${pick + 1} or switch?`;
      stay.disabled = sw.disabled = false;
    }));
    stay.addEventListener('click', () => finish('stay', pick));
    sw.addEventListener('click', () => finish('switch', [0, 1, 2].find(i => i !== pick && i !== opened)));
    reset();
  }

  /* ---------------- elsewhere: open sudoku from the card ---------------- */
  $$('[data-open]').forEach(b => b.addEventListener('click', () => window.__openProp && window.__openProp(b.dataset.open)));

  /* ---------------- contact ---------------- */
  const mail = $('#mailLink');
  if (mail) {
    const parts = ['charlotte.t.maedler', 'gmail.com'];
    mail.addEventListener('click', (e) => {
      e.preventDefault();
      const addr = parts.join('@');
      mail.href = 'mailto:' + addr; $('#mailText').textContent = addr;
      navigator.clipboard?.writeText(addr).then(() => window.__toast && window.__toast('copied to clipboard'));
    });
  }
  const FACTS = [
    'Honey never spoils. Edible honey has been found in 3,000-year-old Egyptian tombs.',
    'A day on Venus is longer than its year.',
    'Octopuses have three hearts and blue blood.',
    'The shortest war in history lasted about 38 minutes (Anglo-Zanzibar, 1896).',
    'Oxford University is older than the Aztec Empire.',
    'A group of flamingos is called a flamboyance.',
    'Bananas are berries. Strawberries are not.',
  ];
  const foot = $('#footFact');
  if (foot) {
    let i = Math.floor(Math.random() * FACTS.length);
    const show = () => { foot.textContent = 'fun fact · ' + FACTS[i % FACTS.length] + '  ↻'; };
    foot.style.cursor = 'pointer'; foot.addEventListener('click', () => { i++; show(); }); show();
  }
  $('#replay')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
})();
