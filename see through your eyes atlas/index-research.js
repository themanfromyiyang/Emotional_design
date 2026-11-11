(() => {
 'use strict';
 const home=document.getElementById('atlas-home');
 const viewer=document.getElementById('index-research');
 const frame=document.getElementById('research-frame');
 const standalone=document.getElementById('open-research-page');
 const globeNav=document.querySelector('.topbar nav a[href="/"]');
 const researchNav=document.getElementById('nav-research');

 function route(){
  const taxon=location.hash.match(/^#taxon=(\d+)$/);
  if(taxon)return {taxonId:taxon[1]};
  if(location.hash.startsWith('#search=')){try{return {query:decodeURIComponent(location.hash.slice(8))};}catch{return {query:''};}}
  if(location.hash==='#research')return {};
  return null;
 }
 function show(view){
  const active=!!view;
  home.hidden=active;viewer.hidden=!active;
  if(active){
   const url=new URL('research.html',location.href);url.searchParams.set('embed','1');
   const full=new URL('research.html',location.href);
   if(view.query){url.searchParams.set('q',view.query);full.searchParams.set('q',view.query);}
   if(view.taxonId){url.hash='taxon='+view.taxonId;full.hash='taxon='+view.taxonId;}
   if(frame.src!==url.href){frame.style.height='900px';frame.src=url.href;}
   standalone.href=full.href;
   researchNav.setAttribute('aria-current','page');globeNav.removeAttribute('aria-current');
  }else{
   researchNav.removeAttribute('aria-current');globeNav.setAttribute('aria-current','page');
  }
  window.scrollTo({top:0});
 }
 function navigate(hash){history.pushState(null,'',location.pathname+location.search+hash);show(route());}
 document.addEventListener('click',event=>{
  const link=event.target.closest('.species-card>a');if(!link)return;
  const taxon=link.getAttribute('href')?.match(/^#taxon=(\d+)$/);if(!taxon)return;
  event.preventDefault();navigate('#taxon='+taxon[1]);
 });
 document.getElementById('search-form').addEventListener('submit',event=>{
  event.preventDefault();navigate('#search='+encodeURIComponent(document.getElementById('search').value.trim().slice(0,100)));
 });
 researchNav.addEventListener('click',event=>{event.preventDefault();navigate('#research');});
 document.getElementById('close-research').addEventListener('click',()=>{
  history.replaceState(null,'',location.pathname+location.search);show(null);
 });
 window.addEventListener('hashchange',()=>show(route()));
 window.addEventListener('popstate',()=>show(route()));
 window.addEventListener('service-settings-saved',()=>{if(!viewer.hidden)frame.contentWindow?.postMessage({type:'atlas-settings-saved'},location.origin);});
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow||!event.data||typeof event.data!=='object')return;
  if(event.data.type==='atlas-embed-height'&&!viewer.hidden){const height=Number(event.data.height);if(Number.isFinite(height))frame.style.height=Math.max(650,Math.min(50000,Math.ceil(height)+24))+'px';}
  if(event.data.type==='atlas-embed-species'&&/^\d+$/.test(String(event.data.id))){history.replaceState(null,'',location.pathname+location.search+'#taxon='+event.data.id);const full=new URL('research.html',location.href);full.hash='taxon='+event.data.id;standalone.href=full.href;}
  if(event.data.type==='atlas-embed-catalogue'){history.replaceState(null,'',location.pathname+location.search+'#research');standalone.href=new URL('research.html',location.href).href;}
 });
 show(route());
})();
