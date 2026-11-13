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
   let input;try{input=JSON.parse(options.body||'{}');}catch{throw Error('Invalid settings');}
   if(input.researchModel!==undefined){if(!/^[a-z][a-z0-9._-]{1,79}$/.test(input.researchModel))throw Error('Invalid research model name');state.researchModel=input.researchModel;}
   if(input.imageModel!==undefined){if(!/^[a-z][a-z0-9._-]{1,79}$/.test(input.imageModel))throw Error('Invalid image model name');state.imageModel=input.imageModel;}
   if(input.apiKey){if(!/^sk-[A-Za-z0-9_-]{12,509}$/.test(input.apiKey))throw Error('OpenAI API Key Invalid format');state.openaiKey=input.apiKey;}
   if(input.deepseekApiKey){if(!/^[A-Za-z0-9_-]{12,512}$/.test(input.deepseekApiKey))throw Error('DeepSeek API Key Invalid format');state.deepseekKey=input.deepseekApiKey;}
   try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{throw Error('This browser could not save settings for this tab');}
   return configuration();
  }
  const headers={'Content-Type':'application/json',...options.headers};
  if(url==='/api/research'||url==='/api/world'){
   let model=state.researchModel;
   if(url==='/api/world')try{model=JSON.parse(options.body).research?.model||model;}catch{}
   const key=model.startsWith('deepseek-')?state.deepseekKey:state.openaiKey;
   if(!key)throw Error('Enter an API key for the selected research model in Settings first');
   headers['X-Research-Key']=key;headers['X-Research-Model']=model;
  }
  if(url==='/api/generate'){
   if(!state.openaiKey)throw Error('Enter your OpenAI API key in Settings first');
   headers['X-Image-Key']=state.openaiKey;headers['X-Image-Model']=state.imageModel;
  }
  const response=await fetch(new URL(url,backendOrigin).href,{...options,headers});
  if(!(response.headers.get('content-type')||'').includes('application/json')){
   const error=new Error('The backend is unavailable. Open the full website to continue.');error.code='BACKEND_NOT_CONNECTED';throw error;
  }
  let body;try{body=await response.json();}catch{throw Error('The service returned incomplete data. Please try again.');}
  if(!response.ok)throw Error(body.error||'Request failed. Please try again');
  return body;
 }
 window.ApiClient={request};
})();
