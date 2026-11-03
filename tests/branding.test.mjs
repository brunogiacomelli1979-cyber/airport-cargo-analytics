import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const p='./public/static/brand/viracopos-oficial.png';
test('marca institucional está presente no pacote',()=>assert.equal(existsSync(p),true));
for(const page of ['index.html','entrar.html','relatorios.html']) {
 test(`marca visível em ${page}`,()=>assert.match(readFileSync('./public/'+page,'utf8'),/viracopos-oficial\.png/));
}
test('marca no service worker para PWA',()=>assert.match(readFileSync('./public/sw.js','utf8'),/viracopos-oficial\.png/));
