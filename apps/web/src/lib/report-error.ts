// Report an error React caught (error.tsx / global-error.tsx) to Sentry (S3 follow-up, #77).
// Same gate as instrumentation-client.ts: with no NEXT_PUBLIC_SENTRY_DSN this does nothing, makes
// no network request, and (the env value being inlined at build time) the SDK is not bundled.
export function reportError(error: Error & { digest?: string }): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      // Monitoring must never break the error screen.
    });
}
