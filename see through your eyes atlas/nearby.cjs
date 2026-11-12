const {normalize,fail}=require('./inaturalist.cjs');
function parseLocation(input){
 const read=(key,lo,hi,fallback)=>{const raw=input[key]??fallback;if(raw===null||raw===undefined||String(raw).trim()==='')throw fail('请提供有效经纬度');const n=Number(raw);if(!Number.isFinite(n)||n<lo||n>hi)throw fail('坐标或范围无效');return n;};
 const lat=read('lat',-90,90),lng=read('lng',-180,180),radius=read('radius',2,200,25),page=read('page',1,100,1);
 if(!Number.isInteger(page))throw fail('页码无效');
 return {lat,lng,radius,page};
}
function createNearby({fetchImpl=fetch,now=Date.now,spacing=1100}={}){
 const cache=new Map(),pending=new Map();let queue=Promise.resolve(),next=0;
 return async input=>{
  const point=parseLocation(input),key=JSON.stringify(point),hit=cache.get(key);
  if(hit&&now()-hit.time<300000)return {...hit.data,cached:true};
  if(pending.has(key))return pending.get(key);
  if(pending.size>=12)throw fail('查询较多，请稍后重试',429);
  const job=queue.then(async()=>{
   if(next>now())await new Promise(r=>setTimeout(r,next-now()));next=now()+spacing;
   const params=new URLSearchParams({...point,per_page:24,taxon_id:1,locale:'zh-CN',verifiable:'true',quality_grade:'research,needs_id'});
   const response=await fetchImpl('https://api.inaturalist.org/v1/observations/species_counts?'+params,{headers:{Accept:'application/json','User-Agent':'SeeThroughYourEyes-Atlas/1.0'},signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw fail(response.status===429?'数据源请求较多，请稍后重试':'附近物种数据暂时无法读取，请重试',503);
   const raw=await response.json();if(!Array.isArray(raw.results))throw fail('数据源返回格式异常',502);
   const animalGroups=new Set(['Animalia','Mammalia','Aves','Reptilia','Amphibia','Actinopterygii','Mollusca','Insecta','Arachnida']);
   const results=raw.results.filter(r=>r.taxon?.id&&(Array.isArray(r.taxon.ancestor_ids)?r.taxon.ancestor_ids.includes(1):animalGroups.has(r.taxon.iconic_taxon_name))).map(r=>({...normalize(r.taxon),localCount:r.count,isAnimal:true}));
   const missing=results.filter(t=>!t.photo);
   if(missing.length){
    try{
     if(next>now())await new Promise(r=>setTimeout(r,next-now()));next=now()+spacing;
     const photos=await fetchImpl('https://api.inaturalist.org/v1/taxa/'+missing.map(t=>t.id).join(',')+'?locale=zh-CN',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
     if(photos.ok){const extra=await photos.json();const byId=new Map((extra.results||[]).map(t=>[t.id,normalize(t).photo]));for(const t of missing)t.photo=byId.get(t.id)||null;}
    }catch{/* Species records remain useful if optional photos are unavailable. */}
   }
   const data={...point,total:raw.total_results,results,source:'iNaturalist',fetchedAt:new Date(now()).toISOString(),cached:false};
   cache.set(key,{time:now(),data});if(cache.size>100)cache.delete(cache.keys().next().value);return data;
  }).catch(error=>{if(hit)return {...hit.data,cached:true,stale:true};throw error;}).finally(()=>pending.delete(key));
  queue=job.catch(()=>{});pending.set(key,job);return job;
 };
}
module.exports={createNearby,parseLocation};
