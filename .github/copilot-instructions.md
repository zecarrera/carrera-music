# Copilot Instructions — Carrera Music

## Project overview
Carrera Music is a mobile-first iOS PWA music player built with React + Vite, backed by YouTube and persisted via Supabase. See `README.md` for full tech stack and setup.

## README maintenance
After any change that affects the following, **always check if `README.md` needs updating** before committing:
- Features added, changed, or removed
- Tech stack changes (new dependencies, replaced libraries)
- Environment variables added or renamed
- Project structure changes (new files/directories with meaningful purpose)
- Deployment process changes
- Known limitations resolved or newly discovered
- New branches with significant scope

The README is the source of truth for onboarding — keep it accurate.

## Code style
- React functional components with hooks only
- Plain CSS files co-located with components (no CSS-in-JS, no Tailwind)
- No unnecessary comments — only comment code that genuinely needs clarification
- Prefer named exports for components

## Commit messages
Always include the Co-authored-by trailer:
```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Deployment
- Hosted on Vercel under `jose-carreras-projects` scope
- Deploy with: `vercel build --prod --yes && vercel --prebuilt --prod`
- Env vars: `VITE_YOUTUBE_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Key constraints
- Vite 5 (not 8+) — Node 22.1.0 incompatibility
- iOS Safari: inputs must have `font-size >= 16px` to prevent zoom on focus
- YouTube IFrame pauses on iOS lock screen — this is a known limitation, do not attempt to fix without switching providers
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
