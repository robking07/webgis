import { ViewerShell } from "@/components/ViewerShell";

export default async function Page({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const search = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  return <ViewerShell search={search} />;
}
