/* Source vetted CC0/Public-Domain Wikimedia Commons photos for every species
   slot still missing from scripts/photo-manifest.json.

   Run on a machine WITH network access (same constraint as fetch-photos.mjs):

     node scripts/source-photos.mjs           # search + write candidates file
     node scripts/source-photos.mjs --apply   # also merge best pick into the
                                              # manifest + append LICENSES.md rows

   Safety: only files whose Commons LicenseShortName is exactly CC0 or
   Public domain are ever considered — anything else is skipped, so the
   "vetted CC0/PD only" ground rule holds by construction. --apply still
   requires the human step afterwards: fetch (fetch-photos.mjs), then eyeball
   the legibility sheet (legibility-sheet.mjs) at real card size and swap any
   bad pick for the next candidate in photo-manifest.candidates.json. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'photo-manifest.json');
const CANDIDATES = path.join(__dirname, 'photo-manifest.candidates.json');
const LICENSES = path.join(__dirname, '..', 'public', 'photos', 'LICENSES.md');
const UA = 'CokKalpliKoruyucu-photo-sourcing/1.0 (game asset pipeline; contact repo owner)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Game id → scientific names to try, best regional fit first. */
const SPECIES = {
  'çam': ['Pinus sylvestris', 'Pinus nigra'],
  'servi': ['Cupressus sempervirens'],
  'huş': ['Betula pendula'],
  'akçaağaç': ['Acer platanoides', 'Acer campestre'],
  'söğüt': ['Salix babylonica', 'Salix alba'],
  'ginkgo': ['Ginkgo biloba'],
  'zeytin': ['Olea europaea'],
  'kestane': ['Castanea sativa'],
  'kayın': ['Fagus sylvatica', 'Fagus orientalis'],
  'kavak': ['Populus nigra', 'Populus alba'],
  'toros sediri': ['Cedrus libani'],
  'ardıç': ['Juniperus excelsa', 'Juniperus communis'],
  'sekoya': ['Sequoia sempervirens', 'Sequoiadendron giganteum'],
  'elma': ['Malus domestica'],
  'kiraz': ['Prunus avium'],
  'ceviz': ['Juglans regia'],
  'palmiye': ['Phoenix canariensis', 'Chamaerops humilis'],
  'incir': ['Ficus carica'],
  'limon': ['Citrus limon', 'Citrus × limon'],
  'ladin': ['Picea orientalis', 'Picea abies'],
  'fındık': ['Corylus avellana'],
  'kızılağaç': ['Alnus glutinosa'],
  'dişbudak': ['Fraxinus excelsior', 'Fraxinus angustifolia'],
};
const KIND_TERMS = { leaf: ['leaf', 'leaves', 'foliage'], bark: ['bark', 'trunk'], tree: ['tree', 'habit', ''] };
const OK_LICENSE = /^(cc0|public domain)$/i;
/* obvious non-subject files: herbarium sheets, range maps, plates, close-ups of the wrong organ */
const REJECT_TITLE = /herbarium|map|distribution|illustration|drawing|botanical.?plate|seed|flower|blossom|fruit ?stone|cone ?scale|wood ?sample|logo/i;

async function api(params) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  for (const [k, v] of Object.entries({ format: 'json', ...params })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function findCandidates(sciNames, kind) {
  for (const sci of sciNames) {
    for (const term of KIND_TERMS[kind]) {
      let data;
      try {
        data = await api({
          action: 'query', generator: 'search', gsrnamespace: '6',
          gsrsearch: `${sci} ${term}`.trim() + ' filetype:bitmap', gsrlimit: '25',
          prop: 'imageinfo', iiprop: 'extmetadata|size|mime',
        });
      } catch (e) { console.warn(`  search failed (${sci} ${term}): ${e.message}`); continue; }
      const good = [];
      for (const p of Object.values(data?.query?.pages || {})) {
        const ii = p.imageinfo?.[0]; if (!ii) continue;
        const lic = ii.extmetadata?.LicenseShortName?.value || '';
        if (!OK_LICENSE.test(lic)) continue;
        if (!/^image\/(jpe?g|png)$/.test(ii.mime || '')) continue;
        if ((ii.width || 0) < 500 || (ii.height || 0) < 500) continue;
        const title = p.title.replace(/^File:/, '');
        if (REJECT_TITLE.test(title)) continue;
        good.push({ file: title, license: lic, w: ii.width, h: ii.height });
      }
      if (good.length) return good.slice(0, 4);
      await sleep(300);
    }
  }
  return [];
}

const apply = process.argv.includes('--apply');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const candidates = {};
let missing = 0;

for (const [id, sciNames] of Object.entries(SPECIES)) {
  const have = manifest.slots[id] || {};
  candidates[id] = {};
  for (const kind of ['leaf', 'bark', 'tree']) {
    if (have[kind]) continue; /* already sourced — never overwrite a vetted pick */
    const c = await findCandidates(sciNames, kind);
    candidates[id][kind] = c;
    if (!c.length) { missing++; console.log(`✗ ${id} ${kind}: no CC0/PD candidate found — source manually`); }
    else console.log(`✓ ${id} ${kind}: ${c[0].file} (${c[0].license}, ${c[0].w}×${c[0].h})`);
    await sleep(400); /* stay polite with the API */
  }
}
await writeFile(CANDIDATES, JSON.stringify(candidates, null, 2));
console.log(`\nWrote ${CANDIDATES}${missing ? ` — ${missing} slot(s) need manual sourcing` : ''}`);

if (apply) {
  const rows = [];
  for (const [id, kinds] of Object.entries(candidates)) {
    for (const [kind, list] of Object.entries(kinds)) {
      if (!list.length) continue;
      manifest.slots[id] = manifest.slots[id] || {};
      manifest.slots[id][kind] = list[0].file;
      const page = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(list[0].file.replaceAll(' ', '_'));
      rows.push(`| ${id} · ${kind} | ${list[0].file} | ${list[0].license} | ${page} |`);
    }
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  if (rows.length) {
    const lic = await readFile(LICENSES, 'utf8');
    await writeFile(LICENSES, lic.trimEnd() +
      '\n\n## Auto-sourced (review pending — legibility sheet + subject check)\n\n' +
      '| Slot | Commons file | License | Source |\n|------|--------------|---------|--------|\n' +
      rows.join('\n') + '\n');
  }
  console.log(`Merged ${rows.length} slots into the manifest. Next:\n` +
    '  node scripts/fetch-photos.mjs\n' +
    '  node scripts/legibility-sheet.mjs   (then open the sheet and eyeball every card)');
}
