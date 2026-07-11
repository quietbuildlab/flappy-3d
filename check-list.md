# flappy-3d — Production Release Checklist
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/check-list.md
**Status**: near-release (arguably release-ready for v1) — polished 3D Flappy Bird-style PWA, live at flappy.playminiarcade.com; held back only by an unclosed v1.0.0 tag, missing real-device checks, and doc drift.

## Do yourself (human-only)
- [ ] Real-device pass: confirm iOS Safari audio unlock works on a physical device (explicitly manual per README)
- [ ] Real-device pass: verify sustained 60fps on iPhone 12 / Pixel 6 (explicitly manual per README)
- [ ] Tag and cut v1.0.0 (Phase 5 leftover, never closed)
- [ ] Confirm GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set
- [ ] Decide canonical deploy target: GitHub Pages vs Cloudflare Pages

## Decisions needed
- GitHub Pages vs Cloudflare Pages as the canonical host — docs currently contradict each other (README cites Pages/quietbuildlab.github.io; CLAUDE.md documents the 2026-05-21 Cloudflare migration)
- Whether v1.0.0 ships now or waits on any of the improvements below

## Delegate to Claude (automatable)
- [ ] Reconcile `README.md`: Three.js → Babylon.js, GitHub Pages → Cloudflare, fix the live URL
- [ ] Update `.planning/STATE.md` (stale — ends at Phase 14 / 2026-05-02, never records the Babylon rebuild)
- [ ] Run `npm run build` + `npm run bundle-check` (≤600KB budget)
- [ ] Run the Playwright UAT suite as a regression gate
- [ ] Reopen/close-out Phase 5 items in the planning docs once the human checks pass

## Risks to keep in mind
- Thin bundle headroom — budget was relaxed 250KB → 600KB and is currently ~521KB; a stray `@babylonjs/core` barrel import would blow the budget (the deep-import discipline is load-bearing)
- GPU-buffer leaks if any entity skips `dispose()`
- Doc contradictions (Three.js/Pages vs Babylon/Cloudflare) could misdirect the deploy target
- The Babylon rebuild post-dates the last verification pass, so the green history predates the current code
