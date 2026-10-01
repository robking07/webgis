export type Status = "loading" | "empty" | "error";

export interface StatusStateProps {
  status: Status;
  message?: string;
  onRetry?: () => void;
}

const DEFAULTS: Record<Status, string> = {
  loading: "Loading…",
  empty: "Nothing to show here yet.",
  error: "Something went wrong loading this data.",
};

/** The only loading / empty / error state. */
export function StatusState({ status, message, onRetry }: StatusStateProps) {
  return (
    <div className={`wg-status wg-status-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
      {status === "loading" && <span className="wg-spinner" aria-hidden />}
      <span>{message ?? DEFAULTS[status]}</span>
      {status === "error" && onRetry && (
        <button type="button" onClick={onRetry} className="wg-button">Try again</button>
      )}
    </div>
  );
}
