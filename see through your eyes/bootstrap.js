// Local index and IDE previews share the same live application when its server is running.
window.APP_BOOTSTRAP=(async()=>{
 const local=location.protocol==='file:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 if(!local || (location.protocol==='http:' && location.port==='5180'))return false;
 try {
  const response=await fetch('http://127.0.0.1:5180/api/status',{cache:'no-store',signal:AbortSignal.timeout(2500)});
  if(!response.ok || !(response.headers.get('content-type')||'').includes('application/json'))return false;
  const status=await response.json();
  if(status.service!=='see-through-your-eyes')return false;
  const target=new URL('http://127.0.0.1:5180/');
  const input=new URLSearchParams(location.search);
  for(const key of ['q','group'])if(input.has(key))target.searchParams.set(key,input.get(key));
  target.hash=location.hash;
  location.replace(target.href);return true;
 }catch{return false;}
})();
