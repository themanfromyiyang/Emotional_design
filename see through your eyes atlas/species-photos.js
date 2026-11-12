(() => {
 'use strict';
 const cache=new Map(),pending=new Map();
 let queue=Promise.resolve(),lastRequest=0;
 const key=name=>String(name||'').trim().toLowerCase().replace(/\s+/g,' ');
 const validURL=(value,hosts)=>{try{const u=new URL(value);return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}};
 async function json(base,params){
  const task=queue.then(async()=>{
   const wait=1100-(Date.now()-lastRequest);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastRequest=Date.now();
   const response=await fetch(base+'?'+new URLSearchParams(params),{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Photo source unavailable');
   const data=await response.json();if(data.error)throw Error('Photo source error');return data;
  });queue=task.catch(()=>{});return task;
 }
 function inatPhoto(photo){
  if(!photo||!['cc0','cc-by','cc-by-sa'].includes(photo.license_code))return null;
  const url=validURL(photo.medium_url||photo.url,['static.inaturalist.org','inaturalist-open-data.s3.amazonaws.com']);
  return url&&/^\d+$/.test(String(photo.id))?{url,license:photo.license_code,attribution:photo.attribution||'',source:'https://www.inaturalist.org/photos/'+photo.id}:null;
 }
 async function memo(id,work){
  const hit=cache.get(id);if(hit&&hit.until>Date.now())return hit.value;
  if(pending.has(id))return pending.get(id);
  const task=work().then(value=>{cache.set(id,{value,until:Date.now()+(value.length?86400000:300000)});if(cache.size>200)cache.delete(cache.keys().next().value);return value;}).finally(()=>pending.delete(id));
  pending.set(id,task);return task;
 }
 async function alternatives(taxon){
  return memo('inat:'+taxon.id,async()=>{
   if(!/^[1-9]\d*$/.test(String(taxon.id)))return [];
   const data=await json('https://api.inaturalist.org/v1/taxa/'+taxon.id,{locale:'zh-CN'});
   const t=data.results?.find(t=>String(t.id)===String(taxon.id)&&key(t.name)===key(taxon.name));
   return t?[t.default_photo,...(t.taxon_photos||[]).map(p=>p.photo)].map(inatPhoto).filter(Boolean):[];
  });
 }
 const claims=(entity,property)=>(entity.claims?.[property]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value);
 async function commons(taxon){
  return memo('commons:'+key(taxon.name),async()=>{
   const base='https://www.wikidata.org/w/api.php';
   const search=await json(base,{action:'wbsearchentities',format:'json',origin:'*',language:'en',type:'item',limit:5,search:taxon.name});
   const ids=(search.search||[]).map(item=>item.id).filter(id=>/^Q\d+$/.test(id));if(!ids.length)return [];
   const details=await json(base,{action:'wbgetentities',format:'json',origin:'*',ids:ids.join('|'),props:'claims'});
   const titles=Object.values(details.entities||{}).filter(e=>claims(e,'P225').some(name=>key(name)===key(taxon.name))).flatMap(e=>claims(e,'P18')).filter(name=>typeof name==='string').slice(0,3).map(name=>'File:'+name);
   if(!titles.length)return [];
   const data=await json('https://commons.wikimedia.org/w/api.php',{action:'query',format:'json',origin:'*',titles:titles.join('|'),prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:640,iiextmetadatafilter:'LicenseShortName|Artist|Credit'});
   return Object.values(data.query?.pages||{}).flatMap(page=>{
    const info=page.imageinfo?.[0],meta=info?.extmetadata;
    const license=meta?.LicenseShortName?.value||'';
    if(!/^(CC0(?: 1\.0)?|Public domain|CC BY(?:-SA)? \d\.\d)$/i.test(license)||!/^image\/(jpeg|png|webp)$/.test(info?.mime||''))return [];
    const url=validURL(info.thumburl,['upload.wikimedia.org','thumb.wikimedia.org']),source=validURL(info.descriptionurl,['commons.wikimedia.org']);
    const attribution=new DOMParser().parseFromString(meta?.Artist?.value||meta?.Credit?.value||'作者见原页','text/html').body.textContent.trim().slice(0,300);
    return url&&source?[{url,source,license,attribution}]:[];
   });
  });
 }
 function mount({taxon,cover,credit}){
  const initial=taxon.photo,seen=new Set();
  const alive=()=>cover.isConnected;
  function creditText(message){credit.replaceChildren(document.createTextNode(message));}
  async function show(photo){
   if(!photo||seen.has(photo.url)||!alive())return false;seen.add(photo.url);
   const img=document.createElement('img');img.alt=taxon.commonName||taxon.name;img.referrerPolicy='no-referrer';
   const loaded=await new Promise(resolve=>{const timer=setTimeout(()=>{img.src='';resolve(false);},12000);img.onload=()=>{clearTimeout(timer);resolve(true);};img.onerror=()=>{clearTimeout(timer);resolve(false);};img.src=photo.url;});
   if(!loaded||!alive())return false;
   cover.querySelectorAll('img,.monogram,.no-image').forEach(n=>n.remove());cover.classList.remove('no-photo');cover.prepend(img);
   const a=document.createElement('a');a.href=photo.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent=photo.license.toUpperCase()+' · '+photo.attribution;credit.replaceChildren(a);taxon.photo=photo;return true;
  }
  async function run(){
   if(!alive())return;
   creditText('正在查找开放许可照片…');
   if(await show(initial))return;
   for(const provider of [alternatives,commons]){
    if(!alive())return;
    try{for(const photo of await provider(taxon)){if(await show(photo))return;}}catch{/* A failed source must not hide the species or block another source. */}
   }
   if(alive())creditText('暂未找到可加载的开放许可照片');
  }
  // Cards are built before insertion; observe after the caller mounts its list.
  setTimeout(()=>{
   if(!alive())return;
   if(typeof IntersectionObserver==='undefined'){void run();return;}
   const observer=new IntersectionObserver(entries=>{if(!alive()){observer.disconnect();return;}if(entries.some(e=>e.isIntersecting)){observer.disconnect();void run();}},{rootMargin:'250px'});
   observer.observe(cover);
  },0);
 }
 window.SpeciesPhotos={mount,alternatives,commons};
})();
