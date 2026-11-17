import { ITEMS, RARITIES, CATEGORIES, HIGHLIGHT_TIER, PER_GROUP, getGroup, getItem, itemImage, rollItem, worldItems, worldPool } from './items.js';
import * as realm from './realm.js';
import * as dimension from './dimension.js';
import { state, DUPE_EXTRA } from './state.js';
import * as exp from './expedition.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import * as arena from './arena.js';
import { audio } from './audio.js';
import * as buffs from './buffs.js';
import * as mine from './mine.js';
import * as trader from './trader.js';
import * as forgeMod from './forge.js';
import * as sets from './sets.js';
import * as garden from './garden.js';
import * as village from './village.js';
import * as gardener from './gardener.js';
import * as fishtrap from './fishtrap.js';
import * as magic from './magic.js';
import * as companions from './companions.js';
import * as well from './well.js';
import * as tailor from './tailor.js';
import * as care from './companioncare.js';
import { tierChances } from './items.js';
import { OUTFITS, makePlayerSprites } from './sprites.js';

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

export function createUI({ onToggle, onOutfit, onTravel, where, onCast, onPortal }) {
  const overlay = $('#overlay');
  const goldEl = $('#gold span');
  const toastEl = $('#toast');
  let view = null; // 'well' | 'gallery' | 'expedition'
  let toastTimer = 0;
  let filter = { cat: CATEGORIES[0].id, rank: 'D', world: 'normal' };
  let selected = null;
  let lastPull = [];
  const pick = { level: 0 }; // gewählte Gefahrenstufe im Dungeon-Menü
  let arenaTab = 'fight';
  const partySel = { arena: null, dungeon: null }; // angetippter Platz je Team: { i, key }
  const rerenderParty = (pk) => (pk === 'arena' ? renderArena() : renderDungeon());
  let mineSel = null; // angetippter Arbeitsplatz in der Mine: { l, s }
  const forgeSel = { cat: CATEGORIES[0].id, rank: 'D', item: null };
  let talkTo = null; // Dorfbewohner im Gespräch
  let marketTab = 'saat';
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
    if (view === 'wardrobe') renderWardrobe();
    if (view === 'mine') renderMine();
    if (view === 'forge') renderForge();
    if (view === 'stats') renderStats();
    if (view === 'garden') renderGarden();
    if (view === 'kitchen') renderKitchen();
    if (view === 'villager') renderVillager();
    if (view === 'market') renderMarket();
    if (view === 'fishbook') renderFishBook();
    if (view === 'trap') renderTrap();
    if (view === 'tower') renderTower();
    if (view === 'companions') renderCompanions();
    if (view === 'tailor') renderTailor();
    if (view === 'portal') renderPortal();
    if (view === 'trader') renderTrader();
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

  let spiritLine = null; // letzter Spruch des Brunnengeists
  let dupeMode = false; // Duplikat-Wunsch eingeschaltet
  function renderWell() {
    const chances = tierChances(buffs.lucky());
    const rates = RARITIES.map(
      (r, t) => `<tr class="r-${r.id}"><td><b>${r.id}</b></td><td>${percent(chances[t])}</td><td>${fmt(r.sell)} Gold</td></tr>`
    ).join('');
    const t = well.tier();
    const free = well.freeSingle();
    const pityA = 1 - well.untilA() / well.PITY_A;
    const pityS = 1 - well.untilS() / well.PITY_S;
    overlay.innerHTML = `
      <section class="panel well">
        ${head('Wunschbrunnen')}
        ${upgradeBar('well')}
        <div class="spirit${well.spiritGift() ? ' gift' : ''}"><span class="spirit-img"></span><p>${spiritLine || well.say()}</p></div>
        ${buffs.lucky() ? '<p class="buff-note">✦ Glücksrausch aktiv: seltene Ränge um 10 % wahrscheinlicher.</p>' : ''}
        ${well.spiritGift() ? '<button class="big spirit-wish" data-act="pull" data-n="spirit">✦ Geschenk des Brunnengeists<small>Gratiswunsch · garantiert Rang A, S oder SS</small></button>' : ''}
        <div class="actions">
          <button class="big${free && !dupeMode ? ' free' : ''}${dupeMode ? ' dupe' : ''}" data-act="pull" data-n="1">1× ${dupeMode ? 'Duplikat' : 'wünschen'}<small>${free && !dupeMode ? (free === 'next' ? 'Gratis! (Glückswurf)' : 'Gratis! (Wunsch des Tages)') : `${fmt(well.cost(1, dupeMode))} Gold`}</small></button>
          <button class="big${dupeMode ? ' dupe' : ''}" data-act="pull" data-n="10">10× ${dupeMode ? 'Duplikate' : 'wünschen'}<small>${fmt(well.cost(10, dupeMode))} Gold</small></button>
        </div>
        <label class="dupe-toggle"><input type="checkbox" data-act="dupe-mode" ${dupeMode ? 'checked' : ''} ${well.canDupe() ? '' : 'disabled'}>
          <span><b>Nur Duplikate</b> (+${DUPE_EXTRA} Gold pro Zug) – es kommen nur Stücke, die du schon hast. Ideal als Material zum Leveln von Helden, Ausrüstung, Lebewesen und Minenarbeitern. Zählt nicht für den Glückszähler.</span></label>
        <p class="muted">Gratiswünsche heute: ${well.dailyLeft()} / ${well.DAILY_FREE[t]}${well.freeNext() ? ' · der nächste Einzelwunsch ist gratis ✦' : ''} · Chance auf einen Gratis-Folgewunsch: ${percent(well.FREE_NEXT[t])}${well.DISCOUNT[t] ? ` · ${Math.round(well.DISCOUNT[t] * 100)} % Rabatt` : ''}</p>
        <div class="pity">
          <div class="line"><span>Glückszähler <b class="rank-a">A</b></span><span class="muted">spätestens in ${well.untilA()} Stücken</span></div>
          <div class="bar pity-a"><i style="width:${Math.round(pityA * 100)}%"></i></div>
          <div class="line"><span>Glückszähler <b class="rank-s">S</b></span><span class="muted">spätestens in ${well.untilS()} Stücken</span></div>
          <div class="bar pity-s"><i style="width:${Math.round(pityS * 100)}%"></i></div>
        </div>
        <p class="note" id="well-note"></p>
        <div class="grid results" id="results"></div>
        <details>
          <summary>Chancen und Duplikat-Werte</summary>
          <table><tr><th>Rang</th><th>Chance</th><th>Duplikat</th></tr>${rates}</table>
          <p class="muted">Ohne Rang A oder besser ist spätestens das ${well.PITY_A}. Stück ein A, ohne Rang S oder besser spätestens das ${well.PITY_S}. ein S. Der Brunnengeist verschenkt ab und zu einen Wunsch mit garantiert A–SS (je Stück ${percent(well.SPIRIT_CHANCE[t])}).</p>
        </details>
        <footer><button data-act="gallery">Zur Galerie</button></footer>
      </section>`;
    $('.spirit-img', overlay).append(picture(well.ghostImage()));
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
    const res = well.pull(n, Math.random, { dupes: dupeMode && n !== 'spirit' });
    if (res.error) {
      $('#well-note').textContent = res.error;
      audio.play('error');
      return;
    }
    lastPull = res.results;
    spiritLine = well.say(res);
    audio.play(res.free === 'spirit' ? 'wish' : 'pull');
    renderWell();
    if (res.gotSpirit) toast('✦ Der Brunnengeist erscheint und schenkt dir einen besonderen Wunsch!');
    else if (res.gotFreeNext) toast('✦ Glück gehabt: Dein nächster Einzelwunsch ist gratis!');
    // seltene Funde der Reihe nach groß zeigen, das seltenste zuletzt
    reveals.push(...lastPull.filter((p) => p.item.tier >= HIGHLIGHT_TIER).sort((a, b) => a.item.tier - b.item.tier).map((p) => (res.free === 'spirit' ? { ...p, source: 'GESCHENK DES BRUNNENGEISTS' } : p)));
    nextReveal();
  }

  // ------------------------------------------------------------ Pop-up für A, S, SS

  function nextReveal() {
    $('.reveal')?.remove();
    const next = reveals.shift();
    if (!next) return onToggle(busy());
    if (next.result) return showResult(next.result);
    if (next.fight) return showFight(next.fight);
    if (next.setDone) return showSetComplete(next.setDone);
    if (next.meal) return showMeal(next.meal);
    if (next.questDone) return showQuestDone(next.questDone);
    if (next.catch) return showCatch(next.catch);
    if (next.companion) return showCompanion(next.companion);
    if (next.realm) return showRealm(next.realm);
    if ('wake' in next) return showWakeUp(next.wake);
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

  // Team-Bausteine für Arena und Dungeon (gemeinsame Logik in party.js)
  const PARTY = { arena: () => arena.party, dungeon: () => dungeon.party };
  const OTHER = { arena: 'Dungeon', dungeon: 'Arena' };
  const PLACE_RANK = { arena: 'Arena-Rang', dungeon: 'Tor-Rang' };
  const slotLabel = (key) => (key === 'hero' ? 'Held' : arena.SLOTS.find((s) => s.cat === key).name);
  const levelBadge = (pk, id) => `<span class="count">${RARITIES[PARTY[pk]().levelOf(id)].id}</span>`;

  // Ein Platz im Team: belegt als Kachel, sonst als leeres Feld mit Beschriftung.
  function slotButton(pk, i, key, id) {
    const sel = partySel[pk];
    const on = sel && sel.i === i && sel.key === key ? ' sel' : '';
    const lock = PARTY[pk]().locked() ? ' disabled' : '';
    const item = id && getItem(id);
    if (!item) return `<button class="tile empty-slot${on}" data-act="slot" data-p="${pk}" data-i="${i}" data-k="${key}"${lock}>${slotLabel(key)}</button>`;
    return `<button class="tile r-${item.rank}${on}" data-act="slot" data-p="${pk}" data-i="${i}" data-k="${key}" data-sprite="${id}" title="${item.name}"${lock}>
      <span class="rank">${item.rank}</span>${levelBadge(pk, id)}</button>`;
  }

  // Umhang-Platz (aus der Schneiderei)
  function capeButton(pk, i, m) {
    const sel = partySel[pk];
    const on = sel && sel.i === i && sel.key === 'cape' ? ' sel' : '';
    const lock = PARTY[pk]().locked() ? ' disabled' : '';
    if (m.cape == null || !m.hero) return `<button class="tile empty-slot${on}" data-act="slot" data-p="${pk}" data-i="${i}" data-k="cape"${lock}>Umhang</button>`;
    return `<button class="tile r-${RARITIES[m.cape].id}${on}" data-act="slot" data-p="${pk}" data-i="${i}" data-k="cape" data-cape="${m.cape}" title="Umhang Rang ${RARITIES[m.cape].id}"${lock}><span class="rank">${RARITIES[m.cape].id}</span></button>`;
  }

  function capePickerHtml(pk, i) {
    const P = PARTY[pk]();
    const m = P.team()[i];
    const tiles = RARITIES.map((r, t) => {
      const free = P.capesFree(t, i);
      if (!tailor.capes(t)) return '';
      return `<button class="tile r-${r.id}${m.cape === t ? ' picked' : ''}" data-act="equip-cape" data-p="${pk}" data-v="${t}" data-cape="${t}" title="Umhang Rang ${r.id} · +${tailor.CAPE_POWER[t]} Stärke" ${free > 0 ? '' : 'disabled'}>
        <span class="rank">${r.id}</span><span class="count">${free}</span></button>`;
    }).join('');
    return `<div class="chest picker">
      <div class="line"><span>Umhang für Platz ${i + 1} wählen</span>
        <span><button data-act="equip-cape" data-p="${pk}" data-v="" ${m.cape != null ? '' : 'disabled'}>Ablegen</button> <button data-act="slot-close" data-p="${pk}">Fertig</button></span></div>
      <p class="muted">${m.hero ? `Umhänge näht man am Nähtisch im Haus aus Stoff und Seide. Stärke je Rang: ${tailor.CAPE_POWER.join(' · ')}. Beide Teams teilen sich den Vorrat.` : 'Erst einen Helden auf diesen Platz stellen.'}</p>
      ${tiles ? `<div class="grid heroes">${tiles}</div>` : '<p class="muted">Du hast noch keinen Umhang genäht.</p>'}
    </div>`;
  }

  function membersHtml(pk) {
    const P = PARTY[pk]();
    const members = P.team().map((m, i) => `
      <div class="member">
        <div class="hero-slot">${slotButton(pk, i, 'hero', m.hero)}</div>
        <div class="gear-slots">${arena.SLOTS.map((s) => slotButton(pk, i, s.cat, m.gear[s.cat])).join('')}${capeButton(pk, i, m)}</div>
        <span>Stärke <b class="gold-text">${fmt(P.memberPower(m))}</b></span>
      </div>`).join('');
    const actions = P.locked()
      ? '<p class="muted">Das Team ist gerade unterwegs und kann erst nach der Rückkehr umgestellt werden.</p>'
      : `<div class="leader-actions">
          <button data-act="auto-equip" data-p="${pk}">Automatisch ausrüsten</button>
          <span class="muted">Tippe einen Platz an, um ihn zu besetzen. Wer im ${OTHER[pk]}-Team steckt, ist hier nicht verfügbar.</span>
        </div>`;
    return `<div class="members ${pk}">${members}</div>${actions}${P.locked() ? '' : pickerHtml(pk)}`;
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
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    for (const el of overlay.querySelectorAll('[data-mat]')) {
      const [kind, tier] = el.dataset.mat.split(':');
      el.prepend(picture(arena.materialImage(kind, Number(tier))));
    }
    const boss = arena.bossInfo();
    if (boss) $('#boss-frame')?.append(picture(boss.image));
  }

  function fightHtml() {
    return `
      ${upgradeBar('arena')}
      <h4>Team · Stärke ${fmt(arena.teamPower())}</h4>
      ${membersHtml('arena')}
      <h4>Boss</h4>
      ${bossHtml()}
      <p class="muted">Vorrat: ${matSummary() || 'noch kein Stoff und keine Seide'}</p>`;
  }

  function matSummary() {
    return Object.keys(arena.MATERIALS).flatMap((kind) =>
      RARITIES.map((r, t) => (arena.have(kind, t) ? `${arena.MATERIALS[kind].name} ${r.id} ×${arena.have(kind, t)}` : null)).filter(Boolean)
    ).join(' · ');
  }

  function pickerHtml(pk) {
    const sel = partySel[pk];
    if (!sel) return '';
    if (sel.key === 'cape') return capePickerHtml(pk, sel.i);
    const P = PARTY[pk]();
    const { i, key } = sel;
    const m = P.team()[i];
    const current = key === 'hero' ? m.hero : m.gear[key];
    const list = P.candidates(key, true).slice(0, 44);
    let detail = '';
    if (current) {
      const item = getItem(current);
      const level = P.levelOf(current);
      const cost = P.levelCost(item);
      const isHero = key === 'hero';
      detail = `<div class="crow r-${RARITIES[level].id}">
        <div class="info"><b>${item.name}</b>
          <span>Rang ${item.rank} · Stufe <span class="evo">${RARITIES[level].id}</span> · Stärke <span class="gold-text">${P.powerOf(item)}</span>
          ${cost === null ? '' : `→ ${P.powerOf(item, level + 1)}`}</span></div>
        ${cost === null
          ? `<button disabled>${P.capped(level) ? `${PLACE_RANK[pk]} nötig` : 'Maximal'}</button>`
          : `<button data-act="gear-up" data-p="${pk}" data-id="${current}" ${P.material(item) >= cost ? '' : 'disabled'}>→ ${RARITIES[level + 1].id} · ${fmt(cost)}</button>`}
      </div>
      <p class="muted">Verbessert wird mit ${isHero ? 'Helden-Duplikaten' : 'Duplikaten von Waffen, Rüstung, Relikten und Artefakten'} (Verkaufswert). Verfügbar: <b class="gold-text">${fmt(P.material(item))}</b>. Stufen gelten in Arena und Dungeon.</p>`;
    }
    const tiles = list.map((item) => {
      const elsewhere = P.usedElsewhere(item.id);
      const at = P.equippedAt(item.id);
      const tag = elsewhere ? `<span class="new away-tag">${OTHER[pk][0]}</span>` : at >= 0 && item.id !== current ? `<span class="new">${at + 1}</span>` : '';
      return `<button class="tile r-${item.rank}${item.id === current ? ' picked' : ''}${elsewhere ? ' elsewhere' : ''}" data-act="equip" data-p="${pk}" data-id="${item.id}" data-sprite="${item.id}" title="${item.name}${elsewhere ? ` – im ${OTHER[pk]}-Team` : ''}" ${elsewhere ? 'disabled' : ''}>
        <span class="rank">${item.rank}</span>${levelBadge(pk, item.id)}${tag}</button>`;
    }).join('');
    return `<div class="chest picker">
      <div class="line"><span>${slotLabel(key)} für Platz ${i + 1} wählen</span>
        <span><button data-act="equip" data-p="${pk}" data-id="" ${current ? '' : 'disabled'}>Ablegen</button> <button data-act="slot-close" data-p="${pk}">Fertig</button></span></div>
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
        const upP = arena.upChance(kind);
        const odds = up === r.id ? `100 % Rang ${r.id}` : `${percent(1 - upP)} Rang ${r.id} · ${percent(upP)} Rang ${up}`;
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

  // ------------------------------------------------------------ Kleiderschrank

  function renderWardrobe() {
    overlay.innerHTML = `
      <section class="panel wardrobe">
        ${head('Kleiderschrank')}
        <p class="lead">Such dir etwas Gemütliches aus. Die Kleidung trägst du draußen und im Haus.</p>
        <div class="outfits" id="outfits"></div>
      </section>`;
    $('#outfits').replaceChildren(
      ...OUTFITS.filter((o) => !o.world || dimension.known().includes(o.world)).map((o) => {
        const el = document.createElement('button');
        el.className = `outfit${o.id === state.outfit ? ' on' : ''}`;
        el.dataset.act = 'outfit';
        el.dataset.id = o.id;
        const c = document.createElement('canvas');
        c.width = 12;
        c.height = 16;
        c.className = 'sprite outfit-sprite';
        c.getContext('2d').drawImage(makePlayerSprites(o.id, state.character || {})[1].idle, 0, 0);
        el.append(c);
        const locked = !tailor.sewn(o.id);
        if (locked) el.classList.add('locked');
        const bonusText = o.bonus ? companions.describeBonus({ bonus: o.bonus }) : '';
        el.insertAdjacentHTML('beforeend', `<b>${o.name}</b>${o.id === state.outfit ? '<span class="tag">angezogen</span>' : ''}${locked ? '<span class="muted">✂ am Nähtisch nähen</span>' : ''}${bonusText ? `<span class="gold-text">${bonusText}</span>` : ''}`);
        return el;
      })
    );
  }

  // ------------------------------------------------------------ Aufwachen

  function showWakeUp(buffId) {
    const b = buffId && buffs.BUFFS[buffId];
    const el = document.createElement('div');
    el.className = `reveal ${b ? `r-${b.rank}` : 'result r-D'}`;
    el.innerHTML = `
      ${b ? '<div class="rays"></div>' : ''}
      <div class="card">
        <div class="source">GUTEN MORGEN</div>
        <div class="rank-big">${b ? b.name.toUpperCase() : 'AUSGESCHLAFEN'}</div>
        ${b ? '<div class="frame"></div>' : ''}
        <p>${b
          ? `${b.text}<br>Hält ${buffs.BUFF_MINUTES} Minuten.`
          : `Du hast tief und fest geschlafen. Diesmal ohne besonderen Traum –<br>mit ${percent(buffs.sleepChance())} Glück wachst du mit einem Rausch auf.`}</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    if (b) $('.frame', el).append(picture(buffs.icon(buffId)));
    document.body.append(el);
    $('button[data-act]', el).focus();
    if (b) audio.play('reveal', 4);
    onToggle(true);
  }

  // ------------------------------------------------------------ Fischreuse

  function renderTrap() {
    fishtrap.tick();
    const cost = fishtrap.nextCost();
    if (!fishtrap.built()) {
      overlay.innerHTML = `
        <section class="panel">
          ${head('Fischreuse')}
          <p class="lead">Eine Reuse am Ufer fängt laufend Fische – auch, während du nicht da bist. Sie ist langsamer als selbst angeln und fängt keine Flaschenposts.</p>
          <div class="chest"><p>Stufe D: alle ${fishtrap.MINUTES[0]} Minuten ein Fisch, Platz für ${fishtrap.CAPACITY[0]} Fische.</p>
            <div class="line"><button class="big" data-act="trap-up" ${state.gold >= cost ? '' : 'disabled'}>Reuse bauen<small>${fmt(cost)} Gold</small></button></div></div>
        </section>`;
      return;
    }
    const lv = fishtrap.level();
    const entries = Object.entries(state.village.trap.stored);
    overlay.innerHTML = `
      <section class="panel trappanel">
        ${head('Fischreuse')}
        <div class="chest upgrade r-${fishtrap.rank()}">
          <div class="line"><span>Fischreuse · Rang <b class="evo">${fishtrap.rank()}</b> · alle ${fmt1(fishtrap.minutes())} min ein Fisch · Platz für ${fishtrap.capacity()}</span>
            ${cost === null ? '<span class="muted">voll ausgebaut</span>' : `<button data-act="trap-up" ${state.gold >= cost ? '' : 'disabled'}>Auf Rang ${RARITIES[lv + 1].id} ausbauen · ${fmt(cost)} Gold</button>`}</div>
          ${cost === null ? '' : `<p class="muted">Nächster Rang: alle ${fmt1(fishtrap.MINUTES[lv + 1])} min, Platz für ${fishtrap.CAPACITY[lv + 1]}.</p>`}
        </div>
        <div class="chest">
          <div class="line"><span>Im Korb: <b>${fishtrap.stored()} / ${fishtrap.capacity()}</b>${fishtrap.full() ? ' – voll, die Reuse wartet' : ''}</span>
            <button class="big" data-act="trap-collect" ${fishtrap.stored() ? '' : 'disabled'}>Reuse leeren</button></div>
          <div class="bar"><i style="width:${(fishtrap.stored() / fishtrap.capacity()) * 100}%"></i></div>
          <div class="ores">${entries.map(([id, n]) => `<span class="ore-chip r-${RARITIES[village.fishSpec(id).tier].id}" data-fish-img="${id}"><b>${n}</b> ${village.fishSpec(id).name}</span>`).join('') || '<span class="muted">Noch leer.</span>'}</div>
        </div>
        <p class="muted">Gefangen wird nach denselben Chancen wie beim Angeln; offline beißen Arten aller Tageszeiten. Fänge zählen fürs Angelbuch.</p>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-fish-img]')) el.prepend(picture(village.fishImage(el.dataset.fishImg)));
  }

  // ------------------------------------------------------------ Magierturm und Zauberbuch

  let spellSchool = 'alle';
  function renderTower() {
    if (!buildings.owned('tower')) return renderPurchase('tower', 'Magierturm');
    magic.tick();
    // Heimat-Zauber nach Schule; Zauber der Portalwelten auf eigenen Reitern (sobald man sie kennt)
    const inTab = (sp, id) => (id.startsWith('w:') ? sp.world === id.slice(2) : sp.world === 'normal' && (id === 'alle' || sp.school === id));
    if (spellSchool.startsWith('w:') && !dimension.known().includes(spellSchool.slice(2))) spellSchool = 'alle';
    const shown = magic.SPELLS.filter((sp) => inTab(sp, spellSchool));
    const card = (sp) => {
      const rank = RARITIES[sp.rank].id;
      const learned = magic.learned(sp.id);
      const block = learned ? magic.castBlocker(sp) : magic.learnBlocker(sp);
      const cd = magic.cooldownLeft(sp.id);
      const known = learned || magic.hasScroll(sp);
      const button = learned
        ? `<button class="big" data-act="cast" data-v="${sp.id}" ${block ? 'disabled' : ''}>Wirken · ${sp.cost} Mana</button>`
        : `<button data-act="learn" data-v="${sp.id}" ${block ? 'disabled' : ''}>Lernen</button>`;
      return `<div class="spell r-${rank}${learned ? '' : ' locked'}${known ? '' : ' unknown'}">
        <div class="spell-head"><span class="spell-img" data-scroll="${sp.scroll.id}"></span>
          <div><div class="line"><b>${magic.school(sp.school).icon} ${sp.name}</b><span class="evo">Rang ${rank}</span></div>
          <span class="muted">${sp.scroll.name}</span></div></div>
        <p>${sp.text}</p>
        <span class="muted">${sp.cost} Mana · Abklingzeit ${sp.cooldown} min${cd ? ` · bereit in <b data-cd="${sp.id}">${clock(cd)}</b>` : ''}</span>
        ${button}
        ${block && !(learned && cd) ? `<span class="note">${block}</span>` : ''}
      </div>`;
    };
    const groups = RARITIES.map((r, t) => {
      const list = shown.filter((sp) => sp.rank === t);
      return list.length ? `<h3 class="spell-rank r-${r.id}">Rang ${r.id}</h3><div class="spells">${list.map(card).join('')}</div>` : '';
    }).join('');
    const count = (id) => magic.SPELLS.filter((sp) => inTab(sp, id) && magic.learned(sp.id)).length;
    const total = (id) => magic.SPELLS.filter((sp) => inTab(sp, id)).length;
    const tabs = [['alle', 'Heimat'], ...magic.SCHOOLS.map((sc) => [sc.id, `${sc.icon} ${sc.name}`]), ...dimension.known().map((w) => [`w:${w}`, `◆ ${realm.WORLDS[w].name}`])]
      .map(([id, name]) => `<button class="tab${spellSchool === id ? ' on' : ''}" data-act="spell-school" data-v="${id}">${name} <span class="muted">${count(id)}/${total(id)}</span></button>`).join('');
    const pending = magic.pending();
    overlay.innerHTML = `
      <section class="panel towerpanel">
        ${head('Zauberbuch')}
        ${upgradeBar('tower')}
        <div class="chest mana">
          <div class="line"><span>Mana <b id="mana-text"></b></span><span class="muted">+${fmt1(magic.regen())}/min, nachts doppelt so schnell</span></div>
          <div class="bar mana-bar"><i id="mana-bar"></i></div>
          ${pending.length ? `<p class="buff-note">Wartet auf seinen Einsatz: ${pending.join(' · ')}</p>` : ''}
        </div>
        <p class="muted">Jede Schriftrolle (Relikte) lehrt ihren eigenen Zauber – sie wird dabei nicht verbraucht. Je höher der Rang, desto stärker der Zauber. Das Zauberbuch öffnest du überall mit <kbd>Z</kbd>.</p>
        <nav class="tabs">${tabs}</nav>
        ${groups}
      </section>`;
    for (const el of overlay.querySelectorAll('[data-scroll]')) el.append(sprite(getItem(el.dataset.scroll)));
    updateTower();
  }

  function updateTower() {
    const t = $('#mana-text');
    if (!t) return;
    t.textContent = `${magic.mana()} / ${magic.maxMana()}`;
    $('#mana-bar').style.width = `${(magic.mana() / magic.maxMana()) * 100}%`;
    for (const el of overlay.querySelectorAll('[data-cd]')) {
      const left = magic.cooldownLeft(el.dataset.cd);
      if (!left) return renderTower();
      el.textContent = clock(left);
    }
  }

  // ------------------------------------------------------------ Angelbuch

  const TIME_ICON = { any: '◯', day: '☀', night: '☾', twilight: '◐' };

  function renderFishBook() {
    const known = village.FISH.filter((f) => village.caughtTotal(f.id) > 0).length;
    const total = village.FISH.reduce((n, f) => n + village.caughtTotal(f.id), 0);
    const card = (f) => {
      const caught = village.caughtTotal(f.id);
      const rank = RARITIES[f.tier].id;
      const active = village.isActive(f);
      return `<div class="fishcard r-${rank}${caught ? '' : ' unknown'}" data-fish="${f.id}">
        <div class="line"><b>${caught ? f.name : '???'}</b><span class="evo">Rang ${rank}</span></div>
        <p class="muted">${caught ? f.info : 'Noch nie gefangen.'}</p>
        <div class="fishstats">
          <span>Gefangen <b>${fmt(caught)}</b></span>
          <span>Im Vorrat <b>${fmt(village.fishCount(f.id))}</b></span>
          <span class="${active ? 'gold-text' : ''}">${TIME_ICON[f.time]} ${village.TIME_NAMES[f.time]}${active ? ' · jetzt aktiv' : ''}</span>
          <span>Marktwert <b class="gold-text">${fmt(f.price)}</b></span>
        </div>
      </div>`;
    };
    const groups = RARITIES.map((r, t) => {
      const list = village.FISH.filter((f) => f.tier === t);
      const found = list.filter((f) => village.caughtTotal(f.id)).length;
      return `<h4>Rang ${r.id} · ${percent(r.chance)} · ${found}/${list.length} entdeckt</h4><div class="fishcards">${list.map(card).join('')}</div>`;
    }).join('');
    overlay.innerHTML = `
      <section class="panel fishbookpanel">
        ${head('Angelbuch')}
        <p class="lead">${known} von ${village.FISH.length} Arten entdeckt · ${fmt(total)} Fische gefangen · ${fmt(village.bottlesFound())} Flaschenposts gefunden</p>
        <div class="bar"><i style="width:${(known / village.FISH.length) * 100}%"></i></div>
        <p class="muted">Erst entscheidet der Rang (Chancen wie am Brunnen), dann beißt eine Art dieses Rangs, die gerade aktiv ist:
          ☀ tagsüber, ☾ nachts, ◐ in der Dämmerung, ◯ immer. Mit ${percent(village.TREASURE_CHANCE)} hängt eine Flaschenpost am Haken.</p>
        ${groups}
      </section>`;
    for (const el of overlay.querySelectorAll('[data-fish]')) el.prepend(picture(village.fishImage(el.dataset.fish)));
  }

  // ------------------------------------------------------------ Dorf

  const DIFF_RANK = { leicht: 'D', mittel: 'B', schwer: 'S' };

  function needIcon(need) {
    if (need.type === 'ore') return mine.oreImage(need.tier);
    if (need.type === 'crop') return garden.cropImage(need.id);
    if (need.type === 'fish') return village.tierFishImage(need.tier);
    return itemImage(getGroup(need.cat, RARITIES[need.tier].id)[0]);
  }

  function renderVillager() {
    const npc = village.villager(talkTo);
    const q = village.quest(npc.id);
    let body;
    if (!q) {
      const wait = Math.max(0, Math.ceil(((state.village.next[npc.id] || 0) - Date.now()) / 1000));
      body = `<p class="lead">„${npc.hello} Gerade habe ich nichts für dich – schau in ${clock(wait)} wieder vorbei.“</p>`;
    } else {
      const have = village.haveFor(q.need);
      const ok = village.canComplete(q);
      const reward = `${fmt(q.reward.gold)} Gold${q.reward.item !== null ? ` + Sammelstück ab Rang ${RARITIES[q.reward.item].id}` : ''}`;
      body = `
        <p class="lead">„${npc.hello}“</p>
        <div class="chest quest r-${DIFF_RANK[q.difficulty]}">
          <div class="line"><b>Aufgabe</b><span class="tag diff">${q.difficulty}</span></div>
          <div class="quest-need"><span id="need-icon"></span><span>Bitte bring mir <b>${village.describeNeed(q.need)}</b></span></div>
          <span class="${ok ? 'gold-text' : 'muted'}">Du hast ${fmt(have)} von ${q.need.n}${q.need.type === 'item' ? ' (nur Duplikate zählen)' : ''}</span>
          <span>Belohnung: <b class="gold-text">${reward}</b></span>
          <div class="line">
            <button class="big" data-act="quest-done" ${ok ? '' : 'disabled'}>Abgeben</button>
            <button data-act="quest-skip">Ablehnen</button>
          </div>
        </div>`;
    }
    overlay.innerHTML = `
      <section class="panel villagerpanel">
        ${head(npc.name)}
        <div class="villager-row"><div class="frame" id="npc-face"></div><div class="info">${body}</div></div>
        <p class="muted">Erledigte Aufgaben insgesamt: ${fmt(state.village.done)}. Neue Aufgaben tauchen immer wieder auf.</p>
      </section>`;
    $('#npc-face').append(picture(village.villagerImage(npc.id)));
    if (q) $('#need-icon')?.append(picture(needIcon(q.need)));
  }

  function showQuestDone(res) {
    const npc = village.villager(res.quest.villager);
    const el = document.createElement('div');
    el.className = `reveal r-${DIFF_RANK[res.quest.difficulty]}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">AUFGABE ERLEDIGT · ${res.quest.difficulty.toUpperCase()}</div>
        <div class="rank-big">DANKE!</div>
        <div class="frame"></div>
        <h3>${npc.name}</h3>
        <p class="gold-won">+${fmt(res.gold)} Gold</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(picture(village.villagerImage(npc.id)));
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('win');
    onToggle(true);
  }

  // Fang: kleine Fische als Hinweis, große als Pop-up, Flaschenpost als Sammelstück
  function showRealm(type) {
    const w = realm.WORLDS[type];
    const el = document.createElement('div');
    el.className = `reveal realm-${type}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">DAS PORTAL ÖFFNET SICH …</div>
        <div class="rank-big">${w.name.toUpperCase()}</div>
        <p>${w.intro}</p>
        <p class="muted">Diese Welt bleibt deine Portalwelt. Hier baust du alles neu auf – Brunnen, Lager, Mine, Arena und mehr. Am Brunnen und unterwegs findest du nur Stücke ${type === 'hoelle' ? 'der Hölle' : 'des Himmels'}, und nur die helfen dir hier. Gold, Sammlung und Begleiter nimmst du mit. Durch das Portal geht es jederzeit zurück.</p>
        <button data-act="reveal-next">Los geht's</button>
      </div>`;
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('reveal', 5);
    onToggle(true);
  }

  function renderPortal() {
    const b = buildings.BUILDINGS.portal;
    if (!buildings.owned('portal')) {
      overlay.innerHTML = `
        <section class="panel portalpanel">
          ${head('Dimensionsportal')}
          <p class="lead">${b.pitch}</p>
          <div class="chest">
            <p>Wohin das Portal führt, verrät es erst beim ersten Durchschreiten: in die <b class="hell-text">Hölle</b> oder in den <b class="heaven-text">Himmel</b>. Das Schicksal entscheidet einmal – danach bleibt es so.</p>
            <p class="muted">${b.unlocks} In der Portalwelt haben Gebäude, Expedition, Mine, Arena, Dungeon, Schmiede, Brunnen und Garten einen eigenen Stand; deine Heimat sammelt währenddessen weiter.</p>
            <div class="line"><button class="big" data-act="build" data-id="portal" ${state.gold >= b.buy ? '' : 'disabled'}>Portal bauen<small>${fmt(b.buy)} Gold</small></button></div>
          </div>
        </section>`;
      return;
    }
    const label = (w) => (dimension.visited(w) ? realm.WORLDS[w].name : '???');
    const dest = dimension.destinations();
    const card = (w) => `<div class="realm-card realm-${dimension.visited(w) ? w : 'unknown'}">
        <b>${label(w)}</b>
        ${dimension.visited(w) ? `<ul>${realm.BONUS_TEXT[w].map((t) => `<li>${t}</li>`).join('')}</ul>` : '<p class="muted">Noch nie betreten.</p>'}
        <button class="big" data-act="portal-go" data-v="${w}">Hindurchgehen</button>
      </div>`;
    const second = dimension.second();
    overlay.innerHTML = `
      <section class="panel portalpanel">
        ${head('Dimensionsportal')}
        ${realm.inRealm()
          ? `<p class="lead">Du bist in ${realm.current() === 'hoelle' ? 'der Hölle' : 'dem Himmel'}.</p><button class="big" data-act="portal-go" data-v="normal">Zurück in die Heimat</button>`
          : `<p class="lead">Wohin soll es gehen?</p><div class="realm-cards">${dest.map(card).join('')}</div>`}
        <div class="chest">
          <p class="muted">In den Portalwelten starten alle Gebäude bei Rang B – teurer (× ${realm.PRICE}), dafür bringen Expedition, Dungeon und Münzen doppelt so viel Gold. Wünsche kosten das Doppelte. Jede Dimension hat eigene Boni, Zauber, Kleidung, Pflanzen und Gerichte.</p>
          ${dest.length < 2 ? `<p>Die zweite Dimension (${dimension.visited(second) ? realm.WORLDS[second].name : '???'}) öffnet sich, sobald in der Heimat <b>alle Gebäude auf Rang SS</b> stehen: <b class="gold-text">${dimension.homeProgress()} / ${dimension.HOME_BUILDINGS.length}</b>.</p>` : ''}
        </div>
      </section>`;
  }

  function showCompanion(c) {
    const rank = companions.rankOf(c);
    const el = document.createElement('div');
    el.className = `reveal r-${rank}`;
    const isActive = companions.active()?.id === c.id;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">NEUER BEGLEITER</div>
        <div class="rank-big">RANG ${rank}</div>
        <div class="frame"></div>
        <h3>${c.name}</h3>
        <p>${c.text}</p>
        <p class="gold-text">${companions.describeBonus(c)}</p>
        <p class="muted">${isActive ? 'Begleitet dich ab jetzt.' : 'Im Begleiter-Menü (C) kannst du es mitnehmen.'}</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(picture(companions.icon(c.id)));
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('reveal', c.tier);
    onToggle(true);
  }

  let tailorTab = 'umhang';
  const matHtml = (cost) => cost.map((c) => `<span class="mat-cost${tailor.have(c.kind, c.tier) >= c.n ? '' : ' short'}" data-mat="${c.kind}:${c.tier}">${c.n}× ${arena.MATERIALS[c.kind].name} ${RARITIES[c.tier].id}</span>`).join(' ');
  function renderTailor() {
    const tabs = [['umhang', 'Heldenumhänge'], ['kleidung', 'Kleidung'], ['einrichtung', 'Einrichtung'], ['veredeln', 'Veredeln']]
      .map(([id, name]) => `<button class="tab${tailorTab === id ? ' on' : ''}" data-act="tailor-tab" data-v="${id}">${name}</button>`).join('');
    const stock = ['stoff', 'seide'].map((kind) => `<div class="stock"><b>${arena.MATERIALS[kind].name}</b>${RARITIES.map((r, t) =>
      `<span class="r-${r.id}" data-mat="${kind}:${t}" title="${arena.MATERIALS[kind].name} Rang ${r.id}"><i class="evo">${r.id}</i> ${tailor.have(kind, t)}</span>`).join('')}</div>`).join('');
    let body = '';
    if (tailorTab === 'umhang') {
      body = `<p class="muted">Umhänge geben einem Helden in Arena oder Dungeon zusätzliche Stärke. Anlegen im Team über den Platz „Umhang“.</p>
        <div class="sew-list">${RARITIES.map((r, t) => `
          <div class="sew r-${r.id}"><span class="sew-img" data-cape="${t}"></span>
            <div><b>Umhang Rang ${r.id}</b><span>+${tailor.CAPE_POWER[t]} Stärke · im Vorrat: ${tailor.capes(t)}</span><span>${matHtml(tailor.capeCost(t))}</span></div>
            <button data-act="sew-cape" data-v="${t}" ${tailor.affordable(tailor.capeCost(t)) ? '' : 'disabled'}>Nähen</button></div>`).join('')}</div>`;
    } else if (tailorTab === 'kleidung') {
      body = `<p class="muted">Genähte Kleidung trägst du über den Kleiderschrank. Solange du sie trägst, wirkt ihr Bonus.</p>
        <div class="sew-list">${tailor.SEWN.filter((o) => !o.world || dimension.known().includes(o.world)).map((o) => {
          const done = tailor.sewn(o.id);
          return `<div class="sew r-${RARITIES[o.sew.tier].id}"><span class="sew-img" data-outfit="${o.id}"></span>
            <div><b>${o.name}</b><span class="gold-text">${companions.describeBonus({ bonus: o.bonus })}</span><span>${done ? (state.outfit === o.id ? 'genäht · angezogen' : 'genäht') : matHtml(tailor.sewCost(o))}</span></div>
            ${done ? (state.outfit === o.id ? '<span class="tag">an</span>' : `<button data-act="outfit" data-id="${o.id}">Anziehen</button>`) : (tailor.canSewHere(o) ? `<button data-act="sew-outfit" data-v="${o.id}" ${tailor.affordable(tailor.sewCost(o)) ? '' : 'disabled'}>Nähen</button>` : `<span class="muted">nur ${o.world === 'hoelle' ? 'in der Hölle' : 'im Himmel'}</span>`)}</div>`;
        }).join('')}</div>`;
    } else if (tailorTab === 'einrichtung') {
      body = `<p class="muted">Gemütlichkeit <b class="gold-text">${tailor.cozy()} / ${tailor.MAX_COZY}</b> – jeder Punkt erhöht die Chance auf einen Rausch beim Schlafen um 1 % (jetzt ${percent(buffs.sleepChance())}).</p>
        <div class="sew-list">${tailor.DECOR.map((d) => {
          const done = tailor.placed(d.id);
          const tierOf = Math.max(...d.cost.map((c) => c.tier));
          return `<div class="sew r-${RARITIES[tierOf].id}"><span class="sew-img cozy">♥${d.cozy}</span>
            <div><b>${d.name}</b><span>${d.text}</span><span>${done ? 'steht im Haus' : matHtml(d.cost)}</span></div>
            ${done ? '<span class="tag">✓</span>' : `<button data-act="sew-decor" data-v="${d.id}" ${tailor.affordable(d.cost) ? '' : 'disabled'}>Nähen</button>`}</div>`;
        }).join('')}</div>`;
    } else {
      body = `<p class="muted">Zu viel von einer Sorte? Hier wird umgewandelt.</p>
        ${tailor.REFINE.map((r) => `<div class="refine"><b>${r.name}</b><span class="muted">${r.text}</span>
          <div class="refine-row">${RARITIES.map((rk, t) => (t + r.up > 5 ? '' : `<button class="r-${rk.id}" data-act="refine" data-v="${r.id}" data-t="${t}" ${tailor.canRefine(r, t) ? '' : 'disabled'}>${rk.id}${r.up ? `→${RARITIES[t + 1].id}` : ''}</button>`)).join('')}</div></div>`).join('')}`;
    }
    overlay.innerHTML = `
      <section class="panel tailorpanel">
        ${head('Nähtisch')}
        <p class="lead">Aus Stoff und Seide der Bossarena entstehen hier Umhänge, Kleidung und Einrichtung.</p>
        <div class="stocks">${stock}</div>
        <nav class="tabs">${tabs}</nav>
        ${body}
      </section>`;
    for (const el of overlay.querySelectorAll('.stock [data-mat]')) {
      const [kind, tier] = el.dataset.mat.split(':');
      el.prepend(picture(arena.materialImage(kind, Number(tier))));
    }
    for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    for (const el of overlay.querySelectorAll('[data-outfit]')) {
      const c = document.createElement('canvas');
      c.width = 12;
      c.height = 16;
      c.className = 'sprite outfit-sprite';
      c.getContext('2d').drawImage(makePlayerSprites(el.dataset.outfit, state.character || {})[1].idle, 0, 0);
      el.append(c);
    }
  }

  function renderCompanions() {
    const act = companions.active();
    const cards = companions.COMPANIONS.map((c) => {
      const rank = companions.rankOf(c);
      const have = companions.owned(c.id);
      const on = act?.id === c.id;
      const lvl = have ? companions.level(c.id) : 1;
      const max = lvl >= companions.MAX_LEVEL;
      const treats = have && !max ? garden.available().filter((x) => garden.have(x.id)).map((x) =>
        `<button class="treat${x.id === c.fav ? ' fav' : ''}" data-act="comp-feed" data-v="${c.id}" data-crop="${x.id}" title="${x.name}: +${care.treatPoints(c, x.id)} Freundschaft"><span data-crop-img="${x.id}"></span>${garden.have(x.id)}</button>`).join('') : '';
      const friendship = have ? `
        <div class="friend"><span class="hearts">${'♥'.repeat(lvl)}${'♡'.repeat(companions.MAX_LEVEL - lvl)}</span><span class="muted">Stufe ${lvl}${max ? ' · beste Freunde' : ''}</span></div>
        ${max ? '' : `<div class="bar friend-bar"><i style="width:${Math.round(companions.progress(c.id) * 100)}%"></i></div>`}
        <span class="muted">Liebling: ${garden.crop(c.fav).name} (zählt doppelt) · Geschenke: ${c.gifts.map((k) => care.GIFT_TEXT[k]).join(', ')}</span>
        ${max ? '' : treats ? `<div class="treats">${treats}</div>` : '<span class="muted">Keine Leckerlis – ernte etwas im Garten.</span>'}` : '';
      return `<div class="companion r-${rank}${have ? '' : ' missing'}${on ? ' on' : ''}">
        <div class="line"><span class="comp-img" data-comp="${c.id}"></span>
          <div><b>${have ? c.name : '???'}</b><span class="evo">Rang ${rank}</span></div></div>
        <p>${have ? c.text : c.night ? 'Zeigt sich nur nachts …' : 'Streift irgendwo durchs Tal …'}</p>
        <p class="gold-text">${companions.describeBonus(c, lvl)}</p>
        ${friendship}
        ${have ? (on ? '<span class="tag">dabei</span>' : `<button data-act="comp-pick" data-v="${c.id}">Mitnehmen</button>`) : ''}
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <section class="panel compspanel">
        ${head('Begleiter')}
        <p class="muted">Auf dem Hof und im Dorf taucht ab und zu ein Tier mit einem Herz über dem Kopf auf. Geh hin und freunde dich an (<kbd>E</kbd>) – aber beeil dich, lange bleibt es nicht. Seltene Begleiter sind selten unterwegs, manche nur nachts. Einer kann dich begleiten, gibt dir seinen Bonus und bringt ab und zu ein Geschenk mit. Leckerlis aus dem Garten stärken die Freundschaft: bis Stufe 5 wird der Bonus doppelt so groß und Geschenke kommen öfter.</p>
        <div class="line"><span>Gefunden: <b>${companions.ownedCount()} / ${companions.COMPANIONS.length}</b>${act ? ` · Dabei: <b>${act.name}</b>` : ''}</span>
          ${act ? '<button data-act="comp-pick" data-v="">Allein gehen</button>' : ''}</div>
        <div class="companions">${cards}</div>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-comp]')) {
      const c = companions.companion(el.dataset.comp);
      const pic = picture(companions.icon(c.id));
      if (!companions.owned(c.id)) pic.classList.add('silhouette');
      el.append(pic);
    }
    for (const el of overlay.querySelectorAll('.companions [data-crop-img]')) el.append(picture(garden.cropImage(el.dataset.cropImg)));
  }

  function showCatch(res) {
    const rank = RARITIES[res.tier].id;
    const el = document.createElement('div');
    el.className = `reveal r-${rank}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">GROSSER FANG</div>
        <div class="rank-big">RANG ${rank}</div>
        <div class="frame"></div>
        <h3>${res.fish.name}</h3>
        <p>Wert am Markt: ${fmt(res.fish.price)} Gold</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(picture(village.fishImage(res.species)));
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('reveal', res.tier);
    onToggle(true);
  }

  function renderMarket() {
    const m = village.market();
    const tabs = ['saat', 'verkauf', 'sammel'].map((t, i) => `<button class="tab${marketTab === t ? ' on' : ''}" data-act="market-tab" data-v="${t}">${['Saatgut', 'Ernte und Fisch verkaufen', 'Sammelstücke'][i]}</button>`).join('');
    let body = '';
    if (marketTab === 'saat') {
      body = `<p class="muted">Saatpäckchen auf Vorrat sind 20 % günstiger. Beim Pflanzen im Garten werden sie zuerst verbraucht.</p>
        <div class="seeds">${garden.available().map((c) => `
          <div class="seed" data-crop-img="${c.id}"><b>${c.name}</b><span>Vorrat: ${village.seeds(c.id)}</span>
            <span class="gold-text">${village.seedPrice(c.id)} Gold</span>
            <span><button data-act="buy-seed" data-v="${c.id}" data-n="1" ${state.gold >= village.seedPrice(c.id) ? '' : 'disabled'}>1×</button>
            <button data-act="buy-seed" data-v="${c.id}" data-n="5" ${state.gold >= village.seedPrice(c.id) * 5 ? '' : 'disabled'}>5×</button></span>
          </div>`).join('')}</div>`;
    }
    if (marketTab === 'verkauf') {
      const crops = garden.available().map((c) => `
        <div class="seed" data-crop-img="${c.id}"><b>${c.name}</b><span>Vorrat: ${garden.have(c.id)}</span>
          <span class="gold-text">${village.CROP_PRICE[c.id]} Gold je Stück</span>
          <button data-act="sell-crop" data-v="${c.id}" ${garden.have(c.id) ? '' : 'disabled'}>Alle verkaufen</button></div>`).join('');
      const fish = village.FISH.filter((f) => village.fishCount(f.id)).map((f) => `
        <div class="seed" data-fish-img="${f.id}"><b>${f.name} <span class="evo r-${RARITIES[f.tier].id}">${RARITIES[f.tier].id}</span></b><span>Vorrat: ${village.fishCount(f.id)}</span>
          <span class="gold-text">${fmt(f.price)} Gold je Stück</span>
          <button data-act="sell-fish" data-v="${f.id}">Alle verkaufen</button></div>`).join('') || '<p class="muted">Noch keine Fische im Vorrat – ab zum Steg!</p>';
      body = `<h4>Ernte</h4><div class="seeds">${crops}</div><h4>Fische</h4><div class="seeds">${fish}</div>
        <p class="muted">Tipp: Aufgaben der Dorfbewohner zahlen für Ernte und Fische meist deutlich mehr.</p>`;
    }
    if (marketTab === 'sammel') {
      const stock = m.stock.map((s, i) => {
        const item = getItem(s.id);
        return `<div class="offer r-${item.rank}${s.sold ? ' sold' : ''}">
          <div class="tile r-${item.rank}" data-sprite="${item.id}"><span class="rank">${item.rank}</span>${state.count(item.id) ? '' : '<span class="new">NEU</span>'}</div>
          <b>${item.name}</b><span class="gold-text">${fmt(village.stockPrice(item))} Gold</span>
          <button data-act="market-buy" data-v="${i}" ${!s.sold && state.gold >= village.stockPrice(item) ? '' : 'disabled'}>${s.sold ? 'Verkauft' : 'Kaufen'}</button></div>`;
      }).join('');
      const wants = m.wants.map((w, i) => {
        const item = getItem(w.id);
        const dup = state.duplicates(item.id);
        return `<div class="offer r-${item.rank}${w.done ? ' sold' : ''}">
          <div class="tile r-${item.rank}${state.count(item.id) ? '' : ' unknown'}" data-sprite="${item.id}"><span class="rank">${item.rank}</span>${dup ? `<span class="count">×${dup}</span>` : ''}</div>
          <b>${item.name}</b><span class="gold-text">${fmt(village.wantPrice(item))} Gold</span>
          <button data-act="market-sell" data-v="${i}" ${!w.done && dup ? '' : 'disabled'}>${w.done ? 'Verkauft' : dup ? 'Duplikat verkaufen' : 'Kein Duplikat'}</button></div>`;
      }).join('');
      body = `<p class="muted">Neues Angebot in <b id="market-time"></b>.</p>
        <h4>Hilde verkauft</h4><div class="offers">${stock}</div>
        <h4>Hilde sucht – zahlt das Doppelte des Verkaufswerts</h4><div class="offers">${wants}</div>`;
    }
    overlay.innerHTML = `
      <section class="panel marketpanel">
        ${head(village.MARKET.name)}
        <p class="lead">„Frisch vom Feld, frisch aus dem Teich – und dazu allerlei Schätze!“</p>
        <nav class="tabs">${tabs}</nav>
        ${body}
      </section>`;
    for (const el of overlay.querySelectorAll('[data-crop-img]')) el.prepend(picture(garden.cropImage(el.dataset.cropImg)));
    for (const el of overlay.querySelectorAll('[data-fish-img]')) el.prepend(picture(village.fishImage(el.dataset.fishImg)));
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    updateMarket();
  }

  function updateMarket() {
    const el = $('#market-time');
    if (el) el.textContent = clock(village.marketRefreshIn());
    if (view === 'market' && village.marketRefreshIn() === 0) renderMarket();
    if (view === 'villager' && !village.quest(talkTo) && !$('.quest')) {
      // Wartezeit auf eine neue Aufgabe herunterzählen
      renderVillager();
    }
  }

  // ------------------------------------------------------------ Garten

  const cropChip = (id, n, need) => `<span class="ore-chip${need !== undefined && n < need ? ' short' : ''}" data-crop="${id}"><b>${need !== undefined ? `${n}/${need}` : fmt(n)}</b> ${garden.crop(id).name}</span>`;
  const fillCrops = (root = overlay) => {
    for (const el of root.querySelectorAll('[data-crop]')) el.prepend(picture(garden.cropImage(el.dataset.crop)));
  };
  let gardenSel = null; // Beet, für das gerade Saatgut gewählt wird

  // Gartenhelfer-Bereich im Garten-Menü
  let helperPick = false;
  function helperHtml() {
    const c = gardener.creature();
    const h = gardener.info();
    if (!c || helperPick) {
      const list = worldPool('lebewesen', (i) => i.cat === 'lebewesen').filter((i) => state.count(i.id)).sort((a, b) => b.tier - a.tier).slice(0, 44);
      return `<div class="chest helper">
        <div class="line"><b>Gartenhelfer</b>${c ? '<button data-act="helper-close">Abbrechen</button>' : ''}</div>
        <p class="muted">Ein Lebewesen kann sich um die Beete kümmern: ernten, neu pflanzen und – wenn du es erlaubst – Ernte am Markt verkaufen, um Saat zu kaufen. Es zieht dann nicht mehr mit auf Expedition.</p>
        ${list.length
          ? `<div class="grid heroes">${list.map((i) => `<button class="tile r-${i.rank}${i.id === h.creature ? ' picked' : ''}" data-act="helper-pick" data-id="${i.id}" data-sprite="${i.id}" title="${i.name}"><span class="rank">${i.rank}</span></button>`).join('')}</div>`
          : '<p class="muted">Du besitzt noch keine Lebewesen – ziehe welche am Wunschbrunnen.</p>'}
      </div>`;
    }
    const options = (i) => {
      const cur = h.plan[i] || '';
      const last = state.garden.last[i];
      return `<select data-act="helper-plan" data-i="${i}">
        <option value="" ${cur === '' ? 'selected' : ''}>wie zuletzt${last ? ` (${garden.crop(last).name})` : ''}</option>
        ${garden.available().map((cr) => `<option value="${cr.id}" ${cur === cr.id ? 'selected' : ''}>${cr.name}</option>`).join('')}
        <option value="none" ${cur === 'none' ? 'selected' : ''}>leer lassen</option>
      </select>`;
    };
    return `<div class="chest helper">
      <div class="helper-row">
        <div class="tile r-${c.rank}" data-sprite="${c.id}"><span class="rank">${c.rank}</span></div>
        <div class="info">
          <b>${c.name}</b>
          <span class="muted">kümmert sich um die Beete · ${fmt(h.harvests)} Ernten · ${fmt(h.sold)} Gold verkauft · ${fmt(h.spent)} Gold für Saat</span>
        </div>
        <button data-act="helper-change">Wechseln</button>
        <button data-act="helper-off">Entlassen</button>
      </div>
      <label class="check"><input type="checkbox" data-act="helper-sell" ${h.sell ? 'checked' : ''}> Darf Ernte am Markt verkaufen und davon Saat kaufen</label>
      <div class="line"><span>Vorrat behalten (fürs Kochen): <b>${h.reserve}</b> je Pflanze</span>
        <span><button data-act="helper-res" data-v="-1">−</button> <button data-act="helper-res" data-v="1">+</button></span></div>
      <div class="plans">${garden.beds().map((_, i) => `<label>Beet ${i + 1} ${options(i)}</label>`).join('')}</div>
      <div class="line"><span>Kasse des Helfers: <b class="gold-text">${fmt(gardener.purse())} Gold</b></span>
        <span><button data-act="helper-deposit" ${state.gold >= gardener.DEPOSIT ? '' : 'disabled'}>+${gardener.DEPOSIT} einzahlen</button>
        <button data-act="helper-withdraw" ${gardener.purse() ? '' : 'disabled'}>Kasse leeren</button></span></div>
      ${h.sell ? '' : '<p class="note">Ohne Verkaufserlaubnis erntet der Helfer nur und pflanzt nur mit Saatpäckchen vom Markt.</p>'}
    </div>`;
  }

  function renderGarden() {
    const now = Date.now();
    const bedCards = garden.beds().map((b, i) => {
      if (!b) {
        return `<button class="bed empty${gardenSel === i ? ' sel' : ''}" data-act="bed" data-v="${i}"><b>Beet ${i + 1}</b><span>leer – pflanzen</span></button>`;
      }
      const c = garden.crop(b.crop);
      const g = garden.growth(i, now);
      return `<div class="bed${g >= 1 ? ' ready' : ''}" data-crop-img="${c.id}">
        <b>Beet ${i + 1} · ${c.name}</b>
        ${g >= 1 ? '<span class="gold-text">reif!</span>' : `<span data-bed-time="${i}">${clock(garden.remaining(i, now))}</span>`}
        <div class="bar"><i data-bed-bar="${i}" style="width:${g * 100}%"></i></div>
      </div>`;
    }).join('');
    const price = garden.nextBedPrice();
    const seeds = gardenSel === null ? '' : `
      <div class="chest picker">
        <div class="line"><span>Was soll in Beet ${gardenSel + 1} wachsen?</span><button data-act="bed-close">Abbrechen</button></div>
        <div class="seeds">${garden.available().map((c) => `
          <button class="seed" data-act="plant" data-v="${c.id}" data-crop-img="${c.id}" ${state.gold >= c.seed ? '' : 'disabled'}>
            <b>${c.name}</b><span>${c.minutes} min · ${c.yield}× Ernte</span><span class="gold-text">${c.seed} Gold</span>
          </button>`).join('')}</div>
      </div>`;
    overlay.innerHTML = `
      <section class="panel gardenpanel">
        ${head('Garten')}
        <p class="lead">Pflanzen wachsen in echter Zeit weiter, auch wenn das Spiel geschlossen ist. Gekocht wird am Kamin im Haus.</p>
        <div class="leader-actions">
          <button class="big" data-act="harvest" ${garden.readyCount(now) ? '' : 'disabled'}>Alles ernten (${garden.readyCount(now)})</button>
          ${price === null ? '' : `<button data-act="buy-bed" ${state.gold >= price ? '' : 'disabled'}>Neues Beet · ${fmt(price)} Gold</button>`}
        </div>
        ${seeds}
        <div class="beds">${bedCards}</div>
        <h4>Vorrat</h4>
        <div class="ores">${garden.available().map((c) => cropChip(c.id, garden.have(c.id))).join('')}</div>
        <h4>Gartenhelfer</h4>
        ${helperHtml()}
      </section>`;
    for (const el of overlay.querySelectorAll('[data-crop-img]')) el.prepend(picture(garden.cropImage(el.dataset.cropImg)));
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    fillCrops();
  }

  // Restzeiten jede Sekunde aktualisieren; ein reifes Beet zeichnet das Menü neu
  function updateGarden() {
    if (view !== 'garden') return;
    const now = Date.now();
    let changedState = false;
    garden.beds().forEach((b, i) => {
      const t = $(`[data-bed-time="${i}"]`);
      if (!b || !t) return;
      if (garden.ready(i, now)) changedState = true;
      t.textContent = clock(garden.remaining(i, now));
      $(`[data-bed-bar="${i}"]`).style.width = `${garden.growth(i, now) * 100}%`;
    });
    if (changedState) renderGarden();
  }

  function harvest() {
    const got = garden.harvestAll();
    const parts = Object.entries(got).map(([id, n]) => `${n}× ${garden.crop(id).name}`);
    if (!parts.length) {
      audio.play('error');
      return false;
    }
    audio.play('gold');
    toast(`Geerntet: ${parts.join(', ')}`);
    return true;
  }

  // ------------------------------------------------------------ Küche

  function renderKitchen() {
    const b = buffs.current();
    const cards = garden.recipes().map((r) => {
      const effect = r.buff
        ? `${buffs.BUFFS[r.buff].name} für ${r.minutes} Minuten`
        : `Verlängert einen laufenden Rausch um ${r.extend} Minuten`;
      return `<div class="recipe r-${r.buff ? buffs.BUFFS[r.buff].rank : 'A'}" data-recipe="${r.id}">
        <b>${r.name}</b>
        <span class="muted">${effect}</span>
        <div class="ores">${Object.entries(r.needs).map(([id, n]) => cropChip(id, garden.have(id), n)).join('')}</div>
        <button data-act="cook" data-v="${r.id}" ${garden.canCook(r) ? '' : 'disabled'}>Kochen und essen</button>
        ${r.extend && !b ? '<span class="note">Gerade ist kein Rausch aktiv.</span>' : ''}
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <section class="panel kitchenpanel">
        ${head('Kochen am Kamin')}
        <p class="lead">Aus der Ernte deines Gartens werden Gerichte, die gezielt einen Rausch geben. Ein neuer Rausch ersetzt den laufenden.</p>
        ${b ? `<p class="buff-note">Aktiv: ${buffs.BUFFS[b.id].name}, noch ${clock(buffs.remaining())}</p>` : ''}
        <div class="recipes">${cards}</div>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-recipe]')) {
      const r = garden.recipes().find((x) => x.id === el.dataset.recipe);
      const frame = document.createElement('div');
      frame.className = 'frame small';
      frame.append(picture(r.buff ? buffs.icon(r.buff) : garden.teaImage()));
      el.prepend(frame);
    }
    fillCrops();
  }

  function showMeal(r) {
    const b = buffs.current();
    const def = buffs.BUFFS[b.id];
    const el = document.createElement('div');
    el.className = `reveal r-${def.rank}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">LECKER! · ${r.name.toUpperCase()}</div>
        <div class="rank-big">${def.name.toUpperCase()}</div>
        <div class="frame"></div>
        <p>${def.text}<br>Noch ${clock(buffs.remaining())} Minuten.</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.frame', el).append(picture(r.buff ? buffs.icon(r.buff) : garden.teaImage()));
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('reveal', 4);
    onToggle(true);
  }

  // ------------------------------------------------------------ Statistik

  const SOURCES = {
    muenzen: 'Münzen auf dem Weg',
    expedition: 'Expedition',
    dungeon: 'Dungeon',
    arena: 'Bossarena',
    'arena-haendler': 'Arena-Händler',
    brunnen: 'Wunschbrunnen',
    erzhaendler: 'Erzhändler',
    schmiede: 'Schmiede',
    verkauf: 'Duplikate verkauft',
    anlagen: 'Anlagen bauen und ausbauen',
    leitung: 'Expeditionsleitung',
    garten: 'Garten (Saatgut)',
    aufgaben: 'Aufgaben im Dorf',
    gartenhelfer: 'Gartenhelfer (Kasse)',
    sternschnuppe: 'Sternschnuppen',
    begleiter: 'Geschenke der Begleiter',
    magie: 'Zauber',
    markt: 'Markt im Dorf',
    angeln: 'Angeln (Flaschenpost)',
    sonstiges: 'Sonstiges',
  };

  function renderStats() {
    const st = state.stats;
    const realH = (Date.now() - st.since) / 3600000;
    const playH = st.played / 3600;
    const perH = (n, h) => (h >= 1 / 12 ? fmt(Math.round(n / h)) : '–');
    const table = (title, rows, head2) => `
      <h4>${title}</h4>
      ${rows.length
        ? `<table class="stats"><tr><th></th>${head2.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>`
        : '<p class="muted">Noch nichts aufgezeichnet.</p>'}`;
    const goldRows = (group) => Object.entries(st[group])
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<tr><td>${SOURCES[k] || k}</td><td>${fmt(Math.round(v))}</td><td>${perH(v, realH)}</td><td>${perH(v, playH)}</td></tr>`);
    const itemRows = Object.entries(st.items)
      .sort((a, b) => b[1].n - a[1].n)
      .map(([k, v]) => `<tr><td>${SOURCES[k] || k}</td><td>${fmt(v.n)}</td><td>${fmt(v.dupes)}</td><td>${fmt(v.dupValue)}</td><td>${perH(v.dupValue, realH)}</td></tr>`);
    const since = new Date(st.since).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    overlay.innerHTML = `
      <section class="panel statspanel">
        ${head('Statistik')}
        <p class="lead">Seit ${since}: ${fmt1(realH)} h echte Zeit, davon ${fmt1(playH)} h gespielt.
          „Pro Stunde“ rechnet mit der echten Zeit (Expedition und Mine laufen auch offline), „pro Spielstunde“ nur mit der Zeit im Spiel.</p>
        ${table('Gold eingenommen', goldRows('gold'), ['Gesamt', 'pro Stunde', 'pro Spielstunde'])}
        ${table('Gold ausgegeben', goldRows('spent'), ['Gesamt', 'pro Stunde', 'pro Spielstunde'])}
        ${table('Sammelstücke erhalten', itemRows, ['Stücke', 'davon Duplikate', 'Duplikat-Wert', 'Wert pro Stunde'])}
        <p class="muted">Der Duplikat-Wert ist das Material für Entwicklungen und Verbesserungen (Verkaufswert der Duplikate).</p>
        <footer><button data-act="stats-reset" class="danger">Statistik zurücksetzen</button></footer>
      </section>`;
  }

  // ------------------------------------------------------------ Schmiede

  function renderForge() {
    if (!buildings.owned('forge')) return renderPurchase('forge', 'Schmiede');
    forgeMod.tick();
    const cats = CATEGORIES.map((c) => `<button class="tab${c.id === forgeSel.cat ? ' on' : ''}" data-act="forge-cat" data-v="${c.id}">${c.name}</button>`).join('');
    const ranks = RARITIES.map((r, t) => `<button class="tab r-${r.id}${r.id === forgeSel.rank ? ' on' : ''}" data-act="forge-rank" data-v="${r.id}"><b>${r.id}</b>${forgeMod.canForgeRank(t) ? '' : '<small>gesperrt</small>'}</button>`).join('');
    overlay.innerHTML = `
      <section class="panel forgepanel">
        ${head('Schmiede')}
        <p class="lead">Kopiere gezielt ein Sammelstück, das du schon besitzt. Kostet Gold, Erz aus der Mine und Schmiedeglut.</p>
        ${upgradeBar('forge')}
        <div class="chest glut">
          <div class="line"><span>Schmiedeglut <span id="glut-dots"></span></span><span id="glut-next" class="muted"></span></div>
        </div>
        <div class="ores">${RARITIES.map((r, t) => oreChip(t, mine.ore(t))).join('')}</div>
        <nav class="tabs">${cats}</nav>
        <nav class="tabs ranks">${ranks}</nav>
        <div class="detail" id="forge-detail"></div>
        <div class="grid" id="forge-grid"></div>
      </section>`;
    $('#forge-grid').replaceChildren(
      ...getGroup(forgeSel.cat, forgeSel.rank, realm.current()).map((item) => {
        const n = state.count(item.id);
        const el = tile(item, { hidden: !n, badge: n > 1 ? `<span class="count">×${n}</span>` : '' });
        el.dataset.act = 'forge-pick';
        if (!n) el.disabled = true;
        if (item.id === forgeSel.item) el.classList.add('sel');
        return el;
      })
    );
    fillOres();
    renderForgeDetail();
    updateForge();
  }

  function renderForgeDetail() {
    const box = $('#forge-detail');
    const item = forgeSel.item && getItem(forgeSel.item);
    if (!box) return;
    if (!item || item.cat !== forgeSel.cat || item.rank !== forgeSel.rank) {
      box.className = 'detail';
      box.innerHTML = '<p class="muted">Wähle ein eigenes Stück aus, um es zu kopieren.</p>';
      return;
    }
    const c = forgeMod.cost(item);
    const why = forgeMod.blocker(item);
    box.className = `detail r-${item.rank}`;
    box.innerHTML = `
      <div class="frame"></div>
      <div class="info">
        <h3>${item.name}</h3>
        <p><b class="rank-text">Rang ${item.rank}</b> · ${item.catName} · im Besitz: ${state.count(item.id)}</p>
        <p class="forge-cost"><span class="gold-text">${fmt(c.gold)} Gold</span> · <span class="price" data-ore="${item.tier}">${c.ore}</span> · <span class="glut-cost">${c.glut} Glut</span></p>
        <button class="big" data-act="forge-make" ${why ? 'disabled' : ''}>Kopie schmieden</button>
        ${why ? `<p class="note">${why}</p>` : `<p class="muted">Verkaufswert der Kopie: ${fmt(item.sell)} Gold</p>`}
      </div>`;
    $('.frame', box).append(sprite(item));
    fillOres(box);
  }

  // Glutanzeige, jede Sekunde aktualisiert
  function updateForge() {
    const dots = $('#glut-dots');
    if (!dots) return;
    forgeMod.tick();
    const max = forgeMod.maxGlut();
    const g = forgeMod.glut();
    dots.innerHTML = Array.from({ length: max }, (_, i) => `<i class="ember${i < g ? ' on' : ''}"></i>`).join('') + ` <b>${g}/${max}</b>`;
    const sec = forgeMod.nextGlutIn();
    $('#glut-next').textContent = sec ? `nächste Glut in ${clock(sec)} · alle ${fmt1(forgeMod.glutMinutes())} min` : 'voll';
  }

  // ------------------------------------------------------------ Mine

  const oreChip = (t, n) => `<span class="ore-chip r-${RARITIES[t].id}" data-ore="${t}"><b>${fmt(n)}</b> ${mine.LEVELS[t].ore}</span>`;
  const fillOres = (root = overlay) => {
    for (const el of root.querySelectorAll('[data-ore]')) el.prepend(picture(mine.oreImage(Number(el.dataset.ore))));
  };

  function renderMine() {
    if (!buildings.owned('mine')) return renderPurchase('mine', 'Mine');
    mine.tick();
    const { place, mineLevel } = where();
    const inMine = place === 'mine';
    const levels = mine.LEVELS.map((lv, l) => {
      const rank = RARITIES[l].id;
      if (!mine.unlocked(l)) {
        return `<div class="mine-level r-${rank} locked"><b><i>${rank}</i> Ebene ${l + 1} · ${lv.name}</b><span class="lock">Mine auf Rang ${rank} ausbauen</span></div>`;
      }
      const slots = mine.workers(l).map((w, s) => {
        const on = mineSel && mineSel.l === l && mineSel.s === s ? ' sel' : '';
        return w
          ? `<button class="tile r-${w.rank}${on}" data-act="mine-slot" data-l="${l}" data-s="${s}" data-sprite="${w.id}" title="${w.name}"><span class="rank">${w.rank}</span><span class="count">${RARITIES[mine.levelOf(w.id)].id}</span></button>`
          : `<button class="tile empty-slot${on}" data-act="mine-slot" data-l="${l}" data-s="${s}">frei</button>`;
      }).join('');
      return `<div class="mine-level r-${rank}${inMine && l === mineLevel ? ' here' : ''}">
        <b><i>${rank}</i> Ebene ${l + 1} · ${lv.name}</b>
        <div class="mine-slots">${slots}</div>
        <span class="mine-rate" data-ore="${l}"><span class="gold-text">${fmt1(mine.levelRate(l))}</span> ${lv.ore} / min</span>
        ${inMine ? (l === mineLevel ? '<span class="tag">hier</span>' : `<button data-act="travel" data-v="${l}">Hinfahren</button>`) : ''}
      </div>`;
    }).join('');

    overlay.innerHTML = `
      <section class="panel minepanel">
        ${head('Mine')}
        ${upgradeBar('mine')}
        <div class="ores">${RARITIES.map((r, t) => oreChip(t, mine.ore(t))).join('')}</div>
        <div class="leader-actions">
          <button data-act="mine-auto">Automatisch besetzen</button>
          ${inMine ? '<button data-act="travel" data-v="-1">Zur Oberfläche</button>' : ''}
          <span class="muted">Bis zu drei Monster je Ebene. Erz sammelt sich von selbst, auch offline (bis zu 8 Stunden).</span>
        </div>
        ${minePicker()}
        <div class="mine-levels">${levels}</div>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    fillOres();
  }

  function minePicker() {
    if (!mineSel) return '';
    const { l, s } = mineSel;
    const current = state.mine.slots[l][s];
    const list = mine.candidates().slice(0, 44);
    let detail = '';
    const item = current && state.count(current) && getItem(current);
    if (item) {
      const level = mine.levelOf(item.id);
      const cost = mine.levelCost(item);
      detail = `<div class="crow r-${RARITIES[level].id}">
        <div class="info"><b>${item.name}</b>
          <span>Rang ${item.rank} · Stufe <span class="evo">${RARITIES[level].id}</span> ·
          ${fmt1(mine.digsPerMinute(item))} Hiebe/min × ${mine.yieldOf(item)} Erz
          ${cost === null ? '' : `→ ${fmt1(mine.digsPerMinute(item, level + 1))} × ${mine.yieldOf(item, level + 1)}`}</span></div>
        ${cost === null
          ? `<button disabled>${mine.capped(level) ? 'Minen-Rang nötig' : 'Maximal'}</button>`
          : `<button data-act="mine-up" data-id="${item.id}" ${mine.material() >= cost ? '' : 'disabled'}>→ ${RARITIES[level + 1].id} · ${fmt(cost)}</button>`}
      </div>
      <p class="muted">Verbessert wird mit Monster-Duplikaten (Verkaufswert). Verfügbar: <b class="gold-text">${fmt(mine.material())}</b>.</p>`;
    }
    const tiles = list.map((m) => {
      const at = mine.assignedAt(m.id);
      return `<button class="tile r-${m.rank}${m.id === current ? ' picked' : ''}" data-act="mine-pick" data-id="${m.id}" data-sprite="${m.id}" title="${m.name}">
        <span class="rank">${m.rank}</span><span class="count">${RARITIES[mine.levelOf(m.id)].id}</span>${at >= 0 && m.id !== current ? `<span class="new">${RARITIES[at].id}</span>` : ''}</button>`;
    }).join('');
    return `<div class="chest picker">
      <div class="line"><span>Monster für Ebene ${l + 1}, Platz ${s + 1}</span>
        <span><button data-act="mine-pick" data-id="" ${current ? '' : 'disabled'}>Abziehen</button> <button data-act="mine-close">Fertig</button></span></div>
      ${detail}
      ${list.length ? `<div class="grid heroes">${tiles}</div>` : '<p class="muted">Du besitzt noch keine Monster – ziehe welche am Wunschbrunnen.</p>'}
    </div>`;
  }

  // ------------------------------------------------------------ Erzhändler

  function renderTrader() {
    if (!trader.present()) {
      overlay.innerHTML = `
        <section class="panel">
          ${head('Erzhändler')}
          <p class="lead">Der Erzhändler ist gerade nicht da.</p>
          <p class="muted">Er kommt nur selten vorbei – alle ${trader.CHECK_MINUTES} Minuten Spielzeit mit ${percent(trader.ARRIVE_CHANCE)} Chance – und setzt sich dann
          für ${trader.STAY_MINUTES} Minuten neben den Wunschbrunnen. Sammle bis dahin Erz in der Mine.</p>
          <div class="ores">${RARITIES.map((r, t) => oreChip(t, mine.ore(t))).join('')}</div>
        </section>`;
      fillOres();
      return;
    }
    const offers = trader.offers().map((o, i) => {
      const item = getItem(o.id);
      const can = !o.sold && mine.ore(o.tier) >= o.price;
      return `<div class="offer r-${item.rank}${o.sold ? ' sold' : ''}">
        <div class="tile r-${item.rank}" data-sprite="${item.id}"><span class="rank">${item.rank}</span>${state.count(item.id) ? '' : '<span class="new">NEU</span>'}</div>
        <b>${item.name}</b>
        <span class="price" data-ore="${o.tier}">${o.price}</span>
        <button data-act="trader-buy" data-v="${i}" ${can ? '' : 'disabled'}>${o.sold ? 'Verkauft' : 'Tauschen'}</button>
      </div>`;
    }).join('');
    const left = trader.surpriseLeft();
    const surprise = RARITIES.map((r, t) => `
      <button class="level r-${r.id}" data-act="trader-surprise" data-v="${t}" ${left > 0 && mine.ore(t) >= trader.SURPRISE_PRICE[t] ? '' : 'disabled'}>
        <b><i>${r.id}</i>Überraschung</b><span class="price" data-ore="${t}">${trader.SURPRISE_PRICE[t]}</span>
      </button>`).join('');
    overlay.innerHTML = `
      <section class="panel traderpanel">
        ${head('Erzhändler')}
        <p class="lead">„Feines Erz hast du da! Ich tausche gegen Schätze aus aller Welt.“ · zieht weiter in <b id="trader-time"></b></p>
        <div class="ores">${RARITIES.map((r, t) => oreChip(t, mine.ore(t))).join('')}</div>
        <h4>Angebote</h4>
        <div class="offers">${offers}</div>
        <h4>Überraschungstausch · noch ${left}× bei diesem Besuch</h4>
        <p class="muted">Ein zufälliges Sammelstück im Rang des Erzes.</p>
        <div class="levels">${surprise}</div>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
    fillOres();
    updateTrader();
  }

  function updateTrader() {
    const el = $('#trader-time');
    if (el) el.textContent = clock(trader.remaining());
    if (view === 'trader' && !trader.present() && el) renderTrader();
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
          <p><b>${b.name}</b> – noch nicht gebaut. Nach dem Bau hat die Anlage Rang <b class="r-${realm.inRealm() ? 'B' : 'D'} evo">${realm.inRealm() ? 'B' : 'D'}</b>${realm.inRealm() ? ' (Portalwelt)' : ''};
          jeder Ausbau schaltet den nächsten Rang frei.</p>
          <p class="muted">${b.unlocks}</p>
          <div class="line"><button class="big" data-act="build" data-id="${id}" ${state.gold >= buildings.nextCost(id) ? '' : 'disabled'}>Bauen<small>${fmt(buildings.nextCost(id))} Gold</small></button></div>
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
    dungeon.party.clean();
    const status = dungeon.status();
    const run = dungeon.run();

    if (run) {
      const level = dungeon.LEVELS[run.level];
      overlay.innerHTML = `
        <section class="panel dungeon r-${level.rank}">
          ${head('Dungeon')}
          <p class="lead"><b class="evo">${level.rank}</b> · ${level.name} · Stärke beim Aufbruch ${fmt(run.power ?? dungeon.power())} · Erfolgschance ${percent(dungeon.chance(run.level, run.power ?? dungeon.power()))}</p>
          <div class="party${status === 'running' ? ' away' : ''}" id="party"></div>
          <div class="chest">
            <div class="line"><span id="run-text"></span></div>
            <div class="bar"><i id="run-bar"></i></div>
            <div class="line">
              <button class="big" data-act="dungeon-collect" id="run-collect">Ergebnis abholen</button>
              <button data-act="dungeon-abort" id="run-abort">Abbrechen (ohne Beute)</button>
            </div>
          </div>
          <h4>Team</h4>
          ${membersHtml('dungeon')}
        </section>`;
      $('#party').replaceChildren(...run.heroes.filter((id) => getItem(id)).map((id) => tile(getItem(id))));
      for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
      updateDungeon();
      return;
    }

    if (!dungeon.unlocked(pick.level)) pick.level = buildings.tier('dungeon');
    const power = dungeon.power();
    const odds = dungeon.chance(pick.level, power);
    const level = dungeon.LEVELS[pick.level];
    const heroes = dungeon.party.heroIds().length;
    const levels = dungeon.LEVELS.map((l, i) => `
      <button class="level r-${l.rank}${i === pick.level ? ' on' : ''}" data-act="level" data-v="${i}" ${dungeon.unlocked(i) ? '' : 'disabled'}>
        <b><i>${l.rank}</i>${l.name}</b>
        <span>${duration(l.seconds)} · Stärke ${fmt(l.need)}</span>
        <span class="gold-text">~${fmt(l.gold)} Gold</span>
        <span>${l.standard ? `${l.standard}× D + ` : ''}${l.bonus}× ${l.minTier ? `ab ${dungeon.rankOf(l.minTier)}` : 'Zufall'}</span>
        ${dungeon.unlocked(i) ? '' : `<span class="lock">Tor-Rang ${l.rank} nötig</span>`}
      </button>`).join('');

    overlay.innerHTML = `
      <section class="panel dungeon">
        ${head('Dungeon')}
        <p class="lead">Rüste bis zu ${dungeon.MAX_HEROES} Helden aus und schicke sie los. Je länger der Dungeon, desto gefährlicher – und desto mehr Beute.</p>
        ${upgradeBar('dungeon')}
        <h4>Gefahrenstufe</h4>
        <div class="levels">${levels}</div>
        <h4>Team · Stärke ${fmt(power)}</h4>
        ${membersHtml('dungeon')}
        <div class="chest">
          <div class="line odds">
            <span>Team-Stärke <b>${fmt(power)}</b> / ${fmt(level.need)}</span>
            <span>Erfolgschance <b class="${odds >= 0.7 ? 'good' : odds >= 0.35 ? 'mid' : 'bad'}">${heroes ? percent(odds) : '–'}</b></span>
          </div>
          <p class="muted">Gleiche Stärke-Rechnung wie in der Arena: Held plus Ausrüstung, jeweils nach Rang und Stufe. Scheitert die Erkundung, gibt es keine Beute.</p>
          <div class="line">
            <button class="big" data-act="dungeon-start" ${heroes ? '' : 'disabled'}>Losschicken · ${duration(level.seconds)}</button>
          </div>
        </div>
      </section>`;
    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
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

    for (const el of overlay.querySelectorAll('[data-sprite]')) el.prepend(sprite(getItem(el.dataset.sprite))); for (const el of overlay.querySelectorAll('[data-cape]')) el.prepend(picture(tailor.capeImage(Number(el.dataset.cape))));
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

  // Set-Fortschritt der gewählten Gruppe und alle aktiven Set-Boni
  function setPanel() {
    const t = RARITIES.findIndex((r) => r.id === filter.rank);
    const have = sets.progress(filter.cat, t);
    const done = have >= PER_GROUP;
    const active = sets.activeBonuses();
    const cat = CATEGORIES.find((c) => c.id === filter.cat).name;
    return `<div class="chest setpanel r-${filter.rank}${done ? ' done' : ''}">
      <div class="line"><span><b>Set ${cat} · Rang ${filter.rank}</b> ${done ? '✓ vollständig' : `${have}/${PER_GROUP}`}</span>
        <span class="${done ? 'gold-text' : 'muted'}">Bonus: ${sets.describe(filter.cat, t)}</span></div>
      <div class="bar"><i style="width:${(have / PER_GROUP) * 100}%"></i></div>
      ${active.length ? `<p class="muted">Aktive Set-Boni: ${active.join(' · ')}</p>` : ''}
    </div>`;
  }

  function showSetComplete({ cat, tier }) {
    const name = CATEGORIES.find((c) => c.id === cat).name;
    const rank = RARITIES[tier].id;
    const el = document.createElement('div');
    el.className = `reveal r-${rank}`;
    el.innerHTML = `
      <div class="rays"></div>
      <div class="card">
        <div class="source">SAMMEL-SET VOLLSTÄNDIG</div>
        <div class="rank-big">${name.toUpperCase()} · ${rank}</div>
        <div class="grid set-grid"></div>
        <h3>${sets.describe(cat, tier)}</h3>
        <p>Alle ${PER_GROUP} Stücke gesammelt – der Bonus gilt ab sofort dauerhaft.</p>
        <button data-act="reveal-next">Weiter</button>
      </div>`;
    $('.set-grid', el).replaceChildren(...getGroup(cat, rank).slice(0, 10).map((item) => sprite(item)));
    document.body.append(el);
    $('button[data-act]', el).focus();
    audio.play('reveal', 5);
    onToggle(true);
  }

  function renderGallery() {
    const realmsShown = state.realm.type ? [...new Set([state.realm.type, ...dimension.known()])] : [];
    if (filter.world !== 'normal' && !realmsShown.includes(filter.world)) filter.world = 'normal';
    const W = filter.world;
    const all = worldItems(W);
    // Welten: Heimat und – sobald das Portal steht – die Portalwelt
    const worlds = state.realm.type
      ? `<nav class="tabs worlds">${['normal', ...realmsShown].map((w) => {
          const have = state.collected(worldItems(w));
          return `<button class="tab world-${w}${W === w ? ' on' : ''}" data-act="gal-world" data-v="${w}">${w === 'normal' ? 'Heimat' : dimension.visited(w) ? realm.WORLDS[w].name : '??? (Portalwelt)'}<small>${have}/${worldItems(w).length}</small></button>`;
        }).join('')}</nav>`
      : '';
    const cats = CATEGORIES.map((c) => {
      const mine = state.collected(all.filter((i) => i.cat === c.id));
      return `<button class="tab${c.id === filter.cat ? ' on' : ''}" data-act="cat" data-v="${c.id}">${c.name}<small>${mine}/${PER_GROUP * RARITIES.length}</small></button>`;
    }).join('');
    const ranks = RARITIES.map((r) => {
      const have = state.collected(getGroup(filter.cat, r.id, W));
      return `<button class="tab r-${r.id}${r.id === filter.rank ? ' on' : ''}" data-act="rank" data-v="${r.id}"><b>${r.id}</b><small>${have >= PER_GROUP ? '✓ Set' : `${have}/${PER_GROUP}`}</small></button>`;
    }).join('');
    const dupes = state.duplicateValue();

    overlay.innerHTML = `
      <section class="panel gallery">
        ${head('Galerie')}
        ${worlds}
        <p class="lead">${fmt(state.collected(all))} von ${fmt(all.length)} Sammelstücken ${W === 'normal' ? 'der Heimat' : `aus ${W === 'hoelle' ? 'der Hölle' : 'dem Himmel'}`} entdeckt</p>
        <nav class="tabs">${cats}</nav>
        <nav class="tabs ranks">${ranks}</nav>
        ${W === 'normal' ? setPanel() : ''}
        <div class="grid" id="gallery-grid"></div>
        <div class="detail" id="detail"></div>
        <footer>
          <button data-act="sell-all" ${dupes ? '' : 'disabled'}>Alle Duplikate verkaufen${dupes ? ` (+${fmt(dupes)} Gold)` : ''}</button>
        </footer>
      </section>`;

    $('#gallery-grid').replaceChildren(
      ...getGroup(filter.cat, filter.rank, W).map((item) => {
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
    if (!item || item.cat !== filter.cat || item.rank !== filter.rank || item.world !== filter.world) {
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
        ${buildings.owned('forge') ? `<button data-act="forge-item" data-id="${item.id}">In der Schmiede kopieren</button>` : ''}
        ${magic.spellOf(item.id) ? `<p class="muted">Lehrt den Zauber <b>${magic.spellOf(item.id).name}</b>${magic.learned(item.id) ? ' (gelernt)' : ''}: ${magic.spellOf(item.id).text}</p>` : ''}
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
    if (tileEl && view === 'well') {
      const item = getItem(tileEl.dataset.id);
      filter = { cat: item.cat, rank: item.rank, world: item.world };
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
    if (act === 'pull') pull(btn.dataset.n === 'spirit' ? 'spirit' : Number(btn.dataset.n));
    if (act === 'build') {
      // Das Schicksal entscheidet beim Bau, welche Welt hinter dem Portal liegt
      if (btn.dataset.id === 'portal' && !buildings.owned('portal') && state.gold >= buildings.BUILDINGS.portal.buy && !state.realm.type) {
        state.realm.type = realm.REALMS[Math.floor(Math.random() * realm.REALMS.length)];
      }
      if (!buildings.advance(btn.dataset.id)) audio.play('error');
      else {
        audio.play('build');
        const b = buildings.BUILDINGS[btn.dataset.id];
        toast(b.upgrades.length ? `${b.name}: Rang ${buildings.rank(btn.dataset.id)}` : `${b.name} gebaut! Stell dich davor und drücke E.`);
        exp.rebuilt();
      }
      show(view);
    }
    if (act === 'outfit') {
      if (!tailor.sewn(btn.dataset.id)) {
        audio.play('error');
        toast('Diese Kleidung musst du erst am Nähtisch nähen.');
        return;
      }
      state.outfit = btn.dataset.id;
      onOutfit(btn.dataset.id);
      audio.play('levelUp');
      if (view === 'tailor') renderTailor();
      else renderWardrobe();
    }
    if (act === 'quest-done') {
      const res = village.complete(talkTo);
      if (!res) audio.play('error');
      else {
        reveals.push({ questDone: res });
        if (res.item) reveals.push({ item: res.item, isNew: res.isNew, source: 'BELOHNUNG' });
        renderVillager();
        nextReveal();
      }
    }
    if (act === 'quest-skip') { village.decline(talkTo); renderVillager(); }
    if (act === 'market-tab') { marketTab = btn.dataset.v; renderMarket(); }
    if (act === 'buy-seed') { audio.play(village.buySeeds(btn.dataset.v, Number(btn.dataset.n)) ? 'coin' : 'error'); renderMarket(); }
    if (act === 'sell-crop') { if (village.sellCrops(btn.dataset.v)) audio.play('sell'); renderMarket(); }
    if (act === 'sell-fish') { if (village.sellFish(btn.dataset.v)) audio.play('sell'); renderMarket(); }
    if (act === 'market-buy') {
      const got = village.buyStock(Number(btn.dataset.v));
      if (!got) audio.play('error');
      else {
        reveals.push({ ...got, source: 'MARKT' });
        renderMarket();
        nextReveal();
      }
    }
    if (act === 'market-sell') { if (village.sellWanted(Number(btn.dataset.v))) audio.play('sell'); renderMarket(); }
    if (act === 'helper-pick') { gardener.assign(btn.dataset.id); helperPick = false; audio.play('levelUp'); renderGarden(); }
    if (act === 'helper-change') { helperPick = true; renderGarden(); }
    if (act === 'helper-close') { helperPick = false; renderGarden(); }
    if (act === 'helper-off') { gardener.assign(null); renderGarden(); }
    if (act === 'helper-res') { gardener.setReserve(gardener.info().reserve + Number(btn.dataset.v)); renderGarden(); }
    if (act === 'helper-deposit') { audio.play(gardener.deposit() ? 'coin' : 'error'); renderGarden(); }
    if (act === 'helper-withdraw') { if (gardener.withdraw()) audio.play('gold'); renderGarden(); }
    if (act === 'comp-feed') {
      const res = care.feed(btn.dataset.v, btn.dataset.crop);
      if (!res) audio.play('error');
      else {
        audio.play(res.up ? 'levelUp' : 'pick');
        if (companions.active()?.id === btn.dataset.v) companions.cheer();
        if (res.up) toast(`♥ ${companions.companion(btn.dataset.v).name} ist jetzt auf Freundschaftsstufe ${res.level}!`);
        renderCompanions();
      }
    }
    if (act === 'comp-pick') { companions.setActive(btn.dataset.v || null); audio.play('click'); renderCompanions(); }
    if (act === 'portal-go') { show(null); onPortal?.(btn.dataset.v); return; }
    if (act === 'tailor-tab') { tailorTab = btn.dataset.v; renderTailor(); }
    if (act === 'sew-cape') { audio.play(tailor.sewCape(Number(btn.dataset.v)) ? 'build' : 'error'); renderTailor(); }
    if (act === 'sew-outfit') {
      if (tailor.sewOutfit(btn.dataset.v)) { audio.play('levelUp'); toast(`✂ ${OUTFITS.find((o) => o.id === btn.dataset.v).name} genäht – im Kleiderschrank oder gleich hier anziehen.`); }
      else audio.play('error');
      renderTailor();
    }
    if (act === 'sew-decor') {
      if (tailor.buyDecor(btn.dataset.v)) { audio.play('build'); toast(`♥ ${tailor.decor(btn.dataset.v).name} schmückt jetzt dein Haus.`); }
      else audio.play('error');
      renderTailor();
    }
    if (act === 'refine') { audio.play(tailor.refine(btn.dataset.v, Number(btn.dataset.t)) ? 'coin' : 'error'); renderTailor(); }
    if (act === 'spell-school') { spellSchool = btn.dataset.v; renderTower(); }
    if (act === 'learn') { audio.play(magic.learn(btn.dataset.v) ? 'levelUp' : 'error'); renderTower(); }
    if (act === 'cast') {
      const id = btn.dataset.v;
      const note = magic.cast(id, { onRain: (s) => onCast?.(id, s) });
      if (!note) audio.play('error');
      else {
        audio.play('spell');
        toast(`✦ ${magic.spell(id).name}: ${note}`);
        onCast?.(id);
        renderTower();
      }
    }
    if (act === 'trap-up') { audio.play(fishtrap.upgrade() ? 'build' : 'error'); renderTrap(); }
    if (act === 'trap-collect') {
      const got = fishtrap.collect();
      const fresh = got.filter((g) => g.isNew).map((g) => g.fish.name);
      toast(`${got.length} Fische aus der Reuse${fresh.length ? ` – neu im Angelbuch: ${fresh.join(', ')}` : ''}`);
      audio.play('gold');
      renderTrap();
    }
    if (act === 'bed') { gardenSel = Number(btn.dataset.v); renderGarden(); }
    if (act === 'bed-close') { gardenSel = null; renderGarden(); }
    if (act === 'plant') {
      audio.play(garden.plant(gardenSel, btn.dataset.v) ? 'levelUp' : 'error');
      gardenSel = null;
      renderGarden();
    }
    if (act === 'harvest') { harvest(); renderGarden(); }
    if (act === 'buy-bed') { audio.play(garden.buyBed() ? 'build' : 'error'); renderGarden(); }
    if (act === 'cook') {
      const r = garden.cook(btn.dataset.v);
      if (!r) audio.play('error');
      else {
        reveals.push({ meal: r });
        renderKitchen();
        nextReveal();
      }
    }
    if (act === 'stats-reset') {
      if (confirm('Statistik zurücksetzen? Der Spielstand bleibt erhalten.')) {
        state.resetStats();
        renderStats();
      }
    }
    if (act === 'forge-cat') { forgeSel.cat = btn.dataset.v; renderForge(); }
    if (act === 'forge-rank') { forgeSel.rank = btn.dataset.v; renderForge(); }
    if (act === 'forge-pick') { forgeSel.item = btn.dataset.id; renderForge(); }
    if (act === 'forge-make') {
      const got = forgeMod.forge(forgeSel.item);
      if (!got) audio.play('error');
      else {
        audio.play('build');
        reveals.push({ ...got, source: 'SCHMIEDE' });
        renderForge();
        nextReveal();
      }
    }
    if (act === 'forge-item') {
      const item = getItem(btn.dataset.id);
      Object.assign(forgeSel, { cat: item.cat, rank: item.rank, item: item.id });
      show('forge');
    }
    if (act === 'mine-slot') {
      const sel = { l: Number(btn.dataset.l), s: Number(btn.dataset.s) };
      mineSel = mineSel && mineSel.l === sel.l && mineSel.s === sel.s ? null : sel;
      renderMine();
    }
    if (act === 'mine-close') { mineSel = null; renderMine(); }
    if (act === 'mine-pick' && mineSel) { mine.assign(mineSel.l, mineSel.s, btn.dataset.id || null); renderMine(); }
    if (act === 'mine-auto') { mine.autoAssign(); mineSel = null; audio.play('levelUp'); renderMine(); }
    if (act === 'mine-up') { audio.play(mine.levelUp(getItem(btn.dataset.id)) ? 'levelUp' : 'error'); renderMine(); }
    if (act === 'travel') { show(null); onTravel(Number(btn.dataset.v)); }
    if (act === 'trader-buy' || act === 'trader-surprise') {
      const got = act === 'trader-buy' ? trader.buyOffer(Number(btn.dataset.v)) : trader.surprise(Number(btn.dataset.v));
      if (!got) audio.play('error');
      else {
        reveals.push({ ...got, source: 'ERZHÄNDLER' });
        renderTrader();
        nextReveal();
      }
    }
    if (act === 'arena-tab') { arenaTab = btn.dataset.v; renderArena(); }
    if (act === 'slot') {
      const pk = btn.dataset.p;
      const sel = { i: Number(btn.dataset.i), key: btn.dataset.k };
      const cur = partySel[pk];
      partySel[pk] = cur && cur.i === sel.i && cur.key === sel.key ? null : sel;
      rerenderParty(pk);
    }
    if (act === 'slot-close') { partySel[btn.dataset.p] = null; rerenderParty(btn.dataset.p); }
    if (act === 'equip') {
      const pk = btn.dataset.p;
      const sel = partySel[pk];
      if (sel && !PARTY[pk]().equip(sel.i, sel.key, btn.dataset.id || null)) audio.play('error');
      rerenderParty(pk);
    }
    if (act === 'equip-cape') {
      const pk = btn.dataset.p;
      const sel = partySel[pk];
      if (sel && !PARTY[pk]().equipCape(sel.i, btn.dataset.v === '' ? null : Number(btn.dataset.v))) audio.play('error');
      rerenderParty(pk);
    }
    if (act === 'auto-equip') { PARTY[btn.dataset.p]().autoEquip(); partySel[btn.dataset.p] = null; rerenderParty(btn.dataset.p); }
    if (act === 'gear-up') { audio.play(PARTY[btn.dataset.p]().levelUp(getItem(btn.dataset.id)) ? 'levelUp' : 'error'); rerenderParty(btn.dataset.p); }
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
    if (act === 'dungeon-start') { audio.play(dungeon.start(pick.level) ? 'start' : 'error'); renderDungeon(); }
    if (act === 'dungeon-abort') { dungeon.abort(); renderDungeon(); }
    if (act === 'dungeon-collect') collectDungeon();
    if (act === 'leader') { exp.setLeader(btn.dataset.id); renderExpedition(); }
    if (act === 'leader-evolve') { audio.play(exp.evolveLeader() ? 'levelUp' : 'error'); renderExpedition(); }
    if (act === 'evolve') { audio.play(exp.evolve(getItem(btn.dataset.id)) ? 'levelUp' : 'error'); renderExpedition(); }
    if (act === 'cat') { filter.cat = btn.dataset.v; renderGallery(); }
    if (act === 'gal-world') { filter.world = btn.dataset.v; renderGallery(); }
    if (act === 'rank') { filter.rank = btn.dataset.v; renderGallery(); }
    if (act === 'sell') { if (state.sellDuplicates(btn.dataset.id)) audio.play('sell'); renderGallery(); }
    if (act === 'sell-all') { if (state.sellAllDuplicates()) audio.play('sell'); renderGallery(); }
    audio.click();
  });

  // Auswahlfelder und Häkchen (Gartenhelfer)
  overlay.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'helper-plan') { gardener.setPlan(Number(el.dataset.i), el.value); renderGarden(); }
    if (el.dataset.act === 'helper-sell') { gardener.setSell(el.checked); renderGarden(); }
    if (el.dataset.act === 'dupe-mode') { dupeMode = el.checked; audio.click(); renderWell(); }
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
    openWardrobe: () => show('wardrobe'),
    openMine: () => show('mine'),
    openForge: () => show('forge'),
    openStats: () => show('stats'),
    openGarden: () => show('garden'),
    talk(id) {
      talkTo = id;
      show('villager');
    },
    openMarket: () => show('market'),
    openFishBook: () => show('fishbook'),
    openTrap: () => show('trap'),
    openTower: () => show('tower'),
    openCompanions: () => show('companions'),
    openTailor: () => show('tailor'),
    openPortal: () => show('portal'),
    // erste Ankunft in der Portalwelt
    realmArrived(type) {
      reveals.push({ realm: type });
      if (!$('.reveal')) nextReveal();
    },
    // neuer Begleiter: Pop-up
    // Geschenk vom Begleiter
    companionGift(res) {
      if (res.item) {
        toast(`🎁 ${res.c.name} bringt dir etwas Besonderes!`);
        reveals.push({ item: res.item, isNew: res.isNew, source: `GESCHENK VON ${res.c.name.toUpperCase()}` });
        if (!$('.reveal')) nextReveal();
        return;
      }
      const what = res.kind === 'gold' ? `${fmt(res.n)} Gold` : res.kind === 'mana' ? `${res.n} Mana` : `${res.n}× ${res.what}${res.kind === 'seeds' ? ' (Saat)' : ''}`;
      toast(`🎁 ${res.c.name} bringt dir ein Geschenk: ${what}`);
    },
    foundCompanion(c) {
      reveals.push({ companion: c });
      if (!$('.reveal')) nextReveal();
    },
    // Wunsch an eine Sternschnuppe
    wished(res) {
      if (res.item) {
        toast('Eine Sternschnuppe! Dein Wunsch geht in Erfüllung …');
        reveals.push({ item: res.item, isNew: res.isNew, source: 'STERNSCHNUPPE' });
        if (!$('.reveal')) nextReveal();
      } else if (res.mana) toast(`✦ Sternschnuppe: +${res.mana} Mana`);
      else toast(`✦ Sternschnuppe: +${fmt(res.gold)} Gold`);
    },
    updateTower,
    refreshGarden() {
      if (view === 'garden') renderGarden();
    },
    refreshTrap() {
      if (view === 'trap') renderTrap();
    },
    updateMarket,
    caught(res) {
      if (res.treasure) {
        toast('Eine Flaschenpost! Darin steckt etwas …');
        reveals.push({ item: res.item, isNew: res.isNew, source: 'FLASCHENPOST' });
      } else if (res.tier < HIGHLIGHT_TIER) {
        toast(`Gefangen: ${res.fish.name} (Rang ${RARITIES[res.tier].id})${res.isNew ? ' – neu im Angelbuch!' : ''}`);
        audio.play('coin');
        return;
      } else reveals.push({ catch: res });
      if (!$('.reveal')) nextReveal();
    },
    openKitchen: () => show('kitchen'),
    harvest,
    updateGarden,
    setComplete(cat, tier) {
      reveals.push({ setDone: { cat, tier } });
      // erst nach dem laufenden Ereignis anzeigen, damit es keine anderen Pop-ups verdrängt
      setTimeout(() => {
        if (!$('.reveal')) nextReveal();
      }, 0);
    },
    updateForge,
    openTrader: () => show('trader'),
    updateTrader,
    refreshMine() {
      if (view === 'mine') renderMine();
    },
    wakeUp(buffId) {
      reveals.push({ wake: buffId });
      nextReveal();
    },
    openExpedition: () => show('expedition'),
    openWell: () => show('well'),
    openGallery: () => show('gallery'),
    close: () => show(null),
  };
}
