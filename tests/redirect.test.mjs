import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/_middleware.ts';

const canonical = 'https://playminiarcade.com/game/flappy';
const legacy = 'flappy.playminiarcade.com';

test('legacy root and nested requests redirect to the fixed canonical game URL', async () => {
  for (const [method, path] of [['GET', '/'], ['HEAD', '/old/path?next=https://evil.example']]) {
    let passedThrough = false;
    const response = await onRequest({ request: new Request(`https://${legacy}${path}`, { method }), next: async () => { passedThrough = true; return new Response('asset'); } });
    assert.equal(response.status, 301); assert.equal(response.headers.get('location'), canonical); assert.equal(passedThrough, false);
  }
});

test('Pages, preview, local and lookalike hosts pass through unchanged', async () => {
  for (const url of ['https://flappy-3d.pages.dev/component.js', 'https://preview.flappy-3d.pages.dev/component.js', 'http://127.0.0.1:8788/component.js', `https://${legacy}.evil.example/`]) {
    const asset = new Response('asset', { status: 200 }); let calls = 0;
    const response = await onRequest({ request: new Request(url), next: async () => { calls += 1; return asset; } });
    assert.equal(response, asset); assert.equal(calls, 1);
  }
});

test('legacy service-worker updates receive a non-caching retirement worker', async () => {
  const response = await onRequest({
    request: new Request(`https://${legacy}/sw.js`),
    next: async () => new Response('old worker'),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /skipWaiting/);
});
