import {spawnSync} from 'node:child_process';

const action=process.argv[2]||'check';
const result=spawnSync('git',['credential','fill'],{
 input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',
 env:{...process.env,GIT_TERMINAL_PROMPT:'0'}
});
if(result.status!==0)throw Error('GitHub credential manager did not provide an authenticated credential.');
const fields=Object.fromEntries(result.stdout.split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)];}));
const token=fields.password;
if(!token)throw Error('GitHub credential manager returned no access token.');
const endpoint=action==='check'?'https://api.github.com/user':'https://api.github.com/repos/themanfromyiyang/Emotional_design/pages';
const response=await fetch(endpoint,{
 method:action==='enable'?'POST':'GET',
 headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2026-03-10','User-Agent':'SeeThroughYourEyes-Publisher',...(action==='enable'?{'Content-Type':'application/json'}:{})},
 ...(action==='enable'?{body:JSON.stringify({source:{branch:'gh-pages',path:'/'}})}:{})
});
const data=await response.json().catch(()=>({}));
if(action==='check')console.log(JSON.stringify({status:response.status,login:data.login||null}));
else console.log(JSON.stringify({status:response.status,url:data.html_url||null,message:data.message||null,source:data.source||null}));
if(!response.ok)process.exitCode=1;
