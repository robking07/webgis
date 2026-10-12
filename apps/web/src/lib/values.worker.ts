// Fetches, parses and classifies a level's values off the main thread (issue #28): for 240k block
// groups that was ~0.6 s of stall. Replies with the geoids joined, the values and classes as
// transferable arrays, and the classes already packed for the per-state map layers.
import { classifyValues, packByState } from "@webgis/design";
import type { WorkerReply, WorkerRequest } from "./values";

const post = (m: WorkerReply, transfer: Transferable[] = []) => self.postMessage(m, { transfer });

self.onmessage = async ({ data: { id, url, symbology } }: MessageEvent<WorkerRequest>) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return post({ id, status: r.status });
    const values: Record<string, unknown> = await r.json();
    const keys = Object.keys(values).filter((k) => typeof values[k] === "number");
    const vals = Float64Array.from(keys, (k) => values[k] as number);
    if (!symbology) return post({ id, keys: keys.join(","), vals }, [vals.buffer]);
    const c = classifyValues(symbology, vals);
    const packed = packByState(keys.map((k, i) => [k, c.cls[i]] as const), c.colors.length);
    post({ id, keys: keys.join(","), vals, classed: { ...c, packed } }, [vals.buffer, c.cls.buffer]);
  } catch (e) {
    post({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
