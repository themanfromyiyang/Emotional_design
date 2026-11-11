const {test}=require('node:test'),assert=require('node:assert/strict');
const {createNearby,parseLocation}=require('./nearby.cjs');
const {createApp}=require('./server.cjs');
const PlaceNames=require('./place-name.js');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const photo={id:1,license_code:'cc-by',medium_url:'https://static.inaturalist.org/photos/1/medium.jpg',attribution:'Test photographer'};
const taxon={id:42,name:'Species test',iconic_taxon_name:'Aves',rank:'species',default_photo:photo};
test('rejects invalid location without treating missing coordinates as zero',()=>{
 for(const input of [{},{lat:'',lng:0},{lat:91,lng:0},{lat:0,lng:181},{lat:'NaN',lng:0},{lat:0,lng:0,radius:1000},{lat:0,lng:0,page:1.5}])assert.throws(()=>parseLocation(input),{status:400});
 assert.deepEqual(parseLocation({lat:0,lng:0}),{lat:0,lng:0,radius:25,page:1});
 assert.equal(parseLocation({lat:-90,lng:180,radius:2}).lat,-90);
});
test('location, range, and page reach API; counts are local, caching is location-specific',async()=>{
 const urls=[];const client=createNearby({spacing:0,fetchImpl:async url=>{urls.push(new URL(url));return {ok:true,json:async()=>({total_results:80,results:[{count:7,taxon}]})};}});
 const a=await client({lat:22,lng:114,radius:5,page:2});assert.equal(a.results[0].localCount,7);assert.equal(a.results[0].isAnimal,true);assert.equal(urls[0].searchParams.get('lat'),'22');assert.equal(urls[0].searchParams.get('radius'),'5');assert.equal(urls[0].searchParams.get('page'),'2');assert.equal(urls[0].searchParams.get('taxon_id'),'1');
 assert.equal((await client({lat:22,lng:114,radius:5,page:2})).cached,true);assert.equal(urls.length,1);await client({lat:23,lng:114,radius:5,page:2});assert.equal(urls.length,2);
});
test('nearby results exclude non-animal taxa even if upstream returns them',async()=>{
 const plant={...taxon,id:43,name:'Plant test',iconic_taxon_name:'Plantae',ancestor_ids:[48460,47126]};
 const bird={...taxon,ancestor_ids:[48460,1,2,3]};
 const client=createNearby({spacing:0,fetchImpl:async()=>({ok:true,json:async()=>({total_results:2,results:[{count:5,taxon:plant},{count:7,taxon:bird}]})})});
 const data=await client({lat:0,lng:0});assert.deepEqual(data.results.map(t=>t.id),[42]);assert.equal(data.results[0].isAnimal,true);
});
test('licensed alternate photos preserve counts and optional photo failures do not hide species',async()=>{
 let calls=0;const client=createNearby({spacing:0,fetchImpl:async()=>({ok:true,json:async()=>++calls===1?{total_results:1,results:[{count:9,taxon:{...taxon,default_photo:null}}]}:{results:[{...taxon,default_photo:null,taxon_photos:[{photo}]}]}})});
 const result=await client({lat:0,lng:0});assert.equal(result.results[0].photo.license,'cc-by');assert.equal(result.results[0].localCount,9);
 const broken=createNearby({spacing:0,fetchImpl:async url=>{if(!url.includes('species_counts'))throw Error('offline');return {ok:true,json:async()=>({total_results:1,results:[{count:4,taxon:{...taxon,default_photo:null}}]})};}});assert.equal((await broken({lat:0,lng:0})).results[0].photo,null);
});
test('empty data is distinct from upstream failure; cached data reports stale fallback',async()=>{
 let time=0,fail=false;const client=createNearby({spacing:0,now:()=>time,fetchImpl:async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({total_results:0,results:[]})};}});
 assert.equal((await client({lat:0,lng:0})).total,0);fail=true;time=400000;assert.equal((await client({lat:0,lng:0})).stale,true);await assert.rejects(client({lat:1,lng:1}),/offline/);
});
test('orthographic front-hemisphere projection round trips coordinates across rotation',()=>{
 const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'assets/vendor/d3.min.js'),'utf8'),ctx);const d3=ctx.d3;
 for(const [lat,lng] of [[22.49,114.04],[-33.9,151.2],[60,-120],[0,179.9]]){
  const p=d3.geoOrthographic().rotate([-lng,-lat]).scale(240).translate([300,300]);const point=p([lng,lat]),inverse=p.invert(point);assert.ok(Math.abs(point[0]-300)<1e-8);assert.ok(Math.abs(point[1]-300)<1e-8);assert.ok(Math.abs(inverse[0]-lng)<1e-8);assert.ok(Math.abs(inverse[1]-lat)<1e-8);
 }
});
test('selected coordinates resolve to a nearby place name, including across the date line',()=>{
 const cities=require('./assets/place-names.json').cities;
 const point={lat:22.49,lng:114.04},nearest=PlaceNames.nearest(point,cities);
 assert.ok(nearest.km<60);
 assert.match(PlaceNames.label(point,cities),/[^0-9°]+/);
 assert.ok(!PlaceNames.label(point,cities).includes('选中的地点'));
 assert.equal(PlaceNames.label(point,cities,'zh-CN',[{...point,name:'香港 · 米埔湿地'}]),'香港 · 米埔湿地');
 assert.ok(PlaceNames.distance(0,179.9,0,-179.9)<30);
});
test('atlas assets and nearby endpoint serve while original UI stays accessible',async t=>{
 const server=createApp({nearby:async q=>({total:1,results:[],...parseLocation(q)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 for(const url of ['/','/research.html','/original.html','/atlas.js','/index-research.js','/place-name.js','/assets/place-names.json','/atlas.css','/settings.js','/settings.css','/assets/world-land.json','/assets/vendor/d3.min.js'])assert.equal((await fetch(base+url)).status,200,url);
 assert.equal((await fetch(base+'/nearby.cjs')).status,404);assert.equal((await fetch(base+'/api/nearby?lat=200&lng=0')).status,400);const data=await(await fetch(base+'/api/nearby?lat=0&lng=0&radius=10')).json();assert.equal(data.radius,10);
 const html=await(await fetch(base+'/')).text();assert.ok(!html.includes('data-group'));assert.match(html,/<canvas id="globe"/);assert.match(html,/<button id="settings-button" type="button">配置生成服务/);assert.match(html,/<title>地球探索｜万物视野 · See Through Your Eyes<\/title>/);assert.match(html,/action="research.html"/);assert.match(html,/<section id="index-research"[^>]*hidden>/);assert.match(html,/<iframe id="research-frame"/);const catalogue=await(await fetch(base+'/research.html')).text();assert.match(catalogue,/<a href="\/" class="brand"/);assert.match(catalogue,/<title>物种视觉研究｜万物视野 · See Through Your Eyes<\/title>/);assert.match(catalogue,/atlas-embed-height/);const legacy=await(await fetch(base+'/original.html')).text();assert.match(legacy,/research.html.*location.search.*location.hash/);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of fs.readFileSync(path.join(__dirname,'atlas.js'),'utf8').matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
});
test('index keeps the globe as the default and opens the shared report for a species link',()=>{
 function run(hash){const elements=new Map(),listeners={};const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,src:'',href:'',style:{},contentWindow:{},setAttribute(){},removeAttribute(){},addEventListener(){}});return elements.get(id);};const location={hash,search:'?lat=22.49&lng=114.04&radius=25',href:'http://127.0.0.1:5181/'+hash,origin:'http://127.0.0.1:5181',pathname:'/'};const context={location,URL,document:{getElementById:element,querySelector:()=>element('globe-nav'),addEventListener:(name,callback)=>listeners[name]=callback},window:{addEventListener:(name,callback)=>listeners[name]=callback,scrollTo(){}},history:{pushState(){},replaceState(){}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'index-research.js'),'utf8'),context);return {elements,element};}
 const home=run('');assert.equal(home.element('atlas-home').hidden,false);assert.equal(home.element('index-research').hidden,true);
 const selected=run('#taxon=42');assert.equal(selected.element('atlas-home').hidden,true);assert.equal(selected.element('index-research').hidden,false);assert.match(selected.element('research-frame').src,/research\.html\?embed=1#taxon=42$/);assert.match(selected.element('open-research-page').href,/research\.html#taxon=42$/);
});
