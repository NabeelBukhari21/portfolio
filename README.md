# Nabeel.OS — Portfolio

Cyberpunk portfolio for **Syed Nabeel Raza** — Next.js 16, TypeScript, Tailwind v4, Motion, MediaPipe and Gemini.

## What's inside

| Section | What it does |
|---|---|
| Boot sequence | Plays once per session, click to skip |
| Hero + **Neural Link** | Holo ID card tilts with the mouse — or, opt-in, with the visitor's head via MediaPipe (100% on-device) |
| **The System** | Live architecture map: every project/role is a node, packets flow along edges, click to inspect |
| **The Pipeline** | Career told as a CI/CD run: commit → build → test → deploy → monitor |
| Projects | Case-file cards; GitHub / demo buttons appear when you add links |
| **Character Select** | RPG stat sheet, skill tree, story arcs, achievements |
| Side Businesses | HimalayanZenSalt + MariasCollectionCA |
| **Ask Nabeel.AI** | Gemini chatbot grounded on `profile.ts` (server-side key, rate-limited) |
| Contact + **Vault** | Email/LinkedIn/GitHub public; phone & address behind a password, served from env vars only |
| Terminal | Press <kbd>`</kbd> — `help`, `ls`, `open rentos`, `neofetch`, `sudo hire-me`… |
| Hidden level | Konami code (↑↑↓↓←→←→BA) or `sidequests` in the terminal |
| **Recruiter mode** | Toggle (top right) or link `yourdomain.dev/?mode=recruiter` for a clean one-pager |

## Edit your content

Everything lives in **`src/content/profile.ts`**. Search for `TODO` (MaxDal details, domain).
Photos → `public/photos/` (names listed in `public/photos/README.txt`). Resume → `public/resume.pdf`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and CONTACT_* values
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. vercel.com → **Add New → Project** → import the repo (Next.js is auto-detected).
3. **Settings → Environment Variables**: add everything from `.env.example`.
4. Deploy. Every `git push` redeploys; other branches get preview URLs.
5. **Settings → Domains**: add your domain and set the DNS records Vercel shows. Then update `site.domain` in `profile.ts`.

## Security notes

- The Gemini key and vault contents never reach the browser — they are only read inside `src/app/api/*`.
- Rate limiting is in-memory (per server instance). For stronger limits use Upstash Redis.
- Neural Link only starts after a click, and camera frames never leave the device.
