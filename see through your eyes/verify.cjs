const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const html=read('index.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size);
for(const match of read('app.js').matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),`Missing DOM element ${match[1]}`);
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(https?:|data:)/.test(match[1]))continue;assert.ok(fs.existsSync(path.join(__dirname,match[1].split('?')[0])),`Missing asset ${match[1]}`);}
assert.ok(!html.includes('species.js'));assert.ok(!read('app.js').includes('window.SPECIES'));
assert.ok(!fs.existsSync(path.join(__dirname,'assets/park-vision-atlas.png')));
console.log('PASS: DOM, assets, no fixed species list or pre-generated animal images.');
