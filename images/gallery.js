// Time each photograph stays still; the push animation is configured in app.js.
export const DISPLAY_MS = 20_000;

export function nextIndex(current, count) {
  return count > 1 ? (current + 1) % count : 0;
}

// Return an index into the original collection, not the recency-sorted array.
// Unseen photos have priority until the current shuffle cycle is exhausted.
export function choosePhoto(photos, currentId, random = Math.random, seen = new Set()) {
  if (!photos.length) return -1;

  const ranked = photos
    .map((photo, index) => ({ photo, index }))
    .sort((a, b) =>
      (Date.parse(b.photo.createdAt) || 0) - (Date.parse(a.photo.createdAt) || 0)
      || b.index - a.index
    )
    // The sorted position doubles as recency rank; no need to look it up again below.
    .map((entry, rank) => ({ ...entry, rank }));
  const available = ranked.filter(entry =>
    !seen.has(entry.photo.id) && entry.photo.id !== currentId
  );
  const pool = available.length ? available : ranked;

  // Newest: 20; next two: 8; next five: 3; older: 1.
  // Featuring multiplies that weight by four without bypassing the cycle.
  const choices = pool
    .map(entry => ({
      ...entry,
      weight: (entry.rank === 0 ? 20 : entry.rank < 3 ? 8 : entry.rank < 8 ? 3 : 1)
        * (entry.photo.featured === true ? 4 : 1),
    }))
    .filter(entry => photos.length === 1 || entry.photo.id !== currentId);

  let draw = random() * choices.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of choices) {
    draw -= entry.weight;
    if (draw < 0) return entry.index;
  }
  return choices.at(-1).index;
}

// Fit an upload preview within its available area, preserving orientation.
export function frameSize(width, height, portrait, padding = 32) {
  const ratio = portrait ? 2 / 3 : 3 / 2;
  const availableWidth = Math.max(1, width - 2 * padding);
  const availableHeight = Math.max(1, height - 2 * padding);
  const w = Math.min(availableWidth, availableHeight * ratio);
  return { width: w, height: w / ratio };
}

// All measurements are CSS pixels relative to the gallery viewport.
// Every photo reserves equal space above and below for the pinned controls.
// Each neighbor exposes ten percent of its own width at the screen edge.
export function photoPosition(
  width,
  height,
  portrait,
  slot = 'center',
  padding = 32,
  anchorPortrait = portrait,
) {
  // anchorPortrait remains accepted for existing callers; each photo now fits
  // independently so landscape neighbors do not shrink a portrait main photo.
  const reserve = width <= 600 ? 88 : 96;
  const fit = orientation => {
    const ratio = orientation ? 2 / 3 : 3 / 2;
    const w = Math.max(1, Math.min(
      width * .78,
      Math.max(1, width - padding * 2),
      Math.max(1, height - reserve * 2) * ratio,
    ));
    return { width: w, height: w / ratio };
  };
  const size = fit(portrait);

  return {
    ...size,
    left: slot === 'previous' ? -size.width * .9
      : slot === 'next' ? width - size.width * .1
      : (width - size.width) / 2,
    top: (height - size.height) / 2,
  };
}
