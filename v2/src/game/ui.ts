/* DOM overlay UI: menu, map, journal, cards, HUD. Fully i18n'd (tr/en/de),
   every tree name carries a 🔊 listen button (never triggers selection). */
import { S, setLang, getLang, LANGS, type Lang } from '../core/i18n';
import { TREES, treeName } from '../core/trees';
import { TOOLS, type Eye } from '../core/config';
import { WORLD, LEVEL_META, type ClueTier } from '../core/world';
import { familyStars, pick3 } from '../core/logic';
import type { SaveData } from '../core/save';
import { getTreeArt, getChoiceArt } from './art';
import { speak } from './audio';

export interface UICallbacks {
  onStart(levelIdx: number): void;
  onResume(): void;
  onRetry(): void;
  onNextLevel(): void;
  onLangChange(l: Lang): void;
  onMuteToggle(): boolean;   /* returns new muted state */
  onRestartLevel(): void;
  onPauseToggle(): void;
  /* input passthrough for pads */
  press(action: string): void;
  release(action: string): void;
  /* tree/boss card results */
  onTreeAnswer(correct: boolean, treeId: string): void;
  onMimicAnswer(correct: boolean): void;
}

const $ = (id: string) => document.getElementById(id)!;

export class UI {
  private cb: UICallbacks;
  private save: SaveData;
  constructor(cb: UICallbacks, save: SaveData) {
    this.cb = cb; this.save = save;
    this.buildLangRow();
    this.bindChrome();
    this.bindPads();
    this.applyLang();
  }

  /* ---------- chrome ---------- */
  private buildLangRow(): void {
    $('langRow').innerHTML = LANGS
      .map(l => `<button class="langBtn" data-l="${l}">${l.toUpperCase()}</button>`).join('');
    $('langRow').querySelectorAll<HTMLButtonElement>('button').forEach(b => {
      b.onclick = () => { setLang(b.dataset.l as Lang); this.cb.onLangChange(b.dataset.l as Lang); this.applyLang(); };
    });
  }
  applyLang(): void {
    $('langRow').querySelectorAll<HTMLButtonElement>('button').forEach(b =>
      b.classList.toggle('active', b.dataset.l === getLang()));
  }
  private bindChrome(): void {
    $('mute').onclick = () => { $('mute').textContent = this.cb.onMuteToggle() ? '🔇' : '🔊'; };
    $('restart').onclick = () => this.cb.onRestartLevel();
    $('pauseBtn').onclick = () => this.cb.onPauseToggle();
    $('fsBtn').onclick = () => this.toggleFS();
    document.addEventListener('fullscreenchange', () => this.syncFsIcon());
  }
  private isFS(): boolean { return !!(document.fullscreenElement || (document as any).webkitFullscreenElement); }
  requestFS(): void {
    const el = document.documentElement as any;
    try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {}); } catch { /* iOS Safari */ }
    try { (screen.orientation as any)?.lock?.('landscape')?.catch(() => {}); } catch { /* unsupported */ }
  }
  private toggleFS(): void {
    if (this.isFS()) { try { document.exitFullscreen?.(); } catch { /* ok */ } }
    else this.requestFS();
  }
  private syncFsIcon(): void { $('fsBtn').textContent = this.isFS() ? '⤡' : '⛶'; }

  private bindPads(): void {
    const bind = (id: string, a: string) => {
      const el = $(id);
      const dn = (e: Event) => { e.preventDefault(); this.cb.press(a); };
      const up = (e: Event) => { e.preventDefault(); this.cb.release(a); };
      el.addEventListener('pointerdown', dn);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    bind('bLeft', 'left'); bind('bRight', 'right'); bind('bJump', 'jump');
    bind('bPow', 'use'); bind('bSand', 'sand'); bind('bHeal', 'heal');
  }

  /* ---------- HUD ---------- */
  setHearts(n: number, max: number): void {
    $('hud').innerHTML = '❤️'.repeat(n) + '🖤'.repeat(Math.max(0, max - n));
  }
  setSand(n: number): void { $('sandCount').textContent = String(n); }
  setPower(eye: Eye | null): void {
    const bp = $('bPow');
    if (eye) { bp.style.background = TOOLS[eye].col; bp.textContent = TOOLS[eye].emoji; }
    else { bp.style.background = 'rgba(255,247,236,.78)'; bp.textContent = '✨'; }
  }
  private hintTimer = 0;
  showHint(msg: string, secs = 2.2): void {
    const el = $('hintBar'); el.textContent = msg; el.style.opacity = '1';
    clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => { el.style.opacity = '0'; }, secs * 1000);
  }
  setGameplayVisible(on: boolean): void {
    for (const id of ['padL', 'padR', 'hud']) $(id).style.display = on ? '' : 'none';
    $('menu').style.display = on ? 'none' : '';
  }

  /* ---------- overlay plumbing ---------- */
  private show(html: string): HTMLElement {
    const card = $('card'); card.innerHTML = html;
    $('ov').classList.remove('hidden');
    this.wireSayButtons(card);
    return card;
  }
  hideOverlay(): void { $('ov').classList.add('hidden'); }
  private wireSayButtons(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('.sayBtn').forEach(sb => {
      sb.addEventListener('pointerdown', e => e.stopPropagation());
      sb.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); speak(sb.dataset.say || ''); });
    });
  }
  private sayBtn(text: string): string {
    return `<span class="sayBtn" data-say="${text}" role="button" aria-label="dinle">🔊</span>`;
  }

  /* ---------- screens ---------- */
  showMenu(): void {
    this.setGameplayVisible(false);
    $('menu').innerHTML = `
      <button class="play" id="mStart">${S('ui.newGame')}</button>
      <button class="ghost" id="mCont">${S('ui.continue')}</button>
      <button class="ghost" id="mMap">${S('ui.levels')}</button>
      <button class="ghost" id="mJournal">${S('ui.journal')}</button>
      <button class="ghost" id="mHow">${S('ui.howto')}</button>`;
    $('mStart').onclick = () => { this.requestFS(); this.cb.onStart(0); };
    $('mCont').onclick = () => { this.requestFS(); this.cb.onStart(Math.min(this.save.furthest || 0, 9)); };
    $('mMap').onclick = () => this.showMap();
    $('mJournal').onclick = () => this.showJournal();
    $('mHow').onclick = () => this.showHowto();
    this.hideOverlay();
  }
  showHowto(): void {
    const card = this.show(`<h1>${S('howto.title')}</h1>
      <p>← → · <b>⤴</b> · ✨</p>
      <p><span class="pw" style="background:#3fa9f5">❄️</span> <span class="pw" style="background:#ff6b4a">🔥</span>
         <span class="pw" style="background:#54c97a">🌿</span> <span class="pw" style="background:#ffcc3a;color:#5a4400">🌀</span>
         <span class="pw" style="background:#b07ad8">🟣</span></p>
      <p><span class="pw" style="background:#e8c27a;color:#5a4400">🏖️</span> → <span class="pw" style="background:#ffd54a;color:#5a4400">💛</span> ❤️</p>
      <p class="hint">← → • ↑/Space • F ✨ • G 🏖️ • H 💛 • P ⏸</p>
      <div class="row"><button class="play" id="hBack">${S('ui.back')}</button></div>`);
    (card.querySelector('#hBack') as HTMLElement).onclick = () => this.showMenu();
  }
  showMap(): void {
    const furthest = this.save.furthest || 0;
    let flat = 0;
    const rows = WORLD.map(r => {
      const nodes = r.levels.map(() => {
        const idx = flat++;
        const cls = idx < furthest ? 'done' : idx === furthest ? 'next' : 'locked';
        return `<button class="mapNode ${cls}" data-i="${idx}" ${cls === 'locked' ? 'disabled' : ''}>${idx + 1}</button>`;
      }).join('');
      return `<div class="mapRegion"><h2>${S(r.nameKey)}</h2><div class="row" style="justify-content:flex-start">${nodes}</div></div>`;
    }).join('');
    const card = this.show(`<h1>${S('map.title')}</h1>${rows}
      <div class="row"><button class="play" id="mapBack">${S('ui.back')}</button></div>`);
    card.querySelectorAll<HTMLButtonElement>('.mapNode:not(.locked)').forEach(b => {
      b.onclick = () => { this.requestFS(); this.cb.onStart(Number(b.dataset.i)); };
    });
    (card.querySelector('#mapBack') as HTMLElement).onclick = () => this.showMenu();
  }
  showJournal(): void {
    const journal = this.save.journal || [];
    const stars = familyStars(journal, TREES);
    const famHtml = Object.entries(stars)
      .filter(([, v]) => v.learned > 0)
      .map(([f, v]) => `<div class="famRow"><span class="star">${v.star ? '⭐' : '☆'}</span> ${f} · ${v.learned}/${v.total}</div>`).join('');
    const cards = journal.length === 0
      ? `<p>${S('journal.empty')}</p>`
      : `<div class="treeChoices">` + journal.map(id => {
          const info = TREES[id];
          return `<div class="treeChoice" style="cursor:default">
            <img src="${getChoiceArt(id, 72)}" alt="">
            <span class="nameRow"><span class="tName">${treeName(id)}</span>${this.sayBtn(treeName(id))}</span>
            <span class="tDesc">${info?.desc || ''}</span></div>`;
        }).join('') + '</div>';
    const card = this.show(`<h1>${S('journal.title')}</h1>
      ${journal.length ? `<h2 style="font-size:15px;color:#1f4d4a;margin:4px 0">${S('journal.stars')}</h2>${famHtml}` : ''}
      ${cards}
      <div class="row" style="margin-top:12px"><button class="play" id="jBack">${S('ui.back')}</button></div>`);
    (card.querySelector('#jBack') as HTMLElement).onclick = () => this.showMenu();
  }
  showPause(): void {
    const card = this.show(`<h1>${S('pause.title')}</h1><p>${S('pause.body')}</p>
      <div class="row"><button class="play" id="pRes">${S('ui.resume')}</button>
      <button class="ghost" id="pMenu">${S('ui.menu')}</button></div>`);
    (card.querySelector('#pRes') as HTMLElement).onclick = () => this.cb.onResume();
    (card.querySelector('#pMenu') as HTMLElement).onclick = () => this.showMenu();
  }
  showGameOver(): void {
    const card = this.show(`<div class="eyes">${S('over.eyes')}</div><h1>${S('over.title')}</h1><p>${S('over.body')}</p>
      <div class="row"><button class="play" id="oRetry">${S('ui.retry')}</button>
      <button class="ghost" id="oMenu">${S('ui.menu')}</button></div>`);
    (card.querySelector('#oRetry') as HTMLElement).onclick = () => this.cb.onRetry();
    (card.querySelector('#oMenu') as HTMLElement).onclick = () => this.showMenu();
  }
  showLevelComplete(levelName: string, isLast: boolean): void {
    if (isLast) {
      const card = this.show(`<div class="eyes">${S('win.eyes')}</div><h1>${S('win.title')}</h1><p>${S('win.body')}</p>
        <div class="row"><button class="play" id="wMenu">${S('ui.menu')}</button></div>`);
      (card.querySelector('#wMenu') as HTMLElement).onclick = () => this.showMenu();
      return;
    }
    const card = this.show(`<div class="eyes">${S('next.eyes')}</div><h1>${levelName}${S('next.suffix')}</h1><p>${S('next.body')}</p>
      <div class="row"><button class="play" id="nNext">${S('ui.nextLevel')}</button>
      <button class="ghost" id="nMenu">${S('ui.menu')}</button></div>`);
    (card.querySelector('#nNext') as HTMLElement).onclick = () => this.cb.onNextLevel();
    (card.querySelector('#nMenu') as HTMLElement).onclick = () => this.showMenu();
  }

  /* ---------- tree recognition card (3 clue tiers) ---------- */
  showTreeQuestion(treeId: string, pool: string[], tier: ClueTier): void {
    const choices = pick3(treeId, pool);
    const qKey = tier === 'bark' ? 'tree.question.bark' : tier === 'silhouette' ? 'tree.question.silhouette' : 'tree.question';
    const clue = getTreeArt(treeId, tier, 120);
    const isPhoto = !clue.startsWith('data:');
    const card = this.show(`<h1>${S(qKey)}</h1>
      <div class="clueBadge"><img class="${isPhoto ? 'photo' : ''}" src="${clue}" alt=""></div>
      <div class="treeChoices">` + choices.map(id => {
        const info = TREES[id];
        return `<button class="treeChoice" data-id="${id}">
          <img src="${getChoiceArt(id, 72)}" alt="">
          <span class="nameRow"><span class="tName">${treeName(id)}</span>${this.sayBtn(treeName(id))}</span>
          <span class="tDesc">${info?.desc || ''}</span></button>`;
      }).join('') + '</div>');
    card.querySelectorAll<HTMLButtonElement>('.treeChoice').forEach(btn => {
      btn.onclick = () => {
        const ok = btn.dataset.id === treeId;
        if (!ok) btn.classList.add('dim');
        this.cb.onTreeAnswer(ok, treeId);
      };
    });
    this.wireSayButtons(card);
  }
  showTreeWake(treeId: string, onDone: () => void): void {
    const info = TREES[treeId]; const nm = treeName(treeId);
    const card = this.show(`<div class="wakeCard"><div class="eyes">${S('tree.wake.eyes')}</div>
      <div class="clueBadge"><img src="${getTreeArt(treeId, 'leaf', 120)}" alt=""></div>
      <div class="tBig nameRow"><span><b>${nm}</b>${S('tree.wake.title')}</span>${this.sayBtn(nm)}</div>
      <p style="margin:2px 0 0">${S('journal.family')}${info?.family || ''} · ${info?.desc || ''}</p>
      <div class="wakeFact">🌱 ${info?.fact || info?.gift || ''}</div>
      <p class="hint">${S('tree.wake.body')}</p>
      <div class="row"><button class="play" id="tDone">${S('ui.resume')}</button></div></div>`);
    (card.querySelector('#tDone') as HTMLElement).onclick = onDone;
  }

  /* ---------- mimic boss card: find the real tree ---------- */
  showMimicQuestion(realId: string, pool: string[], tier: ClueTier): void {
    const choices = pick3(realId, pool);
    const clue = getTreeArt(realId, tier === 'leaf' ? 'bark' : tier, 120); /* mimic is always ≥ bark difficulty */
    const card = this.show(`<h1>${S('boss.mimic.title')}</h1><p>${S('boss.mimic.question')}</p>
      <div class="clueBadge"><img src="${clue}" alt=""></div>
      <div class="treeChoices">` + choices.map(id =>
        `<button class="treeChoice" data-id="${id}">
          <img src="${getChoiceArt(id, 72)}" alt="">
          <span class="nameRow"><span class="tName">${treeName(id)}</span>${this.sayBtn(treeName(id))}</span>
        </button>`).join('') + '</div>');
    card.querySelectorAll<HTMLButtonElement>('.treeChoice').forEach(btn => {
      btn.onclick = () => {
        const ok = btn.dataset.id === realId;
        if (!ok) btn.classList.add('dim');
        this.cb.onMimicAnswer(ok);
      };
    });
    this.wireSayButtons(card);
  }
}
