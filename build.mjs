import { cpSync, mkdirSync, rmSync } from 'node:fs';

const files = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'service-worker.js', 'icon-192.svg', 'icon-512.svg'];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
files.forEach((file) => cpSync(file, `dist/${file}`));
