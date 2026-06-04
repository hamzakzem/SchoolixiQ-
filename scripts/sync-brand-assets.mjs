/**
 * Copies public/logo.png to PWA icons and native Android/iOS launcher + splash assets.
 * Run after updating the brand mark: npm run sync:brand
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logo = path.join(root, 'public', 'logo.png');

if (!fs.existsSync(logo)) {
  console.error('Missing public/logo.png');
  process.exit(1);
}

const copy = (dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(logo, dest);
};

const webTargets = [
  'public/favicon.png',
  'public/icon-192.png',
  'public/icon-512.png',
];
for (const rel of webTargets) {
  copy(path.join(root, rel));
  console.log('Updated', rel);
}

const androidDirs = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];
for (const dir of androidDirs) {
  const base = path.join(root, 'android', 'app', 'src', 'main', 'res', dir);
  for (const name of ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png']) {
    copy(path.join(base, name));
  }
}

const androidSplashDirs = [
  'drawable',
  'drawable-port-mdpi',
  'drawable-port-hdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
  'drawable-land-mdpi',
  'drawable-land-hdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
];
for (const dir of androidSplashDirs) {
  copy(path.join(root, 'android', 'app', 'src', 'main', 'res', dir, 'splash.png'));
}

const iosIcon = path.join(
  root,
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
  'AppIcon-512@2x.png',
);
copy(iosIcon);

const iosSplashDir = path.join(
  root,
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'Splash.imageset',
);
for (const name of [
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png',
]) {
  copy(path.join(iosSplashDir, name));
}

console.log('Brand assets synced. Rebuild web (npm run build:web) and run: npx cap sync');
