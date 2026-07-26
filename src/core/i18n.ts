/* Language infrastructure — ported from v1. TR is the complete source table;
   EN/DE fall back to TR per-key so no UI string is ever blank.
   (Arabic support was removed 2026-07-11 by owner request; saves carrying
   lang:'ar' are coerced back to 'tr' in save.ts.) */
export type Lang = 'tr' | 'en' | 'de';
export const LANGS: Lang[] = ['tr', 'en', 'de'];
export function isLang(l: unknown): l is Lang { return LANGS.includes(l as Lang); }

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
    'menu.title': 'Çok Kalpli Koruyucu', 'menu.kicker': 'Bir iyilik macerası', 'menu.subtitle': 'sevgiyle, zekâyla, şiddetsiz bir macera',
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
  en: {
    'ui.newGame': '▶ New Journey', 'ui.continue': 'Continue', 'ui.levels': 'Journey', 'ui.howto': 'How to Play',
    'ui.back': '← Back', 'ui.menu': 'Menu', 'ui.resume': 'Continue', 'ui.restart': 'Restart', 'ui.retry': 'Try Again',
    'ui.playAgain': 'Play Again', 'ui.nextLevel': 'Next Chapter →', 'ui.journal': 'Nature Journal',
    'pause.title': 'A Quiet Pause', 'pause.body': 'We can continue whenever you are ready.',
    'over.eyes': '💛 a gentle pause 💛', 'over.title': 'Shall we try again?', 'over.body': 'Your hearts need a rest—and that is okay. A Guardian never gives up.',
    'next.eyes': '🌟👁️💚👁️🌟', 'next.suffix': ' restored!', 'next.body': 'Beautiful work, Guardian. A new part of the world is waiting.',
    'win.eyes': '🏆👁️💚👁️🏆', 'win.title': 'The journey is complete!',
    'win.body': 'You restored every world without fighting—only with kindness, attention, and clever thinking.',
    'boss.title': 'The Confused Giant', 'howto.title': 'How to Play',
    'menu.title': 'Çok Kalpli Koruyucu', 'menu.kicker': 'A kindness adventure', 'menu.subtitle': 'a gentle journey of heart, wit, and wonder',
    'map.title': 'The Journey', 'map.locked': 'Restore the previous chapter first',
    'region.cayir': 'Meadow Valley', 'region.zirveler': 'Emerald Peaks', 'region.magara': 'Crystal Caves', 'region.kestane': 'Chestnut Grove',
    'region.toros': 'Taurus Highlands', 'region.meyve': 'Orchard', 'region.akdeniz': 'Mediterranean Coast',
    'region.karadeniz': 'Black Sea Forest', 'region.gol': 'Lakeside', 'region.usta': 'Master Gardener',
    'tree.question.bark': 'Which tree has this bark?', 'tree.question.silhouette': 'Which tree makes this silhouette?',
    'boss.mimic.title': 'The Mimic is hiding!', 'boss.mimic.question': 'Find the real tree!',
    'journal.stars': 'Family Stars', 'tree.prompt': '✨ Sleeping Wise Tree—reach out!', 'tree.question': 'Which tree has this leaf?',
    'tree.wake.eyes': '🌳✨', 'tree.wake.title': ' is awake!', 'tree.wake.body': 'Added to your Nature Journal ✓',
    'journal.title': 'Nature Journal', 'journal.empty': 'No trees have awakened yet. Look for softly glowing trees on your journey.',
    'journal.family': 'Family: ', 'journal.gift': 'Its gift: ',
  },
  de: {
    'ui.newGame': '▶ Neue Reise', 'ui.continue': 'Weiter', 'ui.levels': 'Reise', 'ui.howto': 'So geht’s',
    'ui.back': '← Zurück', 'ui.menu': 'Menü', 'ui.resume': 'Weiter', 'ui.restart': 'Neu starten', 'ui.retry': 'Nochmal',
    'ui.playAgain': 'Nochmal spielen', 'ui.nextLevel': 'Nächstes Kapitel →', 'ui.journal': 'Naturtagebuch',
    'pause.title': 'Eine kleine Pause', 'pause.body': 'Wir machen weiter, wenn du bereit bist.',
    'over.eyes': '💛 eine sanfte Pause 💛', 'over.title': 'Versuchen wir es noch einmal?', 'over.body': 'Deine Herzen ruhen sich aus—das ist in Ordnung. Ein Hüter gibt niemals auf.',
    'next.eyes': '🌟👁️💚👁️🌟', 'next.suffix': ' ist geheilt!', 'next.body': 'Wunderbar, Hüter! Ein neuer Teil der Welt wartet auf dich.',
    'win.eyes': '🏆👁️💚👁️🏆', 'win.title': 'Die Reise ist geschafft!',
    'win.body': 'Du hast jede Welt ohne Kampf geheilt—nur mit Güte, Aufmerksamkeit und klugem Denken.',
    'boss.title': 'Der verwirrte Riese', 'howto.title': 'So geht’s',
    'menu.title': 'Çok Kalpli Koruyucu', 'menu.kicker': 'Ein Abenteuer der Güte', 'menu.subtitle': 'eine sanfte Reise voller Herz, Köpfchen und Wunder',
    'map.title': 'Die Reise', 'map.locked': 'Heile zuerst das vorige Kapitel',
    'region.cayir': 'Wiesental', 'region.zirveler': 'Smaragdspitzen', 'region.magara': 'Kristallhöhlen', 'region.kestane': 'Kastanienhain',
    'region.toros': 'Taurus-Hochland', 'region.meyve': 'Obstgarten', 'region.akdeniz': 'Mittelmeerküste',
    'region.karadeniz': 'Schwarzmeerwald', 'region.gol': 'Am See', 'region.usta': 'Meistergärtner',
    'tree.question.bark': 'Welcher Baum hat diese Rinde?', 'tree.question.silhouette': 'Welcher Baum hat diesen Umriss?',
    'boss.mimic.title': 'Der Nachahmer versteckt sich!', 'boss.mimic.question': 'Finde den echten Baum!',
    'journal.stars': 'Familiensterne', 'tree.prompt': '✨ Schlafender weiser Baum—berühre ihn!', 'tree.question': 'Zu welchem Baum gehört dieses Blatt?',
    'tree.wake.eyes': '🌳✨', 'tree.wake.title': ' ist erwacht!', 'tree.wake.body': 'Zum Naturtagebuch hinzugefügt ✓',
    'journal.title': 'Naturtagebuch', 'journal.empty': 'Noch ist kein Baum erwacht. Suche auf deiner Reise nach sanft leuchtenden Bäumen.',
    'journal.family': 'Familie: ', 'journal.gift': 'Sein Geschenk: ',
  },
};

let lang: Lang = 'tr';
export function setLang(l: Lang): void { lang = l; }
export function getLang(): Lang { return lang; }

export function S(key: string): string {
  const t = STR[lang];
  if (t && t[key] !== undefined) return t[key];
  return STR.tr[key] !== undefined ? STR.tr[key] : key;
}

export const SPEECH_LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE' };
