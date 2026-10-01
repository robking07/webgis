// What a first-time visitor sees at mapwich.org (no ?d= in the URL). Robbie, 2026-10-01 (D-33, C4):
// median household income until the first Special is published; after that, point this at the
// dataset (or bivariate pair, and optionally the region) that the latest Special is about.
import type { ViewState } from "./url-state";

export interface LandingView {
  /** Mapped dataset id. */
  d: string;
  /** Second dataset for a bivariate view. */
  b?: string;
  /** Map position, when the story is about one region; otherwise the national view. */
  at?: ViewState;
  /** The Special this view comes from (its /specials/<id>), once there is one. */
  special?: string;
}

export const LANDING: LandingView = { d: "median_household_income" };
