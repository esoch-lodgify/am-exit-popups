import fs from 'fs';
import { minify } from 'terser';

const SRC = process.argv[2], OUT = process.argv[3];
let src = fs.readFileSync(SRC, 'utf8');
const before = src.length;

/* ---- 1 · the CSS inside `var CSS = ` -----------------------------------------
   Comments and whitespace only. No value, colour, selector or shorthand
   rewriting, so the stylesheet the browser sees is character-for-character
   equivalent to the source. (clean-css saved a further 80 bytes but rewrote
   gradient stops from 0% to 0 — not worth any behavioural risk.) */
const m = src.match(/var CSS = `([\s\S]*?)`;\n/);
if (!m) throw new Error('CSS literal not found');
const rawCss = m[1];
const minCss = rawCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
for (const t of ['__LDG_ROOT__', '__LDG_PHOTO__', '__LDG_TAG__'])
  if (!minCss.includes(t)) throw new Error('runtime token lost: ' + t);
if (/[`]|\$\{/.test(minCss)) throw new Error('minified CSS would break the template literal');
console.log('css     ', rawCss.length, '->', minCss.length,
            '(' + Math.round(100 - minCss.length / rawCss.length * 100) + '% off)');
src = src.replace(m[0], 'var CSS = `' + minCss + '`;\n');

/* ---- 2 · the markup templates -----------------------------------------------
   Whitespace-only gaps between tags, and wrapped attribute lists. Text content
   is never touched. */
let saved = 0;
src = src.replace(/(US|CA_EN|CA_FR): `(<div class="ldg[\s\S]*?)`(,?\n)/g, (all, key, html, tail) => {
  const c = html.replace(/>\s*\n\s*</g, '><').replace(/\n\s+/g, ' ').trim();
  saved += html.length - c.length;
  return key + ': `' + c + '`' + tail;
});
console.log('markup  ', saved, 'chars collapsed');

/* ---- 3 · terser: compress + mangle, comments stripped ------------------------ */
const res = await minify(src, {
  ecma: 2017,
  compress: { passes: 3, drop_debugger: true, pure_getters: true },
  mangle: { toplevel: false },
  format: {
    comments: false,
    preamble: '/*! Lodgify LD2026 top bar + exit popup | build ' +
              new Date().toISOString().slice(0, 10) +
              ' | source: github.com/esoch-lodgify/am-exit-popups */'
  }
});
if (res.error) throw res.error;
fs.writeFileSync(OUT, res.code);
console.log('total   ', before, '->', res.code.length,
            '(' + Math.round(100 - res.code.length / before * 100) + '% off)');
