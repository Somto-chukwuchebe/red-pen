// Run after `vite build`: checks the service worker will really make the app work offline.
// A file listed twice with different revisions makes Workbox throw at start-up, leaving a
// service worker that runs but caches nothing — the app then fails in airplane mode.
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
const urls = [...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((m) => m[1]);
const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
const problems = [];
if (dupes.length) problems.push(`listed twice: ${[...new Set(dupes)].join(', ')}`);
for (const needed of ['index.html', 'manifest.webmanifest']) if (!urls.includes(needed)) problems.push(`missing: ${needed}`);
if (!urls.some((u) => /^assets\/index-.*\.js$/.test(u))) problems.push('missing: the main script');
if (!sw.includes('NavigationRoute')) problems.push('missing: offline start-up page (navigateFallback)');

if (problems.length) {
  console.error(`✗ Offline check failed — ${problems.join('; ')}`);
  process.exit(1);
}
console.log(`✓ Offline check: ${urls.length} files saved for offline use`);
