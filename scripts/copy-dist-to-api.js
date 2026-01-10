const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'dist');
const destDir = path.join(__dirname, '..', 'api', 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }

  // Create destination directory
  fs.mkdirSync(dest, { recursive: true });

  // Copy files recursively
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`Copying ${srcDir} to ${destDir}...`);
copyDir(srcDir, destDir);
console.log('✅ Successfully copied dist to api/dist');

