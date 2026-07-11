# iOS (ve Android) Paketleme — Capacitor

Web build'i değişmeden native kabuğa sarılır. Tek seferlik kurulum (Mac'te, repo `v2/` içinde):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios
```

Her sürümde:

```bash
npm run build      # dist/ üretir (base './' — Capacitor uyumlu)
npx cap sync ios
npx cap open ios   # Xcode açılır → imzala → cihazda çalıştır / TestFlight
```

Notlar:
- `capacitor.config.json` hazır (appId: com.cagatay.cokkalplikoruyucu, webDir: dist).
- Oyun dokunmatik-öncelikli: sol pad (◀ ▶), sağ pad (🏖️ 💛 ✨ ⤴), tam ekran + yatay kilit istekleri mevcut.
- Ses: WebAudio sentez + Web Speech (tr/en/de/ar) — iOS WKWebView'de ilk dokunuşta başlar (mevcut `pointerdown` kancası bunu yapıyor).
- Kayıt: `localStorage` — WKWebView'de kalıcıdır; App Store güncellemelerinde korunur.
- Android için: `npm i @capacitor/android && npx cap add android`.
- Apple **Arcade** ayrı bir karar (tarihsel olarak native motor bekler) — App Store hedefi için bu kurulum yeterli. `docs/REBUILD_PLAN.md`'deki karara bakın.
