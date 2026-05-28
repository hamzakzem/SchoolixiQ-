const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('Starting asset generation from public/icon.svg...');

  // 1. Generate standard 1024x1024 icon.png (Legacy and fallback app icon)
  await sharp('public/icon.svg')
    .resize(1024, 1024)
    .png()
    .toFile('assets/icon.png');
  console.log('✓ Generated assets/icon.png (1024x1024)');

  // 2. Generate icon-background.png (solid Indigo background color, 1024x1024)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#1e1b4b'
    }
  })
  .png()
  .toFile('assets/icon-background.png');
  console.log('✓ Generated assets/icon-background.png (1024x1024)');

  // 3. Generate icon-only.png (Adaptive icon foreground: logo scaled to 700px on transparent 1024px canvas)
  const parsedIconBuffer = await sharp('public/icon.svg')
    .resize(700, 700)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent
    }
  })
  .composite([{ input: parsedIconBuffer, gravity: 'center' }])
  .png()
  .toFile('assets/icon-only.png');
  console.log('✓ Generated assets/icon-only.png (1024x1024 with 700px centered logo)');

  // 4. Generate splash.png (Splash screen: indigo background with centered 600px logo)
  const splashLogoBuffer = await sharp('public/icon.svg')
    .resize(600, 600)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#1e1b4b'
    }
  })
  .composite([{ input: splashLogoBuffer, gravity: 'center' }])
  .png()
  .toFile('assets/splash.png');
  console.log('✓ Generated assets/splash.png (2732x2732 with 600px centered logo)');

  // 5. Generate splash-dark.png (Dark splash screen: slate background with centered 600px logo)
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#0f172a'
    }
  })
  .composite([{ input: splashLogoBuffer, gravity: 'center' }])
  .png()
  .toFile('assets/splash-dark.png');
  console.log('✓ Generated assets/splash-dark.png (2732x2732 with 600px centered logo)');

  console.log('All source assets generated in assets/ successfully!');
}

main().catch(err => {
  console.error('Error generating source assets:', err);
  process.exit(1);
});
