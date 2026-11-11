(() => {
 'use strict';
 const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const places={hongkong:{lat:22.49,lng:114.04,name:'香港 · 米埔湿地'},amazon:{lat:-3.1,lng:-60.02,name:'亚马孙 · 马瑙斯'},serengeti:{lat:-2.33,lng:34.83,name:'塞伦盖蒂'},borneo:{lat:5.87,lng:117.95,name:'婆罗洲 · 山打根'},reef:{lat:-16.5,lng:145.8,name:'大堡礁'}};
 const params=new URLSearchParams(location.search),read=(key,lo,hi,fallback)=>{const raw=params.get(key),n=Number(raw);return raw!==null&&raw.trim()!==''&&Number.isFinite(n)&&n>=lo&&n<=hi?n:fallback;};
 let selected={lat:read('lat',-90,90,22.49),lng:read('lng',-180,180,114.04)},radius=read('radius',2,200,25),page=1,version=0,abort;
 if(![2,5,10,25,50,200].includes(radius))radius=25;
 let label=params.has('lat')?'正在识别地点…':places.hongkong.name,placeVersion=0,placeData;
 const fmt=(lat,lng,digits=3)=>`${Math.abs(lat).toFixed(digits)}°${lat<0?'S':'N'}, ${Math.abs(lng).toFixed(digits)}°${lng<0?'W':'E'}`;
 function resolvePlace(point){
  const own=++placeVersion;
  label='正在识别地点…';$('location-title').textContent=label;
  placeData??=fetch('assets/place-names.json').then(response=>{if(!response.ok)throw Error('Place names unavailable');return response.json();}).then(data=>data.cities);
  placeData.then(cities=>{if(own!==placeVersion)return;label=window.PlaceNames.label(point,cities,'zh-CN',Object.values(places))||fmt(point.lat,point.lng,2);$('location-title').textContent=label;}).catch(()=>{if(own!==placeVersion)return;label=fmt(point.lat,point.lng,2);$('location-title').textContent=label;});
 }
 function updateLocation(){
  $('coordinates').textContent=fmt(selected.lat,selected.lng);$('location-title').textContent=label;
  $('latitude').value=selected.lat.toFixed(4);$('longitude').value=selected.lng.toFixed(4);
  document.querySelectorAll('[data-radius]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.radius)===radius)));
  const query=new URLSearchParams({lat:selected.lat.toFixed(5),lng:selected.lng.toFixed(5),radius});history.replaceState(null,'','?'+query);
  $('observation-link').href='https://www.inaturalist.org/observations?'+new URLSearchParams({lat:selected.lat,lng:selected.lng,radius,taxon_id:1,verifiable:'true',view:'species'});
 }
 function card(t){
  const article=node('article',undefined,'species-card'),link=node('a'),cover=node('div',undefined,'species-image');
  link.href='research.html#taxon='+t.id;
  link.setAttribute('aria-label',(t.commonName||t.name)+'：探索视觉');
  const fallback=()=>{cover.replaceChildren(node('span',t.name.split(' ').map(s=>s[0]).slice(0,2).join(''),'no-image'));};
  fallback();
  link.append(cover,node('h3',t.commonName||t.name),node('p',t.name,'latin'),node('p',`${t.localCount.toLocaleString('zh-CN')} 条附近记录`,'count'));article.append(link);
  const credit=node('div',undefined,'credit');article.append(credit);
  window.SpeciesPhotos.mount({taxon:t,cover,credit});
  return article;
 }
 async function load(){
  const own=++version;abort?.abort();abort=new AbortController();$('species-list').setAttribute('aria-busy','true');$('species-list').replaceChildren(...Array.from({length:9},()=>node('div',undefined,'loading-tile')));$('empty').hidden=true;$('record-status').textContent=`正在查询 ${radius} km 范围内的记录…`;$('previous').disabled=true;$('next').disabled=true;
  try{
   const data=await window.ApiClient.request('/api/nearby?'+new URLSearchParams({...selected,radius,page}),{signal:abort.signal});if(own!==version)return;
   $('species-list').replaceChildren(...data.results.map(card));$('record-status').replaceChildren(node('strong',data.total.toLocaleString('zh-CN')),document.createTextNode(` 种动物有记录 · ${data.stale?'旧缓存':data.cached?'近期缓存':'在线更新'}`));$('page-number').textContent=String(page).padStart(2,'0');$('previous').disabled=page<=1;$('next').disabled=page*24>=data.total||page>=100;
   if(!data.results.length){$('empty').hidden=false;$('empty-title').textContent='这里还没有找到动物记录';$('empty-description').textContent='试试扩大范围，或在地球仪上换一个地点。';}
  }catch(error){if(own!==version||error.name==='AbortError')return;$('species-list').replaceChildren();$('record-status').textContent='查询未完成';$('empty').hidden=false;$('empty-title').textContent='暂时无法读取记录';$('empty-description').textContent=error.message;$('previous').disabled=page<=1;}
  finally{if(own===version)$('species-list').setAttribute('aria-busy','false');}
 }
 // Orthographic projection renders only the near hemisphere; picking uses its inverse.
 const canvas=$('globe'),ctx=canvas.getContext('2d');let width=600,scale=246,projection,path,land,densityPoints=[],rotation=[-selected.lng,-selected.lat,0],pointer=null,frame=0;
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});};
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=width*.421;if(projection)projection.translate([width/2,width/2]).scale(scale);schedule();}
 function draw(){
  if(!projection||!land||!width)return;projection.rotate(rotation);ctx.clearRect(0,0,width,width);const c=width/2;
  const sphere={type:'Sphere'};ctx.beginPath();path(sphere);const ocean=ctx.createRadialGradient(c-width*.13,c-width*.16,width*.02,c,c,scale);ocean.addColorStop(0,'#f4efd9');ocean.addColorStop(.72,'#e8e4cb');ocean.addColorStop(1,'#c5c9a7');ctx.fillStyle=ocean;ctx.fill();ctx.strokeStyle='#485d39';ctx.lineWidth=1.2;ctx.stroke();
  ctx.save();ctx.beginPath();path(sphere);ctx.clip();ctx.beginPath();path(land);ctx.fillStyle='#8a9c6540';ctx.fill();ctx.strokeStyle='#49613c99';ctx.lineWidth=.65;ctx.stroke();
  ctx.beginPath();path(d3.geoGraticule10());ctx.strokeStyle='#68795128';ctx.lineWidth=.45;ctx.stroke();
  const center=projection.invert([c,c]);ctx.fillStyle='#244e34';
  // Actual GBIF occupied cells; logarithmic tone preserves both sparse and dense regions.
  const lon=center[0]*Math.PI/180,lat=center[1]*Math.PI/180,cl=Math.cos(lon),sl=Math.sin(lon),cp=Math.cos(lat),sp=Math.sin(lat);
  for(const point of densityPoints){const horizontal=cl*point[0]+sl*point[1];if(cp*horizontal+sp*point[2]<=0)continue;const x=c+scale*(-sl*point[0]+cl*point[1]),y=c-scale*(cp*point[2]-sp*horizontal),strength=point[3];ctx.globalAlpha=.13+.77*strength;const size=Math.max(.55,width/600*(.9+.85*strength));ctx.fillRect(x-size/2,y-size/2,size,size);}
  ctx.globalAlpha=1;ctx.beginPath();path(d3.geoCircle().center([selected.lng,selected.lat]).radius(radius/111.195)());ctx.strokeStyle='#8c4a28';ctx.fillStyle='#b879362b';ctx.lineWidth=1.2;ctx.fill();ctx.stroke();
  if(d3.geoDistance(center,[selected.lng,selected.lat])<Math.PI/2){
   const [x,y]=projection([selected.lng,selected.lat]);ctx.save();ctx.translate(x,y);
   // Fixed, slightly irregular ink strokes: no random jitter while rotating.
   ctx.strokeStyle='#fffef5';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
   ctx.shadowColor='#243d32aa';ctx.shadowBlur=3;ctx.shadowOffsetY=1;
   ctx.beginPath();ctx.moveTo(-2,-10);ctx.bezierCurveTo(5,-12,11,-5,10,2);ctx.bezierCurveTo(10,9,3,12,-4,10);ctx.bezierCurveTo(-11,8,-12,0,-9,-6);ctx.quadraticCurveTo(-7,-11,-2,-10);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-16,-1);ctx.lineTo(-7,0);ctx.moveTo(8,1);ctx.lineTo(16,0);ctx.moveTo(0,-16);ctx.lineTo(1,-8);ctx.moveTo(-1,8);ctx.lineTo(0,16);ctx.stroke();
   ctx.beginPath();ctx.arc(0,0,2.3,0,Math.PI*2);ctx.fillStyle='#fffef5';ctx.fill();ctx.restore();
  }
  const shade=ctx.createLinearGradient(0,0,width,width);shade.addColorStop(0,'#ede6c500');shade.addColorStop(.65,'#43562b05');shade.addColorStop(1,'#43562b38');ctx.fillStyle=shade;ctx.fillRect(0,0,width,width);ctx.restore();
  ctx.strokeStyle='#706e56a0';ctx.lineWidth=.7;for(const r of [scale+10,scale+20]){ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<120;i++){const a=i/120*Math.PI*2,inner=scale+20-(i%5===0?9:4);ctx.beginPath();ctx.moveTo(c+Math.cos(a)*inner,c+Math.sin(a)*inner);ctx.lineTo(c+Math.cos(a)*(scale+20),c+Math.sin(a)*(scale+20));ctx.stroke();}
  ctx.fillStyle='#62664d';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('N',c,c-scale-27);ctx.fillText('S',c,c+scale+34);$('view-coordinates').textContent=fmt(center[1],center[0],1);
 }
 function pick(x,y){if(!projection||Math.hypot(x-width/2,y-width/2)>scale)return;projection.rotate(rotation);const [lng,lat]=projection.invert([x,y]);if(Number.isFinite(lng)&&Number.isFinite(lat))select({lat,lng},null,false);}
 function select(point,name,recenter=true){selected={lat:point.lat,lng:point.lng};label=name||'正在识别地点…';page=1;if(recenter)rotation=[-selected.lng,-selected.lat,0];updateLocation();if(name)placeVersion++;else resolvePlace(selected);schedule();load();}
 const xy=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||pointer||!land)return;const [x,y]=xy(e);if(Math.hypot(x-width/2,y-width/2)>scale)return;pointer={id:e.pointerId,x,y,rotation:[...rotation],dragged:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
 canvas.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const [x,y]=xy(e),dx=x-pointer.x,dy=y-pointer.y;if(Math.hypot(dx,dy)>5)pointer.dragged=true;if(pointer.dragged){const sensitivity=90/scale;rotation=[pointer.rotation[0]+dx*sensitivity,Math.max(-89.5,Math.min(89.5,pointer.rotation[1]-dy*sensitivity)),0];schedule();}});
 canvas.addEventListener('pointerup',e=>{if(!pointer||e.pointerId!==pointer.id)return;const click=!pointer.dragged;pointer=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(click)pick(...xy(e));});
 const cancel=()=>{pointer=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
 canvas.addEventListener('keydown',e=>{if(!land)return;const moves={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,8],ArrowDown:[0,-8]};if(moves[e.key]){e.preventDefault();rotation[0]+=moves[e.key][0];rotation[1]=Math.max(-89.5,Math.min(89.5,rotation[1]+moves[e.key][1]));schedule();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(width/2,width/2);}});
 $('coordinate-form').addEventListener('submit',e=>{e.preventDefault();const lat=Number($('latitude').value),lng=Number($('longitude').value);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){$('form-error').hidden=false;$('form-error').textContent='纬度应为 -90 至 90，经度应为 -180 至 180。';return;}$('form-error').hidden=true;select({lat,lng});});
 document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>{const p=places[b.dataset.place];select(p,p.name);}));
 document.querySelectorAll('[data-radius]').forEach(b=>b.addEventListener('click',()=>{radius=Number(b.dataset.radius);page=1;updateLocation();schedule();load();}));
 $('recenter').addEventListener('click',()=>{rotation=[-selected.lng,-selected.lat,0];schedule();});$('retry').addEventListener('click',load);
 $('previous').addEventListener('click',()=>{if(page>1){page--;load();}});$('next').addEventListener('click',()=>{page++;load();});
 $('copy-view').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-view').textContent='链接已复制 ✓';}catch{$('copy-view').textContent='请复制浏览器地址栏中的链接';}setTimeout(()=>$('copy-view').textContent='复制这个地点 ↗',3500);});
 async function initGlobe(){try{
  if(!window.d3||!window.topojson||!ctx)throw Error('地图组件未能加载，请刷新。');
  projection=d3.geoOrthographic().rotate(rotation).clipAngle(90).precision(.4);path=d3.geoPath(projection,ctx);
  const response=await fetch('assets/world-land.json');if(!response.ok)throw Error('地理轮廓加载失败，请刷新。');const topology=await response.json();land=topojson.feature(topology,topology.objects.land);
  $('globe-loading').hidden=true;new ResizeObserver(resize).observe(canvas);resize();
  try{const density=await fetch('assets/occurrence-density.json');if(!density.ok)throw Error('density');const data=await density.json();if(data.taxonKey!==1)throw Error('density taxon');densityPoints=data.points.map(([lng,lat,count])=>{const a=lng*Math.PI/180,b=lat*Math.PI/180;return [Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b),Math.min(1,Math.log10(1+count)/5)];});canvas.dataset.densityCells=String(densityPoints.length);document.querySelector('.map-note').textContent=`GBIF 动物出现记录 · ${data.retrieved.slice(0,10)} 快照 · 点越深表示网格内记录越多（对数色阶）。记录密度受采样影响，不等于物种丰富度；左侧物种来自 iNaturalist。`;schedule();}catch{document.querySelector('.map-note').textContent='记录密度暂时无法加载，当前仅显示地理底图。选点查询仍可使用。';}
 }catch(error){$('globe-loading').textContent=error.message+' 仍可使用上方经纬度选点。';}}
 updateLocation();if(params.has('lat'))resolvePlace(selected);initGlobe();load();
})();
