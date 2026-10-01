// Read one entry of a zip as text (via the unzipper package already used for TIGER).
import { readFileSync } from "node:fs";
import unzipper from "unzipper";

export async function unzipEntry(path: string, name: RegExp): Promise<string> {
  const zip = await unzipper.Open.buffer(readFileSync(path));
  const f = zip.files.find((x) => name.test(x.path));
  if (!f) throw new Error(`${path}: no entry matching ${name}`);
  // Strip a UTF-8 byte-order mark (some FARS years have one; read as latin1 it's "ï»¿"),
  // otherwise the first column name doesn't match and its values silently go missing.
  return (await f.buffer()).toString("latin1").replace(/^(\uFEFF|ï»¿)/, "");
}
