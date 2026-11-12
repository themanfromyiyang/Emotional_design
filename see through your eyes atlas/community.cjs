const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const types=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm']);
function invalid(message){return Object.assign(new Error(message),{status:400});}
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw invalid('观察资料格式无效');
 const record={};for(const [key,max] of [['species',100],['place',200],['habitat',3000],['behavior',3000],['role',50],['observedAt',10]]){if(input[key]!==undefined&&typeof input[key]!=='string')throw invalid('文字字段格式无效');record[key]=(input[key]||'').trim();if(record[key].length>max)throw invalid('文字内容过长');}
 if(!record.species||!record.place||input.consent!==true)throw invalid('请填写物种、地点并确认资料使用授权');
 if(record.observedAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(record.observedAt)||!Number.isFinite(Date.parse(record.observedAt))||new Date(record.observedAt).toISOString().slice(0,10)!==record.observedAt))throw invalid('观察日期无效');
 if(!Array.isArray(input.files)||input.files.length>6)throw invalid('最多上传 6 个附件');let total=0;
 record.files=input.files.map(file=>{if(!file||typeof file.name!=='string'||file.name.length>255||!types.has(file.type)||typeof file.data!=='string'||!file.data.length||file.data.length>5592408||Buffer.from(file.data,'base64').toString('base64')!==file.data)throw invalid('附件格式无效');const size=Buffer.byteLength(file.data,'base64');total+=size;if(!size||size>4*1024*1024||total>8*1024*1024)throw invalid('每个附件最多 4 MB，总计最多 8 MB');return {name:path.basename(file.name),type:file.type,size,data:file.data};});
 if(!record.habitat&&!record.behavior&&!record.files.length)throw invalid('请至少补充一项观察内容或附件');return {...record,consent:true,id:randomUUID(),createdAt:new Date().toISOString(),status:'pending-reference'};
}
function createCommunity(directory){return {
 async save(input){const record=validate(input);await fs.mkdir(directory,{recursive:true});const target=path.join(directory,record.id+'.json'),temporary=target+'.tmp';try{await fs.writeFile(temporary,JSON.stringify(record),{flag:'wx'});await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}return {id:record.id,species:record.species,place:record.place,createdAt:record.createdAt,fileCount:record.files.length};},
 async list(){let names;try{names=await fs.readdir(directory);}catch(error){if(error.code==='ENOENT')return [];throw error;}const records=[];for(const name of names.filter(n=>/^[a-f0-9-]+\.json$/.test(n))){const r=JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));records.push({id:r.id,species:r.species,place:r.place,createdAt:r.createdAt,fileCount:r.files.length});}return records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20);}
};}
module.exports={createCommunity,validate};
