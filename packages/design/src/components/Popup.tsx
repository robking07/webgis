import { Fragment } from "react";
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
  /** The key takeaway in large type (a change map's "−1.3 pts"), with what it measures above it
   *  and, optionally, the values it compares, each with its period right under it. */
  lead?: { label: string; text: string; values?: Array<{ value: string; period: string }> };
  /** One-line note under the rows (e.g. what ± means). */
  footnote?: string;
}

/** The only feature popup / tooltip body. */
export function Popup({ title, subtitle, rows, lead, footnote }: PopupProps) {
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
      {lead && (
        <div className="wg-popup-lead">
          <p className="wg-popup-lead-label">{lead.label}</p>
          <p className="wg-popup-lead-value">{lead.text}</p>
          {lead.values && (
            <div className="wg-popup-lead-pair">
              {lead.values.map((v, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="wg-popup-lead-arrow">→</span>}
                  <p className="wg-popup-lead-cell">
                    <span className="wg-popup-lead-cell-value">{v.value}</span>
                    <span className="wg-popup-lead-cell-period">{v.period}</span>
                  </p>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
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
