const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createClient,fail}=require('./inaturalist.cjs');
const {createNearby}=require('./nearby.cjs');
const {createResearch,generateImage,generateWorldPlan}=require('./research.cjs');
const root=__dirname;
const defaultCommunity=require('./community.cjs').createCommunity(path.join(root,'data','community'));
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const config={key:process.env.OPENAI_API_KEY||'',deepseekKey:process.env.DEEPSEEK_API_KEY||'',researchModel:process.env.RESEARCH_MODEL||process.env.OPENAI_RESEARCH_MODEL||'gpt-6.1-sol',imageModel:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2'};
function saveSettings(file,changes){
 const previous=fs.existsSync(file)?fs.readFileSync(file,'utf8'):fs.readFileSync(path.join(root,'.env.example'),'utf8');
 const names=new Set(Object.keys(changes));
 if(names.has('RESEARCH_MODEL'))names.add('OPENAI_RESEARCH_MODEL');
 const lines=previous.split(/\r?\n/).filter(line=>!names.has(line.match(/^\s*([A-Z_]+)\s*=/)?.[1]));
 const content=lines.join('\n').trimEnd()+'\n'+Object.entries(changes).map(([name,value])=>name+'='+value).join('\n')+'\n';
 const temporary=file+'.'+require('node:crypto').randomUUID()+'.tmp';
 try{fs.writeFileSync(temporary,content,{encoding:'utf8',mode:0o600,flag:'wx'});fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function createApp({community=defaultCommunity,catalogue=createClient(),settings=config,nearby=createNearby(),research,generate=generateImage,worldPlan=generateWorldPlan,envPath=path.join(root,'.env')}={}){
 settings={...settings};
 const researchKey=model=>model.startsWith('deepseek-')?settings.deepseekKey:settings.key;
 const service=research||createResearch({catalogue,key:model=>researchKey(model),model:()=>settings.researchModel});let imageBusy=false;
 const allowed=new Set(['community.js','community.css','species-photos.js','original.html','research.html','atlas.js','place-name.js','atlas.css','settings.css','assets/vendor/d3.min.js','assets/vendor/topojson-client.min.js','assets/world-land.json','assets/occurrence-density.json','assets/place-names.json','index.html','style.css','app.js','api-client.js','settings.js','vision-transfer.js','world-simulation.js','node_modules/three/build/three.module.js','node_modules/three/build/three.core.js','bootstrap.js','assets/example-meadow.png','assets/example-garden.svg','assets/journal-birds.png','assets/journal-botanical.png','assets/journal-fern.jpg','assets/naturalist-paper-v1.png','assets/naturalist-paper-v2.png','assets/naturalist-paper-v3.png','assets/naturalist-paper-v4.png']);
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw fail('需要 JSON 请求',415);let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw fail('上传图片过大',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('请求内容无效');}}
 return http.createServer(async(req,res)=>{try{
  const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))throw fail('仅允许本机访问',403);const url=new URL(req.url,'http://'+host);
  if(req.method==='GET'){
   if(url.pathname==='/api/status'){res.setHeader('Access-Control-Allow-Origin','*');return json(res,200,{service:'see-through-your-eyes',aiConfigured:!!researchKey(settings.researchModel),imageConfigured:!!settings.key,researchModel:settings.researchModel,imageModel:settings.imageModel});}
   if(url.pathname==='/api/community')return json(res,200,{records:await community.list()});
   if(url.pathname==='/api/nearby')return json(res,200,await nearby(Object.fromEntries(url.searchParams)));
   if(url.pathname==='/api/taxa')return json(res,200,await catalogue.search({q:url.searchParams.get('q')||'',group:url.searchParams.get('group')||'',page:Number(url.searchParams.get('page')||1)}));
   if(/^\/api\/taxa\/\d+$/.test(url.pathname))return json(res,200,await catalogue.detail(url.pathname.split('/').pop()));
   const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(!allowed.has(file))throw fail('未找到页面',404);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return fs.createReadStream(path.join(root,file)).pipe(res);
  }
  if(req.method!=='POST')throw fail('不支持的请求方法',405);if(req.headers.origin!=='http://'+host)throw fail('请从本站页面发起请求',403);const input=await body(req);
  if(url.pathname==='/api/community')return json(res,201,{record:await community.save(input)});
  if(url.pathname==='/api/settings'){
   if(!input||typeof input!=='object'||Array.isArray(input))throw fail('配置内容无效',400);
   const changes={};
   if(input.apiKey!==undefined&&input.apiKey!==''){
    if(typeof input.apiKey!=='string'||!/^sk-[A-Za-z0-9_-]{12,509}$/.test(input.apiKey))throw fail('请输入有效格式的 OpenAI API Key',400);
    changes.OPENAI_API_KEY=input.apiKey;
   }
   if(input.deepseekApiKey!==undefined&&input.deepseekApiKey!==''){
    if(typeof input.deepseekApiKey!=='string'||!/^[A-Za-z0-9_-]{12,512}$/.test(input.deepseekApiKey))throw fail('请输入有效格式的 DeepSeek API Key',400);
    changes.DEEPSEEK_API_KEY=input.deepseekApiKey;
   }
   for(const [field,name] of [['researchModel','RESEARCH_MODEL'],['imageModel','OPENAI_IMAGE_MODEL']]){
    if(input[field]===undefined)continue;
    if(typeof input[field]!=='string'||!/^[a-z][a-z0-9._-]{1,79}$/.test(input[field]))throw fail('模型名称无效',400);
    changes[name]=input[field];
   }
   if(!Object.keys(changes).length)throw fail('没有要保存的配置',400);
   saveSettings(envPath,changes);
   if(changes.OPENAI_API_KEY)settings.key=changes.OPENAI_API_KEY;
   if(changes.DEEPSEEK_API_KEY)settings.deepseekKey=changes.DEEPSEEK_API_KEY;
   if(changes.RESEARCH_MODEL)settings.researchModel=changes.RESEARCH_MODEL;
   if(changes.OPENAI_IMAGE_MODEL)settings.imageModel=changes.OPENAI_IMAGE_MODEL;
   return json(res,200,{aiConfigured:!!researchKey(settings.researchModel),imageConfigured:!!settings.key,researchModel:settings.researchModel,imageModel:settings.imageModel});
  }
  if(url.pathname==='/api/research')return json(res,200,await service.run(input.taxonId));
  if(url.pathname==='/api/world'){const session=service.get(input.researchId),model=session.model||settings.researchModel;return json(res,200,await worldPlan(session,{key:researchKey(model),model}));}
  if(url.pathname==='/api/generate'){
   if(imageBusy)throw fail('已有图像正在生成，请稍候',429);
   const session=service.get(input.researchId);imageBusy=true;
   try{return json(res,200,await generate(session,input.image,{key:settings.key,model:settings.imageModel}));}finally{imageBusy=false;}
  }
  throw fail('未找到接口',404);
 }catch(error){if(!res.headersSent)json(res,error.status||502,{error:error.status?error.message:'服务暂时不可用，请稍后重试'});else res.end();}});
}
if(require.main===module){const port=Number(process.env.PORT||5181);createApp().listen(port,'127.0.0.1',()=>console.log(`See through your eyes: http://127.0.0.1:${port}\nResearch model: ${config.researchModel}`));}
module.exports={createApp};
