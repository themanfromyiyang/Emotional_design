(() => {
 'use strict';
 const $=id=>document.getElementById(id),el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const groupNames={Mammalia:'哺乳类',Aves:'鸟类',Insecta:'昆虫',Reptilia:'爬行类',Amphibia:'两栖类',Actinopterygii:'辐鳍鱼类',Mollusca:'软体动物',Arachnida:'蛛形类'};
 let query='',group='',page=1,total=0,catalogueVersion=0,selectionVersion=0,imageVersion=0;
 let selected=null,research=null,sourceImage='',generatedImage='',busyResearch=false,busyImage=false,config={aiConfigured:false},focusBeforeDialog=null;
 let catalogueAbort=null;
 const api=window.ApiClient.request;
 function backendMissing(){ $('backend-banner').hidden=false;$('connection-label').textContent='请打开完整网站';const params=new URLSearchParams({q:query,group});const address=new URL('research.html?'+params+location.hash,location.href).href;$('backend-banner').querySelector('a').href=address;$('open-full-site').href=address;$('open-full-site').hidden=false;$('retry-search').hidden=true; }
 function external(url,text,className){const a=el('a',text,className);try{const parsed=new URL(url);if(parsed.protocol==='https:')a.href=parsed.href;}catch{}a.target='_blank';a.rel='noopener noreferrer';return a;}
 function dialog(html){focusBeforeDialog=document.activeElement;$('dialog-content').innerHTML=html;$('info-dialog').showModal();$('close-dialog').focus();}
 $('close-dialog').addEventListener('click',()=>$('info-dialog').close());$('info-dialog').addEventListener('close',()=>focusBeforeDialog?.focus());
 $('method-button').addEventListener('click',()=>dialog('<h2 id="dialog-title">从问题到视觉报告</h2><p>选择物种后，向所选研究模型提问“这种动物眼中的世界是怎么样的？”，检索视觉与栖息地资料并整理带来源的视觉报告。</p><p>报告逐条标明真正研究的物种。本物种视觉证据不足时可采用有来源的近亲资料，栖息地优先使用本物种资料。点击生成环境后才检索参考照片并规划 3D 场景。模拟是有依据的示意，不能精确复原主观视觉。</p>'));
 window.addEventListener('service-settings-saved',event=>{config={...config,...event.detail};$('connection-label').textContent=config.aiConfigured?'研究服务已配置':'配置研究服务';$('connection-dot').classList.toggle('ready',config.aiConfigured);updateGenerate();});
 async function status(){if(location.protocol==='file:'){showLocalHelp();return;}try{config=await api('/api/status');$('connection-label').textContent=config.aiConfigured?'研究服务已配置':'配置研究服务';$('connection-dot').classList.toggle('ready',config.aiConfigured);}catch(error){$('connection-label').textContent='服务未连接';if(error.code==='BACKEND_NOT_CONNECTED')backendMissing();}}
 function showLocalHelp(){backendMissing();$('catalogue-status').textContent='请打开完整网站以使用在线功能。';$('catalogue-grid').setAttribute('aria-busy','false');$('empty-state').hidden=false;emptyState('进入完整网站，开始探索','点击下方按钮连接动物数据库；请确保本地服务已启动。');}
 function emptyState(title,description){$('empty-state').querySelector('h3').textContent=title;$('empty-state').querySelector('p').textContent=description;}
 function placeholder(t){const cover=el('div',undefined,'cover no-photo');cover.append(el('span',t.name.split(' ').slice(0,2).map(w=>w[0]).join(''),'monogram'));return cover;}
 function card(t){
  const article=el('article',undefined,'animal-card'),button=el('button',undefined,'card-open');button.type='button';button.setAttribute('aria-label',`研究${t.commonName||t.name}的视觉`);
  let cover=t.photo?el('div',undefined,'cover'):placeholder(t);
  if(t.photo){const img=el('img');img.src=t.photo.url;img.alt=t.commonName||t.name;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{const fallback=placeholder(t);fallback.append(el('span',groupNames[t.group]||'动物','card-rank'));cover.replaceWith(fallback);cover=fallback;},{once:true});cover.append(img);}
  cover.append(el('span',groupNames[t.group]||'动物','card-rank'));
  const text=el('div',undefined,'card-text');text.append(el('h3',t.commonName||t.name),el('p',t.name,'latin'),el('span','↗','card-arrow'));if(t.matchType==='exact')text.append(el('span','名称精确匹配','badge'));
  const bottom=el('div',undefined,'card-bottom');bottom.append(el('span',`${t.observationsCount.toLocaleString('zh-CN')} 条观察`),el('span','探索视觉'));text.append(bottom);button.append(cover,text);button.addEventListener('click',()=>choose(t));article.append(button);
  if(t.photo){const credit=external(t.photo.source,`${t.photo.license.toUpperCase()} · ${t.photo.attribution}`,'photo-credit');credit.title=t.photo.attribution;article.append(credit);}else article.append(el('span','暂无可显示的开放许可照片','photo-credit'));
  return article;
 }
 async function loadCatalogue(){
  if(location.protocol==='file:')return showLocalHelp();const version=++catalogueVersion;catalogueAbort?.abort();catalogueAbort=new AbortController();
  $('catalogue-grid').replaceChildren(...Array.from({length:8},()=>el('div',undefined,'skeleton')));$('catalogue-grid').setAttribute('aria-busy','true');$('empty-state').hidden=true;$('open-full-site').hidden=true;$('retry-search').hidden=false;$('catalogue-status').textContent='正在查询 iNaturalist…';$('previous').disabled=true;$('next').disabled=true;
  try{const params=new URLSearchParams({q:query,group,page});const data=await api('/api/taxa?'+params,{signal:catalogueAbort.signal});if(version!==catalogueVersion)return;total=data.total||0;
   $('catalogue-grid').replaceChildren(...data.results.map(card));emptyState('没有找到匹配的动物','试试英文名或拉丁学名，或换一个分类。');$('empty-state').hidden=data.results.length>0;$('results-title').textContent=query?`“${query}”的搜索结果`:(groupNames[group]||'生命图鉴');
   $('catalogue-status').textContent=`${total.toLocaleString('zh-CN')} 个匹配条目${data.searchLimit?' · 名称匹配优先':''}${data.truncated?' · 仅显示最相关的 30 条候选，请细化名称':''} · ${data.stale?'离线缓存':data.cached?'近期缓存':'在线更新'}`;$('page-label').textContent=String(page).padStart(2,'0');$('previous').disabled=page<=1;$('next').disabled=page*24>=total||page>=100;
  }catch(error){if(version!==catalogueVersion||error.name==='AbortError')return;$('catalogue-grid').replaceChildren();$('empty-state').hidden=false;$('catalogue-status').textContent=error.message;emptyState('暂时无法读取动物数据库',error.message);if(error.code==='BACKEND_NOT_CONNECTED'){backendMissing();emptyState('进入完整网站，开始探索','此预览无法连接动物数据库。点击下方按钮继续，搜索内容会保留。');}
  }finally{if(version===catalogueVersion)$('catalogue-grid').setAttribute('aria-busy','false');}
 }
 $('search-form').addEventListener('submit',e=>{e.preventDefault();query=$('search').value.trim();page=1;loadCatalogue();});
 $('filters').addEventListener('click',e=>{const button=e.target.closest('button[data-group]');if(!button)return;group=button.dataset.group;page=1;for(const b of $('filters').querySelectorAll('button')){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}loadCatalogue();});
 $('previous').addEventListener('click',()=>{page--;loadCatalogue();});$('next').addEventListener('click',()=>{page++;loadCatalogue();});$('retry-search').addEventListener('click',loadCatalogue);
 function back(e){e?.preventDefault();selectionVersion++;selected=null;research=null;imageVersion++;$('workspace-view').hidden=true;$('catalogue-view').hidden=false;history.replaceState(null,'',location.pathname);window.scrollTo({top:0});}
 for(const id of ['nav-catalogue','back'])$(id).addEventListener('click',back);
 function resetImage(){imageVersion++;sourceImage='';generatedImage='';$('original-image').hidden=true;$('result-image').hidden=true;$('compare-line').hidden=true;$('comparison').hidden=true;$('download').hidden=true;$('image-empty').hidden=false;$('image-label').hidden=true;$('generating-overlay').hidden=true;$('image-stage').style.aspectRatio='3 / 2';$('upload').value='';$('image-status').textContent='示例为草地与野花照片，尚未应用任何动物视觉效果。';}
 function choose(t){selected=t;selectionVersion++;research=null;resetImage();$('catalogue-view').hidden=true;$('workspace-view').hidden=false;$('species-name').textContent=t.commonName||t.name;$('species-latin').textContent=t.name;$('species-source').href=t.sourceUrl;for(const id of ['research-summary','habitat-content','vision-summary','research-claims-content','research-limits','source-list','research-queries'])$(id).replaceChildren();$('research-topics').hidden=true;$('research-claims').open=false;$('source-details').open=false;$('source-details').hidden=true;$('source-count').textContent='0';$('research-status').textContent=`点击“生成视觉报告”，询问所选模型“${t.commonName||t.name}眼中的世界是怎么样的？”`;history.replaceState(null,'',`#taxon=${t.id}`);window.scrollTo({top:0});window.dispatchEvent(new CustomEvent('world-species-change',{detail:t}));window.dispatchEvent(new Event('world-visible'));updateGenerate();}
 function citation(id){const a=el('a',`[${id}]`,'citation');a.href=`#source-${id}`;a.addEventListener('click',event=>{event.preventDefault();$('source-details').open=true;$(`source-${id}`)?.scrollIntoView({block:'nearest'});});return a;}
 function renderResearch(r){
  const report=r.report;$('research-status').textContent=`视觉报告已生成 · ${new Date(r.retrievedAt).toLocaleString('zh-CN')} · ${r.model||config.researchModel}`;
  $('source-count').textContent=String(r.sources.length);$('source-details').hidden=false;
  $('source-list').replaceChildren(...r.sources.map(s=>{const li=el('li');li.id=`source-${s.id}`;li.append(external(s.url,`[${s.id}] ${s.title}`));return li;}));
  $('research-summary').replaceChildren(el('h3',report.title),el('p',report.summary));
  const habitat=el('div');if(report.habitat){habitat.append(el('p',report.habitat.description),el('p',`研究对象：${report.habitat.measuredSpecies}`,'small muted'));for(const id of report.habitat.sourceIds)habitat.append(citation(id));}
  else habitat.append(el('p','本物种缺少足够的栖息地研究描述。点击生成环境时，将检索它生活环境的参考照片来规划场景。'));
  $('habitat-content').replaceChildren(habitat);
  const vision=el('div',undefined,'vision-summary-list');
  if(r.proxyUsed){const proxy=r.proxyUsed;const note=el('p',`视觉模拟参考${({genus:'同属',family:'同科',order:'同目'})[proxy.level]||'近亲'} ${proxy.measuredSpecies} 的研究；这并非本物种实测。`,'vision-proxy-note');vision.append(note);for(const id of proxy.sourceIds)note.append(' ',citation(id));}
  for(const [key,label] of [['color','颜色辨认'],['fieldOfView','视野'],['clarity','清晰度']]){const row=report.visionSummary?.[key];const item=el('div',undefined,'vision-summary-row');item.append(el('strong',label),el('p',row?.text||'尚无可核验的本物种资料。'));for(const id of row?.sourceIds||[])item.append(citation(id));vision.append(item);}
  $('vision-summary').replaceChildren(vision);
  $('research-topics').hidden=false;
  const features=el('section');features.append(el('h4','研究条目'));
  if(!report.claims.length)features.append(el('p','暂无可核验的本物种视觉研究条目。'));
  for(const claim of report.claims){const item=el('article',undefined,'claim');item.append(el('span',({direct:'本物种',genus:'同属近亲',family:'同科近亲',order:'同目近亲'})[claim.level],'badge'),el('h4',claim.aspect),el('p',claim.explanation),el('p',`研究对象：${claim.measuredSpecies}`,'small muted'));for(const id of claim.sourceIds)item.append(citation(id));features.append(item);}
  const imagined=el('section',undefined,'report-section');imagined.append(el('h3','如果借它的眼睛看世界'),el('p','以下是基于上方研究的想象性描述，不是动物主观体验的实测记录。','small muted'));const imaginedList=el('ul');for(const line of report.firstPerson)imaginedList.append(el('li',line));imagined.append(imaginedList);
  const guide=el('section',undefined,'report-section');guide.append(el('h3','视觉模拟建议'));const guideList=el('ul');for(const row of report.simulationGuide){const li=el('li');li.append(el('strong',row.dimension+'：'),document.createTextNode(row.method+' '));for(const id of row.sourceIds)li.append(citation(id));guideList.append(li);}guide.append(guideList);
  $('research-claims-content').replaceChildren(features,imagined,guide);$('research-claims').open=false;
  const limits=el('section',undefined,'limits');limits.append(el('strong','仍然未知的部分'));const list=el('ul');for(const item of report.unknowns)list.append(el('li',item));limits.append(list);$('research-limits').replaceChildren(limits);
 }
 async function runResearch(){if(!selected||busyResearch)return;const token=selectionVersion,taxon=selected;busyResearch=true;research=null;window.dispatchEvent(new CustomEvent('world-species-change',{detail:taxon}));updateGenerate();$('research-status').textContent=`正在询问 ${config.researchModel?.startsWith('deepseek-')?'DeepSeek':'GPT'}：“${taxon.commonName||taxon.name}眼中的世界是怎么样的？”并整理有来源的视觉报告…`;
  try{const detail=await api('/api/taxa/'+taxon.id);if(token!==selectionVersion)return;const result=await api('/api/research',{method:'POST',body:JSON.stringify({taxonId:taxon.id,taxon:detail}),signal:AbortSignal.timeout(480000)});if(token!==selectionVersion)return;research=result;renderResearch(result);window.dispatchEvent(new CustomEvent('world-research-update',{detail:result}));}
  catch(error){if(token===selectionVersion)$('research-status').textContent=error.name==='TimeoutError'?'研究超时，请重试。':error.message;}
  finally{if(token===selectionVersion){busyResearch=false;updateGenerate();}}
 }
 $('research-again').addEventListener('click',runResearch);
 function updateGenerate(){const color=!!research?.report?.worldAppearance,view=research?.report?.fieldOfView,photoView=!!view&&view.horizontalDegrees<180;
  $('research-again').disabled=!selected||busyResearch||busyImage||!config.aiConfigured;$('research-again').textContent=busyResearch?'正在生成…':research?'重新生成视觉报告 ↻':'生成视觉报告 ↗';
  $('generate-button').disabled=!sourceImage||busyResearch||busyImage||!research?.report||(!color&&!photoView)||(color&&!config.imageConfigured);
  $('generation-hint').textContent=busyResearch?'视觉报告生成中…':!research?.report?'先生成有来源的视觉报告。':!color&&view?.horizontalDegrees>=180?'报告中的宽视野需要 3D 环境呈现，单张照片无法扩展画面。':!color&&!photoView?'报告没有可用于照片模拟的色彩或视野证据。':!sourceImage?'选择原场景图片后可生成模拟。':color&&!config.imageConfigured?'色彩照片生成还需要在设置中填写 OpenAI API Key。':color?'照片会发送给 OpenAI 生成色彩参照，结果只调整原图像素。':'仅在浏览器中按视野证据制作示意。';
  $('example-button').disabled=busyImage;$('upload').disabled=busyImage;
 }
 async function normalizeImage(blob){
  const bitmap=await createImageBitmap(blob);try{if(bitmap.width*bitmap.height>40000000)throw new Error('图片像素过大，请选择 4000 万像素以内的图片。');const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/png');if(data.length>11*1024*1024)throw new Error('转换后的图片过大，请缩小后重试');return {data,width:canvas.width,height:canvas.height};}finally{bitmap.close();}
 }
 function setSource(input,label){sourceImage=input.data;$('original-image').src=sourceImage;$('original-image').hidden=false;$('image-empty').hidden=true;$('result-image').hidden=true;$('compare-line').hidden=true;$('comparison').hidden=true;$('download').hidden=true;$('image-label').hidden=false;$('image-label').textContent='原始画面';$('image-stage').style.aspectRatio=`${input.width} / ${input.height}`;$('image-status').textContent=label;updateGenerate();}
 $('upload').addEventListener('change',async()=>{const file=$('upload').files[0];if(!file)return;const token=++imageVersion,selection=selectionVersion;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPEG 或 WebP 图片');if(file.size>8*1024*1024)throw new Error('请选择不超过 8 MB 的图片');const input=await normalizeImage(file);if(token!==imageVersion||selection!==selectionVersion)return;setSource(input,`已选择：${file.name} · 图片尚未发送`);}catch(error){if(token===imageVersion)$('image-status').textContent=error.message;}});
 $('example-button').addEventListener('click',async()=>{const token=++imageVersion,selection=selectionVersion;try{const img=new Image();img.src='assets/example-meadow.png';await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);if(token!==imageVersion||selection!==selectionVersion)return;setSource({data:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height},'示例：草地与野花照片 · 尚未应用视觉效果');}catch{$('image-status').textContent='示例加载失败，请重试或上传自己的图片。'}});
 function split(){const value=Number($('compare-slider').value);$('result-image').style.clipPath=`inset(0 0 0 ${value}%)`;$('compare-line').style.left=value+'%';$('compare-slider').setAttribute('aria-valuetext',`原图 ${value}%，视觉模拟 ${100-value}%`);}
 $('compare-slider').addEventListener('input',split);
 $('generate-button').addEventListener('click',async()=>{if($('generate-button').disabled)return;const token=selectionVersion,version=++imageVersion,report=research.report;busyImage=true;$('generating-overlay').hidden=false;$('image-status').textContent='正在根据视觉报告处理原图…';updateGenerate();
  try{let result,note;if(report.worldAppearance){const output=await api('/api/generate',{method:'POST',body:JSON.stringify({research,image:sourceImage}),signal:AbortSignal.timeout(330000)});if(token!==selectionVersion||version!==imageVersion)return;result=await window.VisionTransfer.renderSafeImage(sourceImage,output.image,report.fieldOfView?.horizontalDegrees);note=output.note;}else{result=await window.VisionTransfer.renderViewOnly(sourceImage,report.fieldOfView.horizontalDegrees);note='依据有来源的水平视野角度制作视角示意，未改变原图色彩。';}
   if(token!==selectionVersion||version!==imageVersion)return;generatedImage=result;$('result-image').src=result;$('result-image').hidden=false;$('compare-line').hidden=false;$('comparison').hidden=false;$('compare-slider').value='50';split();$('image-label').textContent='原图 / 视觉模拟';$('image-status').textContent=note;$('download').href=result;$('download').download=`${selected.name.replace(/[^a-z0-9-]/gi,'-')}-vision.png`;$('download').hidden=false;
  }catch(error){if(token===selectionVersion&&version===imageVersion)$('image-status').textContent=error.name==='TimeoutError'?'模拟超时，请重试。':error.message;}
  finally{if(token===selectionVersion&&version===imageVersion){busyImage=false;$('generating-overlay').hidden=true;updateGenerate();}}
 });
 async function init(){const params=new URLSearchParams(location.search);query=(params.get('q')||'').slice(0,100);$('search').value=query;const requestedGroup=params.get('group');if(requestedGroup&&groupNames[requestedGroup]){group=requestedGroup;for(const b of $('filters').querySelectorAll('button')){b.classList.toggle('selected',b.dataset.group===group);b.setAttribute('aria-pressed',String(b.dataset.group===group));}}await status();if(location.hash==='#settings')window.ServiceSettings.open();if(location.protocol==='file:')return;const match=location.hash.match(/^#taxon=(\d+)$/);if(match){try{const t=await api('/api/taxa/'+match[1]);choose(t);}catch(error){$('catalogue-status').textContent=error.message;}}loadCatalogue();}
 Promise.resolve(window.APP_BOOTSTRAP).then(redirected=>{if(!redirected)init();});
})();
