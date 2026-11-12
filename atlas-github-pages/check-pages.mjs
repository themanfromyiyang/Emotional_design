import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const read=path=>readFileSync('site/'+path,'utf8');
const index=read('index.html'),research=read('research.html');
assert.match(index,/<canvas id="globe"/);
for(const html of [index,research]){
 assert.match(html,/inat-client\.js/);
 assert.match(html,/api-client\.js/);
 assert.match(html,/settings\.js/);
 assert.doesNotMatch(html,/href="\/"|src="\/"|static-api\.js|127\.0\.0\.1/);
}
assert.match(read('atlas.js'),/ApiClient\.request\('\/api\/nearby/);
assert.match(read('api-client.js'),/https:\/\/see-through-your-eyes-atlas-2026\.fuzzyloom4\.chatgpt\.site/);
assert.match(read('app.js'),/taxonId:taxon\.id,taxon:detail/);

const requests=[];
const response=body=>({ok:true,json:async()=>body});
const taxon={id:14591,name:'Vulpes vulpes',rank:'species',iconic_taxon_name:'Mammalia',ancestor_ids:[1],ancestors:[{id:1,name:'Animalia',rank:'kingdom'}]};
const context={window:{},sessionStorage:{getItem:()=>null,setItem:()=>{}},fetch:async url=>{
 requests.push(String(url));
 if(String(url).includes('species_counts'))return response({total_results:1,results:[{taxon,count:3}]});
 if(String(url).includes('taxa/autocomplete'))return response({total_results:1,results:[taxon]});
 if(String(url).includes('/taxa/14591'))return response({results:[taxon]});
 return response({total_results:1,results:[taxon]});
},URL,URLSearchParams,Map,Set,Date,Error,Number,String};
vm.runInNewContext(read('inat-client.js'),context);
vm.runInNewContext(read('api-client.js'),context);
const nearby=await context.window.ApiClient.request('/api/nearby?lat=22.49&lng=114.04&radius=25&page=1');
assert.equal(nearby.results[0].id,14591);
const catalogue=await context.window.ApiClient.request('/api/taxa?q=fox&group=Mammalia&page=1');
assert.equal(catalogue.results[0].id,14591);
const detail=await context.window.ApiClient.request('/api/taxa/14591');
assert.equal(detail.id,14591);
assert.ok(requests.every(url=>url.startsWith('https://api.inaturalist.org/v1/')));
console.log('PASS: Pages paths and direct animal data with a separate AI backend.');
