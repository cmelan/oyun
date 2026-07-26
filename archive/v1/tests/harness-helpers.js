'use strict';
/* Başsız test ortamı: DOM/Canvas taklitleri.
   Bu dosya, geliştirme oturumları boyunca /tmp'te elle yazılan harness'lerin
   birleştirilmiş/temizlenmiş halidir. Node'da tarayıcı yok — oyun dosyası
   document/canvas/localStorage/speechSynthesis bekler, burada hepsi taklit edilir. */
function makeCtxStub() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get: (o, k) => {
      if (k in o) return o[k];
      return (...a) => ((k === 'createLinearGradient' || k === 'createRadialGradient') ? grad : undefined);
    },
    set: (o, k, v) => { o[k] = v; return true; },
  });
}

function makeElStub(id) {
  const ctxStub = makeCtxStub();
  return {
    id, style: {}, textContent: '', innerHTML: '', width: 0, height: 0, dataset: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); if (f) this._s.add(c); else this._s.delete(c); },
    },
    addEventListener() {}, onclick: null,
    getContext: () => ctxStub,
    setAttribute() {}, querySelectorAll: () => [], appendChild() {},
    toDataURL: () => 'data:image/png;base64,STUB',
  };
}

function installBrowserStubs() {
  const els = {};
  globalThis.document = {
    getElementById: id => (els[id] || (els[id] = makeElStub(id))),
    createElement: () => makeElStub(),
    addEventListener() {},
    documentElement: makeElStub(),
    querySelectorAll: () => [],
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = v; },
  };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.setInterval = () => 0;
  globalThis.screen = { orientation: null };
  const spokenLog = [];
  globalThis.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; this.rate = 1; };
  globalThis.speechSynthesis = { cancel() {}, speak(u) { spokenLog.push({ text: u.text, lang: u.lang }); } };
  return { spokenLog };
}

/* Oyun dosyasının <script> içeriğini çıkarır (tek HTML dosyası, tek <script> bloğu varsayılır). */
function extractScript(htmlPath) {
  const fs = require('fs');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Oyun dosyasında <script> bloğu bulunamadı: ' + htmlPath);
  return m[1];
}

/* Oyun kodunu ve yardımcı bir sürücü betiğini birlikte çalıştırır, global sonuç nesnesini döner. */
function runGame(htmlPath, driverSrc) {
  const stubs = installBrowserStubs();
  const code = extractScript(htmlPath);
  const wrapped = code + '\n;globalThis.__test = {};\n' + driverSrc;
  // eslint-disable-next-line no-eval
  eval(wrapped);
  return { spokenLog: stubs.spokenLog };
}

module.exports = { makeCtxStub, makeElStub, installBrowserStubs, extractScript, runGame };
