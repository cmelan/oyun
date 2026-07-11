/* Language infrastructure — ported from v1. TR is the complete source table;
   EN/DE/AR fall back to TR per-key so no UI string is ever blank. */
export type Lang = 'tr' | 'en' | 'de' | 'ar';

export const STR: Record<Lang, Record<string, string>> = {
  tr: {
    'ui.newGame': '▶ Yeni Oyun', 'ui.continue': 'Devam Et', 'ui.levels': 'Bölümler', 'ui.howto': 'Nasıl Oynanır?',
    'ui.back': '← Geri', 'ui.menu': 'Menü', 'ui.resume': 'Devam Et', 'ui.restart': 'Yeniden Başla', 'ui.retry': 'Tekrar Dene',
    'ui.playAgain': 'Baştan Oyna', 'ui.nextLevel': 'Sonraki Bölüm →',
    'pause.title': 'Mola', 'pause.body': 'Hazır olunca devam edelim.',
    'over.eyes': '💛 nazik bir mola 💛', 'over.title': 'Tekrar deneyelim mi?', 'over.body': 'Kalplerin tükendi — sorun yok, Koruyucu pes etmez!',
    'next.eyes': '🌟👁️💚👁️🌟', 'next.suffix': ' tamamlandı!', 'next.body': 'Harikasın, Koruyucu! Yeni bir dünya seni bekliyor.',
    'win.eyes': '🏆👁️💚👁️🏆', 'win.title': 'Tebrikler! Macera tamam!',
    'win.body': 'Üç dünyayı da dövüşmeden, sadece sevgi ve zekânla dengeye kavuşturdun. Gerçek bir Çok Kalpli Koruyucu!',
    'boss.title': 'Boss · Kötü Canavar',
    'howto.title': 'Nasıl Oynanır?',
    'menu.title': 'Çok Kalpli Koruyucu', 'menu.subtitle': 'sevgiyle, zekâyla, şiddetsiz bir macera',
    'map.title': 'Bölümler', 'map.locked': 'Önceki bölümü tamamla',
    'region.cayir': 'Çayır Vadisi', 'region.zirveler': 'Zümrüt Zirveler', 'region.magara': 'Kristal Mağaralar', 'region.kestane': 'Kestane Korusu',
    'region.toros': 'Toros Yaylası', 'region.meyve': 'Meyve Bahçesi', 'region.akdeniz': 'Akdeniz Kıyısı',
    'region.karadeniz': 'Karadeniz Ormanı', 'region.gol': 'Göl Kenarı', 'region.usta': 'Usta Bahçıvan',
    'tree.question.bark': 'Bu kabuk hangi ağacın?', 'tree.question.silhouette': 'Bu gölge hangi ağacın?',
    'boss.mimic.title': 'Taklitçi saklanıyor!', 'boss.mimic.question': 'Gerçek ağacı bul!',
    'journal.stars': 'Aile Yıldızları',
    'ui.journal': 'Doğa Günlüğü',
    'tree.prompt': '✨ Uyuyan Bilge Ağaç — dokun!', 'tree.question': 'Bu yaprak hangi ağacın?',
    'tree.wake.eyes': '🌳✨', 'tree.wake.title': ' uyandı!', 'tree.wake.body': "Doğa Günlüğü'ne eklendi ✓",
    'journal.title': 'Doğa Günlüğü', 'journal.empty': 'Henüz uyandırdığın bir ağaç yok. Bölümlerde parıldayan uyuyan ağaçları ara!',
    'journal.family': 'Aile: ', 'journal.gift': 'Armağanı: ',
  },
  en: {}, de: {}, ar: {}, /* full translation pass is a roadmap item; fallback to tr */
};

let lang: Lang = 'tr';
export function setLang(l: Lang): void { lang = l; }
export function getLang(): Lang { return lang; }

export function S(key: string): string {
  const t = STR[lang];
  if (t && t[key] !== undefined) return t[key];
  return STR.tr[key] !== undefined ? STR.tr[key] : key;
}

export const SPEECH_LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', ar: 'ar-SA' };
