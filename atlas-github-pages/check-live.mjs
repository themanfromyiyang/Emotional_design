const base='https://themanfromyiyang.github.io/Emotional_design/';
for(const path of ['', 'research.html', 'inat-client.js', 'api-client.js', 'settings.js', 'world-simulation.js', 'vendor/three/three.module.js', 'assets/world-land.json']){
 const response=await fetch(base+path,{redirect:'follow'});
 const body=await response.text();
 console.log(JSON.stringify({path:path||'/',status:response.status,type:response.headers.get('content-type'),title:body.match(/<title>([^<]+)/)?.[1]||null,hasGlobe:body.includes('id="globe"')}));
 if(!response.ok)process.exitCode=1;
}
