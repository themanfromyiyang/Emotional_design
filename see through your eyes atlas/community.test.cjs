const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {validate,createCommunity}=require('./community.cjs');
const observation=()=>({species:'黑脸琵鹭',place:'米埔湿地',habitat:'浅水泥滩',consent:true,files:[]});
test('community HTTP routes accept same-origin observations and serve UI assets',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-community-http-'));
 const server=require('./server.cjs').createApp({community:createCommunity(directory)});
 try{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 for(const asset of ['/community.js','/community.css']){const response=await fetch(base+asset);assert.equal(response.status,200);await response.text();}
 const denied=await fetch(base+'/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(observation())});assert.equal(denied.status,403);await denied.json();
 const response=await fetch(base+'/api/community',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(observation())});assert.equal(response.status,201);const result=await response.json();const records=await (await fetch(base+'/api/community')).json();assert.equal(records.records[0].id,result.record.id);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
});
test('reject empty observations, missing consent and invalid attachments',()=>{
 assert.throws(()=>validate({...observation(),habitat:''}),/至少/);
 assert.throws(()=>validate({...observation(),consent:false}),/授权/);
 assert.throws(()=>validate({...observation(),files:[{name:'script.html',type:'text/html',data:'YQ=='}]}),/格式/);
 assert.throws(()=>validate({...observation(),files:[{name:'large.mp4',type:'video/mp4',data:Buffer.alloc(4*1024*1024+1).toString('base64')}]}),/4 MB/);
 assert.throws(()=>validate({...observation(),observedAt:'2026-02-30'}),/日期/);
});
test('persist observations and binary media across storage instances; list metadata only',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-community-'));
 try{const storage=createCommunity(directory);assert.deepEqual(await storage.list(),[]);const data='UklGRg==';const result=await storage.save({...observation(),files:[{name:'field.wav',type:'audio/wav',data}]});const list=await createCommunity(directory).list();assert.equal(list[0].id,result.id);assert.equal(list[0].fileCount,1);assert.equal(list[0].files,undefined);const saved=JSON.parse(await fs.readFile(path.join(directory,result.id+'.json'),'utf8'));assert.equal(saved.files[0].data,data);assert.equal(saved.status,'pending-reference');}finally{await fs.rm(directory,{recursive:true,force:true});}
});
