import { ITEMS, RARITIES, CATEGORIES, HIGHLIGHT_TIER, PER_GROUP, getGroup, getItem, itemImage, rollItem } from './items.js';
import { state, PULL_COST, PULL_10_COST } from './state.js';
import * as exp from './expedition.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';

// Menüs über dem Spiel: Wunschbrunnen (Ziehen), Galerie und das Pop-up für seltene Funde.

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => n.toLocaleString('de-DE');
const fmt1 = (n) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const duration = (sec) => (sec < 60 ? `${sec} s` : `${sec / 60} min`);
const percent = (p) => `${(p * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;

function picture(image) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  c.className = 'sprite';
  c.getContext('2d').drawImage(image, 0, 0);
  return c;
}
const sprite = (item) => picture(itemImage(item));

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
  const toastEl = $('#toast');
  let view = null; // 'well' | 'gallery' | 'expedition'
  let toastTimer = 0;
  let filter = { cat: CATEGORIES[0].id, rank: 'D' };
  let selected = null;
  let lastPull = [];
  const pick = { level: 0, heroes: [] }; // Auswahl im Dungeon-Menü
  const reveals = [];

  const refreshGold = () => {
    goldEl.textContent = fmt(state.gold);
    for (const el of overlay.querySelectorAll('.gold-now')) el.textContent = fmt(state.gold);
  };
  state.onChange(refreshGold);
  refreshGold();

  const busy = () => !!view || !!$('.reveal');

  function show(next) {
    view = next;
    overlay.hidden = !view;
    if (view === 'well') renderWell();
    if (view === 'gallery') renderGallery();
    if (view === 'expedition') renderExpedition();
    if (view === 'dungeon') renderDungeon();
    if (!view) overlay.replaceChildren();
    onToggle(busy());
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
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
    if (!next) return onToggle(busy());
    if (next.result) return showResult(next.result);
    const { item, isNew, source } = next;
    const el = document.createElement('div');
    el.className = `reveal r-${item.rank}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        ${source ? `<div class="source">${source}</div>` : ''}
        <div class="rank-big">RANG ${item.rank}</div>
        <div class="frame"></div>
        <h3>${item.name}</h3>
        <p>${item.catName} · ${isNew ? '<b class="new">NEU!</b>' : `Duplikat (+${fmt(item.sell)} Gold beim Verkauf)`}</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(sprite(item));
    document.body.append(el);
    $('button', el).focus();
    onToggle(true);
  }

  // ------------------------------------------------------------ Anlagen bauen und ausbauen

  // Kaufbildschirm für eine Anlage, die noch nicht steht.
  function renderPurchase(id, title) {
    const b = buildings.BUILDINGS[id];
    overlay.innerHTML = `
      <section class="panel">
        ${head(title)}
        <p class="lead">${b.pitch}</p>
        <div class="chest">
          <p><b>${b.name}</b> – noch nicht gebaut. Nach dem Bau hat die Anlage Rang <b class="r-D evo">D</b>;
          jeder Ausbau schaltet den nächsten Rang frei.</p>
          <p class="muted">${b.unlocks}</p>
          <div class="line"><button class="big" data-act="build" data-id="${id}" ${state.gold >= b.buy ? '' : 'disabled'}>Bauen<small>${fmt(b.buy)} Gold</small></button></div>
        </div>
      </section>`;
  }

  // Zeile mit aktuellem Rang und Ausbau-Knopf.
  function upgradeBar(id) {
    const b = buildings.BUILDINGS[id];
    const t = buildings.tier(id);
    const cost = buildings.nextCost(id);
    return `<div class="chest upgrade r-${RARITIES[t].id}">
      <div class="line">
        <span>${b.name} · Rang <b class="evo">${RARITIES[t].id}</b></span>
        ${cost === null
          ? '<span class="muted">voll ausgebaut</span>'
          : `<button data-act="build" data-id="${id}" ${state.gold >= cost ? '' : 'disabled'}>Auf Rang ${RARITIES[t + 1].id} ausbauen · ${fmt(cost)} Gold</button>`}
      </div>
      <p class="muted">${b.unlocks}</p>
    </div>`;
  }

  // ------------------------------------------------------------ Dungeon

  function renderDungeon() {
    if (!buildings.owned('dungeon')) return renderPurchase('dungeon', 'Dungeon');
    const status = dungeon.status();
    const run = dungeon.run();

    if (run) {
      const level = dungeon.LEVELS[run.level];
      overlay.innerHTML = `
        <section class="panel dungeon r-${level.rank}">
          ${head('Dungeon')}
          <p class="lead"><b class="evo">${level.rank}</b> · ${level.name} · Erfolgschance ${percent(dungeon.chance(run.level, run.heroes))}</p>
          <div class="party${status === 'running' ? ' away' : ''}" id="party"></div>
          <div class="chest">
            <div class="line"><span id="run-text"></span></div>
            <div class="bar"><i id="run-bar"></i></div>
            <div class="line">
              <button class="big" data-act="dungeon-collect" id="run-collect">Ergebnis abholen</button>
              <button data-act="dungeon-abort" id="run-abort">Abbrechen (ohne Beute)</button>
            </div>
          </div>
        </section>`;
      $('#party').replaceChildren(...run.heroes.map((id) => tile(getItem(id))));
      updateDungeon();
      return;
    }

    const owned = dungeon.heroes();
    pick.heroes = pick.heroes.filter((id) => state.count(id));
    if (!dungeon.unlocked(pick.level)) pick.level = buildings.tier('dungeon');
    const odds = dungeon.chance(pick.level, pick.heroes);
    const level = dungeon.LEVELS[pick.level];
    const levels = dungeon.LEVELS.map((l, i) => `
      <button class="level r-${l.rank}${i === pick.level ? ' on' : ''}" data-act="level" data-v="${i}" ${dungeon.unlocked(i) ? '' : 'disabled'}>
        <b><i>${l.rank}</i>${l.name}</b>
        <span>${duration(l.seconds)} · Stärke ${l.need}</span>
        <span class="gold-text">~${fmt(l.gold)} Gold</span>
        <span>${l.standard ? `${l.standard}× D + ` : ''}${l.bonus}× ${l.minTier ? `ab ${dungeon.rankOf(l.minTier)}` : 'Zufall'}</span>
        ${dungeon.unlocked(i) ? '' : `<span class="lock">Tor-Rang ${l.rank} nötig</span>`}
      </button>`).join('');

    overlay.innerHTML = `
      <section class="panel dungeon">
        ${head('Dungeon')}
        <p class="lead">Schicke bis zu ${dungeon.MAX_HEROES} Helden los. Je länger der Dungeon, desto gefährlicher – und desto mehr Beute.</p>
        ${upgradeBar('dungeon')}
        <h4>Gefahrenstufe</h4>
        <div class="levels">${levels}</div>
        <h4>Helden (${pick.heroes.length}/${dungeon.MAX_HEROES})</h4>
        ${owned.length
          ? '<div class="grid heroes" id="hero-grid"></div>'
          : '<p class="muted">Noch keine Helden – ziehe welche am Wunschbrunnen.</p>'}
        <div class="chest">
          <div class="line odds">
            <span>Team-Stärke <b>${dungeon.power(pick.heroes)}</b> / ${level.need}</span>
            <span>Erfolgschance <b class="${odds >= 0.7 ? 'good' : odds >= 0.35 ? 'mid' : 'bad'}">${pick.heroes.length ? percent(odds) : '–'}</b></span>
          </div>
          <p class="muted">Stärke je Held: ${RARITIES.map((r, i) => `${r.id} ${dungeon.HERO_POWER[i]}`).join(' · ')}. Scheitert die Erkundung, gibt es keine Beute.</p>
          <div class="line">
            <button data-act="best" ${owned.length ? '' : 'disabled'}>Stärkste wählen</button>
            <button class="big" data-act="dungeon-start" ${pick.heroes.length ? '' : 'disabled'}>Losschicken · ${duration(level.seconds)}</button>
          </div>
        </div>
      </section>`;
    $('#hero-grid')?.replaceChildren(
      ...owned.map((h) => {
        const el = tile(h);
        if (pick.heroes.includes(h.id)) el.classList.add('picked');
        return el;
      })
    );
  }

  // läuft jede Sekunde mit, solange eine Erkundung angezeigt wird
  function updateDungeon() {
    const text = $('#run-text');
    const run = dungeon.run();
    if (!text || !run) return;
    const done = dungeon.status() === 'done';
    const total = run.end - run.start;
    text.textContent = done ? 'Deine Helden sind zurück!' : `Unterwegs … noch ${clock(dungeon.remaining())}`;
    $('#run-bar').style.width = `${Math.min(100, ((Date.now() - run.start) / total) * 100)}%`;
    $('#run-collect').disabled = !done;
    $('#run-abort').hidden = done;
    $('#party').classList.toggle('away', !done);
  }

  function collectDungeon() {
    const result = dungeon.collect();
    if (!result) return;
    reveals.push({ result });
    // besonders seltene Beute bekommt danach noch ihren großen Auftritt
    reveals.push(...result.items.filter((i) => i.item.tier >= HIGHLIGHT_TIER).map((i) => ({ ...i, source: 'DUNGEONFUND' })));
    if (view === 'dungeon') renderDungeon();
    nextReveal();
  }

  // Ergebnis-Pop-up: Erfolg oder Niederlage, Gold und alle gefundenen Stücke
  function showResult({ level, success, gold, items, odds }) {
    const el = document.createElement('div');
    el.className = `reveal result r-${level.rank}${success ? '' : ' fail'}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">DUNGEON ${level.rank} · ${level.name.toUpperCase()}</div>
        <div class="rank-big">${success ? 'GESCHAFFT!' : 'GESCHEITERT'}</div>
        ${success
          ? `<div class="gold-won">+${fmt(gold)} Gold</div><div class="grid" id="loot"></div>
             <p>${items.length} Sammelstück${items.length > 1 ? 'e' : ''} gefunden</p>`
          : `<p>Deine Helden mussten umkehren – diesmal ohne Beute.<br>Die Erfolgschance lag bei ${percent(odds)}.</p>`}
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('#loot', el)?.replaceChildren(
      ...items.map(({ item, isNew }) => tile(item, { badge: isNew ? '<span class="new">NEU</span>' : '' }))
    );
    document.body.append(el);
    $('button[data-act]', el).focus();
    onToggle(true);
  }

  // ------------------------------------------------------------ Expedition

  // Leert die Truhe; jedes gefundene Sammelstück bekommt sein eigenes Pop-up.
  function collectChest() {
    const result = exp.collect();
    if (!result) {
      toast(exp.live.team.length ? 'Die Truhe ist noch leer.' : 'Noch kein Team – ziehe Lebewesen am Brunnen.');
      return;
    }
    const finds = result.items.length;
    toast(`+${fmt(result.gold)} Gold aus der Truhe${finds ? ` · ${finds} Fund${finds > 1 ? 'e' : ''}!` : ''}`);
    reveals.push(...result.items.map((i) => ({ ...i, source: 'EXPEDITIONSFUND' })));
    if (view === 'expedition') renderExpedition();
    if (view === 'dungeon') renderDungeon();
    nextReveal();
  }

  function renderExpedition() {
    if (!buildings.owned('camp')) return renderPurchase('camp', 'Expedition');
    exp.tick();
    const roster = exp.roster();
    const team = roster.slice(0, exp.TEAM_SIZE);
    const active = exp.leader();
    const material = exp.material();

    const slots = Array.from({ length: exp.TEAM_SIZE }, (_, i) => {
      const item = team[i];
      if (!item) return '<div class="slot empty">frei</div>';
      const evo = RARITIES[exp.evoOf(item.id)].id;
      return `<div class="slot r-${evo}" data-sprite="${item.id}">
        <b>${item.name}</b>
        <span>Stufe <span class="evo">${evo}</span></span>
        <span class="gold-text">+${fmt1(exp.rateOf(item))} / min</span>
      </div>`;
    }).join('');

    const leaders = exp.LEADERS.map((l) => {
      const tier = exp.leaderTier(l.id);
      return `<button class="leader r-${RARITIES[tier].id}${l.id === active.id ? ' on' : ''}" data-act="leader" data-id="${l.id}" data-leader="${l.id}">
        <b>${l.name}</b>
        <span>${l.role} · Stufe <span class="evo">${RARITIES[tier].id}</span></span>
        <span>Gold +${fmt1(exp.goldBonus(l) * 100)} % · Funde +${fmt1(exp.lootBonus(l) * 100)} %</span>
      </button>`;
    }).join('');
    const lCost = exp.leaderCost();
    const lTier = exp.leaderTier();
    const lNext = lCost === null ? '' : `Gold +${fmt1(exp.goldBonus(active, lTier + 1) * 100)} % · Funde +${fmt1(exp.lootBonus(active, lTier + 1) * 100)} %`;

    const SHOWN = 16;
    const rows = roster.slice(0, SHOWN).map((item, i) => {
      const tier = exp.evoOf(item.id);
      const cost = exp.evolveCost(item);
      const button = cost === null
        ? `<button disabled>${exp.capped(tier) ? 'Lager-Rang nötig' : 'Maximal'}</button>`
        : `<button data-act="evolve" data-id="${item.id}" ${material >= cost ? '' : 'disabled'}>→ ${RARITIES[tier + 1].id} · ${fmt(cost)}</button>`;
      return `<div class="crow r-${RARITIES[tier].id}" data-sprite="${item.id}">
        <div class="info">
          <b>${item.name}</b>
          <span>Rang ${item.rank} · Stufe <span class="evo">${RARITIES[tier].id}</span> · <span class="gold-text">${fmt1(exp.rateOf(item))} / min</span>
          ${cost === null ? '' : `→ ${fmt1(exp.rateOf(item, tier + 1))}`} ${i < exp.TEAM_SIZE ? '<span class="tag">Team</span>' : ''}</span>
        </div>${button}</div>`;
    }).join('');

    overlay.innerHTML = `
      <section class="panel expedition">
        ${head('Expedition')}
        <p class="lead">Deine vier stärksten Lebewesen ziehen los und füllen die Truhe im Lager.</p>
        ${upgradeBar('camp')}
        <div class="team">${slots}</div>
        <div class="chest">
          <div class="line"><span>Truhe: <b class="gold-text" id="chest-gold"></b></span><span id="chest-loot"></span></div>
          <div class="bar"><i id="chest-bar"></i></div>
          <div class="line">
            <span>Ertrag <b class="gold-text">+${fmt1(exp.goldPerMinute())} Gold / min</b> · Fundchance ${percent(exp.lootChance())} / min</span>
            <button data-act="collect" id="chest-btn">Truhe leeren</button>
          </div>
        </div>
        <h4>Expeditionsleitung</h4>
        <div class="leaders">${leaders}</div>
        <div class="leader-actions">
          ${lCost === null
            ? `<span class="muted">${exp.capped(lTier) ? 'Für die nächste Stufe muss das Lager ausgebaut werden.' : 'Höchste Stufe erreicht.'}</span>`
            : `<button data-act="leader-evolve" ${state.gold >= lCost ? '' : 'disabled'}>${active.name.split(' ')[1]} auf ${RARITIES[lTier + 1].id} entwickeln · ${fmt(lCost)} Gold</button><span class="muted">dann ${lNext}</span>`}
        </div>
        <h4>Lebewesen entwickeln</h4>
        <p class="muted">Bezahlt wird mit Lebewesen-Duplikaten, gerechnet in ihrem Verkaufswert. Verfügbar:
          <b class="gold-text">${fmt(material)}</b>. Die günstigsten Duplikate werden zuerst verbraucht, ein Überschuss wird in Gold ausgezahlt.</p>
        <div class="rows">${rows || '<p class="muted">Noch keine Lebewesen – ziehe welche am Wunschbrunnen.</p>'}</div>
        ${roster.length > SHOWN ? `<p class="muted">… und ${roster.length - SHOWN} weitere, schwächere Lebewesen.</p>` : ''}
      </section>`;

    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite)));
    for (const el of overlay.querySelectorAll('[data-leader]')) el.prepend(picture(exp.leaderImage(exp.LEADERS.find((l) => l.id === el.dataset.leader))));
    updateChest();
  }

  // läuft jede Sekunde mit, solange das Menü offen ist
  function updateChest() {
    const gold = $('#chest-gold');
    if (!gold) return;
    const { gold: g, cap, loot } = exp.live;
    gold.textContent = `${fmt(g)} / ${fmt(cap)} Gold${cap && g >= cap ? ' (voll)' : ''}`;
    $('#chest-loot').textContent = loot ? `✦ ${loot} Fund${loot > 1 ? 'e' : ''} wartet${loot > 1 ? 'n' : ''}` : '';
    $('#chest-bar').style.width = `${cap ? Math.min(100, (g / cap) * 100) : 0}%`;
    $('#chest-btn').disabled = !g && !loot;
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
    if (tileEl && view === 'dungeon') {
      if (dungeon.run()) return;
      const id = tileEl.dataset.id;
      if (pick.heroes.includes(id)) pick.heroes = pick.heroes.filter((h) => h !== id);
      else if (pick.heroes.length < dungeon.MAX_HEROES) pick.heroes.push(id);
      renderDungeon();
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
    if (act === 'build') {
      if (buildings.advance(btn.dataset.id)) {
        const b = buildings.BUILDINGS[btn.dataset.id];
        toast(`${b.name}: Rang ${buildings.rank(btn.dataset.id)}`);
        exp.rebuilt();
      }
      show(view);
    }
    if (act === 'collect') collectChest();
    if (act === 'level') { pick.level = Number(btn.dataset.v); renderDungeon(); }
    if (act === 'best') { pick.heroes = dungeon.heroes().slice(0, dungeon.MAX_HEROES).map((h) => h.id); renderDungeon(); }
    if (act === 'dungeon-start') { dungeon.start(pick.level, pick.heroes); renderDungeon(); }
    if (act === 'dungeon-abort') { dungeon.abort(); renderDungeon(); }
    if (act === 'dungeon-collect') collectDungeon();
    if (act === 'leader') { exp.setLeader(btn.dataset.id); renderExpedition(); }
    if (act === 'leader-evolve') { exp.evolveLeader(); renderExpedition(); }
    if (act === 'evolve') { exp.evolve(getItem(btn.dataset.id)); renderExpedition(); }
    if (act === 'cat') { filter.cat = btn.dataset.v; renderGallery(); }
    if (act === 'rank') { filter.rank = btn.dataset.v; renderGallery(); }
    if (act === 'sell') { state.sellDuplicates(btn.dataset.id); renderGallery(); }
    if (act === 'sell-all') { state.sellAllDuplicates(); renderGallery(); }
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="reveal-next"]')) nextReveal();
  });

  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if ($('.reveal')) nextReveal();
    else if (view) show(null);
  });

  return {
    isOpen: busy,
    toast,
    collectChest,
    updateChest,
    updateDungeon,
    openDungeon: () => show('dungeon'),
    openExpedition: () => show('expedition'),
    openWell: () => show('well'),
    openGallery: () => show('gallery'),
    close: () => show(null),
  };
}
