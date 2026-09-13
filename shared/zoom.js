// Mirror geometry in the outer photograph's 3000 × 2000 coordinate system.
export const MIRROR = { x: 1517, y: 837.5, width: 538, height: 749 };
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);

// Scroll progress is normalized to 0–1. The first 45% reveals the landscape;
// the remaining 55% pulls the portrait into view around the stationary mirror.
export function zoomState(progress, width, height, mirrorFit, reduced = false) {
  const p = clamp(progress);
  const first = ease(clamp(p / .45));
  const second = reduced ? 1 : ease(clamp((p - .45) / .55));

  // Cover both sides of the fixed mirror anchor at the furthest zoom.
  // Four extra pixels prevent rounding from exposing the photograph's edges.
  const end = Math.max(
    (width + 4) / (2 * Math.min(MIRROR.x, 3000 - MIRROR.x)),
    (height + 4) / (2 * Math.min(MIRROR.y, 2000 - MIRROR.y)),
  );
  const scale = mirrorFit * Math.pow(end / mirrorFit, second);
  return {
    scale,
    x: -MIRROR.x * scale,
    y: -MIRROR.y * scale,
    innerScale: reduced ? 1 : Math.pow(1.15, 1 - first),
  };
}

// Move the SVG camera within a viewport-sized surface, never a giant CSS layer.
// Convert viewport pixels to photograph coordinates around the mirror center.
export function cameraViewBox(scale, width, height) {
  const w = width / scale;
  const h = height / scale;
  return `${MIRROR.x - w / 2} ${MIRROR.y - h / 2} ${w} ${h}`;
}

export function setCamera(camera, scale, width, height) {
  camera.setAttribute('viewBox', cameraViewBox(scale, width, height));
  camera.dataset.scale = String(scale);
}

export function menuSkyY(height, scale) {
  return height / 2 - Math.min(height * .4, 240 * scale);
}

// Expanded labels must fit both the viewport and the actual curved aperture.
// Require extra clearance to reopen, preventing toggles at a fractional edge.
export function menuFitsMirror({
  width,
  height,
  scale,
  rowWidth,
  rowHeight,
  collapsed = false,
  centerY = menuSkyY(height, scale),
}, inside) {
  const margin = collapsed ? 18 : 8;
  const left = width / 2 - rowWidth / 2 - margin;
  const right = width / 2 + rowWidth / 2 + margin;
  const top = centerY - rowHeight / 2 - margin;
  const bottom = centerY + rowHeight / 2 + margin;
  if (left < 12 || right > width - 12 || top < 12 || bottom > height - 12) {
    return false;
  }

  // The caller's aperture test uses photograph coordinates. Sample all four
  // sides of the menu box, since corners alone can miss a curved boundary.
  const point = (x, y) => inside(
    MIRROR.x + (x - width / 2) / scale,
    MIRROR.y + (y - height / 2) / scale,
  );
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    if (
      !point(left + (right - left) * t, top)
      || !point(left + (right - left) * t, bottom)
      || !point(left, top + (bottom - top) * t)
      || !point(right, top + (bottom - top) * t)
    ) {
      return false;
    }
  }
  return true;
}
