(function(root){
 'use strict';
 async function request(url,options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json')) {
   const error=new Error('当前页面没有连接本站后端，请使用完整网站地址打开。');
   error.code='BACKEND_NOT_CONNECTED';throw error;
  }
  let body;try{body=await response.json();}catch{throw new Error('服务返回的数据不完整，请稍后重试。');}
  if(!response.ok)throw new Error(body.error||'请求失败，请稍后重试');return body;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={request};else root.ApiClient={request};
})(globalThis);
