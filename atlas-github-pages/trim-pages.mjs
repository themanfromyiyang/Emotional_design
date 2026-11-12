import {readFileSync,writeFileSync,rmSync} from 'node:fs';
const file='site/research.html';let html=readFileSync(file,'utf8');
for(const expression of [/<script src="vision-transfer\.js\?v=[^"]+" defer><\/script>/,/<script type="module" src="world-simulation\.js\?v=[^"]+"><\/script>/]){
 if(!expression.test(html))throw Error('Expected unused simulation script in research.html');
 html=html.replace(expression,'');
}
writeFileSync(file,html);
for(const name of ['site/world-simulation.js','site/vision-transfer.js','site/vendor/three/three.module.js','site/vendor/three/three.core.js'])rmSync(name);
