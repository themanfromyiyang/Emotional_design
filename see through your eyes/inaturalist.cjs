const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const GROUPS=new Set(['','Mammalia','Aves','Insecta','Reptilia','Amphibia','Actinopterygii','Mollusca','Arachnida']);
const GROUP_IDS={Mammalia:40151,Aves:3,Insecta:47158,Reptilia:26036,Amphibia:20978,Actinopterygii:47178,Mollusca:47115,Arachnida:47119};
const nameKey=value=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
function rankMatches(results,query){
 const key=nameKey(query);
 return results.map((taxon,index)=>{
  const names=[taxon.name,taxon.commonName,...(taxon.aliases||[])].filter(Boolean).map(nameKey);
  const exact=names.includes(key),phrase=names.some(name=>name.includes(key));
  return {taxon:{...taxon,matchType:exact?'exact':'related'},index,score:exact?0:phrase?1:2};
 }).filter(item=>!/[\u3400-\u9fff]/u.test(key)||item.score<2)
 .sort((a,b)=>a.score-b.score||a.index-b.index).map(item=>item.taxon);
}
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function taxonId(value){const id=String(value);if(!/^[1-9]\d{0,9}$/.test(id))throw fail('无效的物种编号');return id;}
function safePhoto(photo){
  if(!photo||!['cc0','cc-by','cc-by-sa'].includes(photo.license_code))return null;
  try{const url=new URL(photo.medium_url||photo.url);if(url.protocol!=='https:'||!['inaturalist-open-data.s3.amazonaws.com','static.inaturalist.org'].includes(url.hostname))return null;return {url:url.href,attribution:photo.attribution||'',license:photo.license_code,source:`https://www.inaturalist.org/photos/${photo.id}`};}catch{return null;}
}
function normalize(t){return {id:t.id,name:t.name,commonName:t.preferred_common_name||'',aliases:(t.names||[]).filter(n=>n.is_valid!==false).map(n=>n.name).filter(n=>typeof n==='string'),rank:t.rank,group:t.iconic_taxon_name||'',observationsCount:t.observations_count||0,photo:safePhoto(t.default_photo)||(t.taxon_photos||[]).map(p=>safePhoto(p.photo)).find(Boolean)||null,ancestors:(t.ancestors||[]).map(a=>({id:a.id,name:a.name,rank:a.rank})),sourceUrl:`https://www.inaturalist.org/taxa/${t.id}`};}
function createClient({fetchImpl=fetch,cacheDir=path.join(__dirname,'.cache','catalogue-v3'),spacing=1100,now=Date.now}={}){
 const memory=new Map(),pending=new Map();let queue=Promise.resolve(),next=0,blocked=0;
 async function request(endpoint,ttl){
  const key=crypto.createHash('sha256').update(endpoint).digest('hex');let cached=memory.get(key);
  if(!cached)try{cached=JSON.parse(fs.readFileSync(path.join(cacheDir,key+'.json'),'utf8'));}catch{}
  if(cached&&now()-cached.at<ttl)return {...cached.data,cached:true,fetchedAt:new Date(cached.at).toISOString()};
  if(pending.has(key))return pending.get(key);if(pending.size>=24)throw fail('请求较多，请稍后再试',429);
  const task=queue.then(async()=>{
   if(next>now())await new Promise(r=>setTimeout(r,next-now()));if(now()<blocked)throw fail('iNaturalist 正在限流，请稍后重试',503);next=now()+spacing;
   const res=await fetchImpl('https://api.inaturalist.org/v1/'+endpoint,{headers:{Accept:'application/json','User-Agent':'SeeThroughYourEyes/2.0'},signal:AbortSignal.timeout(15000)});
   if(res.status===429){const seconds=Number(res.headers.get('retry-after'));blocked=now()+Math.max(60000,Number.isFinite(seconds)?seconds*1000:60000);}
   if(!res.ok)throw fail('iNaturalist 暂时无法连接',503);const raw=await res.json();if(!Array.isArray(raw.results))throw fail('物种数据格式异常',502);
   const data={results:raw.results.map(normalize),total:raw.total_results};const entry={at:now(),data};memory.set(key,entry);if(memory.size>200)memory.delete(memory.keys().next().value);
   try{fs.mkdirSync(cacheDir,{recursive:true});fs.writeFileSync(path.join(cacheDir,key+'.json'),JSON.stringify(entry));}catch{}
   return {...data,cached:false,fetchedAt:new Date(entry.at).toISOString()};
  }).catch(error=>{if(cached)return {...cached.data,cached:true,stale:true,fetchedAt:new Date(cached.at).toISOString()};throw error;}).finally(()=>pending.delete(key));
  queue=task.catch(()=>{});pending.set(key,task);return task;
 }
 async function withPhotos(data){
  const missing=data.results.filter(t=>!t.photo);
  if(!missing.length)return data;
  try{
   // List endpoints only include default_photo. Fetch missing covers in one
   // batch so normalize can inspect the full taxon_photos collection.
   const details=await request('taxa/'+missing.map(t=>taxonId(t.id)).join(',')+'?locale=zh-CN&per_page=30',24*3600000);
   const photos=new Map(details.results.filter(t=>t.photo).map(t=>[t.id,t.photo]));
   return {...data,results:data.results.map(t=>t.photo?t:{...t,photo:photos.get(t.id)||null})};
  }catch{return {...data,photoWarning:'部分物种照片暂时无法读取，请稍后重试。'};}
 }
 return {
  async search({q='',group='',page=1}={}){
   if(typeof q!=='string'||q.length>100||!GROUPS.has(group)||!Number.isInteger(page)||page<1||page>100)throw fail('搜索条件无效');
   const params=new URLSearchParams({taxon_id:String(GROUP_IDS[group]||1),rank:'species',is_active:'true',locale:'zh-CN'});
   if(!q.trim()){
    params.set('per_page','24');params.set('page',String(page));params.set('order_by','observations_count');
    return withPhotos(await request('taxa?'+params,5*60000));
   }
   // Autocomplete performs exact-name resolution before related-name matching.
   // It is capped at 30 and always returns page 1; paginate that set locally.
   params.set('q',q.normalize('NFKC').trim().replace(/\s+/g,' '));params.set('all_names','true');params.set('per_page','30');
   const data=await request('taxa/autocomplete?'+params,5*60000);
   const candidates=rankMatches(data.results.filter(t=>!group||t.group===group),q);
   return withPhotos({...data,results:candidates.slice((page-1)*24,page*24),total:candidates.length,searchLimit:30,truncated:data.total>data.results.length});
  },
  async detail(value){const id=taxonId(value),result=await request('taxa/'+id+'?locale=zh-CN',24*3600000),taxon=result.results[0];if(!taxon||String(taxon.id)!==id)throw fail('未找到这个物种',404);if(!taxon.ancestors.some(a=>a.id===1)||!['species','subspecies'].includes(taxon.rank))throw fail('请选择动物物种条目',400);return taxon;}
 };
}
module.exports={createClient,normalize,safePhoto,taxonId,fail};
