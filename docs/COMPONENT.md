# Flappy component contract

Load the trusted game deployment's `component.js` as an ES module, then create
`<pma-flappy>` inside a container with explicit width and height. The element
uses an open Shadow DOM. It starts one clean session when connected, fully
disposes that session when removed, and supports reconnecting the same element.
Standalone and component entries share `src/mount.ts`; there is one gameplay implementation.

| API | Payload / behavior |
| --- | --- |
| `pma-ready` | `{ gameId: 'flappy' }`, session setup succeeded |
| `pma-error` | `{ gameId: 'flappy', message: string }`, WebGL/setup failure; remove and reconnect to retry |
| `pma-round-ended` | `{ gameId: 'flappy', mode: 'endless' \| 'timeAttack' \| 'daily', score: number }` once per completed round |
| `pause(): void` | Pause active gameplay and music; player resumes using the game menu |

All three events bubble and are composed. Subscribe before appending the
element. Scores are local and untrusted. Host owns loading/error/retry UI,
navigation and fullscreen. Keyboard shortcuts act within the focused game
root and ignore editable elements, native controls and dialogs. Focus leaving
the game, window blur or document hiding pauses play.

The component writes only `pma:flappy:v1` in the host origin's localStorage.
Standalone retains `flappy-3d:v1` on the game origin. Scores, skins and settings
are separate; no transfer or automatic sharing is implied, and old records
remain untouched.

## Build and serving

`pnpm build` publishes stable `component.js`, hashed shared JS chunks and the
independent standalone HTML/PWA. Audio URLs resolve against the game module
origin with the configured `VITE_BASE`; the component registers no service
worker. Existing public audio filenames remain stable and revalidate.

`public/_headers` allows cross-origin public assets and revalidates responses.
These are deployment configuration, not proof of live response headers. Verify
the deployed entry, chunks and audio with the host origin before release.
Cloudflare deployment asset retention must be checked before claiming
uninterrupted availability of chunks referenced by an older active release.
Do not assume a new deployment retains old hashed files at the main hostname.
Deploy only through the existing approved GitHub Actions pipeline.

Host CSP must permit the game origin in `script-src`, `connect-src` (Howler's
MP3 XHR) and `media-src` (HTML audio fallback), and `data:` in `img-src` for
uploaded skins. Shadow UI uses inline styles. No new eval or worker capability
is required by the component. Actual host CSP enforcement remains a host
integration/release check.

## Verification

From this repository, with installed Playwright Chromium (or set
`PLAYWRIGHT_EXECUTABLE_PATH` to a compatible Chromium binary):

```sh
VITE_BASE=/ pnpm build
pnpm exec playwright test -c playwright.component.config.ts
bash scripts/bundle-check.sh
```

The component config starts a production Vite preview on `127.0.0.1:5205`
and an independent host on `127.0.0.1:5206`. It uses real browser clicks,
typing, WebGL drawing and Web Audio sources, without a gameplay test hook.
The seven tests cover ready/render, play/pause/restart and round events, host
input and storage isolation, remote audio and no host service worker, ten
disconnect/reconnects during respawn and menu animation, portrait/fullscreen
and container resize, unsupported WebGL and partial setup failure recovery,
uploaded image pixels and persisted mode/settings.

The component gate uses the root-base Cloudflare artifact. For the existing
standalone camera and desktop/mobile checks against that same build, run:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5205/ pnpm exec playwright test --config playwright.standalone.config.ts
```

The original browser red was the absent custom-element registration at
`fc01b80`. Browser launch initially required sandbox escalation on this Mac.
Production build and the bundle gate passed (534.25 KB gzip / 600 KB); the gate
includes `component.js` as well as hashed JS. Component suite: 7 passed in
36.7 seconds. Existing standalone camera and cream UI suite: 4 passed in 21.8 seconds.
Portrait screenshots are browser emulation, not physical iOS/Safari audio or
device-performance acceptance. Vite preview CORS is enabled for the harness;
it does not enforce Cloudflare `_headers`.

API references checked: [custom element lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements),
[Vite production build](https://vite.dev/guide/build),
[Howler API](https://github.com/goldfire/howler.js#documentation),
[GSAP cleanup](https://gsap.com/docs/v3/GSAP/gsap.killTweensOf()/).
Installed Babylon, XState, Howler, GSAP and Vite declarations were checked for
the actual cleanup and build API signatures used here.
