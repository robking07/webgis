# Mapwich

Mapwich is a non-commercial, educational, map-first viewer for US data. Look up a place, layer
datasets over it, and compare. Live at https://mapwich.org.

## Quick start

```bash
npm ci                # Node 24; see docs/handbook.md for secrets and ingest tools
npm run build
npm run dev
```

Copy `.env.example` to `.env.local` for keys. The build and dev server work without it.

## Docs

- [Handbook](docs/handbook.md): setup, house rules, how to work here
- [Runbook](docs/runbook.md): deploys, secrets, recovery
- [Roadmap](docs/roadmap.md)
- [Architecture](docs/architecture.md): where code lives
- [Changelog](CHANGELOG.md)

## License

Code: [MIT](LICENSE). Map data keeps the license of each source (listed on the site's data pages). The text of Specials in `apps/web/content/specials/` is © Robbie King, all rights reserved.
