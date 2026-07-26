# iOS (ve Android) Paketleme — Capacitor

Web build'i değişmeden native kabuğa sarılır. Tek seferlik kurulum (Mac'te, repo kökünde):

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
- **Yatay kilit (native, tek seferlik):**
  - iOS: Xcode → target → General → Deployment Info → Device Orientation'da yalnız
    *Landscape Left/Right* işaretli kalsın (Info.plist `UISupportedInterfaceOrientations`).
  - Android: `android/app/src/main/AndroidManifest.xml` → MainActivity'ye
    `android:screenOrientation="sensorLandscape"`.
  - Tarayıcıda ise: dikey tutuşta resimli "cihazı çevir" örtüsü çıkar + oyun otomatik
    molaya girer; tam ekranda `screen.orientation.lock('landscape')` zaten deneniyor.
- Ses: WebAudio sentez + Web Speech (tr/en/de) — iOS WKWebView'de ilk dokunuşta başlar (mevcut `pointerdown` kancası bunu yapıyor).
- Kayıt: `localStorage` — WKWebView'de kalıcıdır; App Store güncellemelerinde korunur.
- Android için: `npm i @capacitor/android && npx cap add android`.
- Apple **Arcade** ayrı bir karar (tarihsel olarak native motor bekler) — App Store hedefi için bu kurulum yeterli. `docs/REBUILD_PLAN.md`'deki karara bakın.
