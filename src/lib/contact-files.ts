// Documents on a contact record — the parts that are pure decisions rather
// than DOM. Kept out of app.astro so they can be tested without a browser:
// what a file is called once it becomes a storage key, which files are refused
// before a byte leaves the laptop, and what order folders appear in.
//
// The DOM wiring (drop zone, rows, signed-URL open, delete) lives in
// src/pages/app.astro and reads everything it needs from here.

/** Starter folders, in the order they render. Anything else an office invents
 *  is stored as a plain string on the row and sorts after these. */
export const DOC_FOLDERS = [
  'Application',
  'Policy',
  'ID / Verification',
  'Correspondence',
  'Tax / Income',
  'Quotes',
  'Other',
] as const;

export const DOC_MAX_BYTES = 50 * 1024 * 1024;

/** Nothing legitimate in a client file is an executable, and a private bucket
 *  is still somewhere people download things from. */
export const DOC_BLOCKED = /\.(exe|msi|bat|cmd|com|scr|dll|pif|vbs|jar|app|apk|deb|dmg)$/i;

const DOC_ICONS: [RegExp, string][] = [
  [/pdf/i, '📕'],
  [/(sheet|excel|csv|numbers)/i, '📊'],
  [/(word|document|rtf|opendocument\.text)/i, '📄'],
  [/^image\//i, '🖼️'],
  [/^video\//i, '🎬'],
  [/^audio\//i, '🎵'],
  [/(zip|compressed|tar|rar|7z)/i, '🗜️'],
];

export function docIcon(mime?: string | null, name?: string | null): string {
  const hay = `${mime || ''} ${name || ''}`;
  for (const [re, ic] of DOC_ICONS) if (re.test(hay)) return ic;
  return '📎';
}

export function fmtBytes(n?: number | null): string {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** Storage object keys are NOT url-decoded on the way back out, so a filename
 *  with a space, an accent or a '#' in it becomes a key nobody can sign a URL
 *  for. Only the key is flattened — the row keeps the original name for display. */
export function docSlug(name?: string | null): string {
  return (
    String(name || 'file')
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(-80) || 'file'
  );
}

/** <contact_id>/<uuid>-<slug>. The first segment must be the contact id: the
 *  storage RLS policy checks ownership against `storage.foldername(name)[1]`. */
export function docPath(contactId: string, uuid: string, name: string): string {
  return `${contactId}/${uuid}-${docSlug(name)}`;
}

export type DocCandidate = { name: string; size: number };

/** Split a dropped batch into what uploads and what gets reported back. Done
 *  before any network call so a broker sees one clear message instead of four
 *  failed requests. */
export function splitQueue<T extends DocCandidate>(files: T[]) {
  const tooBig = files.filter((f) => f.size > DOC_MAX_BYTES);
  const blocked = files.filter((f) => f.size <= DOC_MAX_BYTES && DOC_BLOCKED.test(f.name));
  const queue = files.filter((f) => f.size <= DOC_MAX_BYTES && !DOC_BLOCKED.test(f.name));
  const notes: string[] = [];
  if (tooBig.length) notes.push(`Over 50 MB, skipped: ${tooBig.map((f) => f.name).join(', ')}`);
  if (blocked.length) notes.push(`Not an allowed file type, skipped: ${blocked.map((f) => f.name).join(', ')}`);
  return { queue, tooBig, blocked, notes };
}

/** Starter folders first in their fixed order, then everything else A–Z. An
 *  empty folder cannot exist — a folder here is a label on a row. */
export function groupFolders<T extends { folder?: string | null }>(files: T[]): [string, T[]][] {
  const by = new Map<string, T[]>();
  for (const f of files) {
    const k = f.folder || 'Other';
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(f);
  }
  const order = [...by.keys()].sort((a, b) => {
    const ia = (DOC_FOLDERS as readonly string[]).indexOf(a);
    const ib = (DOC_FOLDERS as readonly string[]).indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  return order.map((k) => [k, by.get(k)!]);
}
