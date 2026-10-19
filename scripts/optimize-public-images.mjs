// Pre-generate responsive assets: no image server or external service required.
import sharp from 'sharp';
import {resolve, join} from 'node:path';
const root = resolve(process.argv[2] || '.');
for (const width of [256, 512, 768]) {
 await sharp(join(root, 'public/francesco-fracchia-logo.png')).resize({width}).webp({lossless:true,effort:6}).toFile(join(root, `public/francesco-fracchia-logo-${width}.webp`));
}
for (const width of [160, 320, 480, 640, 960]) {
 const source = join(root, 'public/images/francesco-fracchia-ritratto.png');
 await sharp(source).resize({width}).webp({quality:82,effort:6}).toFile(join(root, `public/images/francesco-ritratto-${width}.webp`));
 await sharp(source).resize({width}).avif({quality:55,effort:6}).toFile(join(root, `public/images/francesco-ritratto-${width}.avif`));
}
