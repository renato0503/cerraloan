const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

async function createIcon(size, filename) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#16213e"/>
                <stop offset="100%" style="stop-color:#0f3460"/>
            </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#grad)"/>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">MC</text>
    </svg>`;

    await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(iconsDir, filename));
    
    console.log(`Created ${filename}`);
}

async function generate() {
    await createIcon(192, 'icon-192.png');
    await createIcon(512, 'icon-512.png');
    console.log('All icons generated!');
}

generate().catch(console.error);
