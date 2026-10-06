// Browser error reporting (S3). Does nothing unless NEXT_PUBLIC_SENTRY_DSN is set:
// no init, no network calls, no logging. Next inlines the variable at build time, so with no
// DSN the dynamic import below is dead code and the Sentry SDK is not in the client bundle.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        // Errors only, no personal details: no PII, no replay, no tracing, no user context.
        // v11 replaced sendDefaultPii with dataCollection; turn every optional collector off.
        dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false },
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
      });
    })
    .catch(() => {
      // Monitoring must never break the app.
    });
}
