import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('site');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
http.createServer(async(request,response)=>{
 const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
 try{const bytes=await readFile(file);response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{response.writeHead(404).end();}
}).listen(5183,'127.0.0.1',()=>console.log('http://127.0.0.1:5183/'));
