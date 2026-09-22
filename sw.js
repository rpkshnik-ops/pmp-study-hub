'use strict';
const CACHE = 'pmp-study-hub-8eb4e77142716234';
const ASSETS = ['./','./index.html','./styles.css','./config.js','./core.js','./learning.js','./app.js','./icon.svg','./manifest.webmanifest', ...[1,2,3,4,5,6].map(n=>'./content/pack-'+String(n).padStart(2,'0')+'.json')];
self.addEventListener('install', event => event.waitUntil((async () => {
 const cache=await caches.open(CACHE);await cache.addAll(ASSETS);
 // v1/v2 had no update UI. Activate this one-time bridge; do not reload any client.
 const existing=await caches.keys();
 if(existing.some(name=>name==='pmp-study-hub-v1'||name==='pmp-study-hub-v2'))await self.skipWaiting();
})()));
self.addEventListener('message', event => { if(event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil((async () => {
 for(const name of await caches.keys()) if(name.startsWith('pmp-study-hub-') && name !== CACHE) await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
 if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request, {ignoreSearch:true});
  if(cached) return cached;
  try { return await fetch(event.request); }
  catch(error) { if(event.request.mode === 'navigate') return cache.match('./index.html'); throw error; }
 })());
});
