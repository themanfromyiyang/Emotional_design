const {test}=require('node:test');
const assert=require('node:assert/strict');
const {synthesize}=require('./research.cjs');
test('missing visual dimensions borrow relatives even when direct field of view exists',async()=>{
 const direct={measuredSpecies:'Testus example',level:'direct',sourceIds:['S1'],explanation:'direct color evidence'};
 const relative={measuredSpecies:'Testus cousin',level:'genus',sourceIds:['S2'],explanation:'relative low-light evidence'};
 const original={title:'Vision',summary:'Summary',visionSummary:Object.fromEntries(['color','fieldOfView','clarity'].map(k=>[k,{text:k,sourceIds:[]}])),visionEvidence:{color:direct,lowLight:null,clarity:null},claims:[],firstPerson:[],simulationGuide:[],habitat:null,fieldOfView:{...direct,horizontalDegrees:220},worldAppearance:null,visualStreak:null,unknowns:[]};
 const organized={...original,visionEvidence:{color:relative,lowLight:relative,clarity:{...relative,measuredSpecies:'Unrelated species'}},fieldOfView:{...relative,horizontalDegrees:300}};
 const requests=[];
 const fetchImpl=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);let value,source;
 if(body.text?.format?.name==='species_habitat')value={biome:'forest',description:'A forest with tall trees, a grassy floor and a stream.'};
 else if(body.text?.format?.name==='animal_vision_report')value=original;
 else if(body.text?.format?.name==='animal_vision_proxy_report')value=organized;
 else {value='Research evidence';source=requests.length===1?'target':'relative';}
 return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:typeof value==='string'?value:JSON.stringify(value),annotations:source?[{type:'url_citation',url:'https://example.org/'+source,title:source,start_index:0}]:[]}]}]})};};
 const result=await synthesize({name:'Testus example',ancestors:[{rank:'genus',name:'Testus',id:1}]},{key:'test',fetchImpl});
 const fallback=requests.find(r=>r.input?.includes('"missing"'));
 assert.deepEqual(JSON.parse(fallback.input).missing,['lowLight','clarity']);
 assert.equal(result.report.fieldOfView.horizontalDegrees,220);
 assert.deepEqual(result.report.visionEvidence.color,direct);
 assert.deepEqual(result.report.visionEvidence.lowLight,relative);
 assert.equal(result.report.visionEvidence.clarity,null);
 assert.equal(result.report.habitat.measuredSpecies,'Testus example');
 assert.equal(result.sources.length,2);
});
