const stats = ["hp", "mp", "atk", "def", "magic", "magicDef", "speed", "deep-sea"];

export function ArtifactIcon({ stat }: { stat: string }) {
  const index = stats.indexOf(stat);
  if (index < 0) return null;
  return <span aria-hidden="true" className="block size-14 shrink-0 bg-no-repeat" style={{
    backgroundImage: "url('/optimized/ui/artifact-icons-v1.a44f85eb7f99.webp')", backgroundSize: "400% 200%",
    backgroundPosition: `${index % 4 / 3 * 100}% ${Math.floor(index / 4) * 100}%`,
  }} />;
}

let atlas: HTMLImageElement | undefined;
export function drawArtifactIcon(ctx: CanvasRenderingContext2D, stat: string, x: number, y: number, size: number) {
  const index = stats.indexOf(stat);
  if (index < 0) return;
  if (!atlas) {
    atlas = new Image(); atlas.onload = () => window.dispatchEvent(new Event("artifact-art-ready"));
    atlas.src = "/optimized/ui/artifact-icons-v1.a44f85eb7f99.webp";
  }
  if (!atlas.complete || !atlas.naturalWidth) return;
  const width = atlas.naturalWidth / 4, height = atlas.naturalHeight / 2;
  ctx.drawImage(atlas, index % 4 * width, Math.floor(index / 4) * height, width, height, x, y, size, size);
}
