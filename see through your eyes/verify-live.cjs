// Read-only integration check. Does not call any paid OpenAI endpoint.
const {createClient}=require('./inaturalist.cjs');
const {collectPapers}=require('./research.cjs');
(async()=>{const client=createClient();const search=await client.search({q:'Danaus plexippus'});const selected=search.results.find(t=>t.name==='Danaus plexippus');if(!selected)throw new Error('Search did not return requested animal');const taxon=await client.detail(selected.id);const bundle=await collectPapers(taxon);console.log(JSON.stringify({name:taxon.name,id:taxon.id,searches:bundle.searches.map(s=>({scope:s.scope,name:s.name,hits:s.hits})),papers:bundle.papers.length,warnings:bundle.warnings},null,2));if(!bundle.searches.length)process.exitCode=1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
