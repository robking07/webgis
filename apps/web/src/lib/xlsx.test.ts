import { describe, expect, it } from "vitest";
import { crc32 as zlibCrc } from "node:zlib";
import { crc32 } from "./xlsx";
import { tractPack } from "./csv";
import type { Dataset } from "./registry";

// Reads the stored (uncompressed) entries back out of the zip, checking each CRC.
async function unzip(blob: Blob): Promise<Record<string, string>> {
  const b = new Uint8Array(await blob.arrayBuffer()), v = new DataView(b.buffer), out: Record<string, string> = {};
  for (let p = 0; v.getUint32(p, true) === 0x04034b50;) {
    const size = v.getUint32(p + 18, true), n = v.getUint16(p + 26, true);
    const name = new TextDecoder().decode(b.subarray(p + 30, p + 30 + n)), data = b.subarray(p + 30 + n, p + 30 + n + size);
    expect(crc32(data)).toBe(v.getUint32(p + 14, true));
    out[name] = new TextDecoder().decode(data);
    p += 30 + n + size;
  }
  return out;
}
const cells = (row: string) => [...row.matchAll(/<c r="([A-Z]+)\d+"( t="inlineStr")?>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)<\/c>/g)]
  .map(([, col, str, num, text]) => [col, str ? text : Number(num)]);

const ds = (id: string) => ({ id, title: `T ${id}`, unit: "percent", vintage: "2023", license: "PD", source: { name: "S", citation: "C & D" } }) as unknown as Dataset;

describe("tractPack", () => {
  it("keeps GEOID as text with its leading zero and lines values up under their columns", async () => {
    const values = { a: { "020100": [5.5, 1.2] as [number, number] }, b: { "020100": [7, null] as [number, null], "020200": [3, null] as [number, null] } };
    const geo = { "020100": ["Tract 201, Autauga County, AL", 0, 0, 1] as [string, number, number, number] };
    const files = await unzip(tractPack("01001", "Autauga County, AL", values, geo, [ds("a"), ds("b"), ds("missing")]));
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml");
    const rows = files["xl/worksheets/sheet1.xml"].split("<row ").slice(1);
    expect(cells(rows[0])).toEqual([["A", "GEOID"], ["B", "name"], ["C", "a"], ["D", "a_moe"], ["E", "b"], ["F", "b_moe"]]);
    expect(cells(rows[1])).toEqual([["A", "01001020100"], ["B", "Tract 201, Autauga County, AL"], ["C", 5.5], ["D", 1.2], ["E", 7]]);
    // A tract missing from the geography file still gets a row and a name; blank cells keep later columns in place.
    expect(cells(rows[2])).toEqual([["A", "01001020200"], ["B", "Tract 202, Autauga County, AL"], ["E", 3]]);
    expect(files["xl/worksheets/sheet2.xml"]).toContain("C &amp; D");
  });
  it("crc32 matches zlib", () => {
    const b = new TextEncoder().encode("Mapwich tract pack");
    expect(crc32(b)).toBe(zlibCrc(b));
  });
});
