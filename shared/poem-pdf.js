import { normalizeLayout, renderPoem } from './poem-format.js?v=c22e598a6f7d';

export const PRINT_CSS = `
@page { margin: 12.7mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #111110; background: white; font-family: Switzer, Arial, sans-serif; }
article { margin: 0 auto; }
h1 { margin: 0 0 28px; font-size: 32px; line-height: 1.2; font-weight: 500; overflow-wrap: anywhere; break-after: avoid; }
.credit { margin: 0 0 18px; font-size: 12px; line-height: 1.5; break-after: avoid; }
.poem { margin: 0; font-weight: 400; tab-size: 4; overflow-wrap: break-word; }
.poem > span { break-inside: avoid; }
.print-tools { position: sticky; top: 0; padding: 16px; background: white; border-bottom: 1px solid #ddd; font: 14px/1.5 Switzer, Arial, sans-serif; }
.print-tools button { font: inherit; min-height: 44px; margin: 8px 12px 0 0; cursor: pointer; }
@media screen { article { margin: 36px auto; } body { overflow-x: auto; } }
@media print { .print-tools { display: none !important; } article { margin: 0 auto; } }
`;

/** Size paper to the saved measure instead of silently shrinking type or clipping wide poems. */
export function printPageSize(measurePixels) {
  const width = Math.max(816, Math.ceil(Number(measurePixels) || 0) + 96);
  const height = Math.max(1056, Math.ceil(width * 1056 / 816));
  return { width, height, css: `@page { size: ${width}px ${height}px; margin: 48px; }` };
}

export function populatePrintDocument(document, poem) {
  const layout = normalizeLayout(poem?.layout);
  document.title = String(poem?.title || 'Poem');
  const style = document.createElement('style');
  style.textContent = PRINT_CSS;
  document.head.appendChild(style);
  const tools = document.createElement('div');
  tools.className = 'print-tools';
  tools.setAttribute('role', 'status');
  tools.textContent = 'Preparing PDF layout…';
  document.body.appendChild(tools);
  const article = document.createElement('article');
  article.style.width = `${layout.measure}ch`;
  article.style.fontSize = `${layout.fontSize}px`;
  const venues = [...new Set((Array.isArray(poem?.publications) ? poem.publications : []).filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))];
  if (venues.length) {
    const credit = document.createElement('p');
    credit.className = 'credit';
    credit.textContent = `Published in ${venues.join(', ')}`;
    article.appendChild(credit);
  }
  if (poem?.title) {
    const title = document.createElement('h1');
    title.textContent = String(poem.title);
    article.appendChild(title);
  }
  const body = document.createElement('div');
  body.className = 'poem';
  renderPoem(body, poem?.body ?? '', layout);
  article.appendChild(body);
  document.body.appendChild(article);
  return { article, tools, layout };
}

/** Invoke directly from a click so browsers can open the print tab. No upload or saved copy. */
export async function exportPoemPDF(poem, { host = window, fontStylesheet = new URL('./fonts.css', import.meta.url).href } = {}) {
  const popup = host.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups for this site to export a PDF.');
  popup.opener = null;
  const document = popup.document;
  const { article, tools, layout } = populatePrintDocument(document, poem);
  const timeout = (promise, message) => new Promise((resolve, reject) => {
    const timer = host.setTimeout(() => reject(new Error(message)), 12000);
    Promise.resolve(promise).then(value => { host.clearTimeout(timer); resolve(value); }, error => { host.clearTimeout(timer); reject(error); });
  });
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontStylesheet;
    await timeout(new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () => reject(new Error('The poem font could not be loaded. Please try again.'));
      document.head.appendChild(link);
    }), 'The poem font took too long to load. Please try again.');
    if (!document.fonts) throw new Error('This browser cannot confirm the poem font is ready. Try another browser.');
    const loaded = await timeout(document.fonts.load(`500 ${layout.fontSize}px Switzer`), 'The poem font took too long to load. Please try again.');
    if (!loaded.length) throw new Error('Switzer could not be loaded. Please try again.');
    await timeout(document.fonts.ready, 'The poem font took too long to load. Please try again.');
    if (popup.closed) return null;
    const page = document.createElement('style');
    page.textContent = printPageSize(article.getBoundingClientRect().width).css;
    document.head.appendChild(page);
    tools.textContent = '';
    const print = document.createElement('button');
    print.type = 'button';
    print.textContent = 'Print / Save as PDF';
    print.onclick = () => popup.print();
    tools.appendChild(print);
    popup.focus();
    popup.print();
    return popup;
  } catch (error) {
    if (!popup.closed) tools.textContent = error.message;
    throw error;
  }
}
