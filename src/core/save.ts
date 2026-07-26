/* Save system — v2 key with a v1 migration path (never wipe a child's progress).
   Storage is injectable so headless tests need no browser. */
import { isLang, type Lang } from './i18n';

export interface SaveData {
  furthest?: number;      /* unlock frontier, flat level index */
  journal?: string[];     /* learned tree ids */
  lang?: Lang;
  muted?: boolean;
}

/* Saves written before a language was removed (e.g. 'ar') must still load —
   coerce any unknown lang to Turkish rather than carrying an invalid value. */
function sanitize(s: SaveData): SaveData {
  if (s.lang !== undefined && !isLang(s.lang)) s.lang = 'tr';
  return s;
}

export const SAVE_KEY_V2 = 'ckk2_save_v2';
export const SAVE_KEY_V1 = 'ckk2_save_v1';

export type KVStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadSave(storage: KVStorage): SaveData {
  try {
    const v2 = JSON.parse(storage.getItem(SAVE_KEY_V2) || 'null');
    if (v2) return sanitize(v2 as SaveData);
    const v1 = JSON.parse(storage.getItem(SAVE_KEY_V1) || 'null');
    if (v1) {
      /* v1 shape is compatible — adopt it wholesale, persist under v2 key */
      const migrated: SaveData = sanitize({
        furthest: v1.furthest, journal: v1.journal, lang: v1.lang, muted: !!v1.muted,
      });
      writeSave(migrated, storage);
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

export function writeSave(save: SaveData, storage: KVStorage): void {
  try { storage.setItem(SAVE_KEY_V2, JSON.stringify(save)); } catch { /* quota/private mode: play on */ }
}

/* Journal write on tree wake; returns true if newly learned. */
export function recordTreeWake(save: SaveData, treeId: string): boolean {
  if (!save.journal) save.journal = [];
  if (save.journal.includes(treeId)) return false;
  save.journal.push(treeId);
  return true;
}
