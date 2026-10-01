# CLAUDE.md

Full build spec: `docs/SPEC.md` (read it before writing code). Open questions and
stop-conditions are logged in `docs/DECISIONS.md`.

## Core Directive — one clarifying question, continually reevaluated

After every user request, and after every step of a multi-step task, re-evaluate the
goal, the assumptions made so far, and what the last step revealed. Then ask exactly
ONE clarifying question about the highest-value open uncertainty (use AskUserQuestion).
Never ask something already answered. Never ask filler.

- **Prototype mode (now → first review session):** the question must not block. Ask
  it, state the default you're taking, and keep building. Log it in `docs/DECISIONS.md`.
  The only time to stop and wait is a SPEC §10 stop-condition or a §12 open decision.
- **Refinement mode (after Robbie says the review is done):** ask the question and
  wait for the answer before continuing.

Current mode: **REFINEMENT** (since 2026-10-01). Ask and wait before decisions. Switch back to
prototype-style momentum only for a full new feature buildout or a similarly large task, and say so
when you do.

## Conventions

- Adding a dataset = registry entry + ingest script only. No UI code.
- All symbology comes from `packages/design` tokens. No ad hoc layer styling.
- Never touch Robbie's NAS, home network, or Met Council internal systems or non-public data.
  Open data the Met Council publishes publicly (e.g. on the MN Geospatial Commons) is allowed,
  under the same license checks as any other source (Robbie, 2026-10-01; DECISIONS D-16).
- Secrets live in `.env.local` only (Supabase, Census, Anthropic, R2, Vercel; names in `.env.example`). Never commit them,
  never print them, and never pass them as command-line arguments.
