import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const distDirectory = resolve(import.meta.dirname, '../dist');
const html = readFileSync(resolve(distDirectory, 'index.html'), 'utf8');

function findAsset(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Could not find ${label} in dist/index.html`);
  return match[1].replace(/^\//, '');
}

const resources = [
  {
    label: 'Initial JavaScript (gzip)',
    path: findAsset(/<script[^>]+src="([^"]+)"/, 'initial JavaScript'),
    budget: 70 * 1024,
    gzip: true,
  },
  {
    label: 'Initial CSS (gzip)',
    path: findAsset(/<link[^>]+href="([^"]+\.css)"/, 'initial CSS'),
    budget: 8 * 1024,
    gzip: true,
  },
  {
    label: 'Login hero image',
    path: 'example-your-stars.webp',
    budget: 100 * 1024,
  },
];

let failed = false;

for (const resource of resources) {
  const absolutePath = resolve(distDirectory, resource.path);
  const size = resource.gzip
    ? gzipSync(readFileSync(absolutePath)).byteLength
    : statSync(absolutePath).size;
  const passed = size <= resource.budget;
  failed ||= !passed;

  console.log(
    `${passed ? 'PASS' : 'FAIL'} ${resource.label}: ${(size / 1024).toFixed(1)} KiB / ${(resource.budget / 1024).toFixed(0)} KiB`,
  );
}

if (failed) process.exitCode = 1;
