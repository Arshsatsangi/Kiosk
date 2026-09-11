const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'old', 'static', 'img');
const dst = path.join(root, 'client', 'public', 'img');

// Create destination directory
if (!fs.existsSync(dst)) {
  fs.mkdirSync(dst, { recursive: true });
}

// Also copy to client/public root
const dstRoot = path.join(root, 'client', 'public');

const files = ['leaf_bg.png', 'ayurvaani.png', 'prakriti.png', 'viveka.png'];

files.forEach(f => {
  try {
    // Copy to /img/ subfolder
    fs.copyFileSync(path.join(src, f), path.join(dst, f));
    console.log('Copied to img/:', f);
    // Also copy to root public for existing references
    fs.copyFileSync(path.join(src, f), path.join(dstRoot, f));
    console.log('Copied to public/:', f);
  } catch (e) {
    console.error('FAILED:', f, e.message);
  }
});

console.log('\\nDone! All images copied.');
