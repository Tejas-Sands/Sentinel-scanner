import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = '/home/citrix/.gemini/antigravity/brain/877219d3-6264-456c-a0dc-13673daf038e/media__1779191973534.png';
const destDir = path.join(__dirname, 'public');
const dest = path.join(destDir, 'logo.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('--- SENTINEL SCANNER: BRAND LOGO COPIED SUCCESSFULLY TO public/logo.png ---');
  }
} catch (err) {
  console.error('Failed to copy logo in config boot:', err);
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
