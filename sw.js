/* Service worker do StudyShelf: deixa o app funcionando sem internet.
   Todos os arquivos do app são guardados no primeiro acesso; os PDFs da pessoa
   ficam no IndexedDB (não passam por aqui). A versão e a lista de arquivos vêm do build. */
const VERSION = '6a11e96fd5-mwlld9td';
const PRECACHE = [
 "./",
 "./app-C3FIDPSM.css",
 "./app-TITJGAAO.js",
 "./fonts/atkinson-hyperlegible-next-latin-400-normal-T2TIKS3B.woff",
 "./fonts/atkinson-hyperlegible-next-latin-400-normal-XD2DM5SQ.woff2",
 "./fonts/atkinson-hyperlegible-next-latin-500-normal-HSKVGJQV.woff2",
 "./fonts/atkinson-hyperlegible-next-latin-500-normal-KMFNKJL7.woff",
 "./fonts/atkinson-hyperlegible-next-latin-700-normal-U2M2LX7A.woff2",
 "./fonts/atkinson-hyperlegible-next-latin-700-normal-XRIDMOST.woff",
 "./fonts/atkinson-hyperlegible-next-latin-ext-400-normal-6Z4N5DRF.woff",
 "./fonts/atkinson-hyperlegible-next-latin-ext-400-normal-RX4DU7WU.woff2",
 "./fonts/sofia-sans-condensed-latin-500-normal-WGXWJX6C.woff",
 "./fonts/sofia-sans-condensed-latin-500-normal-YVFYUEAA.woff2",
 "./fonts/sofia-sans-condensed-latin-600-normal-MYMBD54Z.woff",
 "./fonts/sofia-sans-condensed-latin-600-normal-QVVHUKLV.woff2",
 "./fonts/sofia-sans-condensed-latin-700-normal-CB3JV3RO.woff2",
 "./fonts/sofia-sans-condensed-latin-700-normal-WTJ4OAGL.woff",
 "./fonts/sofia-sans-condensed-latin-800-normal-4KVBNP4C.woff",
 "./fonts/sofia-sans-condensed-latin-800-normal-X5XIRJOZ.woff2",
 "./fonts/sofia-sans-condensed-latin-ext-700-normal-3FLWSO72.woff",
 "./fonts/sofia-sans-condensed-latin-ext-700-normal-7J2FKXD2.woff2",
 "./icons/apple-touch-icon.png",
 "./icons/icon-192.png",
 "./icons/icon-512.png",
 "./icons/icon-maskable-512.png",
 "./index.html",
 "./manifest.webmanifest",
 "./vendor/html-to-pdfmake.js",
 "./vendor/jszip.min.js",
 "./vendor/mammoth.browser.min.js",
 "./vendor/marked.min.js",
 "./vendor/pdf-lib.min.js",
 "./vendor/pdf.min.js",
 "./vendor/pdf.worker.min.js",
 "./vendor/pdfmake.min.js",
 "./vendor/vfs_fonts.js",
 "./vendor/xlsx.full.min.js"
];
const CACHE = 'studyshelf-' + VERSION;
const SHARED = 'studyshelf-shared';

self.addEventListener('install', (event) => {
  // cache: 'reload' busca direto no servidor: sem isso, uma versão nova poderia guardar
  // arquivos antigos que ainda estavam no cache comum do navegador
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('studyshelf-') && key !== CACHE && key !== SHARED) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// A página pede para a versão nova entrar quando a pessoa toca em "Atualizar"
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // "Compartilhar → StudyShelf" no Android: guarda os arquivos e abre o app
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(receiveShare(event.request));
    return;
  }
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação: sempre a página do app guardada (funciona offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((r) => r || fetch(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((r) => r || fetch(event.request)));
});

async function receiveShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((f) => f && typeof f === 'object' && f.name);
    const cache = await caches.open(SHARED);
    await Promise.all(files.map((file, i) => cache.put(
      new Request(`./shared/${Date.now()}-${i}`),
      new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream', 'x-name': encodeURIComponent(file.name) } }),
    )));
  } catch (e) { /* abre o app mesmo assim */ }
  return Response.redirect('./?share-target=1', 303);
}
