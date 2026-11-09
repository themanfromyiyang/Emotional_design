const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname,file),'utf8');
const context = {window:{}};
vm.runInNewContext(read('species.js'),context);
const records = context.window.SPECIES;
assert.equal(records.length,5);
assert.equal(new Set(records.map(s => s.id)).size,records.length);
for (const record of records) {
  for (const field of ['id','name','latin','position','finding','interpretation','limit']) assert.ok(record[field],`${record.id}: missing ${field}`);
  if (record.id !== 'human') assert.ok(record.sources.length,`${record.id}: missing sources`);
  for (const source of record.sources) assert.equal(new URL(source.url).protocol,'https:');
}
assert.match(records.find(s => s.id === 'fox').sources[0].url,/8424924/);
assert.equal(records.find(s => s.id === 'fox').position,records.find(s => s.id === 'dog').position);
const html = read('index.html');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for (const match of read('app.js').matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(match[1]),`Missing element ${match[1]}`);
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|data:)/.test(match[1])) continue;
  assert.ok(fs.existsSync(path.join(__dirname,match[1])),`Missing asset ${match[1]}`);
}
const png = fs.readFileSync(path.join(__dirname,'assets/park-vision-atlas.png'));
assert.equal(png.readUInt32BE(16),1536);
assert.equal(png.readUInt32BE(20),1024);
console.log('PASS: species evidence, fox primary source, DOM references, local assets, and 2×2 image atlas.');
