const fs = require('fs');
const path = require('path');

const src = '/home/citrix/.gemini/antigravity/brain/877219d3-6264-456c-a0dc-13673daf038e/media__1779191973534.png';
const destDir = path.join(__dirname, 'public');
const dest = path.join(destDir, 'logo.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log('Logo copied successfully to public/logo.png');
} catch (err) {
  console.error('Failed to copy logo:', err);
}
