# askkpop.com

Static site served at <https://askkpop.com>. No build step: plain HTML, one stylesheet, one script.

| Page | What it is |
|------|------------|
| `index.html` | **Noēsis — Field Guide to Every Service.** Every part of the Noēsis system in plain language. |
| `beginner.html` | **Noēsis — Beginner's Guide.** The same system explained from zero. |
| `creator.html` | **Hwan Joo Jang — Software Engineering.** Portfolio. Keeps its own original design (self-contained styles); it does not use the noesiis.com theme. |

## Design

The theme is a 1:1 port of the [noesiis.com](https://noesiis.com) landing page
(`dashboard/src/app/LandingView.tsx` in [ASKKPOP/Noesis](https://github.com/ASKKPOP/Noesis)):

- `assets/noesiis.css` holds the shared tokens and components: `#020610` field, glass panels, terracotta `#da7a4e` CTAs, Cormorant Garamond / DM Sans / JetBrains Mono, and the Orbitron neon wordmark.
- `assets/cybergrid.js` is a vanilla port of the live isometric city canvas (`CyberGrid.tsx`, HUD hidden). It draws a single still frame when the visitor prefers reduced motion.

## Content source of truth

The Noēsis pages summarize the public system wiki (`wiki/` in ASKKPOP/Noesis, served at <https://noesiis.com/wiki/>). When the wiki changes, update these pages to match. Each page footer states the date it reflects.

## Deploy

Upload the repository contents (everything except `README.md` and `.git`) to the askkpop.com web root (`/home/centos/ask`). `Noesis.html`, `noesis-world.html`, `roadmap.html` and `services.html` on the server are copies of `index.html`; refresh them after each deploy. Bump the `?v=` query on the CSS and JS links when those files change so browsers don't keep the old copies.
