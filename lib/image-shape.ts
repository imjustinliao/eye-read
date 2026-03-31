/**
 * Scans an image's alpha channel to build a "shape profile" —
 * for each row of pixels, records the leftmost and rightmost
 * opaque pixel. This lets text wrap around the real silhouette.
 *
 * Supports rotation: we draw the image rotated on a larger canvas
 * and scan that rotated result.
 */

export type ShapeRow = {
  left: number;
  right: number; // exclusive
};

export type ShapeProfile = {
  rows: (ShapeRow | null)[];
  width: number;  // canvas width (may be larger than image when rotated)
  height: number; // canvas height
  offsetX: number; // how much the image origin shifted due to rotation
  offsetY: number;
};

const ALPHA_THRESHOLD = 20;

/**
 * Load an image element from a URL. Cached so we only load once.
 */
let cachedImg: HTMLImageElement | null = null;
let cachedSrc = "";

function loadImage(src: string): Promise<HTMLImageElement> {
  if (cachedImg && cachedSrc === src) return Promise.resolve(cachedImg);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cachedImg = img;
      cachedSrc = src;
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

/**
 * Build a shape profile for an image at a given rotation angle.
 * The image is drawn rotated onto a canvas large enough to contain
 * the full rotated bounding box, then scanned row by row.
 */
export async function buildShapeProfile(
  src: string,
  displayWidth: number,
  displayHeight: number,
  angleDeg: number,
): Promise<ShapeProfile> {
  const img = await loadImage(src);

  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angleRad));
  const sin = Math.abs(Math.sin(angleRad));

  // Rotated bounding box size
  const canvasW = Math.ceil(displayWidth * cos + displayHeight * sin);
  const canvasH = Math.ceil(displayWidth * sin + displayHeight * cos);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // Move origin to center of canvas, rotate, draw image centered
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(img, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);

  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const pixels = imageData.data;

  const rows: (ShapeRow | null)[] = [];

  for (let row = 0; row < canvasH; row++) {
    let left = -1;
    let right = -1;

    for (let col = 0; col < canvasW; col++) {
      const alphaIndex = (row * canvasW + col) * 4 + 3;
      if (pixels[alphaIndex] > ALPHA_THRESHOLD) {
        if (left === -1) left = col;
        right = col;
      }
    }

    if (left === -1) {
      rows.push(null);
    } else {
      rows.push({ left, right: right + 1 });
    }
  }

  return {
    rows,
    width: canvasW,
    height: canvasH,
    // The rotated canvas is bigger than the original image.
    // The offset tells us how far the top-left shifted.
    offsetX: (canvasW - displayWidth) / 2,
    offsetY: (canvasH - displayHeight) / 2,
  };
}

/**
 * For a given line band, find the blocked horizontal interval
 * based on the shape profile (which may be rotated).
 */
export function getShapeBlockedInterval(
  lineTop: number,
  lineBottom: number,
  companionX: number,
  companionY: number,
  profile: ShapeProfile,
  padding: number,
): { left: number; right: number } | null {
  if (profile.rows.length === 0) return null;

  // The rotated canvas is offset from the companion's position
  const canvasX = companionX - profile.offsetX;
  const canvasY = companionY - profile.offsetY;

  const localTop = Math.max(0, Math.floor(lineTop - canvasY));
  const localBottom = Math.min(profile.rows.length, Math.ceil(lineBottom - canvasY));

  if (localTop >= profile.rows.length || localBottom <= 0) return null;

  let minLeft = Infinity;
  let maxRight = -Infinity;

  for (let row = localTop; row < localBottom; row++) {
    const entry = profile.rows[row];
    if (entry === null) continue;
    if (entry.left < minLeft) minLeft = entry.left;
    if (entry.right > maxRight) maxRight = entry.right;
  }

  if (minLeft === Infinity) return null;

  return {
    left: canvasX + minLeft - padding,
    right: canvasX + maxRight + padding,
  };
}
