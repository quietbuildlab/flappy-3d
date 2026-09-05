# flappy-3d — Improvements (UI / UX / design / workflow)
> Generated 2026-07-11 from the portfolio review. Portfolio summary: ~/projects/improvements.md

1. **Preview the new 3D corridor on the title screen.** `src/ui/screens/TitleScreen.tsx` — add depth-parallax to the demo pipes so players immediately see the Babylon true-3D corridor rather than a flat preview.

2. **Expose a manual graphics quality toggle.** `src/render/createPipeline.ts` currently gates bloom/FXAA/vignette solely on `hardwareConcurrency`. Surface a one-tap "lite/full" toggle in `SettingsModal.tsx` so users can override the automatic decision.

3. **Add an auto-downgrade toast.** When a device is struggling, drop effects visibly with an FPS/quality auto-downgrade toast rather than silently stuttering — pairs well with the manual toggle in #2.

4. **Increase end-of-run stickiness.** `GameOverScreen.tsx` + `LeaderboardList.tsx` — show a personal-best delta and generate a daily-seed share-card so players have a reason to return and to share.

5. **Surface the day/night cycle in the HUD.** `src/entities/Clouds.ts` / `Background.ts` already drive a time-of-day cycle; add a time-of-day indicator to the HUD so the atmosphere reads as intentional.

## Workflow
6. **Reconcile the docs as part of the release, not after.** `README.md` (Three.js/GitHub Pages) and `.planning/STATE.md` (ends at Phase 14) both predate the Babylon rebuild. Fold the doc reconciliation into the v1.0.0 cut so the shipped docs match the shipped code.

7. **Keep the bundle-check as a hard gate.** With only ~79KB of headroom under the 600KB budget, wire `pnpm bundle-check` into CI as a blocking step so a barrel import can't silently regress the tree-shaking.
