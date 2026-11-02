// Minimal reader for old Excel .xls files (OLE2 container + BIFF8 records): EPA's design value
// workbooks before 2010 are .xls. Reads one worksheet's cells as text rows, like airquality's .xlsx reader.
// shortcut: BIFF8 only (no BIFF5), big-stream workbooks only (>= 4096 bytes), no dates or formats; upgrade if another source needs more.
import { readFileSync } from "node:fs";

/** An RK cell value (a number packed into 32 bits). */
export function decodeRk(rk: number): number {
  let v: number;
  if (rk & 2) v = rk >> 2; // signed 30-bit integer
  else { const b = Buffer.alloc(8); b.writeUInt32LE((rk & 0xfffffffc) >>> 0, 4); v = b.readDoubleLE(0); }
  return rk & 1 ? v / 100 : v;
}

/** The bytes of the "Workbook" stream from an OLE2 compound file. */
function workbookStream(f: Buffer): Buffer {
  if (f.readUInt32BE(0) !== 0xd0cf11e0) throw new Error("xls: not an OLE2 file");
  const ss = 1 << f.readUInt16LE(30);
  const sector = (n: number) => f.subarray((n + 1) * ss, (n + 2) * ss);
  const difat: number[] = [];
  for (let i = 0; i < 109; i++) difat.push(f.readInt32LE(76 + i * 4));
  for (let s = f.readInt32LE(68), n = f.readUInt32LE(72); n > 0 && s >= 0; n--) { // extra DIFAT sectors
    const d = sector(s);
    for (let i = 0; i < ss / 4 - 1; i++) difat.push(d.readInt32LE(i * 4));
    s = d.readInt32LE(ss - 4);
  }
  const fat: number[] = [];
  for (const s of difat) if (s >= 0) { const d = sector(s); for (let i = 0; i < ss / 4; i++) fat.push(d.readInt32LE(i * 4)); }
  const chain = (start: number) => {
    const parts: Buffer[] = [];
    for (let s = start; s >= 0 && parts.length <= fat.length; s = fat[s]) parts.push(sector(s));
    return Buffer.concat(parts);
  };
  const dir = chain(f.readInt32LE(48));
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const name = dir.subarray(o, o + Math.max(0, dir.readUInt16LE(o + 64) - 2)).toString("utf16le");
    if (name !== "Workbook" && name !== "Book") continue;
    const size = dir.readUInt32LE(o + 120);
    if (size < 4096) throw new Error("xls: workbook stream is in the mini stream (unsupported)");
    return chain(dir.readInt32LE(o + 116)).subarray(0, size);
  }
  throw new Error("xls: no Workbook stream");
}

/** The shared string table, joining CONTINUE records (each continuation of a split string restarts with a width flag). */
function sharedStrings(chunks: Buffer[]): string[] {
  let ci = 0, p = 8; // skip total + unique counts
  const out: string[] = [];
  const unique = chunks[0].readUInt32LE(4);
  const take = (n: number, wide: boolean): string => {
    let s = "";
    while (n > 0) {
      if (p >= chunks[ci].length) { ci++; p = 1; wide = (chunks[ci].readUInt8(0) & 1) === 1; }
      const w = wide ? 2 : 1;
      const k = Math.min(n, Math.floor((chunks[ci].length - p) / w));
      s += chunks[ci].subarray(p, p + k * w).toString(wide ? "utf16le" : "latin1");
      p += k * w; n -= k;
    }
    return s;
  };
  const skip = (n: number) => { while (n > 0) { if (p >= chunks[ci].length) { ci++; p = 0; } const k = Math.min(n, chunks[ci].length - p); p += k; n -= k; } };
  const u = (bytes: 1 | 2 | 4) => { // a number never straddles chunks in practice
    if (p >= chunks[ci].length) { ci++; p = 0; }
    const v = bytes === 1 ? chunks[ci].readUInt8(p) : bytes === 2 ? chunks[ci].readUInt16LE(p) : chunks[ci].readUInt32LE(p);
    p += bytes; return v;
  };
  for (let i = 0; i < unique; i++) {
    const cch = u(2), flags = u(1);
    const runs = flags & 8 ? u(2) : 0, ext = flags & 4 ? u(4) : 0;
    out.push(take(cch, (flags & 1) === 1));
    skip(runs * 4 + ext);
  }
  return out;
}

/** Rows of the named worksheet as arrays of strings (numbers as their text), blanks as "". */
export function readXlsRows(path: string, sheetName: string): string[][] {
  const wb = workbookStream(readFileSync(path));
  const records: { t: number; at: number; d: Buffer }[] = [];
  for (let o = 0; o + 4 <= wb.length;) { const t = wb.readUInt16LE(o), n = wb.readUInt16LE(o + 2); records.push({ t, at: o, d: wb.subarray(o + 4, o + 4 + n) }); o += 4 + n; }
  let sst: string[] = [];
  const i0 = records.findIndex((r) => r.t === 0xfc);
  if (i0 >= 0) { const chunks = [records[i0].d]; for (let i = i0 + 1; records[i]?.t === 0x3c; i++) chunks.push(records[i].d); sst = sharedStrings(chunks); }
  const sheets = records.filter((r) => r.t === 0x85).map((r) => {
    const cch = r.d.readUInt8(6), wide = r.d.readUInt8(7) & 1;
    return { offset: r.d.readUInt32LE(0), name: r.d.subarray(8, 8 + cch * (wide ? 2 : 1)).toString(wide ? "utf16le" : "latin1") };
  });
  const sheet = sheets.find((s) => s.name === sheetName);
  if (!sheet) throw new Error(`xls: no sheet named "${sheetName}" in [${sheets.map((s) => s.name).join(" | ")}]`);
  const rows: string[][] = [];
  const put = (r: number, c: number, v: string) => { (rows[r] ??= [])[c] = v; };
  let last: [number, number] | null = null; // a formula's string result arrives in the next STRING record
  for (let i = records.findIndex((r) => r.at === sheet.offset) + 1; i < records.length && records[i].t !== 0x0a; i++) {
    const { t, d } = records[i];
    if (t === 0xfd) put(d.readUInt16LE(0), d.readUInt16LE(2), sst[d.readUInt32LE(6)] ?? "");
    else if (t === 0x203) put(d.readUInt16LE(0), d.readUInt16LE(2), String(d.readDoubleLE(6)));
    else if (t === 0x27e) put(d.readUInt16LE(0), d.readUInt16LE(2), String(decodeRk(d.readUInt32LE(6))));
    else if (t === 0xbd) for (let c = d.readUInt16LE(2), o = 4; o + 6 <= d.length - 2; o += 6, c++) put(d.readUInt16LE(0), c, String(decodeRk(d.readUInt32LE(o + 2))));
    else if (t === 0x204) { const n = d.readUInt16LE(6), wide = d.readUInt8(8) & 1; put(d.readUInt16LE(0), d.readUInt16LE(2), d.subarray(9, 9 + n * (wide ? 2 : 1)).toString(wide ? "utf16le" : "latin1")); }
    else if (t === 0x06) {
      const r = d.readUInt16LE(0), c = d.readUInt16LE(2);
      if (d.readUInt16LE(12) === 0xffff) last = d.readUInt8(6) === 0 ? [r, c] : null; else put(r, c, String(d.readDoubleLE(6)));
    } else if (t === 0x207 && last) { const n = d.readUInt16LE(0), wide = d.readUInt8(2) & 1; put(last[0], last[1], d.subarray(3, 3 + n * (wide ? 2 : 1)).toString(wide ? "utf16le" : "latin1")); last = null; }
  }
  return Array.from(rows, (r) => Array.from(r ?? [], (x) => x ?? ""));
}
