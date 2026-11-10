const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createClient,safePhoto}=require('./inaturalist.cjs');
const {collectPapers,validateReport,createResearch,decodeImage,imagePrompt,generateImage}=require('./research.cjs');
const {createApp}=require('./server.cjs');
const vm=require('node:vm');
const animal={id:123,name:'Testus example',rank:'species',default_photo:{id:12,license_code:'cc0',medium_url:'https://static.inaturalist.org/photos/12/medium.jpg'},ancestors:[{id:1,rank:'kingdom',name:'Animalia'},{id:2,rank:'family',name:'Testidae'},{id:3,rank:'genus',name:'Testus'}]};
const fakePaper={id:'1',source:'MED',title:'Visual physiology of Testus example',abstractText:'Measured spectral responses in Testus example.',authorString:'Researcher A',pubYear:'2025'};
const epmc=async()=>({ok:true,json:async()=>({hitCount:1,resultList:{result:[fakePaper]}})});
const report={title:'研究说明',summary:'测试说明',unknowns:['摘要证据，非主观视觉复原'],claims:[{aspect:'色觉',explanation:'测试结论',measuredSpecies:'Testus example',level:'direct',sourceIds:['S1'],visualInstruction:'Conservatively reduce red-green distinction.'}]};
test('catalogue accepts arbitrary animal queries, caches and validates filters',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eyes-v2-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let calls=0,url;
 const client=createClient({cacheDir:dir,spacing:0,fetchImpl:async u=>{calls++;url=new URL(u);return {ok:true,json:async()=>({total_results:1,results:[{...animal,iconic_taxon_name:'Aves'}]})}}});
 const a=await client.search({q:'unselected animal',group:'Aves'});assert.equal(a.results[0].id,123);assert.equal(url.searchParams.get('q'),'unselected animal');assert.equal(url.searchParams.get('taxon_id'),'3');assert.equal(url.pathname,'/v1/taxa/autocomplete');
 await client.search({q:'unselected animal',group:'Aves'});assert.equal(calls,1);
 await assert.rejects(client.search({group:'plants'}),{status:400});await assert.rejects(client.detail('../secret'),{status:400});
});
test('Chinese aliases rank exact matches first and reject unrelated single-character hits',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eyes-search-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const client=createClient({cacheDir:dir,spacing:0,fetchImpl:async()=>({ok:true,json:async()=>({total_results:4,results:[
  {...animal,id:1,preferred_common_name:'家猫'},
  {...animal,id:2,preferred_common_name:'熊猫蚁'},
  {...animal,id:3,name:'Ailuropoda melanoleuca',preferred_common_name:'大熊猫',names:[{name:'熊猫',is_valid:true}]},
  {...animal,id:4,preferred_common_name:'浣熊'}
 ]})})});
 const result=await client.search({q:'熊猫'});assert.deepEqual(result.results.map(t=>t.id),[3,2]);assert.equal(result.results[0].matchType,'exact');assert.equal(result.total,2);
 assert.equal((await client.search({q:'熊猫',page:2})).results.length,0);
});
test('name search paginates the bounded candidate set without repeating upstream page one',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eyes-pages-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let calls=0;
 const client=createClient({cacheDir:dir,spacing:0,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({total_results:420,results:Array.from({length:30},(_,i)=>({...animal,id:i+1,name:'Wolf '+i}))})}}});
 const first=await client.search({q:'wolf'}),second=await client.search({q:'wolf',page:2});
 assert.equal(first.results.length,24);assert.equal(second.results.length,6);assert.equal(second.results[0].id,25);assert.equal(first.total,30);assert.equal(first.truncated,true);assert.equal(calls,1);
});
test('photos with absent or restrictive licenses are not displayed',()=>{
 assert.equal(safePhoto({url:'https://static.inaturalist.org/p.jpg',license_code:null}),null);
 assert.equal(safePhoto({url:'https://evil.test/p.jpg',license_code:'cc-by'}),null);
 assert.equal(safePhoto({id:1,url:'https://static.inaturalist.org/p.jpg',license_code:'cc-by',attribution:'Photographer'}).attribution,'Photographer');
});
test('missing catalogue covers use licensed alternatives from batched taxon details',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eyes-photos-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let calls=0;
 const client=createClient({cacheDir:dir,spacing:0,fetchImpl:async u=>{calls++;const details=new URL(u).pathname==='/v1/taxa/123,124';return {ok:true,json:async()=>({total_results:2,results:[123,124].map(id=>({...animal,id,default_photo:{...animal.default_photo,license_code:'cc-by-nc'},taxon_photos:details?[{photo:{...animal.default_photo,attribution:'Test photographer'}}]:[]}))})}}});
 const result=await client.search();assert.equal(calls,2);assert.ok(result.results.every(t=>t.photo?.license==='cc0'));assert.equal(result.results[0].photo.attribution,'Test photographer');
 await client.search();assert.equal(calls,2);
});
test('literature searches species, genus, family and deduplicates sources',async()=>{
 const queries=[];const papers=await collectPapers(animal,async u=>{queries.push(new URL(u).searchParams.get('query'));return epmc()});
 assert.equal(queries.length,3);assert.match(queries[0],/Testus example/);assert.match(queries[2],/Testidae/);assert.equal(papers.papers.length,1);assert.equal(papers.papers[0].scope,'species');assert.ok(papers.papers[0].url.startsWith('https://europepmc.org/'));
});
test('missing key still retrieves papers and never fabricates a GPT report',async()=>{
 const service=createResearch({catalogue:{detail:async()=>animal},fetchImpl:epmc});const session=await service.run(123);
 assert.equal(session.report,null);assert.equal(session.configured,false);assert.equal(session.papers.length,1);assert.equal(service.get(session.id).taxon.id,123);assert.throws(()=>service.get('unknown'),{status:409});
});
test('failed literature requests are explicit warnings, not false zero evidence',async()=>{
 const result=await collectPapers(animal,async()=>{throw new Error('offline')});assert.equal(result.warnings.length,3);assert.equal(result.searches.length,0);
});
test('citations must refer to fetched abstracts; empty evidence blocks image generation',()=>{
 assert.equal(validateReport(report,[{id:'S1',abstract:'data'}]),report);
 assert.throws(()=>validateReport(report,[]),{status:502});assert.throws(()=>validateReport(report,[{id:'S1',abstract:''}]),{status:502});assert.throws(()=>imagePrompt({report:{claims:[]}}),{status:422});
});
test('image upload validation rejects masquerading files; edit uses research and actual input',async()=>{
 assert.throws(()=>decodeImage('data:image/png;base64,'+Buffer.from('not a png image at all').toString('base64')),{status:400});
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX3cAAAAASUVORK5CYII=';
 let request;const result=await generateImage({taxon:animal,report},image,{key:'test-only',fetchImpl:async(url,options)=>{request=JSON.parse(options.body);assert.match(url,/images\/edits$/);return {ok:true,json:async()=>({data:[{b64_json:'test'}]})}}});
 assert.equal(request.images[0].image_url,image);assert.match(request.prompt,/Testus example/);assert.match(request.prompt,/reduce red-green/);assert.equal(result.image,'data:image/png;base64,test');
});
test('HTTP routes conceal configuration and require same-origin POST',async t=>{
 const server=createApp({catalogue:{search:async()=>({results:[],total:0}),detail:async()=>animal},settings:{key:'secret-test',researchModel:'test',imageModel:'test'},research:{run:async()=>({report:null})}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.aiConfigured,true);assert.ok(!JSON.stringify(status).includes('secret-test'));
 assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/research.cjs')).status,404);
 assert.equal((await fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://other.test'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{"taxonId":123}'})).status,200);
});
test('static preview HTML response becomes a helpful backend error, never a JSON SyntaxError',async()=>{
 const context={fetch:async()=>({ok:false,headers:{get:()=> 'text/html'},json:()=>{throw new Error('should not parse HTML')}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'api-client.js'),'utf8'),context);
 await assert.rejects(context.ApiClient.request('/api/taxa?q=wolf'),error=>error.code==='BACKEND_NOT_CONNECTED'&&error.message.includes('完整网站'));
});
test('IDE index redirects to verified live application and retains search',async()=>{
 let target;const context={window:{},location:{protocol:'http:',hostname:'localhost',port:'63342',search:'?q=wolf&group=Mammalia&_ijt=private',hash:'#taxon=123',replace:url=>target=url},URL,URLSearchParams,AbortSignal,fetch:async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({service:'see-through-your-eyes'})})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8'),context);
 assert.equal(await context.window.APP_BOOTSTRAP,true);assert.equal(target,'http://127.0.0.1:5180/?q=wolf&group=Mammalia#taxon=123');
});
test('index keeps its fallback if the backend is unavailable; full site does not loop',async()=>{
 let requests=0;const context={window:{},location:{protocol:'file:',hostname:'',port:'',replace:()=>assert.fail('must not redirect')},AbortSignal,fetch:async()=>{requests++;throw new Error('offline')}};
 const script=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');vm.runInNewContext(script,context);assert.equal(await context.window.APP_BOOTSTRAP,false);
 context.location={protocol:'http:',hostname:'127.0.0.1',port:'5180'};vm.runInNewContext(script,context);assert.equal(await context.window.APP_BOOTSTRAP,false);assert.equal(requests,1);
});
