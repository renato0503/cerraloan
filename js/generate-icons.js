// Icon generator script - Run with Node.js
const fs = require('fs');
const path = require('path');

function createIcon(size) {
    const canvas = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#16213e"/>
            <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">MC</text>
        </svg>
    `;
    return Buffer.from(canvas);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), createIcon(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), createIcon(512));

console.log('Icons created as SVG files. For PNG, use a converter or create programmatically.');
