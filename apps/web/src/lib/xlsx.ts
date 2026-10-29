// A minimal, dependency-free .xlsx writer (D-504): text cells stay text, so an 11-digit GEOID keeps
// its leading zero in Excel, and QGIS/ArcGIS read the column as a string that joins to tract GEOIDs.
export type Cell = string | number | null;
export interface Sheet { name: string; rows: Cell[][] }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const col = (i: number): string => (i >= 26 ? col(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));

export function sheetXml(rows: Cell[][]): string {
  const body = rows.map((r, y) => `<row r="${y + 1}">${r.map((v, x) => {
    const ref = `${col(x)}${y + 1}`;
    if (v === null || v === "") return "";
    return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  // Frozen header row so the column names stay in view.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}

const CRC = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// shortcut: entries are stored, not deflated (a big county's sheet is ~10 MB), use CompressionStream if size bites.
export function zip(files: Array<[string, string]>): Blob {
  const enc = new TextEncoder(), parts: BlobPart[] = [], dir: Uint8Array<ArrayBuffer>[] = [];
  const head = (size: number, sig: number) => {
    const h = new DataView(new ArrayBuffer(size));
    h.setUint32(0, sig, true);
    return h;
  };
  let offset = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const loc = head(30, 0x04034b50);
    loc.setUint16(4, 20, true); loc.setUint32(14, crc, true); loc.setUint32(18, data.length, true); loc.setUint32(22, data.length, true); loc.setUint16(26, n.length, true);
    const cen = head(46, 0x02014b50);
    cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, offset, true);
    parts.push(new Uint8Array(loc.buffer), n, data);
    dir.push(new Uint8Array(cen.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const dirSize = dir.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, dirSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...dir, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function xlsx(sheets: Sheet[]): Blob {
  const ct = "http://schemas.openxmlformats.org/", rel = `${ct}officeDocument/2006/relationships`;
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ct}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ct}package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ct}spreadsheetml/2006/main" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ct}package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows)]),
  ]);
}
