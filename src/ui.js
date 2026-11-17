import { ITEMS, RARITIES, CATEGORIES, HIGHLIGHT_TIER, PER_GROUP, getGroup, getItem, itemImage, rollItem } from './items.js';
import { state, PULL_COST, PULL_10_COST } from './state.js';
import * as exp from './expedition.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import * as arena from './arena.js';
import { audio } from './audio.js';

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
  let arenaTab = 'fight';
  let arenaSel = null; // angetippter Platz im Arena-Team: { i, key }
  const reveals = [];

  const refreshGold = () => {
    goldEl.textContent = fmt(state.gold);
    for (const el of overlay.querySelectorAll('.gold-now')) el.textContent = fmt(state.gold);
  };
  state.onChange(refreshGold);
  refreshGold();

  const busy = () => !!view || !!$('.reveal');

  function show(next) {
    if (next && !view) audio.play('open');
    if (!next && view) audio.play('close');
    view = next;
    overlay.hidden = !view;
    if (view === 'well') renderWell();
    if (view === 'gallery') renderGallery();
    if (view === 'expedition') renderExpedition();
    if (view === 'dungeon') renderDungeon();
    if (view === 'arena') renderArena();
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
      audio.play('error');
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
    audio.play('pull');
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
    if (next.fight) return showFight(next.fight);
    const { item, isNew, source } = next;
    audio.play('reveal', item.tier);
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

  // ------------------------------------------------------------ Bossarena

  const slotLabel = (key) => (key === 'hero' ? 'Held' : arena.SLOTS.find((s) => s.cat === key).name);
  const levelBadge = (id) => `<span class="count">${RARITIES[arena.levelOf(id)].id}</span>`;

  // Ein Platz im Team: belegt als Kachel, sonst als leeres Feld mit Beschriftung.
  function slotButton(i, key, id) {
    const on = arenaSel && arenaSel.i === i && arenaSel.key === key ? ' sel' : '';
    const item = id && getItem(id);
    if (!item) return `<button class="tile empty-slot${on}" data-act="slot" data-i="${i}" data-k="${key}">${slotLabel(key)}</button>`;
    return `<button class="tile r-${item.rank}${on}" data-act="slot" data-i="${i}" data-k="${key}" data-sprite="${id}" title="${item.name}">
      <span class="rank">${item.rank}</span>${key === 'hero' ? '' : levelBadge(id)}</button>`;
  }

  function renderArena() {
    if (!buildings.owned('arena')) return renderPurchase('arena', 'Bossarena');
    arena.clean();
    const tabs = `<nav class="tabs">
      <button class="tab${arenaTab === 'fight' ? ' on' : ''}" data-act="arena-tab" data-v="fight">Arena</button>
      <button class="tab${arenaTab === 'shop' ? ' on' : ''}" data-act="arena-tab" data-v="shop">Händler</button>
    </nav>`;
    const body = arenaTab === 'shop' ? shopHtml() : fightHtml();
    overlay.innerHTML = `<section class="panel arena">${head('Bossarena')}${tabs}${body}</section>`;
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite)));
    for (const el of overlay.querySelectorAll('[data-mat]')) {
      const [kind, tier] = el.dataset.mat.split(':');
      el.prepend(picture(arena.materialImage(kind, Number(tier))));
    }
    const boss = arena.bossInfo();
    if (boss) $('#boss-frame')?.append(picture(boss.image));
  }

  function fightHtml() {
    const team = arena.team();
    const members = team.map((m, i) => `
      <div class="member">
        <div class="hero-slot">${slotButton(i, 'hero', m.hero)}</div>
        <div class="gear-slots">${arena.SLOTS.map((s) => slotButton(i, s.cat, m.gear[s.cat])).join('')}</div>
        <span>Stärke <b class="gold-text">${fmt(arena.memberPower(m))}</b></span>
      </div>`).join('');

    return `
      ${upgradeBar('arena')}
      <h4>Team · Stärke ${fmt(arena.teamPower())}</h4>
      <div class="members">${members}</div>
      <div class="leader-actions">
        <button data-act="auto-equip">Automatisch ausrüsten</button>
        <span class="muted">Tippe einen Platz an, um ihn zu besetzen. Ausrüstung zählt nur an einem Helden.</span>
      </div>
      ${pickerHtml()}
      <h4>Boss</h4>
      ${bossHtml()}
      <p class="muted">Vorrat: ${matSummary() || 'noch kein Stoff und keine Seide'}</p>`;
  }

  function matSummary() {
    return Object.keys(arena.MATERIALS).flatMap((kind) =>
      RARITIES.map((r, t) => (arena.have(kind, t) ? `${arena.MATERIALS[kind].name} ${r.id} ×${arena.have(kind, t)}` : null)).filter(Boolean)
    ).join(' · ');
  }

  function pickerHtml() {
    if (!arenaSel) return '';
    const { i, key } = arenaSel;
    const m = arena.team()[i];
    const current = key === 'hero' ? m.hero : m.gear[key];
    const list = arena.candidates(key).slice(0, 44);
    let detail = '';
    if (current && key !== 'hero') {
      const item = getItem(current);
      const level = arena.levelOf(current);
      const cost = arena.levelCost(item);
      detail = `<div class="crow r-${RARITIES[level].id}">
        <div class="info"><b>${item.name}</b>
          <span>Rang ${item.rank} · Stufe <span class="evo">${RARITIES[level].id}</span> · Stärke <span class="gold-text">${arena.gearPower(item)}</span>
          ${cost === null ? '' : `→ ${arena.gearPower(item, level + 1)}`}</span></div>
        ${cost === null
          ? `<button disabled>${arena.capped(level) ? 'Arena-Rang nötig' : 'Maximal'}</button>`
          : `<button data-act="gear-up" data-id="${current}" ${arena.material() >= cost ? '' : 'disabled'}>→ ${RARITIES[level + 1].id} · ${fmt(cost)}</button>`}
      </div>
      <p class="muted">Verbessert wird mit Duplikaten von Waffen, Rüstung, Relikten und Artefakten (Verkaufswert). Verfügbar: <b class="gold-text">${fmt(arena.material())}</b>.</p>`;
    }
    const tiles = list.map((item) => {
      const at = arena.equippedAt(item.id);
      return `<button class="tile r-${item.rank}${item.id === current ? ' picked' : ''}" data-act="equip" data-id="${item.id}" data-sprite="${item.id}" title="${item.name}">
        <span class="rank">${item.rank}</span>${key === 'hero' ? '' : levelBadge(item.id)}${at >= 0 && item.id !== current ? `<span class="new">${at + 1}</span>` : ''}</button>`;
    }).join('');
    return `<div class="chest picker">
      <div class="line"><span>${slotLabel(key)} für Platz ${i + 1} wählen</span>
        <span><button data-act="equip" data-id="" ${current ? '' : 'disabled'}>Ablegen</button> <button data-act="slot-close">Fertig</button></span></div>
      ${detail}
      ${list.length ? `<div class="grid heroes">${tiles}</div>` : '<p class="muted">Davon besitzt du noch nichts – ziehe am Wunschbrunnen.</p>'}
    </div>`;
  }

  function bossHtml() {
    const boss = arena.bossInfo();
    if (boss) {
      const odds = arena.winChance();
      return `<div class="chest boss r-${boss.rank}">
        <div class="boss-row">
          <div class="frame" id="boss-frame"></div>
          <div class="info">
            <h3>${boss.name}</h3>
            <span><b class="evo">Rang ${boss.rank}</b> · Stärke ${fmt(boss.power)} · dein Team ${fmt(arena.teamPower())}</span>
            <span class="odds">Siegchance <b class="${odds >= 0.7 ? 'good' : odds >= 0.35 ? 'mid' : 'bad'}">${arena.teamPower() ? percent(odds) : '–'}</b></span>
            <span class="muted">Sieg: ${arena.WIN_CLOTH}× Stoff ${boss.rank}, mit ${percent(arena.SILK_CHANCE)} zusätzlich 1× Seide ${boss.rank}. Bei einer Niederlage zieht der Boss ab.</span>
          </div>
        </div>
        <div class="line"><button class="big" data-act="fight" ${arena.teamPower() ? '' : 'disabled'}>Kämpfen!</button></div>
      </div>`;
    }
    const direct = RARITIES.map((r, t) => `
      <button class="level r-${r.id}" data-act="boss" data-v="${t}" ${arena.canChallenge(t) && state.gold >= arena.BOSS_PRICE[t] ? '' : 'disabled'}>
        <b><i>${r.id}</i>Boss</b><span>Stärke ${fmt(arena.BOSS_POWER[t])}</span>
        <span class="gold-text">${fmt(arena.BOSS_PRICE[t])} Gold</span>
        ${arena.canChallenge(t) ? '' : `<span class="lock">Arena-Rang ${r.id} nötig</span>`}
      </button>`).join('');
    return `<div class="chest">
      <div class="line">
        <span><b>Zufallsboss</b> – der Rang wird wie am Brunnen gewürfelt<br><span class="muted">${RARITIES.map((r) => `${r.id} ${percent(r.chance)}`).join(' · ')}</span></span>
        <button class="big" data-act="boss-random" ${state.gold >= arena.RANDOM_PRICE ? '' : 'disabled'}>Würfeln<small>${arena.RANDOM_PRICE} Gold</small></button>
      </div>
    </div>
    <p class="muted">Oder der sichere Weg – einen Boss des gewünschten Rangs gegen Gold herausfordern:</p>
    <div class="levels">${direct}</div>`;
  }

  function shopHtml() {
    const rows = Object.entries(arena.MATERIALS).map(([kind, m]) => `
      <h4>${m.name} · ${m.cost} Stück je Tausch</h4>
      <div class="levels">${RARITIES.map((r, t) => {
        const n = arena.have(kind, t);
        const up = RARITIES[arena.upTier(t)].id;
        const odds = up === r.id ? `100 % Rang ${r.id}` : `${percent(1 - m.up)} Rang ${r.id} · ${percent(m.up)} Rang ${up}`;
        return `<button class="level mat r-${r.id}" data-act="trade" data-k="${kind}" data-v="${t}" data-mat="${kind}:${t}" ${n >= m.cost ? '' : 'disabled'}>
          <b><i>${r.id}</i>${m.name} ×${n}</b><span>${odds}</span></button>`;
      }).join('')}</div>`).join('');
    return `<p class="lead">Der Arena-Händler nimmt kein Gold, nur Stoff und Seide. Dafür gibt es ein zufälliges Sammelstück –
      im Rang des Materials oder mit Glück einen Rang höher.</p>${rows}`;
  }

  function fightBoss() {
    const result = arena.fight();
    if (!result) return audio.play('error');
    audio.play('fight');
    reveals.push({ fight: result });
    renderArena();
    nextReveal();
  }

  function showFight({ boss, win, odds, stoff, seide }) {
    setTimeout(() => audio.play(win ? 'win' : 'lose'), 420);
    const el = document.createElement('div');
    el.className = `reveal result r-${boss.rank}${win ? '' : ' fail'}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">BOSSKAMPF · RANG ${boss.rank}</div>
        <div class="rank-big">${win ? 'SIEG!' : 'NIEDERLAGE'}</div>
        <div class="frame${win ? ' beaten' : ''}"></div>
        <h3>${boss.name}</h3>
        ${win
          ? `<div class="grid" id="loot"></div><p>${stoff}× Stoff ${boss.rank}${seide ? ` und ${seide}× Seide ${boss.rank}` : ''} erbeutet</p>`
          : `<p>Der Boss war zu stark und ist weitergezogen.<br>Die Siegchance lag bei ${percent(odds)}.</p>`}
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(picture(boss.image));
    const loot = $('#loot', el);
    if (loot) {
      for (const [kind, n] of [['stoff', stoff], ['seide', seide]]) {
        if (!n) continue;
        const t = document.createElement('div');
        t.className = `tile r-${boss.rank}`;
        t.append(picture(arena.materialImage(kind, boss.tier)));
        t.insertAdjacentHTML('beforeend', `<span class="rank">${boss.rank}</span><span class="count">×${n}</span>`);
        loot.append(t);
      }
    }
    document.body.append(el);
    $('button[data-act]', el).focus();
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
    audio.play(success ? 'win' : 'lose');
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
      audio.play('error');
      return;
    }
    const finds = result.items.length;
    audio.play('gold');
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
    if (tileEl && !tileEl.closest('[data-act]')) audio.click();
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
      if (!buildings.advance(btn.dataset.id)) audio.play('error');
      else {
        audio.play('build');
        const b = buildings.BUILDINGS[btn.dataset.id];
        toast(`${b.name}: Rang ${buildings.rank(btn.dataset.id)}`);
        exp.rebuilt();
      }
      show(view);
    }
    if (act === 'arena-tab') { arenaTab = btn.dataset.v; renderArena(); }
    if (act === 'slot') {
      const sel = { i: Number(btn.dataset.i), key: btn.dataset.k };
      arenaSel = arenaSel && arenaSel.i === sel.i && arenaSel.key === sel.key ? null : sel;
      renderArena();
    }
    if (act === 'slot-close') { arenaSel = null; renderArena(); }
    if (act === 'equip' && arenaSel) { arena.equip(arenaSel.i, arenaSel.key, btn.dataset.id || null); renderArena(); }
    if (act === 'auto-equip') { arena.autoEquip(); arenaSel = null; renderArena(); }
    if (act === 'gear-up') { audio.play(arena.levelUp(getItem(btn.dataset.id)) ? 'levelUp' : 'error'); renderArena(); }
    if (act === 'boss-random') { audio.play(arena.challengeRandom() ? 'start' : 'error'); renderArena(); }
    if (act === 'boss') { audio.play(arena.challenge(Number(btn.dataset.v)) ? 'start' : 'error'); renderArena(); }
    if (act === 'fight') fightBoss();
    if (act === 'trade') {
      const got = arena.trade(btn.dataset.k, Number(btn.dataset.v));
      if (got) {
        reveals.push({ ...got, source: 'ARENA-HÄNDLER' });
        renderArena();
        nextReveal();
      }
    }
    if (act === 'collect') collectChest();
    if (act === 'level') { pick.level = Number(btn.dataset.v); renderDungeon(); }
    if (act === 'best') { pick.heroes = dungeon.heroes().slice(0, dungeon.MAX_HEROES).map((h) => h.id); renderDungeon(); }
    if (act === 'dungeon-start') { audio.play(dungeon.start(pick.level, pick.heroes) ? 'start' : 'error'); renderDungeon(); }
    if (act === 'dungeon-abort') { dungeon.abort(); renderDungeon(); }
    if (act === 'dungeon-collect') collectDungeon();
    if (act === 'leader') { exp.setLeader(btn.dataset.id); renderExpedition(); }
    if (act === 'leader-evolve') { audio.play(exp.evolveLeader() ? 'levelUp' : 'error'); renderExpedition(); }
    if (act === 'evolve') { audio.play(exp.evolve(getItem(btn.dataset.id)) ? 'levelUp' : 'error'); renderExpedition(); }
    if (act === 'cat') { filter.cat = btn.dataset.v; renderGallery(); }
    if (act === 'rank') { filter.rank = btn.dataset.v; renderGallery(); }
    if (act === 'sell') { if (state.sellDuplicates(btn.dataset.id)) audio.play('sell'); renderGallery(); }
    if (act === 'sell-all') { if (state.sellAllDuplicates()) audio.play('sell'); renderGallery(); }
    audio.click();
  });

  document.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="reveal-next"]')) {
      audio.click();
      nextReveal();
    }
  });

  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if ($('.reveal')) nextReveal();
    else if (view) show(null);
  });

  return {
    isOpen: busy,
    toast(text, sound = false) {
      toast(text);
      if (sound) audio.play('notify');
    },
    collectChest,
    updateChest,
    updateDungeon,
    openDungeon: () => show('dungeon'),
    openArena: () => show('arena'),
    openExpedition: () => show('expedition'),
    openWell: () => show('well'),
    openGallery: () => show('gallery'),
    close: () => show(null),
  };
}
