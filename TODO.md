# College Rugby Portal — TODO

## UI / Design
- [ ] Declutter the header — logo + title + tagline + search + auth is a lot stacked up top. Consider collapsing the search into the nav area, shrinking the header height, or moving auth into a simpler icon/avatar.
- [ ] Review mobile header — even more cramped on small screens

## Repo Cleanup
- [ ] Commit or gitignore untracked contact scripts and CSVs (18 files in contacts/)
- [ ] Remove dist/ from git tracking — it's a build artifact, should be built on deploy
- [ ] Clean up one-off scripts that are done (outreach senders, comparison tools)
- [ ] Review .gitignore for completeness

## Features
- [ ] Link player-features.html from somewhere on the site (currently orphaned)
- [ ] Coach onboarding flow — first-time coach login experience, guided setup
- [ ] Program page editing UX — make it obvious what coaches can update and how

## Performance
- [ ] Code-split the 810KB index bundle (Vite warning) — lazy load heavy pages

## Growth / Marketing
- [ ] Instagram content — slides are ready in brand-kit/
- [ ] Get coaches actively updating their pages (KT helping with outreach)
- [ ] Collect feedback from first coach users
- [ ] SEO — meta tags, Open Graph, program pages indexable?

## Testing
- [ ] Verify Sign in with Apple works live on collegerugbyportal.com
- [ ] Test coach sign-up flow end to end (new coach, email match, dashboard access)
