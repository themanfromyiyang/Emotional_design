(() => {
 'use strict';
 const storageKey='atlas-public-settings-v1';
 const backendOrigin='https://see-through-your-eyes-atlas-2026.fuzzyloom4.chatgpt.site';
 const defaults={researchModel:'gpt-6.1-sol',imageModel:'gpt-image-2',openaiKey:'',deepseekKey:''};
 let state={...defaults};
 try{state={...state,...JSON.parse(sessionStorage.getItem(storageKey)||'{}')};}catch{}
 const configuration=()=>({
  service:'see-through-your-eyes',
  researchModel:state.researchModel,
  imageModel:state.imageModel,
  aiConfigured:!!(state.researchModel.startsWith('deepseek-')?state.deepseekKey:state.openaiKey),
  imageConfigured:!!state.openaiKey
 });
 async function request(url,options={}){
  if(url==='/api/status')return configuration();
  if(url.startsWith('/api/nearby?'))return window.InatClient.nearby(Object.fromEntries(new URLSearchParams(url.split('?')[1])),options.signal);
  if(url.startsWith('/api/taxa?'))return window.InatClient.search(new URLSearchParams(url.split('?')[1]),options.signal);
  if(/^\/api\/taxa\/\d+$/.test(url))return window.InatClient.detail(url.split('/').pop(),options.signal);
  if(url==='/api/settings'){
   let input;try{input=JSON.parse(options.body||'{}');}catch{throw Error('设置格式无效');}
   if(input.researchModel!==undefined){if(!/^[a-z][a-z0-9._-]{1,79}$/.test(input.researchModel))throw Error('研究模型名称无效');state.researchModel=input.researchModel;}
   if(input.imageModel!==undefined){if(!/^[a-z][a-z0-9._-]{1,79}$/.test(input.imageModel))throw Error('图像模型名称无效');state.imageModel=input.imageModel;}
   if(input.apiKey){if(!/^sk-[A-Za-z0-9_-]{12,509}$/.test(input.apiKey))throw Error('OpenAI API Key 格式无效');state.openaiKey=input.apiKey;}
   if(input.deepseekApiKey){if(!/^[A-Za-z0-9_-]{12,512}$/.test(input.deepseekApiKey))throw Error('DeepSeek API Key 格式无效');state.deepseekKey=input.deepseekApiKey;}
   try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{throw Error('浏览器无法保存本标签页的设置');}
   return configuration();
  }
  const headers={'Content-Type':'application/json',...options.headers};
  if(url==='/api/research'||url==='/api/world'){
   let model=state.researchModel;
   if(url==='/api/world')try{model=JSON.parse(options.body).research?.model||model;}catch{}
   const key=model.startsWith('deepseek-')?state.deepseekKey:state.openaiKey;
   if(!key)throw Error('请先在设置中填写当前研究模型对应的 API Key');
   headers['X-Research-Key']=key;headers['X-Research-Model']=model;
  }
  if(url==='/api/generate'){
   if(!state.openaiKey)throw Error('请先在设置中填写 OpenAI API Key');
   headers['X-Image-Key']=state.openaiKey;headers['X-Image-Model']=state.imageModel;
  }
  const response=await fetch(new URL(url,backendOrigin).href,{...options,headers});
  if(!(response.headers.get('content-type')||'').includes('application/json')){
   const error=new Error('当前页面没有连接本站后端，请使用完整网站地址打开。');error.code='BACKEND_NOT_CONNECTED';throw error;
  }
  let body;try{body=await response.json();}catch{throw Error('服务返回的数据不完整，请稍后重试。');}
  if(!response.ok)throw Error(body.error||'请求失败，请稍后重试');
  return body;
 }
 window.ApiClient={request};
})();
