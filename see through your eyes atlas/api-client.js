(function(root){
 'use strict';
 async function request(url,options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('application/json')) {
   const error=new Error('The backend is unavailable. Open the full website to continue.');
   error.code='BACKEND_NOT_CONNECTED';throw error;
  }
  let body;try{body=await response.json();}catch{throw new Error('The service returned incomplete data. Please try again.');}
  if(!response.ok)throw new Error(body.error||'Request failed. Please try again');return body;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={request};else root.ApiClient={request};
})(globalThis);
