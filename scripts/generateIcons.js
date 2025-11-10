const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  try {
    // Read the SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate favicon.ico (16x16, 32x32, 48x48)
    const faviconSizes = [16, 32, 48];
    const faviconImages = await Promise.all(
      faviconSizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    // For favicon.ico, we'll create a 32x32 PNG and rename it
    // (true .ico conversion would require additional library)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    
    // Generate logo192.png
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'logo192.png'));
    
    // Generate logo512.png
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'logo512.png'));
    
    console.log('✅ Icons generated successfully!');
    console.log('   - favicon.ico (32x32)');
    console.log('   - logo192.png');
    console.log('   - logo512.png');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

