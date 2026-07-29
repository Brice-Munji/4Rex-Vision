import "server-only";
import sharp from "sharp";

/**
 * Real, model-free image analysis for the Rex Vision Engine.
 *
 * Uses sharp to measure genuine properties of the uploaded pixels — resolution,
 * clarity, colour distribution, candlestick presence and grid structure. These
 * measurements power upload validation, chart classification and vision
 * confidence **without any AI model**, so the platform can reject non-charts and
 * flag poor uploads even when the live model is not configured.
 */

export interface ImageMetrics {
  width: number;
  height: number;
  format: string;
  aspectRatio: number;
  megapixels: number;
  sizeBytes: number;

  brightness: number; // 0-1 mean luminance
  contrast: number; // 0-1 luminance std-dev
  sharpness: number; // 0-1 edge energy (blur detector)
  colorfulness: number; // 0-1 average saturation
  neutralRatio: number; // fraction of near-grey pixels (chart bg + gridlines)
  greenRatio: number; // fraction of bullish-candle-green pixels
  redRatio: number; // fraction of bearish-candle-red pixels
  gridScore: number; // 0-1 presence of horizontal/vertical gridlines
  darkBackground: boolean;
}

const SUPPORTED_FORMATS = ["png", "jpeg", "jpg", "webp"];

export function isSupportedFormat(format: string | undefined): boolean {
  return !!format && SUPPORTED_FORMATS.includes(format.toLowerCase());
}

export async function analyzeImage(
  buffer: Buffer,
  sizeBytes: number
): Promise<ImageMetrics | null> {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return null;
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return null;

  // Downscale for fast, stable statistics. Use a nearest-neighbour kernel so
  // thin, saturated candlestick pixels survive instead of being averaged into
  // the background (which would hide the very candles we look for).
  const target = 480;
  const { data, info } = await sharp(buffer)
    .resize(target, target, { fit: "inside", kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const lum = new Float32Array(w * h);

  let sumLum = 0;
  let green = 0;
  let red = 0;
  let neutral = 0;
  let sat = 0;
  const total = w * h;

  for (let i = 0, p = 0; i < data.length; i += ch, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[p] = l;
    sumLum += l;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    sat += max === 0 ? 0 : chroma / max;

    if (chroma < 26) neutral++;
    // Candlestick colours: dominant green (bullish) or red (bearish).
    if (g === max && g - r > 22 && g - b > 8 && g > 70) green++;
    if (r === max && r - g > 28 && r - b > 12 && r > 70) red++;
  }

  const meanLum = sumLum / total;

  // Contrast (luminance std-dev) and sharpness (mean gradient magnitude).
  let varSum = 0;
  let gradSum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const d = lum[idx] - meanLum;
      varSum += d * d;
      const gx = x < w - 1 ? Math.abs(lum[idx] - lum[idx + 1]) : 0;
      const gy = y < h - 1 ? Math.abs(lum[idx] - lum[idx + w]) : 0;
      gradSum += gx + gy;
    }
  }
  const contrast = Math.sqrt(varSum / total) / 255;
  const sharpness = Math.min(1, gradSum / total / 40);

  // Grid detection: rows/cols that are near-uniform (gridlines / flat bg bands).
  const gridScore = detectGrid(lum, w, h);

  return {
    width,
    height,
    format: (meta.format ?? "").toLowerCase(),
    aspectRatio: width / height,
    megapixels: (width * height) / 1_000_000,
    sizeBytes,
    brightness: meanLum / 255,
    contrast,
    sharpness,
    colorfulness: sat / total,
    neutralRatio: neutral / total,
    greenRatio: green / total,
    redRatio: red / total,
    gridScore,
    darkBackground: meanLum / 255 < 0.4,
  };
}

/** Fraction of rows + columns that look like straight gridlines. */
function detectGrid(lum: Float32Array, w: number, h: number): number {
  let lineRows = 0;
  for (let y = 0; y < h; y++) {
    let uniform = 0;
    for (let x = 1; x < w; x++) {
      if (Math.abs(lum[y * w + x] - lum[y * w + x - 1]) < 8) uniform++;
    }
    if (uniform / (w - 1) > 0.9) lineRows++;
  }
  let lineCols = 0;
  for (let x = 0; x < w; x++) {
    let uniform = 0;
    for (let y = 1; y < h; y++) {
      if (Math.abs(lum[y * w + x] - lum[(y - 1) * w + x]) < 8) uniform++;
    }
    if (uniform / (h - 1) > 0.9) lineCols++;
  }
  return Math.min(1, (lineRows / h + lineCols / w));
}
