/** Formatting is presentation metadata; poem text remains plain text. */
export function normalizeLayout(layout = {}) {
  const source = layout && typeof layout === 'object' ? layout : {};
  const bounded = (key, fallback, min, max) => {
    const raw = source[key];
    const value = raw === null || raw === '' || typeof raw === 'boolean' ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };
  return {
    fontSize: bounded('fontSize', 18, 12, 32),
    measure: bounded('measure', 46, 24, 90),
    lineSpacing: bounded('lineSpacing', 1.8, 1, 2.6),
    stanzaSpacing: bounded('stanzaSpacing', 0.5, 0, 2),
    alignment: ['left', 'center', 'right'].includes(source.alignment) ? source.alignment : 'left',
  };
}

/** Edit the lines touched by a selection; an end at a line start excludes that line. */
export function formatSelection(text, start, end, action) {
  text = String(text ?? '');
  const offset = value => Math.min(text.length, Math.max(0, Math.trunc(Number(value) || 0)));
  start = offset(start);
  end = offset(end);
  if (end < start) [start, end] = [end, start];
  const original = { text, start, end };
  if (!['indent', 'outdent', 'up', 'down'].includes(action)) return original;
  const lines = text.split('\n');
  const starts = [];
  let position = 0;
  for (const line of lines) { starts.push(position); position += line.length + 1; }
  const lineAt = at => {
    let index = 0;
    while (index + 1 < starts.length && starts[index + 1] <= at) index++;
    return index;
  };
  const first = lineAt(start);
  const last = lineAt(end > start ? end - 1 : end);
  if (action === 'indent' || action === 'outdent') {
    const edits = [];
    for (let index = first; index <= last; index++) {
      const removed = action === 'outdent' ? (lines[index].match(/^(?:\t| {1,2})/)?.[0].length || 0) : 0;
      const added = action === 'indent' ? '\t' : '';
      edits.push({ at: starts[index], removed, added: added.length });
      lines[index] = added + lines[index].slice(removed);
    }
    const map = at => at + edits.reduce((sum, edit) => {
      if (edit.at > at) return sum;
      return sum + edit.added - Math.min(edit.removed, at - edit.at);
    }, 0);
    return { text: lines.join('\n'), start: map(start), end: map(end) };
  }
  if ((action === 'up' && first === 0) || (action === 'down' && last === lines.length - 1)) return original;
  const count = last - first + 1;
  const block = lines.splice(first, count);
  const destination = action === 'up' ? first - 1 : first + 1;
  lines.splice(destination, 0, ...block);
  const newStart = lines.slice(0, destination).reduce((sum, line) => sum + line.length + 1, 0);
  const shift = newStart - starts[first];
  const result = lines.join('\n');
  return { text: result, start: Math.min(result.length, start + shift), end: Math.min(result.length, end + shift) };
}

export function applyPoemLayout(element, layout) {
  const normalized = normalizeLayout(layout);
  Object.assign(element.style, {
    fontSize: `${normalized.fontSize}px`,
    maxWidth: `${normalized.measure}ch`,
    width: '100%',
    lineHeight: String(normalized.lineSpacing),
    textAlign: normalized.alignment,
  });
  return normalized;
}

/** Construct only text nodes/spans, never HTML from poem content. */
export function renderPoem(element, text, layout) {
  const normalized = applyPoemLayout(element, layout);
  const document = element.ownerDocument;
  const lines = String(text ?? '').split('\n');
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    const span = document.createElement('span');
    span.style.display = 'block';
    span.style.whiteSpace = 'pre-wrap';
    span.style.minHeight = '1em';
    if (!line.trim()) span.style.marginBottom = `${normalized.stanzaSpacing}em`;
    // Newlines remain real text, preserving textContent without zero-width characters.
    span.textContent = line;
    fragment.appendChild(span);
    if (index < lines.length - 1) fragment.appendChild(document.createTextNode('\n'));
  });
  element.style.whiteSpace = 'normal';
  element.replaceChildren(fragment);
  return normalized;
}
