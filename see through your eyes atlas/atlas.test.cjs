const {test}=require('node:test'),assert=require('node:assert/strict');
const {createNearby,parseLocation}=require('./nearby.cjs');
const {createApp}=require('./server.cjs');
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
 const a=await client({lat:22,lng:114,radius:5,page:2});assert.equal(a.results[0].localCount,7);assert.equal(a.results[0].isAnimal,true);assert.equal(urls[0].searchParams.get('lat'),'22');assert.equal(urls[0].searchParams.get('radius'),'5');assert.equal(urls[0].searchParams.get('page'),'2');assert.equal(urls[0].searchParams.has('taxon_id'),false);
 assert.equal((await client({lat:22,lng:114,radius:5,page:2})).cached,true);assert.equal(urls.length,1);await client({lat:23,lng:114,radius:5,page:2});assert.equal(urls.length,2);
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
test('atlas assets and nearby endpoint serve while original UI stays accessible',async t=>{
 const server=createApp({nearby:async q=>({total:1,results:[],...parseLocation(q)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 for(const url of ['/','/original.html','/atlas.js','/atlas.css','/assets/world-land.json','/assets/vendor/d3.min.js'])assert.equal((await fetch(base+url)).status,200,url);
 assert.equal((await fetch(base+'/nearby.cjs')).status,404);assert.equal((await fetch(base+'/api/nearby?lat=200&lng=0')).status,400);const data=await(await fetch(base+'/api/nearby?lat=0&lng=0&radius=10')).json();assert.equal(data.radius,10);
 const html=await(await fetch(base+'/')).text();assert.ok(!html.includes('data-group'));const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of fs.readFileSync(path.join(__dirname,'atlas.js'),'utf8').matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
});
