# iOS paketleme — Capacitor + RevenueCat

Native kabuk ve gerekli paketler artık repoda hazırdır. Yeni bir platform
oluşturmayın; kökte yalnız şu komutları kullanın:

```bash
npm ci
cp .env.example .env.local   # yalnız RevenueCat public Apple SDK key'ini yaz
npm run native:sync:ios
npx cap open ios
```

Notlar:
- `capacitor.config.json` hazır (`com.cagatay.cokkalplikoruyucu`, `dist`).
- iOS 15+, iPhone/iPad, tam ekran ve yalnız Landscape Left/Right yapılandırıldı.
- In-App Purchase capability, RevenueCat core ve RevenueCatUI Swift Package
  bağımlılıkları projeye bağlıdır.
- RevenueCat entitlement: `full_journey`; ürün tek seferlik non-consumable
  olmalıdır. Çocuk ekranından doğrudan satın alma yoktur; yetişkin sorusu önce gelir.
- Xcode'da yalnız Development Team seçilmeli, sonra sandbox satın alma/iptal/
  restore/reinstall akışı gerçek cihazda denenmelidir.
- Oyun dokunmatik-öncelikli: sol pad (◀ ▶), sağ pad (🏖️ 💛 ✨ ⤴), tam ekran + yatay kilit istekleri mevcut.
- **Yatay kilit:**
  - iOS ayarı `ios/App/App/Info.plist` içinde repoya kaydedilmiştir.
  - Android: `android/app/src/main/AndroidManifest.xml` → MainActivity'ye
    `android:screenOrientation="sensorLandscape"`.
  - Tarayıcıda ise: dikey tutuşta resimli "cihazı çevir" örtüsü çıkar + oyun otomatik
    molaya girer; tam ekranda `screen.orientation.lock('landscape')` zaten deneniyor.
- Ses: WebAudio sentez + Web Speech (tr/en/de) — iOS WKWebView'de ilk dokunuşta başlar (mevcut `pointerdown` kancası bunu yapıyor).
- Kayıt: `localStorage` — WKWebView'de kalıcıdır; App Store güncellemelerinde korunur.
- Android için: `npm i @capacitor/android && npx cap add android`.
- App Store gizlilik alanında RevenueCat nedeniyle Purchase History, app
  functionality amacıyla açıklanmalıdır; tracking yoktur. Yayındaki politika
  `/privacy.html` adresindedir.
