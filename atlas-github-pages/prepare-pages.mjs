import {readFileSync,writeFileSync} from 'node:fs';

function update(name,changes){
 const file='site/'+name;let value=readFileSync(file,'utf8');
 for(const [before,after] of changes){if(!(before instanceof RegExp?before.test(value):value.includes(before)))throw Error(`Missing ${String(before).slice(0,60)} in ${file}`);value=value.replace(before,after);}
 writeFileSync(file,value);
}

update('index.html',[
 [/href="\/"/g,'href="./"'],
 [/<script src="api-client\.js\?v=[^"]+" defer><\/script>/,'<script src="static-api.js?v=1" defer></script>'],
 [/<script src="settings\.js\?v=[^"]+" defer><\/script>/,''],
 ['配置生成服务 ↗','关于公开版 ↗'],
 ['转动地球，探索附近的动物和地点；进入有来源的物种视觉报告与交互模拟。','转动地球，探索附近的动物和地点；查看 iNaturalist 的公开物种记录。']
]);
update('research.html',[
 [/href="\/"/g,'href="./"'],
 [/<script src="bootstrap\.js\?v=[^"]+"><\/script>/,''],
 [/<script src="api-client\.js\?v=[^"]+" defer><\/script>/,'<script src="static-api.js?v=1" defer></script>'],
 [/<script src="settings\.js\?v=[^"]+" defer><\/script>/,''],
 ['href="http://127.0.0.1:5181/"','href="./"'],
 ['href="http://127.0.0.1:5181/"','href="./"'],
 ['当前是静态预览，无法处理动物搜索和研究请求。先在项目目录运行 npm start，再打开本地网站。','动物数据暂时无法连接，请刷新页面重试。'],
 ['请启用 JavaScript，并通过 npm start 启动后访问本地网站。','请启用 JavaScript 后访问网站。'],
 ['从动物数据库出发，向所选模型提问动物眼中的世界，阅读带来源的视觉报告并探索交互模拟。','从 iNaturalist 动物数据库探索物种；AI 视觉报告需使用带后端的版本。']
]);
update('app.js',[
 ["const address='http://127.0.0.1:5181/research.html?'+params+location.hash;","const address=new URL('research.html?'+params+location.hash,location.href).href;"],
 ["$('connection-label').textContent=config.aiConfigured?'研究服务已配置':'配置研究服务';","$('connection-label').textContent='GitHub Pages 静态版';"]
]);
