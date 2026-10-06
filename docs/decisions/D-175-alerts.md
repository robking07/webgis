# D-175: Alerts, uptime and browser error reporting (S3, #73, PR #75)

Date: 2026-10-05. Decided by Robbie (Sentry) and the lead (the rest).

- **Browser errors: Sentry, free Developer plan** (Robbie's choice over a home-grown log). Client
  side only, via `apps/web/src/instrumentation-client.ts`.
- **Privacy:** no personal details. `@sentry/nextjs` v11 dropped `sendDefaultPii`, so the init sets
  `dataCollection` with user info, cookies, HTTP headers and URL query strings all off; no session
  replay and no tracing (errors only keeps the free quota and page weight down). Robbie turns on the
  project-level "Prevent Storing of IP Addresses" setting (handbook section 7).
- **Off without a DSN:** with `NEXT_PUBLIC_SENTRY_DSN` unset the init is skipped and the SDK is
  not bundled (`next.config.ts` inlines an empty value so the dynamic import is dead code). With a
  DSN the SDK loads as a separate lazy chunk after the page.
- **No source maps for now:** uploading needs an auth-token secret. Later option.
- **Uptime:** Sentry Uptime Monitoring (1 monitor free on every plan), set up by Robbie in the
  dashboard. Not a scheduled GitHub Action: the repo is private, and a 15-minute cron would use
  about 2,900 of the 2,000 free Actions minutes a month.
- **Spend:** only Cloudflare R2 can bill; Robbie sets a spend notification. Vercel Hobby and Supabase
  free have hard limits. No code.
