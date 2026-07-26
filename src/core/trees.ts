/* TREES registry — ported from v1, extended with the v2 `photos` slot:
   real photos (leaf close-up, trunk/bark close-up, full tree) served from the
   asset pipeline. Sources must be vetted public-domain/CC0 ONLY, logged in
   assets/photos/LICENSES.md. Vector silhouettes remain the stylized in-world layer. */
import type { Lang } from './i18n';
import { getLang } from './i18n';

export interface TreePhotos { leaf?: string; bark?: string; tree?: string } /* asset paths */
export interface TreeDef {
  name: Record<Lang, string>;
  family: string;
  desc: string;
  gift: string;
  fact: string;
  crown: 'broad' | 'tall' | 'oval' | 'conifer' | 'weeping' | 'palm';
  photos?: TreePhotos;
}

export const TREES: Record<string, TreeDef> = {
  'meşe': { name: { tr: 'Meşe', en: 'Oak', de: 'Eiche' }, family: 'Kayıngiller', desc: 'Palamut ağacı', gift: 'Palamutlarıyla sincapları besler', fact: 'Bir meşe 500 yıldan uzun yaşayabilir!', crown: 'broad' },
  'çınar': { name: { tr: 'Çınar', en: 'Plane Tree', de: 'Platane' }, family: 'Çınargiller', desc: 'Gölge devi', gift: 'Geniş gölgesiyle serinlik verir', fact: 'Gövdesi yama yama soyulur — her çınar kendine özel desen taşır.', crown: 'tall' },
  'ıhlamur': { name: { tr: 'Ihlamur', en: 'Linden', de: 'Linde' }, family: 'Ihlamurgiller', desc: 'Çay çiçeği ağacı', gift: 'Çiçekleriyle şifalı bir çay verir', fact: 'Kalp biçimli yaprakları arıların en sevdiği ağaçlardan biridir.', crown: 'oval' },
  'çam': { name: { tr: 'Çam', en: 'Pine', de: 'Kiefer' }, family: 'Çamgiller', desc: 'İğne yapraklı ağaç', gift: 'Kozalaklarıyla kışın hayvanlara yiyecek verir', fact: 'Yaprakları yıl boyu yeşil kalır — kışın bile dökülmez!', crown: 'conifer' },
  'servi': { name: { tr: 'Servi', en: 'Cypress', de: 'Zypresse' }, family: 'Servigiller', desc: 'Sivri gölge ağacı', gift: 'Rüzgardan koruyan sık bir duvar oluşturur', fact: 'Bazı serviler binlerce yıl yaşayabilecek kadar uzun ömürlüdür.', crown: 'conifer' },
  'huş': { name: { tr: 'Huş', en: 'Birch', de: 'Birke' }, family: 'Kayıngiller', desc: 'Beyaz gövdeli ağaç', gift: 'Beyaz kabuğuyla ormanı aydınlatır', fact: 'Kabuğu kağıt gibi ince tabakalar halinde soyulur.', crown: 'oval' },
  'akçaağaç': { name: { tr: 'Akçaağaç', en: 'Maple', de: 'Ahorn' }, family: 'Sabunağacıgiller', desc: 'Yıldız yapraklı ağaç', gift: 'Sonbaharda kızıl yapraklarıyla ormanı renklendirir', fact: 'Bazı türlerinin özsuyundan tatlı akçaağaç şurubu yapılır.', crown: 'broad' },
  'söğüt': { name: { tr: 'Söğüt', en: 'Willow', de: 'Weide' }, family: 'Söğütgiller', desc: 'Sarkık dallı ağaç', gift: 'Su kenarında toprağı kökleriyle tutar', fact: 'Dalları su kenarına doğru zarif bir şekilde sarkar.', crown: 'weeping' },
  'ginkgo': { name: { tr: 'Ginkgo', en: 'Ginkgo', de: 'Ginkgo' }, family: 'Ginkgogiller', desc: 'Yelpaze yapraklı ağaç', gift: 'Dünyanın en yaşlı ağaç türlerinden biridir', fact: 'Dinozorların zamanından beri hiç değişmemiş bir ağaç türü!', crown: 'oval' },
  'zeytin': { name: { tr: 'Zeytin', en: 'Olive', de: 'Olive' }, family: 'Zeytingiller', desc: 'Gümüşi yapraklı ağaç', gift: 'Meyvesinden besleyici bir yağ verir', fact: 'Bazı zeytin ağaçları 1000 yıldan daha uzun yaşayabilir!', crown: 'oval' },
  'kestane': { name: { tr: 'Kestane', en: 'Chestnut', de: 'Kastanie' }, family: 'Kayıngiller', desc: 'Dişli yapraklı ağaç', gift: 'Kışlık kestaneleriyle karnımızı doyurur', fact: 'Meyvesi dikenli yeşil bir kabuğun içinde saklanır.', crown: 'broad' },
  'kayın': { name: { tr: 'Kayın', en: 'Beech', de: 'Buche' }, family: 'Kayıngiller', desc: 'Dalgalı yapraklı ağaç', gift: 'Sık gölgesiyle ormanı serinletir', fact: 'Yaprakları sonbaharda bile dalından hemen dökülmez.', crown: 'oval' },
  'kavak': { name: { tr: 'Kavak', en: 'Poplar', de: 'Pappel' }, family: 'Söğütgiller', desc: 'Üçgen yapraklı ağaç', gift: 'Hızla büyüyerek toprağı hemen yeşillendirir', fact: 'Yaprakları en hafif esintide bile hışırdayarak dans eder.', crown: 'tall' },
  /* --- v2 expansion (B5–B9). NOTE: silhouettes pending the 58px legibility check
     (bundled with the postponed real-photo pass — photos become the card art). --- */
  'toros sediri': { name: { tr: 'Toros Sediri', en: 'Taurus Cedar', de: 'Taurus-Zeder' }, family: 'Çamgiller', desc: 'Dağların ulu ağacı', gift: 'Hoş kokulu dayanıklı odun verir', fact: 'Toros Dağları\'nın simgesidir; bin yıldan uzun yaşayabilir!', crown: 'conifer' },
  'ardıç': { name: { tr: 'Ardıç', en: 'Juniper', de: 'Wacholder' }, family: 'Servigiller', desc: 'Mavi kozalaklı ağaç', gift: 'Mavi üzümsü kozalaklarıyla kuşları besler', fact: 'Kuşlar ardıç kozalaklarını yer ve tohumlarını dağlara taşır.', crown: 'conifer' },
  'sekoya': { name: { tr: 'Sekoya', en: 'Sequoia', de: 'Mammutbaum' }, family: 'Servigiller', desc: 'Dünyanın dev ağacı', gift: 'Gökyüzüne uzanan dev bir ev olur', fact: 'Dünyanın en uzun ağaçları sekoyalardır — 100 metreyi aşar!', crown: 'conifer' },
  'elma': { name: { tr: 'Elma', en: 'Apple', de: 'Apfelbaum' }, family: 'Gülgiller', desc: 'Tatlı meyve ağacı', gift: 'Kıpkırmızı sulu elmalar verir', fact: 'İlkbaharda pembe-beyaz çiçekleri arılarla dolar.', crown: 'broad' },
  'kiraz': { name: { tr: 'Kiraz', en: 'Cherry', de: 'Kirschbaum' }, family: 'Gülgiller', desc: 'Beyaz çiçekli meyve ağacı', gift: 'Parlak kırmızı kirazlar verir', fact: 'Kiraz çiçeği açtığında ağaç bembeyaz bir buluta döner.', crown: 'oval' },
  'ceviz': { name: { tr: 'Ceviz', en: 'Walnut', de: 'Walnussbaum' }, family: 'Cevizgiller', desc: 'Kabuklu kuruyemiş ağacı', gift: 'Beyni andıran besleyici cevizler verir', fact: 'Bir ceviz ağacı yüzlerce yıl meyve vermeye devam edebilir.', crown: 'broad' },
  'palmiye': { name: { tr: 'Palmiye', en: 'Palm', de: 'Palme' }, family: 'Palmiyegiller', desc: 'Yelpaze yapraklı kıyı ağacı', gift: 'Kocaman yapraklarıyla gölge şemsiyesi olur', fact: 'Gövdesi dal çıkarmaz — bütün yaprakları tepesinde taşır!', crown: 'palm' },
  'incir': { name: { tr: 'İncir', en: 'Fig', de: 'Feigenbaum' }, family: 'Dutgiller', desc: 'Bal tatlı meyve ağacı', gift: 'Bal gibi tatlı incirler verir', fact: 'İncirin çiçekleri meyvenin İÇİNDE gizlidir — dışarıdan görünmez!', crown: 'broad' },
  'limon': { name: { tr: 'Limon', en: 'Lemon', de: 'Zitronenbaum' }, family: 'Sedefotugiller', desc: 'Sarı meyveli kokulu ağaç', gift: 'C vitamini dolu limonlar verir', fact: 'Yaprağını ovalarsan elin mis gibi limon kokar.', crown: 'oval' },
  'ladin': { name: { tr: 'Ladin', en: 'Spruce', de: 'Fichte' }, family: 'Çamgiller', desc: 'Sivri tepeli orman ağacı', gift: 'Sık dallarıyla kuşlara yuva olur', fact: 'Karadeniz ormanlarının en uzun ağaçlarındandır.', crown: 'conifer' },
  'fındık': { name: { tr: 'Fındık', en: 'Hazel', de: 'Haselnuss' }, family: 'Huşgiller', desc: 'Küçük kuruyemiş ağacı', gift: 'Sincapların en sevdiği fındıkları verir', fact: 'Dünyadaki fındıkların çoğu Karadeniz kıyısında yetişir!', crown: 'oval' },
  'kızılağaç': { name: { tr: 'Kızılağaç', en: 'Alder', de: 'Erle' }, family: 'Huşgiller', desc: 'Su seven ağaç', gift: 'Kökleriyle dere kenarlarını sağlamlaştırır', fact: 'Kesilen odunu havayla temas edince kızıla döner — adı buradan gelir.', crown: 'oval' },
  'dişbudak': { name: { tr: 'Dişbudak', en: 'Ash', de: 'Esche' }, family: 'Zeytingiller', desc: 'Esnek dallı ağaç', gift: 'Esnek odunundan salıncak ve kürek yapılır', fact: 'Tüy gibi karşılıklı dizilmiş yaprakçıkları vardır.', crown: 'tall' },
};

export function treeName(id: string, lang?: Lang): string {
  const n = TREES[id]?.name;
  if (!n) return id;
  return n[lang ?? getLang()] || n.tr || id;
}
