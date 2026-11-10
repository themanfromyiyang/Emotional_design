(() => {
 'use strict';
 const $=id=>document.getElementById(id),el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 const groupNames={Mammalia:'哺乳类',Aves:'鸟类',Insecta:'昆虫',Reptilia:'爬行类',Amphibia:'两栖类',Actinopterygii:'辐鳍鱼类',Mollusca:'软体动物',Arachnida:'蛛形类'};
 const levelNames={direct:'本物种证据',genus:'同属近亲推断',family:'同科近亲推断'},scopeNames={species:'学名检索',genus:'同属检索',family:'同科检索'};
 let query='',group='',page=1,total=0,catalogueVersion=0,selectionVersion=0,imageVersion=0;
 let selected=null,research=null,sourceImage='',generatedImage='',busyResearch=false,busyImage=false,config={aiConfigured:false},focusBeforeDialog=null;
 let catalogueAbort=null;
 const api=window.ApiClient.request;
 function backendMissing(){ $('backend-banner').hidden=false;$('connection-label').textContent='请打开完整网站';const params=new URLSearchParams({q:query,group});const address='http://127.0.0.1:5180/?'+params+location.hash;$('backend-banner').querySelector('a').href=address;$('open-full-site').href=address;$('open-full-site').hidden=false;$('retry-search').hidden=true; }
 function external(url,text,className){const a=el('a',text,className);try{const parsed=new URL(url);if(parsed.protocol==='https:')a.href=parsed.href;}catch{}a.target='_blank';a.rel='noopener noreferrer';return a;}
 function dialog(html){focusBeforeDialog=document.activeElement;$('dialog-content').innerHTML=html;$('info-dialog').showModal();$('close-dialog').focus();}
 $('close-dialog').addEventListener('click',()=>$('info-dialog').close());$('info-dialog').addEventListener('close',()=>focusBeforeDialog?.focus());
 $('method-button').addEventListener('click',()=>dialog('<h2 id="dialog-title">从名字，到另一种看见。</h2><h3>01 · 选择一种生命</h3><p>从 iNaturalist 动物数据库搜索。物种条目实时获取或短期缓存，不是预先选好的体验列表。</p><h3>02 · 沿着证据理解视觉</h3><p>选择后检索 Europe PMC 的论文标题与摘要，再由 GPT 生成有引用的视觉说明。本物种优先，近亲研究单独标记。候选论文不等于有效证据；检索不到不代表世界上没有研究。当前未覆盖所有学术数据库或纪录片。</p><h3>03 · 使用你的场景</h3><p>选择通用示例或上传图片，依据说明中的证据让 GPT 编辑原图。保持场景与构图，不预先生成动物滤镜。普通屏幕与 RGB 图片不能重现额外色维，生成结果是艺术解释。</p>'));
 $('settings-button').addEventListener('click',()=>dialog('<h2 id="dialog-title">连接生成服务</h2><p>动物数据库与论文检索无需 API Key。视觉说明和图像生成使用你自己的 OpenAI API 账户。</p><p>在项目目录新建 <code>.env</code> 文件（可复制 <code>.env.example</code>），在本机填写：</p><pre>OPENAI_API_KEY=你的_API_Key\nOPENAI_RESEARCH_MODEL=gpt-4.1\nOPENAI_IMAGE_MODEL=gpt-image-2</pre><p>保存后重启 <code>npm start</code>，再刷新页面。密钥只在服务端读取，请不要填进网页源码或发到聊天中。</p><p>点击动物会触发研究；点击生成才发送图片。OpenAI API 调用按你的账户计费。没有密钥时仍可搜索动物并查看候选论文。</p>'));
 async function status(){if(location.protocol==='file:'){showLocalHelp();return;}try{config=await api('/api/status');$('connection-label').textContent=config.aiConfigured?'生成服务已连接':'配置生成服务';$('connection-dot').classList.toggle('ready',config.aiConfigured);}catch(error){$('connection-label').textContent='服务未连接';if(error.code==='BACKEND_NOT_CONNECTED')backendMissing();}}
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
 function back(e){e?.preventDefault();selectionVersion++;selected=null;busyResearch=false;busyImage=false;imageVersion++;$('workspace-view').hidden=true;$('catalogue-view').hidden=false;history.replaceState(null,'',location.pathname);window.scrollTo({top:0});}
 for(const id of ['home','nav-catalogue','back'])$(id).addEventListener('click',back);
 function resetImage(){imageVersion++;sourceImage='';generatedImage='';$('original-image').hidden=true;$('result-image').hidden=true;$('compare-line').hidden=true;$('comparison').hidden=true;$('download').hidden=true;$('image-empty').hidden=false;$('image-label').hidden=true;$('generating-overlay').hidden=true;$('image-stage').style.aspectRatio='3 / 2';$('upload').value='';$('image-status').textContent='示例是通用色彩场景，尚未应用任何动物视觉效果。';}
 async function choose(t){selected=t;selectionVersion++;research=null;busyImage=false;resetImage();$('catalogue-view').hidden=true;$('workspace-view').hidden=false;$('species-name').textContent=t.commonName||t.name;$('species-latin').textContent=t.name;$('species-source').href=t.sourceUrl;history.replaceState(null,'',`#taxon=${t.id}`);window.scrollTo({top:0});await runResearch();}
 async function runResearch(){
  if(!selected)return;const token=++selectionVersion,taxon=selected;busyResearch=true;research=null;generatedImage='';$('result-image').hidden=true;$('compare-line').hidden=true;$('comparison').hidden=true;$('download').hidden=true;
  for(const id of ['research-summary','research-claims','research-limits','source-list','research-queries'])$(id).replaceChildren();$('source-count').textContent='0';$('source-details').open=false;
  $('research-status').textContent='正在检索本物种、同属和同科的视觉论文，并整理可读取的摘要…';$('research-again').disabled=true;updateGenerate();
  try{const result=await api('/api/research',{method:'POST',body:JSON.stringify({taxonId:taxon.id}),signal:AbortSignal.timeout(250000)});if(token!==selectionVersion)return;research=result;renderResearch(result);
  }catch(error){if(token!==selectionVersion)return;$('research-status').textContent=error.name==='TimeoutError'?'研究请求超时，请稍后重新研究。':error.message;
  }finally{if(token===selectionVersion){busyResearch=false;$('research-again').disabled=false;updateGenerate();}}
 }
 $('research-again').addEventListener('click',runResearch);
 function renderResearch(r){
  $('source-count').textContent=String(r.papers.length);
  $('research-queries').textContent=r.searches.map(s=>`${s.name} · ${scopeNames[s.scope]}：${s.hits} 条命中`).join(' / ');
  $('source-list').replaceChildren(...r.papers.map(p=>{const li=el('li');li.id=`source-${p.id}`;li.append(external(p.url,`[${p.id}] ${p.title}`),el('small',`${p.year} · ${p.authors}`),el('small',`${scopeNames[p.scope]}：${p.searchName} · ${p.abstract?'已读取摘要':'无摘要，仅题录'}`));return li;}));
  if(r.report){$('research-status').textContent=`视觉说明已生成 · ${new Date(r.retrievedAt).toLocaleString('zh-CN')}`;const summary=el('div',undefined,'research-summary');summary.append(el('h3',r.report.title),el('p',r.report.summary));$('research-summary').append(summary);
   $('research-claims').replaceChildren(...r.report.claims.map(c=>{const item=el('article',undefined,'claim');item.append(el('span',levelNames[c.level],'badge'),el('h3',c.aspect),el('p',c.explanation),el('p',`研究对象：${c.measuredSpecies}`,'small muted'));for(const id of c.sourceIds){const a=el('a',`[${id}]`,'citation');a.href=`#source-${id}`;a.addEventListener('click',()=>{$('source-details').open=true;});item.append(a);}return item;}));
   const limits=el('div',undefined,'limits');limits.append(el('strong','仍然未知的部分'));const list=el('ul');for(const text of r.report.unknowns)list.append(el('li',text));limits.append(list);$('research-limits').append(limits);
  }else{
   $('source-details').open=true;
   const reason=r.aiError||(!r.searches.length?'文献服务暂时无法连接，本次检索未完成，请稍后重新研究。':!r.papers.length?'本次索引未检索到相关文献，不能生成可信的视觉说明。':!r.configured?'候选文献已检索。配置 OpenAI 服务后，点击“重新研究”生成有引用的视觉说明。':'当前文献没有可读取摘要，暂不生成视觉结论。');$('research-status').textContent=reason;
  }
  for(const warning of r.warnings)$('research-limits').append(el('p',warning,'small warning'));
 }
 function updateGenerate(){const supported=research?.report?.claims.some(c=>c.visualInstruction.trim());$('generate-button').disabled=!sourceImage||!supported||busyResearch||busyImage||!config.aiConfigured;
  $('generation-hint').textContent=busyImage?'正在生成，请等待结果。':!config.aiConfigured?'请先连接 OpenAI 生成服务。':busyResearch?'正在整理研究，完成后即可继续。':!research?.report?'需要先生成带来源的视觉说明。':!supported?'本次研究尚不足以支持静态图像转译。':!sourceImage?'选择一张图片，开始视觉转译。':'将依据上方说明编辑这张原图，保留主体与构图。';
  $('example-button').disabled=busyImage;$('upload').disabled=busyImage;$('research-again').disabled=busyResearch||busyImage;
 }
 async function normalizeImage(blob){
  const bitmap=await createImageBitmap(blob);try{if(bitmap.width*bitmap.height>40000000)throw new Error('图片像素过大，请选择 4000 万像素以内的图片。');const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/png');if(data.length>11*1024*1024)throw new Error('转换后的图片过大，请缩小后重试');return {data,width:canvas.width,height:canvas.height};}finally{bitmap.close();}
 }
 function setSource(input,label){sourceImage=input.data;generatedImage='';$('original-image').src=sourceImage;$('original-image').hidden=false;$('image-empty').hidden=true;$('result-image').hidden=true;$('compare-line').hidden=true;$('comparison').hidden=true;$('download').hidden=true;$('image-label').hidden=false;$('image-label').textContent='原始画面';$('image-stage').style.aspectRatio=`${input.width} / ${input.height}`;$('image-status').textContent=label;updateGenerate();}
 $('upload').addEventListener('change',async()=>{const file=$('upload').files[0];if(!file)return;const token=++imageVersion,selection=selectionVersion;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPEG 或 WebP 图片');if(file.size>8*1024*1024)throw new Error('请选择不超过 8 MB 的图片');const input=await normalizeImage(file);if(token!==imageVersion||selection!==selectionVersion)return;setSource(input,`已选择：${file.name} · 图片尚未发送`);}catch(error){if(token===imageVersion)$('image-status').textContent=error.message;}});
 $('example-button').addEventListener('click',async()=>{const token=++imageVersion,selection=selectionVersion;try{const img=new Image();img.src='assets/example-garden.svg';await img.decode();const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;canvas.getContext('2d').drawImage(img,0,0);if(token!==imageVersion||selection!==selectionVersion)return;setSource({data:canvas.toDataURL('image/png'),width:1536,height:1024},'示例：池畔色彩场景 · 原创矢量插画，尚未应用视觉效果');}catch{$('image-status').textContent='示例加载失败，请重试或上传自己的图片。'}});
 function split(){const value=Number($('compare-slider').value);$('result-image').style.clipPath=`inset(0 0 0 ${value}%)`;$('compare-line').style.left=value+'%';$('compare-slider').setAttribute('aria-valuetext',`原图 ${value}%，视觉转译 ${100-value}%`);}
 $('compare-slider').addEventListener('input',split);
 $('generate-button').addEventListener('click',async()=>{
  if($('generate-button').disabled)return;const token=selectionVersion,version=++imageVersion;busyImage=true;$('generating-overlay').hidden=false;$('image-status').textContent='原图与研究中的视觉约束正在发送给 GPT…';updateGenerate();
  try{const output=await api('/api/generate',{method:'POST',body:JSON.stringify({researchId:research.id,image:sourceImage}),signal:AbortSignal.timeout(330000)});if(token!==selectionVersion||version!==imageVersion)return;generatedImage=output.image;$('result-image').src=generatedImage;$('result-image').hidden=false;$('compare-line').hidden=false;$('comparison').hidden=false;$('compare-slider').value='50';split();$('image-label').textContent='原图 / GPT 视觉转译';$('image-status').textContent=output.note;$('download').href=generatedImage;$('download').download=`${selected.name.replace(/[^a-z0-9-]/gi,'-')}-vision.png`;$('download').hidden=false;
  }catch(error){if(token===selectionVersion&&version===imageVersion)$('image-status').textContent=error.name==='TimeoutError'?'生成超时，请稍后重试。':error.message;
  }finally{if(token===selectionVersion&&version===imageVersion){busyImage=false;$('generating-overlay').hidden=true;updateGenerate();}}
 });
 async function init(){const params=new URLSearchParams(location.search);query=(params.get('q')||'').slice(0,100);$('search').value=query;const requestedGroup=params.get('group');if(requestedGroup&&groupNames[requestedGroup]){group=requestedGroup;for(const b of $('filters').querySelectorAll('button')){b.classList.toggle('selected',b.dataset.group===group);b.setAttribute('aria-pressed',String(b.dataset.group===group));}}await status();if(location.protocol==='file:')return;const match=location.hash.match(/^#taxon=(\d+)$/);if(match){try{const t=await api('/api/taxa/'+match[1]);choose(t);}catch(error){$('catalogue-status').textContent=error.message;}}loadCatalogue();}
 Promise.resolve(window.APP_BOOTSTRAP).then(redirected=>{if(!redirected)init();});
})();
