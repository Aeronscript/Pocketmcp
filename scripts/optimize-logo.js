import sharp from "sharp";
import { readFileSync } from "fs";

const input = readFileSync("/home/z/my-project/public/pocketmcp-logo.png");

// Optimisation : resize à 256x256 (assez pour retina), compression PNG optimisée
// + génère un favicon 32x32 et 64x64
await sharp(input)
  .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90, compressionLevel: 9, palette: true })
  .toFile("/home/z/my-project/public/pocketmcp-logo-optimized.png");

await sharp(input)
  .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90, compressionLevel: 9 })
  .toFile("/home/z/my-project/public/favicon-64.png");

await sharp(input)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90, compressionLevel: 9 })
  .toFile("/home/z/my-project/public/favicon-32.png");

console.log("✓ logos optimisés générés");

const fs = await import("fs");
const sizes = await Promise.all([
  fs.promises.stat("/home/z/my-project/public/pocketmcp-logo-optimized.png"),
  fs.promises.stat("/home/z/my-project/public/favicon-64.png"),
  fs.promises.stat("/home/z/my-project/public/favicon-32.png"),
]);
console.log(`  logo-optimized: ${(sizes[0].size / 1024).toFixed(1)} KB`);
console.log(`  favicon-64: ${(sizes[1].size / 1024).toFixed(1)} KB`);
console.log(`  favicon-32: ${(sizes[2].size / 1024).toFixed(1)} KB`);
