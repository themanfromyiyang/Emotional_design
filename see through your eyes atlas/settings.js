(() => {
 'use strict';
 const markup=`<dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
  <div class="settings-heading"><div><p class="settings-eyebrow">LOCAL GENERATION SERVICE</p><h2 id="settings-title">Connect AI services</h2></div><button id="settings-close" type="button" aria-label="Close settings">×</button></div>
  <p class="settings-intro">Choose OpenAI or DeepSeek for vision research and environment planning. AI photo color generation uses OpenAI image models. Provider keys are saved locally.</p>
  <form id="settings-form" autocomplete="off">
   <label for="settings-key">OpenAI API Key <span>For GPT research and image generation; leave blank to keep the current key</span></label>
   <input id="settings-key" type="password" placeholder="sk-…" autocomplete="new-password" spellcheck="false">
   <label for="settings-deepseek-key">DeepSeek API Key <span>For DeepSeek research and environment planning; leave blank to keep the current key</span></label>
   <input id="settings-deepseek-key" type="password" placeholder="sk-…" autocomplete="new-password" spellcheck="false">
   <div class="settings-models">
    <div><label for="settings-research-model">Research and environment model</label><select id="settings-research-model" required>
     <optgroup label="OpenAI"><option value="gpt-6.1-sol">GPT-6.1 Sol · Balanced</option><option value="gpt-6.1-terra">GPT-6.1 Terra · Efficient</option><option value="gpt-6-astra">GPT-6 Astra · Deep research</option><option value="gpt-6-luna">GPT-6 Luna · Economical</option><option value="gpt-5.4">GPT-5.4</option><option value="gpt-5-mini">GPT-5 Mini</option><option value="gpt-4.1">GPT-4.1</option></optgroup><optgroup label="DeepSeek"><option value="deepseek-v4-pro">DeepSeek V4 Pro · Research</option><option value="deepseek-flash">DeepSeek Flash · Economical</option></optgroup>
    </select></div>
    <div><label for="settings-image-model">Image generation model</label><select id="settings-image-model" required>
     <option value="gpt-image-2">GPT Image 2</option><option value="gpt-image-2.5-flare">GPT Image 2.5 Flare</option><option value="gpt-image-2.5-sunburst">GPT Image 2.5 Sunburst</option><option value="gpt-image-2.6-flare">GPT Image 2.6 Flare</option><option value="gpt-image-2.6-sunburst">GPT Image 2.6 Sunburst</option>
    </select></div>
   </div>
   <button id="settings-save" type="submit">Save settings ↗</button><p id="settings-message" role="status" aria-live="polite"></p>
  </form>
  <div class="settings-help">
   <p>When DeepSeek is selected, research uses DeepSeek search and models, and habitat photos are analyzed with DeepSeek Flash. Its current models can read images but output only text. Photo color generation still requires an OpenAI API key. Field-of-view-only illustrations are processed locally.<a href="https://api-docs.deepseek.com/api/list-models/" target="_blank" rel="noopener noreferrer">Official model capabilities ↗</a></p>
   <p>Settings are saved locally in <code>see through your eyes atlas/.env</code> and apply immediately. Keys are used only by the backend and are never displayed. Saving settings makes no paid API calls; actual requests are billed to the provider account.<a href="https://api-docs.deepseek.com/guides/responses_api/" target="_blank" rel="noopener noreferrer">DeepSeek Official API ↗</a></p>
   <details class="settings-manual"><summary>Manual .env setup</summary><p>You can also copy <code>.env.example</code> to <code>.env</code>, then set:</p><pre>OPENAI_API_KEY=YOUR_OPENAI_KEY\nDEEPSEEK_API_KEY=YOUR_DEEPSEEK_KEY\nRESEARCH_MODEL=deepseek-v4-pro\nOPENAI_IMAGE_MODEL=gpt-image-2</pre><p>After editing the file, restart <code>npm start</code> and refresh the page.</p></details>
  </div>
 </dialog>`;
 document.body.insertAdjacentHTML('beforeend',markup);
 const byId=id=>document.getElementById(id),modal=byId('settings-dialog'),form=byId('settings-form'),key=byId('settings-key'),deepseekKey=byId('settings-deepseek-key'),research=byId('settings-research-model'),image=byId('settings-image-model'),message=byId('settings-message'),save=byId('settings-save');
 function choose(select,value){if(!value)return;if(![...select.options].some(option=>option.value===value)){const option=new Option(value,value);select.add(option);}select.value=value;}
 async function open(){if(!modal.open)modal.showModal();message.textContent='Loading local configuration…';save.disabled=true;
  try{const config=await window.ApiClient.request('/api/status');choose(research,config.researchModel);choose(image,config.imageModel);message.textContent=config.aiConfigured?'An API key is configured for the selected research model. Enter a new key to update it.':'No API key is configured for the selected research model.';save.disabled=false;}
  catch(error){message.textContent=error.message;}
 }
 byId('settings-button')?.addEventListener('click',open);
 byId('settings-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('close',()=>{key.value='';deepseekKey.value='';});
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;message.textContent='Saving local configuration…';
  const input={researchModel:research.value,imageModel:image.value};if(key.value.trim())input.apiKey=key.value.trim();if(deepseekKey.value.trim())input.deepseekApiKey=deepseekKey.value.trim();
  try{const config=await window.ApiClient.request('/api/settings',{method:'POST',body:JSON.stringify(input)});key.value='';deepseekKey.value='';message.textContent=config.aiConfigured?'Settings saved. The selected model will be used for your next request.':'Settings saved. The selected research model still needs its API key.';window.dispatchEvent(new CustomEvent('service-settings-saved',{detail:config}));}
  catch(error){message.textContent=error.message;}
  finally{save.disabled=false;}
 });
 window.ServiceSettings={open};
})();
