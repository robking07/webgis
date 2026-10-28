"use client";
// Share the exact view (issue #164). The page URL already holds it: dataset, place, year, since=,
// zoom (lib/url-state.ts), and the compare page's places and metric.
// On the map, Share opens a short menu (issue #361): the link, a citation for a memo, and a map image.
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The link to this view. Theme is a personal preference, not part of the view (D-266). */
export function shareUrl() {
  const u = new URL(location.href);
  u.searchParams.delete("theme");
  return u.href;
}

// Touch screens get the native share sheet; laptops whose browser also has one (Chrome, Safari) just copy.
const sheet = () => !!navigator.share && matchMedia("(pointer: coarse)").matches;

async function copy(text: string, prompt: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  // No clipboard (insecure page, permission refused): show the text selected, ready to copy.
  catch { window.prompt(prompt, text); return false; }
}

/** Phones: the share sheet (save to Photos, send); elsewhere, or if it's refused, a download. */
async function saveFile(file: File) {
  if (sheet() && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (e) { if ((e as Error).name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export interface ShareExtras {
  /** One-line citation for "Copy for my memo". */
  memo: () => string;
  /** The map image and its file name, for "Save image". */
  image: () => Promise<{ blob: Blob; name: string } | null>;
}

export function ShareButton({ extras, align = "right", ...props }: Pick<ComponentProps<typeof Button>, "className" | "variant" | "size"> & {
  extras?: ShareExtras;
  /** Which edge of the button the menu lines up with. */
  align?: "left" | "right";
}) {
  const [done, setDone] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 2000);
    return () => clearTimeout(t);
  }, [done]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  async function shareLink() {
    const url = shareUrl();
    if (sheet()) {
      try { await navigator.share({ title: document.title, url }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    if (await copy(url, "Copy this link:")) setDone("Link copied");
  }
  async function memo() {
    if (await copy(extras!.memo(), "Copy this citation:")) setDone("Citation copied");
  }
  async function image() {
    setDone("Making image…");
    try {
      const made = await extras!.image();
      if (!made) { setDone(null); return; }
      await saveFile(new File([made.blob], made.name, { type: "image/png" }));
      setDone("Image saved");
    } catch { setDone("Image failed"); }
  }
  const pick = (f: () => Promise<void>) => () => { setOpen(false); void f(); };

  const item = "block w-full whitespace-nowrap rounded px-2.5 py-2 text-left text-sm font-normal text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div ref={ref} className="relative inline-block">
      <Button type="button" variant="outline" size="sm" {...props} onClick={extras ? () => setOpen((o) => !o) : shareLink}
        aria-label={extras ? "Share this view" : "Share a link to this view"} aria-expanded={extras ? open : undefined} aria-haspopup={extras ? "true" : undefined} data-share="">
        {done ? <Check aria-hidden /> : <Share2 aria-hidden />}
        {done ?? "Share"}
      </Button>
      {open && (
        <div role="group" aria-label="Share" className={`absolute top-full z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg ${align === "left" ? "left-0" : "right-0"}`}>
          <button type="button" className={item} onClick={pick(shareLink)}>{sheet() ? "Share link" : "Copy link"}</button>
          <button type="button" className={item} onClick={pick(memo)}>Copy for my memo</button>
          <button type="button" className={item} onClick={pick(image)}>Save image</button>
        </div>
      )}
      <span role="status" className="sr-only">{done ?? ""}</span>
    </div>
  );
}
