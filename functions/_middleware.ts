type Context = { request: Request; next(): Promise<Response> };

const retirementWorker = `self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});await self.registration.unregister();await Promise.all(windows.map(client=>client.navigate(client.url)));})()));`;

export function onRequest(context: Context) {
  const url = new URL(context.request.url);
  if (url.hostname !== 'flappy.playminiarcade.com') return context.next();
  if (url.pathname === '/sw.js') return new Response(retirementWorker, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/javascript; charset=utf-8' } });
  return Response.redirect('https://playminiarcade.com/game/flappy', 301);
}
