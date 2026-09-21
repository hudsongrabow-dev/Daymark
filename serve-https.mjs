import { createServer } from 'node:https';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const selfsigned = require('selfsigned');
const root = fileURLToPath(new URL('.', import.meta.url));
const keyPath = join(root, '.dev-key.pem');
const certPath = join(root, '.dev-cert.pem');

if (!existsSync(keyPath) || !existsSync(certPath)) {
  const attrs = [{ name: 'commonName', value: 'Daymark local development' }];
  const { private: privateKey, cert } = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }, { type: 7, ip: '172.16.0.218' }] }]
  });
  writeFileSync(keyPath, privateKey);
  writeFileSync(certPath, cert);
}

const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (request, response) => {
  const requested = normalize(request.url === '/' ? '/index.html' : request.url).replace(/^\.\.(?:[\\/]|$)/, '');
  const filePath = join(root, requested);
  if (!existsSync(filePath)) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
  response.end(readFileSync(filePath));
}).listen(4175, '0.0.0.0', () => console.log('Daymark HTTPS server: https://172.16.0.218:4175'));