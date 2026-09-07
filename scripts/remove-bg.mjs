import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isGreen(rgb) {
  return rgb[1] > 90 && rgb[1] - rgb[0] > 24 && rgb[1] - rgb[2] > 24;
}

function medianColor(samples) {
  if (!samples.length) return [128, 128, 128];
  const channel = (i) => {
    const vals = samples.map((s) => s[i]).sort((a, b) => a - b);
    return vals[(vals.length / 2) | 0];
  };
  return [channel(0), channel(1), channel(2)];
}

function sampleEdges(data, width, height) {
  const samples = [];
  const push = (x, y) => {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
  };
  for (let x = 0; x < width; x += 2) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 2) {
    push(0, y);
    push(width - 1, y);
  }
  return samples;
}

function cutout(data, width, height) {
  const edge = sampleEdges(data, width, height);
  const chroma = edge.filter((s) => s[3] > 8).some((s) => isGreen(s));
  const bg = medianColor(edge.filter((s) => s[3] > 8 && (chroma ? isGreen(s) : true)));
  const visited = new Uint8Array(width * height);
  const queue = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    const x = idx % width;
    const y = (idx / width) | 0;
    const i = idx * 4;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const alpha = data[i + 3];
    const bgLike = chroma
      ? isGreen(rgb)
      : alpha < 18 || dist(rgb, bg) < 48 || (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) < 22 && dist(rgb, bg) < 72);
    if (!bgLike) continue;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const snapshot = Uint8Array.from(data);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = (y * width + x) * 4;
        if (snapshot[i + 3] === 0) continue;
        let trans = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          const j = ((y + dy) * width + (x + dx)) * 4;
          if (snapshot[j + 3] === 0) trans += 1;
        }
        const rgb = [snapshot[i], snapshot[i + 1], snapshot[i + 2]];
        if (chroma && trans > 0 && isGreen(rgb)) data[i + 3] = 0;
        else if (trans >= 3 && dist(rgb, bg) < 55) data[i + 3] = 0;
        else if (trans >= 5) data[i + 3] = Math.min(data[i + 3], 40);
      }
    }
  }

  if (chroma) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g > r + 8 && g > b + 8) {
        data[i + 1] = Math.max(r, b);
        data[i + 3] = Math.min(data[i + 3], 220);
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 12) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
}

function keepLargestOpaque(data, width, height) {
  const label = new Int32Array(width * height).fill(-1);
  let bestCount = 0;
  let bestId = -1;
  let nextId = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (data[(idx << 2) + 3] < 24 || label[idx] !== -1) continue;
      const id = nextId;
      nextId += 1;
      let count = 0;
      const q = [idx];
      label[idx] = id;
      while (q.length) {
        const i = q.pop();
        count += 1;
        const cx = i % width;
        const cy = (i / width) | 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (label[ni] !== -1 || data[(ni << 2) + 3] < 24) continue;
          label[ni] = id;
          q.push(ni);
        }
      }
      if (count > bestCount) {
        bestCount = count;
        bestId = id;
      }
    }
  }
  for (let i = 0; i < label.length; i += 1) {
    if (label[i] !== bestId) {
      const p = i << 2;
      data[p] = 0;
      data[p + 1] = 0;
      data[p + 2] = 0;
      data[p + 3] = 0;
    }
  }
}

function addStickerStroke(data, width, height, radius = 4) {
  const src = Uint8Array.from(data);
  const r2 = radius * radius;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (src[i + 3] > 40) continue;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (src[((ny * width + nx) << 2) + 3] > 80) {
            near = true;
            break;
          }
        }
      }
      if (near) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] > 40) {
      data[i] = src[i];
      data[i + 1] = src[i + 1];
      data[i + 2] = src[i + 2];
      data[i + 3] = src[i + 3];
    }
  }
}

function cropOpaque(data, width, height, pad = 10) {
  let minx = width;
  let miny = height;
  let maxx = 0;
  let maxy = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[((y * width + x) << 2) + 3] < 24) continue;
      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
    }
  }
  if (maxx < minx) return { data, width, height };
  minx = Math.max(0, minx - pad);
  miny = Math.max(0, miny - pad);
  maxx = Math.min(width - 1, maxx + pad);
  maxy = Math.min(height - 1, maxy + pad);
  const w = maxx - minx + 1;
  const h = maxy - miny + 1;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const src = ((miny + y) * width + minx) << 2;
    out.set(data.subarray(src, src + w * 4), y * w * 4);
  }
  return { data: out, width: w, height: h };
}

export async function convert(input, output, { stroke = 5 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);
  cutout(pixels, info.width, info.height);
  keepLargestOpaque(pixels, info.width, info.height);
  if (stroke > 0) addStickerStroke(pixels, info.width, info.height, stroke);
  const cropped = cropOpaque(pixels, info.width, info.height, Math.max(8, stroke + 4));
  mkdirSync(dirname(output), { recursive: true });
  await sharp(Buffer.from(cropped.data), {
    raw: { width: cropped.width, height: cropped.height, channels: 4 },
  })
    .png()
    .toFile(output);
  console.log("wrote", output, cropped.width, "x", cropped.height);
}

const input = process.argv[2];
const output = process.argv[3];
if (input && output) await convert(input, output);
