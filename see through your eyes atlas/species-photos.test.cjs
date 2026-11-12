const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/species-photos.js','utf8');
function client(responses){
 const calls=[];let now=0;
 const context={window:{},URL,URLSearchParams,AbortSignal,Map,Set,Error,Date:{now:()=>now+=2000},setTimeout,clearTimeout,
 DOMParser:class{parseFromString(s){return {body:{textContent:s.replace(/<[^>]*>/g,'')}};}},
 fetch:async url=>{calls.push(url);const body=responses.shift();if(body instanceof Error)throw body;return {ok:true,json:async()=>body};}};
 vm.runInNewContext(code,context);return {...context.window.SpeciesPhotos,calls};
}
const claim=value=>({mainsnak:{datavalue:{value}}});
const entity=name=>({claims:{P225:[claim(name)],P18:[claim('Fox.jpg')]}});
test('iNaturalist filters licenses and checks taxon identity',async()=>{
 const photo={id:12,license_code:'cc-by',medium_url:'https://static.inaturalist.org/photos/12/medium.jpg'};
 const c=client([{results:[{id:42069,name:'Vulpes vulpes',default_photo:{...photo,license_code:null},taxon_photos:[{photo}]}]}]);
 assert.equal((await c.alternatives({id:42069,name:'Vulpes vulpes'})).length,1);
 const mismatch=client([{results:[{id:42069,name:'Other species',default_photo:photo}]}]);
 assert.equal((await mismatch.alternatives({id:42069,name:'Vulpes vulpes'})).length,0);
});
test('Commons rejects a related species despite a search match',async()=>{
 const c=client([{search:[{id:'Q1'}]},{entities:{Q1:entity('Vulpes lagopus')}}]);
 assert.equal((await c.commons({name:'Vulpes vulpes'})).length,0);assert.equal(c.calls.length,2);
});
test('Commons preserves credit, accepts thumbnail host, excludes restricted images, caches and deduplicates',async()=>{
 const info=license=>({mime:'image/jpeg',thumburl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/Fox.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Fox.jpg',extmetadata:{LicenseShortName:{value:license},Artist:{value:'<b>Photographer</b>'}}});
 const c=client([{search:[{id:'Q1'}]},{entities:{Q1:entity('Vulpes vulpes')}},{query:{pages:{1:{imageinfo:[info('CC BY-SA 4.0')]},2:{imageinfo:[info('CC BY-NC 4.0')]}}}}]);
 const t={name:'Vulpes vulpes'},[a,b]=await Promise.all([c.commons(t),c.commons(t)]);
 assert.equal(a.length,1);assert.equal(a[0].attribution,'Photographer');assert.equal(a,b);await c.commons(t);assert.equal(c.calls.length,3);
});
test('temporary failure is retryable rather than cached as no image',async()=>{
 const c=client([new Error('offline'),{search:[]}]);await assert.rejects(c.commons({name:'Vulpes vulpes'}));
 assert.equal((await c.commons({name:'Vulpes vulpes'})).length,0);assert.equal(c.calls.length,2);
});
