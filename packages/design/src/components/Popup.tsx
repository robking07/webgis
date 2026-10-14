import { formatEstimate, type Unit } from "../format.ts";

export interface PopupRow {
  label: string;
  value: number | null | undefined;
  unit: Unit;
  moe?: number | null;
  /** Optional group heading (e.g. dataset category); rows are shown grouped in order. */
  group?: string;
  /** A text value (e.g. "Interstate") shown instead of a formatted number. */
  text?: string;
}

export interface PopupProps {
  title?: string;
  subtitle?: string;
  rows: PopupRow[];
  /** One-line note under the rows (e.g. what ± means). */
  footnote?: string;
}

/** The only feature popup / tooltip body. */
export function Popup({ title, subtitle, rows, footnote }: PopupProps) {
  const groups: Array<[string | undefined, PopupRow[]]> = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last[0] === r.group) last[1].push(r);
    else groups.push([r.group, [r]]);
  }
  return (
    <div className="wg-popup" role={title ? "dialog" : undefined} aria-label={title}>
      {title && <p className="wg-popup-title">{title}</p>}
      {subtitle && <p className="wg-popup-subtitle">{subtitle}</p>}
      {groups.map(([g, rs], gi) => (
        <section key={g ?? gi} className={g ? "wg-popup-group" : undefined} aria-label={g}>
          {g && <p className="wg-popup-group-title">{g}</p>}
          <dl>
            {rs.map((r) => {
              // A zero MOE means a controlled (exact) estimate: formatEstimate returns no margin rather than "±0".
              const est = formatEstimate(r.value, r.moe, r.unit);
              return (
                <div key={r.label} className="wg-popup-row">
                  <dt>{r.label}</dt>
                  <dd>
                    {r.text ?? est.value}
                    {est.moe && <span className="wg-moe"> ±{est.moe}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
      {footnote && <p className="wg-popup-footnote">{footnote}</p>}
    </div>
  );
}
