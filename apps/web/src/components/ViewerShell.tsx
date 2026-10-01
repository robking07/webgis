"use client";
import dynamic from "next/dynamic";
import { StatusState } from "@webgis/design/components";

// The map is browser-only (WebGL, workers), so the whole viewer renders client-side.
const Viewer = dynamic(() => import("./Viewer").then((m) => m.Viewer), {
  ssr: false,
  loading: () => <div className="grid h-dvh place-items-center"><StatusState status="loading" message="Loading map…" /></div>,
});

export function ViewerShell({ search }: { search: string }) {
  return <Viewer search={search} />;
}
