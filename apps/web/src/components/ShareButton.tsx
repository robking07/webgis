"use client";
// Share the exact view (issue #164). The page URL already holds it: dataset, place, year, since=,
// zoom (lib/url-state.ts), and the compare page's places and metric.
import { useEffect, useState, type ComponentProps } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton(props: Pick<ComponentProps<typeof Button>, "className" | "variant" | "size">) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    // Theme is a personal preference, not part of the view (D-266).
    const u = new URL(location.href);
    u.searchParams.delete("theme");
    const url = u.href;
    // Touch screens get the native share sheet; laptops whose browser also has one (Chrome, Safari) just copy.
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: document.title, url }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    // No clipboard (insecure page, permission refused): show the link selected, ready to copy.
    catch { window.prompt("Copy this link:", url); }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" {...props} onClick={share} aria-label="Share a link to this view" data-share="">
        {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
        {copied ? "Link copied" : "Share"}
      </Button>
      <span role="status" className="sr-only">{copied ? "Link copied" : ""}</span>
    </>
  );
}
