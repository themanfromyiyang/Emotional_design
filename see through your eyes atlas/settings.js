(() => {
 'use strict';
 const markup=`<dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
  <div class="settings-heading"><div><p class="settings-eyebrow">LOCAL GENERATION SERVICE</p><h2 id="settings-title">连接生成服务</h2></div><button id="settings-close" type="button" aria-label="关闭配置">×</button></div>
  <p class="settings-intro">可选 OpenAI 或 DeepSeek 生成视觉报告与规划环境。照片的 AI 色彩生成仍使用 OpenAI 图像模型；两家密钥分别保存在本机。</p>
  <form id="settings-form" autocomplete="off">
   <label for="settings-key">OpenAI API Key <span>用于 GPT 研究和图像生成；留空则保留</span></label>
   <input id="settings-key" type="password" placeholder="sk-…" autocomplete="new-password" spellcheck="false">
   <label for="settings-deepseek-key">DeepSeek API Key <span>用于 DeepSeek 研究和环境规划；留空则保留</span></label>
   <input id="settings-deepseek-key" type="password" placeholder="sk-…" autocomplete="new-password" spellcheck="false">
   <div class="settings-models">
    <div><label for="settings-research-model">视觉研究与环境规划模型</label><select id="settings-research-model" required>
     <optgroup label="OpenAI"><option value="gpt-6.1-sol">GPT-6.1 Sol · 均衡</option><option value="gpt-6.1-terra">GPT-6.1 Terra · 高效</option><option value="gpt-6-astra">GPT-6 Astra · 深度研究</option><option value="gpt-6-luna">GPT-6 Luna · 经济</option><option value="gpt-5.4">GPT-5.4</option><option value="gpt-5-mini">GPT-5 Mini</option><option value="gpt-4.1">GPT-4.1</option></optgroup><optgroup label="DeepSeek"><option value="deepseek-v4-pro">DeepSeek V4 Pro · 研究</option><option value="deepseek-flash">DeepSeek Flash · 经济</option></optgroup>
    </select></div>
    <div><label for="settings-image-model">图像生成模型</label><select id="settings-image-model" required>
     <option value="gpt-image-2">GPT Image 2</option><option value="gpt-image-2.5-flare">GPT Image 2.5 Flare</option><option value="gpt-image-2.5-sunburst">GPT Image 2.5 Sunburst</option><option value="gpt-image-2.6-flare">GPT Image 2.6 Flare</option><option value="gpt-image-2.6-sunburst">GPT Image 2.6 Sunburst</option>
    </select></div>
   </div>
   <button id="settings-save" type="submit">保存设置 ↗</button><p id="settings-message" role="status" aria-live="polite"></p>
  </form>
  <div class="settings-help">
   <p>选择 DeepSeek 后，研究使用 DeepSeek 搜索与模型；环境照片由 DeepSeek Flash 分析。DeepSeek 当前模型能读入图片，但只输出文本，不能作为图片生成模型。点击“生成视觉模拟图”需要色彩生成时，仍需 OpenAI API Key。只有视角示意时会在本地处理图片。<a href="https://api-docs.deepseek.com/api/list-models/" target="_blank" rel="noopener noreferrer">查看官方模型能力 ↗</a></p>
   <p>设置保存在本机 <code>see through your eyes atlas/.env</code>，立即生效。密钥只供服务端使用，页面不会回显。保存设置不会调用付费接口，实际调用按对应账户计费。<a href="https://api-docs.deepseek.com/guides/responses_api/" target="_blank" rel="noopener noreferrer">DeepSeek 官方接口 ↗</a></p>
   <details class="settings-manual"><summary>手动配置 .env 的方法</summary><p>也可以在本项目目录复制 <code>.env.example</code> 为 <code>.env</code>，填写：</p><pre>OPENAI_API_KEY=你的_OpenAI_Key\nDEEPSEEK_API_KEY=你的_DeepSeek_Key\nRESEARCH_MODEL=deepseek-v4-pro\nOPENAI_IMAGE_MODEL=gpt-image-2</pre><p>手动修改文件后，重启 <code>npm start</code> 并刷新页面。</p></details>
  </div>
 </dialog>`;
 document.body.insertAdjacentHTML('beforeend',markup);
 const byId=id=>document.getElementById(id),modal=byId('settings-dialog'),form=byId('settings-form'),key=byId('settings-key'),deepseekKey=byId('settings-deepseek-key'),research=byId('settings-research-model'),image=byId('settings-image-model'),message=byId('settings-message'),save=byId('settings-save');
 function choose(select,value){if(!value)return;if(![...select.options].some(option=>option.value===value)){const option=new Option(value,value);select.add(option);}select.value=value;}
 async function open(){if(!modal.open)modal.showModal();message.textContent='正在读取本机配置…';save.disabled=true;
  try{const config=await window.ApiClient.request('/api/status');choose(research,config.researchModel);choose(image,config.imageModel);message.textContent=config.aiConfigured?'当前研究模型已配置密钥；填写新密钥可更新。':'当前研究模型尚未配置对应的 API Key。';save.disabled=false;}
  catch(error){message.textContent=error.message;}
 }
 byId('settings-button')?.addEventListener('click',open);
 byId('settings-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('close',()=>{key.value='';deepseekKey.value='';});
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;message.textContent='正在保存到本机…';
  const input={researchModel:research.value,imageModel:image.value};if(key.value.trim())input.apiKey=key.value.trim();if(deepseekKey.value.trim())input.deepseekApiKey=deepseekKey.value.trim();
  try{const config=await window.ApiClient.request('/api/settings',{method:'POST',body:JSON.stringify(input)});key.value='';deepseekKey.value='';message.textContent=config.aiConfigured?'设置已保存。新模型将在下一次研究或生成时使用。':'设置已保存；当前研究模型还需对应的 API Key。';window.dispatchEvent(new CustomEvent('service-settings-saved',{detail:config}));}
  catch(error){message.textContent=error.message;}
  finally{save.disabled=false;}
 });
 window.ServiceSettings={open};
})();
