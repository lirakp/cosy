import { ITEMS, RARITIES, CATEGORIES, HIGHLIGHT_TIER, PER_GROUP, getGroup, getItem, itemImage, rollItem } from './items.js';
import { state, PULL_COST, PULL_10_COST } from './state.js';

// Menüs über dem Spiel: Wunschbrunnen (Ziehen), Galerie und das Pop-up für seltene Funde.

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => n.toLocaleString('de-DE');
const percent = (p) => `${(p * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;

function sprite(item) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  c.className = 'sprite';
  c.getContext('2d').drawImage(itemImage(item), 0, 0);
  return c;
}

function tile(item, { hidden = false, badge = '' } = {}) {
  const el = document.createElement('button');
  el.className = `tile r-${item.rank}${hidden ? ' unknown' : ''}`;
  el.dataset.id = item.id;
  el.title = hidden ? '???' : `${item.name} · Rang ${item.rank}`;
  el.append(sprite(item));
  el.insertAdjacentHTML('beforeend', `<span class="rank">${item.rank}</span>${badge}`);
  return el;
}

export function createUI({ onToggle }) {
  const overlay = $('#overlay');
  const goldEl = $('#gold span');
  let view = null; // 'well' | 'gallery'
  let filter = { cat: CATEGORIES[0].id, rank: 'D' };
  let selected = null;
  let lastPull = [];
  const reveals = [];

  const refreshGold = () => {
    goldEl.textContent = fmt(state.gold);
    for (const el of overlay.querySelectorAll('.gold-now')) el.textContent = fmt(state.gold);
  };
  state.onChange(refreshGold);
  refreshGold();

  function show(next) {
    view = next;
    overlay.hidden = !view;
    onToggle(!!view);
    if (view === 'well') renderWell();
    if (view === 'gallery') renderGallery();
    if (!view) overlay.replaceChildren();
  }

  const head = (title) => `
    <header>
      <h2>${title}</h2>
      <span class="gold-pill">◉ <span class="gold-now">${fmt(state.gold)}</span></span>
      <button class="close" data-act="close" aria-label="Schließen">✕</button>
    </header>`;

  // ------------------------------------------------------------ Wunschbrunnen

  function renderWell() {
    const rates = RARITIES.map(
      (r) => `<tr class="r-${r.id}"><td><b>${r.id}</b></td><td>${percent(r.chance)}</td><td>${fmt(r.sell)} Gold</td></tr>`
    ).join('');
    overlay.innerHTML = `
      <section class="panel well">
        ${head('Wunschbrunnen')}
        <p class="lead">Wirf Gold hinein – der Brunnen schenkt dir dafür ein Sammelstück.</p>
        <div class="actions">
          <button class="big" data-act="pull" data-n="1">1× wünschen<small>${PULL_COST} Gold</small></button>
          <button class="big" data-act="pull" data-n="10">10× wünschen<small>${PULL_10_COST} Gold</small></button>
        </div>
        <p class="note" id="well-note"></p>
        <div class="grid results" id="results"></div>
        <details>
          <summary>Chancen und Duplikat-Werte</summary>
          <table><tr><th>Rang</th><th>Chance</th><th>Duplikat</th></tr>${rates}</table>
        </details>
        <footer><button data-act="gallery">Zur Galerie</button></footer>
      </section>`;
    renderResults();
  }

  function renderResults() {
    const box = $('#results');
    if (!box) return;
    box.replaceChildren(
      ...lastPull.map(({ item, isNew }) => tile(item, { badge: isNew ? '<span class="new">NEU</span>' : '' }))
    );
  }

  function pull(n) {
    const cost = n === 10 ? PULL_10_COST : PULL_COST;
    const note = $('#well-note');
    if (state.gold < cost) {
      note.textContent = 'Nicht genug Gold. Sammle Münzen auf dem Weg oder verkaufe Duplikate in der Galerie.';
      return;
    }
    const items = Array.from({ length: n }, () => rollItem());
    const seen = new Set();
    lastPull = items.map((item) => {
      const isNew = !state.count(item.id) && !seen.has(item.id);
      seen.add(item.id);
      return { item, isNew };
    });
    state.pull(cost, items);
    note.textContent = '';
    renderResults();
    // seltene Funde der Reihe nach groß zeigen, das seltenste zuletzt
    reveals.push(...lastPull.filter((p) => p.item.tier >= HIGHLIGHT_TIER).sort((a, b) => a.item.tier - b.item.tier));
    nextReveal();
  }

  // ------------------------------------------------------------ Pop-up für A, S, SS

  function nextReveal() {
    $('.reveal')?.remove();
    const next = reveals.shift();
    if (!next) return;
    const { item, isNew } = next;
    const el = document.createElement('div');
    el.className = `reveal r-${item.rank}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="rank-big">RANG ${item.rank}</div>
        <div class="frame"></div>
        <h3>${item.name}</h3>
        <p>${item.catName} · ${isNew ? '<b class="new">NEU!</b>' : `Duplikat (+${fmt(item.sell)} Gold beim Verkauf)`}</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(sprite(item));
    overlay.append(el);
    $('button', el).focus();
  }

  // ------------------------------------------------------------ Galerie

  function renderGallery() {
    const cats = CATEGORIES.map((c) => {
      const mine = state.collected(ITEMS.filter((i) => i.cat === c.id));
      return `<button class="tab${c.id === filter.cat ? ' on' : ''}" data-act="cat" data-v="${c.id}">${c.name}<small>${mine}/${PER_GROUP * RARITIES.length}</small></button>`;
    }).join('');
    const ranks = RARITIES.map((r) => {
      const mine = state.collected(getGroup(filter.cat, r.id));
      return `<button class="tab r-${r.id}${r.id === filter.rank ? ' on' : ''}" data-act="rank" data-v="${r.id}"><b>${r.id}</b><small>${mine}/${PER_GROUP}</small></button>`;
    }).join('');
    const dupes = state.duplicateValue();

    overlay.innerHTML = `
      <section class="panel gallery">
        ${head('Galerie')}
        <p class="lead">${fmt(state.collected())} von ${fmt(ITEMS.length)} Sammelstücken entdeckt</p>
        <nav class="tabs">${cats}</nav>
        <nav class="tabs ranks">${ranks}</nav>
        <div class="grid" id="gallery-grid"></div>
        <div class="detail" id="detail"></div>
        <footer>
          <button data-act="sell-all" ${dupes ? '' : 'disabled'}>Alle Duplikate verkaufen${dupes ? ` (+${fmt(dupes)} Gold)` : ''}</button>
        </footer>
      </section>`;

    $('#gallery-grid').replaceChildren(
      ...getGroup(filter.cat, filter.rank).map((item) => {
        const n = state.count(item.id);
        const el = tile(item, { hidden: !n, badge: n > 1 ? `<span class="count">×${n}</span>` : '' });
        if (item.id === selected) el.classList.add('sel');
        return el;
      })
    );
    renderDetail();
  }

  function renderDetail() {
    const box = $('#detail');
    const item = selected && getItem(selected);
    if (!box) return;
    if (!item || item.cat !== filter.cat || item.rank !== filter.rank) {
      box.innerHTML = '<p class="muted">Tippe ein Stück an, um es genauer anzusehen.</p>';
      return;
    }
    const n = state.count(item.id);
    if (!n) {
      box.innerHTML = `<p class="muted">Noch nicht entdeckt – ein ${item.catName}-Stück vom Rang ${item.rank}.</p>`;
      return;
    }
    const extra = n - 1;
    box.className = `detail r-${item.rank}`;
    box.innerHTML = `
      <div class="frame"></div>
      <div class="info">
        <h3>${item.name}</h3>
        <p><b class="rank-text">Rang ${item.rank}</b> · ${item.catName} · im Besitz: ${n}</p>
        <button data-act="sell" data-id="${item.id}" ${extra ? '' : 'disabled'}>
          ${extra ? `${extra} Duplikat${extra > 1 ? 'e' : ''} verkaufen (+${fmt(extra * item.sell)} Gold)` : 'Keine Duplikate'}
        </button>
      </div>`;
    $('.frame', box).append(sprite(item));
  }

  // ------------------------------------------------------------ Klicks und Tasten

  overlay.addEventListener('click', (e) => {
    const tileEl = e.target.closest('.tile');
    if (tileEl && view === 'gallery') {
      selected = tileEl.dataset.id;
      renderGallery();
      return;
    }
    if (tileEl && view === 'well') {
      const item = getItem(tileEl.dataset.id);
      filter = { cat: item.cat, rank: item.rank };
      selected = item.id;
      show('gallery');
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) {
      if (e.target === overlay) show(null);
      return;
    }
    const act = btn.dataset.act;
    if (act === 'close') show(null);
    if (act === 'gallery') show('gallery');
    if (act === 'pull') pull(Number(btn.dataset.n));
    if (act === 'reveal-next') nextReveal();
    if (act === 'cat') { filter.cat = btn.dataset.v; renderGallery(); }
    if (act === 'rank') { filter.rank = btn.dataset.v; renderGallery(); }
    if (act === 'sell') { state.sellDuplicates(btn.dataset.id); renderGallery(); }
    if (act === 'sell-all') { state.sellAllDuplicates(); renderGallery(); }
  });

  addEventListener('keydown', (e) => {
    if (!view) return;
    if (e.code === 'Escape') {
      if ($('.reveal')) nextReveal();
      else show(null);
    }
  });

  return {
    isOpen: () => !!view,
    openWell: () => show('well'),
    openGallery: () => show('gallery'),
    close: () => show(null),
  };
}
