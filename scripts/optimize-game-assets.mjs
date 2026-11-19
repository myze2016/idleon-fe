import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = path.join(root, "public/optimized/manifest.json");
async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(path.join(directory, entry.name)) : /\.(tsx?|css)$/.test(entry.name) ? [path.join(directory, entry.name)] : []))).flat();
}
const files = await sourceFiles(path.join(root, "src"));
const sources = await Promise.all(files.map(async file => ({ file, text: await readFile(file, "utf8") })));
const previous = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
const originals = new Set(Object.keys(previous));
for (const source of sources) for (const match of source.text.matchAll(/\/(?:ui|maps|room|sprites)\/[a-zA-Z0-9_./-]+\.png/g)) originals.add(match[0]);
const manifest = {};
let originalBytes = 0, optimizedBytes = 0;
const list = [...originals].sort();
// Bound native encoder concurrency to keep regeneration usable on local machines.
for (let offset = 0; offset < list.length; offset += 3) {
  await Promise.all(list.slice(offset, offset + 3).map(async original => {
    const input = path.join(root, "public", original.slice(1));
    const bytes = await sharp(input).webp({ lossless: original.startsWith("/sprites/"), quality: 85, alphaQuality: 100, effort: 6 }).toBuffer();
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const url = `/optimized${original.replace(/\.png$/, `.${hash}.webp`)}`;
    const output = path.join(root, "public", url.slice(1));
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, bytes);
    manifest[original] = url;
    originalBytes += (await stat(input)).size; optimizedBytes += bytes.length;
  }));
}
for (const source of sources) {
  let updated = source.text;
  for (const [original, optimized] of Object.entries(manifest)) {
    if (previous[original]) updated = updated.replaceAll(previous[original], optimized);
    updated = updated.replaceAll(original, optimized);
  }
  if (updated !== source.text) await writeFile(source.file, updated);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${list.length} game assets: ${(originalBytes / 1048576).toFixed(2)} MB -> ${(optimizedBytes / 1048576).toFixed(2)} MB (${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}% smaller).`);
console.log("Original artwork retained. Sprite dimensions and pixels preserved with lossless encoding.");
