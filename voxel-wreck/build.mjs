// 构建：把源码、样式、three 打包成单个可离线运行的 index.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: [resolve(here, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  loader: { '.js': 'js' },
});

const js = result.outputFiles[0].text;
const css = readFileSync(resolve(here, 'src/style.css'), 'utf8');
const tpl = readFileSync(resolve(here, 'index.tpl.html'), 'utf8');

const html = tpl
  .replace('__CSS__', () => css)
  .replace('__JS__', () => js.replace(/<\/script/gi, '<\\/script'));

const out = resolve(here, 'index.html');
writeFileSync(out, html);
console.log('index.html', (statSync(out).size / 1024).toFixed(0) + ' KB');
