const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createClient,safePhoto}=require('./inaturalist.cjs');
const {collectPapers,synthesize,validateReport,generateImage,generateWorldPlan,validateWorldPlan}=require('./research.cjs');
const {transferPixels,applyViewMask}=require('./vision-transfer.js');
const {createApp}=require('./server.cjs');
const vm=require('node:vm');
const animal={id:123,name:'Testus example',rank:'species',default_photo:{id:12,license_code:'cc0',medium_url:'https://static.inaturalist.org/photos/12/medium.jpg'},ancestors:[{id:1,rank:'kingdom',name:'Animalia'},{id:2,rank:'family',name:'Testidae'},{id:3,rank:'genus',name:'Testus'}]};
const fakePaper={id:'1',source:'MED',title:'Visual physiology of Testus example',abstractText:'Measured spectral responses in Testus example.',authorString:'Researcher A',pubYear:'2025'};
const epmc=async()=>({ok:true,json:async()=>({hitCount:1,resultList:{result:[fakePaper]}})});
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
 assert.equal(queries.length,4);assert.match(queries[0],/Testus example/);assert.match(queries[2],/Testidae/);assert.match(queries[3],/habitat/);assert.equal(papers.papers.length,1);assert.equal(papers.papers[0].scope,'species');assert.ok(papers.papers[0].url.startsWith('https://europepmc.org/'));
});
test('visual literature expands to order when that ancestor is available',async()=>{
 const withOrder={...animal,ancestors:[...animal.ancestors,{id:4,rank:'order',name:'Testiformes'}]};
 const queries=[];await collectPapers(withOrder,async url=>{queries.push(new URL(url).searchParams.get('query'));return epmc();});
 assert.equal(queries.length,5);assert.match(queries[3],/Testiformes/);
});
test('failed literature requests are explicit warnings, not false zero evidence',async()=>{
 const result=await collectPapers(animal,async()=>{throw new Error('offline')});assert.equal(result.warnings.length,6);assert.equal(result.searches.length,0);
});
test('GPT answers the direct question, searches sources, then organizes a cited visual report',async()=>{
 const answer='Testus example has a wide field of view. Source note.';
 const report={title:'Testus example 的视觉世界',summary:'宽阔的视野',claims:[{aspect:'视野',explanation:'宽阔',measuredSpecies:'Testus example',level:'direct',sourceIds:['S1'],visualInstruction:''}],firstPerson:['可能看到两侧的环境'],simulationGuide:[{dimension:'视野',method:'展示更宽的场景',sourceIds:['S1']}],habitat:null,fieldOfView:null,worldAppearance:null,visualStreak:null,unknowns:['精确主观视觉未知']};
 const calls=[];const fetchImpl=async(url,options)=>{assert.match(url,/\/responses$/);const body=JSON.parse(options.body);calls.push(body);return {ok:true,json:async()=>calls.length===1?{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:answer,annotations:[{type:'url_citation',url:'https://example.org/paper',title:'Visual study',start_index:0}]}]}]}:{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(report)}]}]}};};
 const result=await synthesize({...animal,commonName:'测试动物'},{key:'test-key',fetchImpl});
 assert.equal(calls.length,2);assert.equal(calls[0].input,'测试动物眼中的世界是怎么样的？');assert.deepEqual(calls[0].tools,[{type:'web_search'}]);assert.equal(calls[0].tool_choice,'required');assert.equal(calls[1].text.format.type,'json_schema');assert.equal(result.sources[0].url,'https://example.org/paper');assert.equal(result.report.claims[0].sourceIds[0],'S1');
 assert.throws(()=>validateReport({...report,claims:[{...report.claims[0],sourceIds:['S9']}]},result.sources),{status:502});
});
test('photo edit uses the report and original image without requesting new scene content',async()=>{
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX3cAAAAASUVORK5CYII=';
 const session={report:{claims:[{visualInstruction:'Reduce red-green contrast'}],worldAppearance:{measuredSpecies:'Testus example',level:'direct',explanation:'Conservative color shift'}}};
 let body;const result=await generateImage(session,image,{key:'test-key',fetchImpl:async(url,options)=>{assert.match(url,/\/images\/edits$/);body=JSON.parse(options.body);return {ok:true,json:async()=>({data:[{b64_json:'generated'}]})};}});
 assert.equal(body.images[0].image_url,image);assert.match(body.prompt,/Reduce red-green contrast/);assert.match(body.prompt,/Do not add, remove/);assert.equal(result.image,'data:image/png;base64,generated');
 await assert.rejects(generateImage(session,'data:image/png;base64,'+Buffer.from('wrong image format').toString('base64'),{key:'test-key'}),{status:400});
});
test('environment plan uses habitat research and selected reference photos on request',async()=>{
 const plan={terrain:'flat',water:'none',vegetationDensity:.28,treeCount:2,shrubCount:45,flowerCount:0,rockCount:18,viewpointHeight:1.25,skyColor:'#aabbcc',groundColor:'#998866',plantColor:'#667744',waterColor:'#668899',groundAccentColor:'#bb9977',plantAccentColor:'#778855',flowerColor:'#667744',flowerAccentColor:'#778855',groundCover:'grass',treeForm:'sparse',referenceIndices:[0,1],sceneDescription:'干旱草地与零散灌木',explanation:'对应干旱开阔草原与稀疏灌木。'};
 const session={taxon:{name:'Osphranter rufus'},report:{habitat:{biome:'grassland',description:'澳大利亚干旱开阔草原，植被稀疏，散布灌木。',sourceIds:['S2']}}};
 let request,modelCalls=0,photoCalls=0;const result=await generateWorldPlan(session,{key:'test-key',fetchImpl:async(url,options)=>{if(String(url).includes('commons.wikimedia.org')){photoCalls++;return {ok:true,json:async()=>({query:{pages:Object.fromEntries([1,2,3].map(id=>[id,{pageid:id,title:`File:Landscape ${id}.jpg`,index:id,imageinfo:[{mime:'image/jpeg',width:1200,height:800,thumburl:`https://upload.wikimedia.org/photo${id}.jpg`,descriptionurl:`https://commons.wikimedia.org/wiki/File:Landscape_${id}.jpg`,extmetadata:{LicenseShortName:{value:'CC BY 4.0'},Artist:{value:'Test Photographer'}}}]}]))}})};}assert.match(url,/\/responses$/);request=JSON.parse(options.body);modelCalls++;const output=modelCalls===1?{queries:['Australian arid grassland landscape']} : plan;return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(output)}]}]})};}});
 assert.equal(modelCalls,2);assert.equal(photoCalls,1);assert.match(request.input[0].content[0].text,/干旱开阔草原/);assert.equal(request.input[0].content.filter(item=>item.type==='input_image').length,3);assert.equal(request.text.format.name,'habitat_world_plan');assert.equal(result.plan.biome,'grassland');assert.equal(result.plan.shrubCount,45);assert.equal(result.photos.length,2);assert.deepEqual(result.sourceIds,['S2']);
 assert.throws(()=>validateWorldPlan({...plan,treeCount:999}),{status:502});
 await assert.rejects(generateWorldPlan({report:{habitat:null,fieldOfView:{horizontalDegrees:324}}},{key:'test-key'}),{status:422});
});
test('safe pixel transfer cannot import new shapes or text from the model image',()=>{
 const source=Uint8ClampedArray.from([20,50,80,255,180,160,140,255,20,50,80,255]);
 const reference=Uint8ClampedArray.from([255,0,0,255,0,255,0,255,0,0,255,255]);
 const output=transferPixels(source,reference);
 assert.deepEqual([...output.slice(0,4)],[...output.slice(8,12)]);
 assert.equal(output[3],255);assert.equal(output[7],255);assert.notDeepEqual([...output],[...reference]);
});
test('view mask darkens only the sides of a narrow view',()=>{
 const pixels=Uint8ClampedArray.from(Array.from({length:5},()=>[100,120,140,255]).flat());
 const masked=applyViewMask(pixels,5,1,90);
 assert.ok(masked[0]<100);assert.equal(masked[8],100);assert.equal(masked[11],255);
 const wide=Uint8ClampedArray.from(Array.from({length:5},()=>[100,120,140,255]).flat());
 assert.deepEqual(applyViewMask(wide,5,1,220),wide);
});
test('research route does not plan an environment until the world button requests it',async t=>{
 const report={title:'研究报告',claims:[]};let worldCalls=0;const server=createApp({catalogue:{search:async()=>({results:[],total:0}),detail:async()=>animal},settings:{key:'secret-test',researchModel:'test',imageModel:'test'},research:{run:async()=>({report}),get:()=>({report})},generate:async()=>({image:'test-image'}),worldPlan:async()=>{worldCalls++;return {plan:{biome:'grassland'}};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.aiConfigured,true);assert.ok(!JSON.stringify(status).includes('secret-test'));
 assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/research.cjs')).status,404);
 assert.equal((await fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://other.test'},body:'{}'})).status,403);
 const generated=await fetch(base+'/api/research',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{"taxonId":123}'});assert.equal(generated.status,200);assert.equal((await generated.json()).report.title,'研究报告');
 assert.equal(worldCalls,0);
 const world=await fetch(base+'/api/world',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{"researchId":"test"}'});assert.equal(world.status,200);assert.equal((await world.json()).plan.biome,'grassland');assert.equal(worldCalls,1);
 assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{"researchId":"test","image":"test"}'})).status,200);
 assert.match(fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),/\/api\/research/);
 assert.match(fs.readFileSync(path.join(__dirname,'research.html'),'utf8'),/id="research-again"[^>]*>生成视觉报告/);
 const worldScript=fs.readFileSync(path.join(__dirname,'world-simulation.js'),'utf8');assert.match(worldScript,/world-generate'\)\.addEventListener\('click'/);assert.doesNotMatch(worldScript.split("$('world-generate').addEventListener('click'")[0].split("window.addEventListener('world-research-update'")[1],/buildEnvironment\(/);
});
test('local settings save the key without exposing it',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eyes-settings-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const envPath=path.join(dir,'.env');fs.writeFileSync(envPath,'PORT=5181\nOPENAI_API_KEY=old-secret\nOPENAI_IMAGE_MODEL=test-image\n');
 const server=createApp({envPath,settings:{key:'',researchModel:'test',imageModel:'test-image'}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const key='sk-test-only-example-123456789';const post=(origin,apiKey)=>fetch(base+'/api/settings',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({apiKey})});
 assert.equal((await post('http://other.test',key)).status,403);
 assert.equal((await post(base,'invalid')).status,400);
 assert.equal((await(await fetch(base+'/api/status')).json()).aiConfigured,false);
 const saved=await post(base,key);assert.equal(saved.status,200);assert.ok(!JSON.stringify(await saved.json()).includes(key));
 const stored=fs.readFileSync(envPath,'utf8');assert.match(stored,/^PORT=5181$/m);assert.match(stored,/^OPENAI_API_KEY=sk-test-only-example-123456789$/m);assert.ok(!stored.includes('old-secret'));
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.aiConfigured,true);assert.ok(!JSON.stringify(status).includes(key));assert.equal((await fetch(base+'/.env')).status,404);
 const models=await fetch(base+'/api/settings',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({researchModel:'gpt-5-mini',imageModel:'gpt-image-2.5-flare'})});assert.equal(models.status,200);assert.equal((await models.json()).researchModel,'gpt-5-mini');
 const updated=fs.readFileSync(envPath,'utf8');assert.match(updated,/^OPENAI_RESEARCH_MODEL=gpt-5-mini$/m);assert.match(updated,/^OPENAI_IMAGE_MODEL=gpt-image-2.5-flare$/m);assert.match(updated,/^OPENAI_API_KEY=sk-test-only-example-123456789$/m);
 const invalidModel=await fetch(base+'/api/settings',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({imageModel:'bad\nPORT=9999'})});assert.equal(invalidModel.status,400);
 const generated=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({researchId:'test',image:'test'})});assert.equal(generated.status,409);
});
test('static preview HTML response becomes a helpful backend error, never a JSON SyntaxError',async()=>{
 const context={fetch:async()=>({ok:false,headers:{get:()=> 'text/html'},json:()=>{throw new Error('should not parse HTML')}})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'api-client.js'),'utf8'),context);
 await assert.rejects(context.ApiClient.request('/api/taxa?q=wolf'),error=>error.code==='BACKEND_NOT_CONNECTED'&&error.message.includes('完整网站'));
});
test('IDE index redirects to verified live application and retains search',async()=>{
 let target;const context={window:{},location:{protocol:'http:',hostname:'localhost',port:'63342',search:'?q=wolf&group=Mammalia&_ijt=private',hash:'#taxon=123',replace:url=>target=url},URL,URLSearchParams,AbortSignal,fetch:async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({service:'see-through-your-eyes'})})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8'),context);
 assert.equal(await context.window.APP_BOOTSTRAP,true);assert.equal(target,'http://127.0.0.1:5181/research.html?q=wolf&group=Mammalia#taxon=123');
});
test('index keeps its fallback if the backend is unavailable; full site does not loop',async()=>{
 let requests=0;const context={window:{},location:{protocol:'file:',hostname:'',port:'',replace:()=>assert.fail('must not redirect')},AbortSignal,fetch:async()=>{requests++;throw new Error('offline')}};
 const script=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');vm.runInNewContext(script,context);assert.equal(await context.window.APP_BOOTSTRAP,false);
 context.location={protocol:'http:',hostname:'127.0.0.1',port:'5181'};vm.runInNewContext(script,context);assert.equal(await context.window.APP_BOOTSTRAP,false);assert.equal(requests,1);
});
