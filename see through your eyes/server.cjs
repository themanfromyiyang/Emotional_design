const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createClient,fail}=require('./inaturalist.cjs');
const {createResearch,generateImage}=require('./research.cjs');
const root=__dirname;
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const config={key:process.env.OPENAI_API_KEY||'',researchModel:process.env.OPENAI_RESEARCH_MODEL||'gpt-4.1',imageModel:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2'};
function createApp({catalogue=createClient(),research,generate=generateImage,settings=config}={}){
 const service=research||createResearch({catalogue,key:settings.key,model:settings.researchModel});let imageBusy=false;
 const allowed=new Set(['index.html','style.css','app.js','api-client.js','bootstrap.js','assets/example-garden.svg','assets/journal-birds.png','assets/journal-botanical.png','assets/journal-fern.jpg','assets/naturalist-paper-v1.png','assets/naturalist-paper-v2.png','assets/naturalist-paper-v3.png','assets/naturalist-paper-v4.png']);
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw fail('需要 JSON 请求',415);let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)throw fail('上传图片过大',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('请求内容无效');}}
 return http.createServer(async(req,res)=>{try{
  const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))throw fail('仅允许本机访问',403);const url=new URL(req.url,'http://'+host);
  if(req.method==='GET'){
   if(url.pathname==='/api/status'){res.setHeader('Access-Control-Allow-Origin','*');return json(res,200,{service:'see-through-your-eyes',aiConfigured:!!settings.key,researchModel:settings.researchModel,imageModel:settings.imageModel});}
   if(url.pathname==='/api/taxa')return json(res,200,await catalogue.search({q:url.searchParams.get('q')||'',group:url.searchParams.get('group')||'',page:Number(url.searchParams.get('page')||1)}));
   if(/^\/api\/taxa\/\d+$/.test(url.pathname))return json(res,200,await catalogue.detail(url.pathname.split('/').pop()));
   const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(!allowed.has(file))throw fail('未找到页面',404);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return fs.createReadStream(path.join(root,file)).pipe(res);
  }
  if(req.method!=='POST')throw fail('不支持的请求方法',405);if(req.headers.origin!=='http://'+host)throw fail('请从本站页面发起请求',403);const input=await body(req);
  if(url.pathname==='/api/research')return json(res,200,await service.run(input.taxonId));
  if(url.pathname==='/api/generate'){if(imageBusy)throw fail('已有图像正在生成，请等待完成',429);const session=service.get(input.researchId);imageBusy=true;try{return json(res,200,await generate(session,input.image,{key:settings.key,model:settings.imageModel}));}finally{imageBusy=false;}}
  throw fail('未找到接口',404);
 }catch(error){if(!res.headersSent)json(res,error.status||502,{error:error.status?error.message:'服务暂时不可用，请稍后重试'});else res.end();}});
}
if(require.main===module){const port=Number(process.env.PORT||5180);createApp().listen(port,'127.0.0.1',()=>console.log(`See through your eyes: http://127.0.0.1:${port}\nGPT services: ${config.key?'configured':'set OPENAI_API_KEY in .env to enable'}`));}
module.exports={createApp};
