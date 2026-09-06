# Source Companion

CI dependency builds: `pnpm-workspace.yaml` permits `workerd` for Wrangler's Cloudflare deployment runtime.

This is a Babylon.js 3D flappy game with a DOM overlay UI. Keep this file in sync when changing source/config boundaries.

## Runtime Entry And Configuration

- `src/main.ts` owns standalone startup and install prompts; only the standalone HTML registers the PWA service worker.
- `src/mount.ts` creates one owned engine, scene, game loop, input, systems and UI session. `mount(root, options)` returns `pause()` and `dispose()`. Teardown stops rendering, actor subscriptions, session timers/tweens, Preact effects, input, resize observation, pending skins and audio.
- `src/component.ts` registers `pma-flappy`, mounts an open Shadow DOM on connection, disposes on removal, and implements the public contract in `docs/COMPONENT.md`.
- `src/constants.ts` contains cross-system tuning values. Prefer named constants here over hidden literals across systems.
- `index.html` defines the standalone document; `src/style.css` and `src/ui/styles.css` are injected into the owned game root and use container dimensions.
- `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` define build, test, dependency, and approved install-script behavior.
- `scripts/` contains verification and asset scripts. Keep scripts runnable from pnpm commands when they gate releases or CI.

## Game Loop And State

- `src/loop/GameLoop.ts` owns fixed-step update timing.
- `src/machine/gameMachine.ts` is the pure xstate game state machine. It must stay free of Babylon and DOM imports.
- `src/input/InputManager.ts` normalizes pointer/keyboard input.
- `src/storage/StorageManager.ts` owns localStorage persistence.
  The component uses `pma:flappy:v1` on its host origin; standalone keeps `flappy-3d:v1` on its own origin. The state machine no longer owns a storage singleton.
- `src/a11y/motion.ts` centralizes reduced-motion detection.

## Entities, Systems, And Rendering

- `src/entities/` contains scene objects such as bird, obstacles, background, clouds, and world layers.
- `src/systems/` contains gameplay rules: collision, difficulty, physics, scoring, scrolling, spawning, and timer behavior.
- `src/render/` builds the Babylon engine, camera views, post-processing, and toon materials. Keep Babylon imports deep to preserve bundle size.
- `src/particles/` owns particle emitter setup.
- `src/pools/ObjectPool.ts` provides reusable objects for runtime allocation control.
- `src/utils/rng.ts` centralizes seeded randomness.

## Audio And UI

- `src/audio/AudioManager.ts` owns per-session Howls, synth nodes, root-scoped unlock and gain mixing. Vite resolves public MP3 URLs against the game module origin; no global master-volume changes.
- `src/ui/UIBridge.tsx` is the only bridge between DOM overlay state and the game runtime.
- `src/ui/components/` contains reusable Preact controls.
- `src/ui/screens/` contains screen-level overlay states.
- `src/ui/styles.css` styles cream-paper menus, HUD cards, rounded controls, and dialogs; the 3D world remains unchanged. Pause/GameOver screen `result-card` wrappers size to their content and scroll within short viewports. Keep inactive overlays non-interactive and recheck keyboard/touch, settings selection, and full leaderboards after chrome changes.

## Tests And Docs

- `tests/` contains Playwright UAT and visual checks.
- `playwright.component.config.ts`, `tests/component.spec.ts`, `tests/component-host.html` and `tests/component-server.mjs` run the built component across two origins. See `docs/COMPONENT.md` for commands and acceptance evidence.
- `vite.config.ts` emits stable `component.js` and shared hashed JS chunks alongside standalone/PWA output; `public/_headers` configures CORS and revalidation. Production asset retention is an explicit release gate.
- `tests/cream-ui.spec.ts` checks desktop/mobile settings, pause/resume, full leaderboard containment on short screens, and restart. After `pnpm build`, start `pnpm exec vite preview --port 5205`, then run `pnpm exec playwright test tests/cream-ui.spec.ts`. This suite defaults to the local `/flappy-3d/` preview (override with `PLAYWRIGHT_BASE_URL`), not the published site.
- `docs/` and `.planning/` hold product, deployment, and planning records.
- `public/audio/CREDITS.md` documents audio asset provenance.
