(() => {
 'use strict';
 const base='https://api.inaturalist.org/v1/';
 const groupIds={Mammalia:40151,Aves:3,Insecta:47158,Reptilia:26036,Amphibia:20978,Actinopterygii:47178,Mollusca:47115,Arachnida:47119};
 const cache=new Map();
 const nameKey=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
 function photoOf(photo){
  if(!photo||!['cc0','cc-by','cc-by-sa'].includes(photo.license_code))return null;
  try{const url=new URL(photo.medium_url||photo.url);if(url.protocol!=='https:'||!['inaturalist-open-data.s3.amazonaws.com','static.inaturalist.org'].includes(url.hostname))return null;return {url:url.href,attribution:photo.attribution||'',license:photo.license_code,source:`https://www.inaturalist.org/photos/${photo.id}`};}catch{return null;}
 }
 function normalize(t){return {id:t.id,name:t.name,commonName:t.preferred_common_name||'',aliases:(t.names||[]).filter(n=>n.is_valid!==false).map(n=>n.name).filter(Boolean),rank:t.rank,group:t.iconic_taxon_name||'',observationsCount:t.observations_count||0,photo:photoOf(t.default_photo)||(t.taxon_photos||[]).map(p=>photoOf(p.photo)).find(Boolean)||null,ancestors:(t.ancestors||[]).map(a=>({id:a.id,name:a.name,rank:a.rank})),sourceUrl:`https://www.inaturalist.org/taxa/${t.id}`};}
 async function inat(endpoint,signal){
  const hit=cache.get(endpoint);if(hit&&Date.now()-hit.at<300000)return {...hit.data,cached:true};
  const response=await fetch(base+endpoint,{headers:{Accept:'application/json'},signal});
  if(!response.ok)throw Error(response.status===429?'iNaturalist 请求较多，请稍后重试。':'动物数据库暂时无法连接，请稍后重试。');
  const data=await response.json();if(!Array.isArray(data.results))throw Error('动物数据库返回的数据格式异常。');
  cache.set(endpoint,{at:Date.now(),data});if(cache.size>80)cache.delete(cache.keys().next().value);
  return data;
 }
 async function nearby(point,signal){
  const {lat,lng,radius=25,page=1}=point;
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))throw Error('坐标无效。');
  const params=new URLSearchParams({lat,lng,radius,page,per_page:24,taxon_id:1,locale:'zh-CN',verifiable:'true',quality_grade:'research,needs_id'});
  const raw=await inat('observations/species_counts?'+params,signal);
  const groups=new Set(['Animalia','Mammalia','Aves','Reptilia','Amphibia','Actinopterygii','Mollusca','Insecta','Arachnida']);
  const results=raw.results.filter(row=>row.taxon?.id&&(Array.isArray(row.taxon.ancestor_ids)?row.taxon.ancestor_ids.includes(1):groups.has(row.taxon.iconic_taxon_name))).map(row=>({...normalize(row.taxon),localCount:row.count,isAnimal:true}));
  return {lat:Number(lat),lng:Number(lng),radius:Number(radius),page:Number(page),total:raw.total_results||0,results,source:'iNaturalist',cached:!!raw.cached};
 }
 async function search(params,signal){
  const q=(params.get('q')||'').normalize('NFKC').trim().slice(0,100),group=params.get('group')||'',page=Math.max(1,Math.min(100,Number(params.get('page'))||1));
  const filter=new URLSearchParams({taxon_id:String(groupIds[group]||1),rank:'species',is_active:'true',locale:'zh-CN'});
  if(!q){filter.set('per_page','24');filter.set('page',String(page));filter.set('order_by','observations_count');const raw=await inat('taxa?'+filter,signal);return {results:raw.results.map(normalize),total:raw.total_results||0,cached:!!raw.cached};}
  filter.set('q',q);filter.set('all_names','true');filter.set('per_page','30');
  const raw=await inat('taxa/autocomplete?'+filter,signal),key=nameKey(q);
  const candidates=raw.results.map(normalize).filter(t=>!group||t.group===group).map((t,index)=>{const names=[t.name,t.commonName,...t.aliases].map(nameKey);const score=names.includes(key)?0:names.some(n=>n.includes(key))?1:2;return {t,index,score};}).filter(row=>!/[\u3400-\u9fff]/u.test(key)||row.score<2).sort((a,b)=>a.score-b.score||a.index-b.index).map(row=>({...row.t,matchType:row.score===0?'exact':'related'}));
  return {results:candidates.slice((page-1)*24,page*24),total:candidates.length,searchLimit:30,truncated:raw.total_results>raw.results.length,cached:!!raw.cached};
 }
 async function detail(id,signal){
  if(!/^[1-9]\d{0,9}$/.test(id))throw Error('物种编号无效。');
  const raw=await inat('taxa/'+id+'?locale=zh-CN',signal),taxon=raw.results[0];
  if(!taxon||String(taxon.id)!==id)throw Error('未找到这个物种。');
  if(!taxon.ancestors?.some(a=>a.id===1)||!['species','subspecies'].includes(taxon.rank))throw Error('请选择动物物种条目。');
  return normalize(taxon);
 }
 async function request(url,options={}){
  if(url==='/api/status')return {service:'see-through-your-eyes',aiConfigured:false,imageConfigured:false,researchModel:'gpt-6.1-sol',imageModel:'gpt-image-2'};
  if(url.startsWith('/api/taxa?'))return search(new URLSearchParams(url.split('?')[1]),options.signal);
  if(/^\/api\/taxa\/\d+$/.test(url))return detail(url.split('/').pop(),options.signal);
  throw Error('GitHub Pages 静态版不提供 AI 视觉报告生成。请使用带后端的本地版本。');
 }
 window.AtlasData={nearby};window.ApiClient={request};
 const showInfo=()=>{
  let dialog=document.getElementById('static-info');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='static-info';dialog.className='settings-dialog';dialog.innerHTML='<div class="settings-heading"><h2>GitHub Pages 公开版</h2><button type="button" aria-label="关闭">×</button></div><p class="settings-intro">地球探索和动物目录直接读取 iNaturalist 的公开记录。GitHub Pages 不能运行本站的研究与图像生成后端，因此视觉报告、照片模拟和 3D 环境生成暂不可用。API Key 不会被要求或上传。</p>';document.body.append(dialog);dialog.querySelector('button').addEventListener('click',()=>dialog.close());}
  dialog.showModal();
 };
 document.getElementById('settings-button')?.addEventListener('click',showInfo);
 window.ServiceSettings={open:showInfo};
 if(document.getElementById('research-again')){
  const notice=document.createElement('p');notice.className='static-site-notice';notice.textContent='GitHub Pages 静态版可浏览动物目录；视觉报告与模拟需要后端服务，当前公开版暂不提供。';
  document.querySelector('.site-header')?.after(notice);
 }
})();
