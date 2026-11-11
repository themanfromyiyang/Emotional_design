(() => {
 'use strict';
 const markup=`<dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
  <div class="settings-heading"><div><p class="settings-eyebrow">LOCAL GENERATION SERVICE</p><h2 id="settings-title">连接生成服务</h2></div><button id="settings-close" type="button" aria-label="关闭配置">×</button></div>
  <p class="settings-intro">动物数据库与论文检索无需 API Key。视觉说明和图像生成使用你自己的 OpenAI API 账户；可在这里填写密钥并选择模型。</p>
  <form id="settings-form" autocomplete="off">
   <label for="settings-key">OpenAI API Key <span>留空则保留现有密钥</span></label>
   <input id="settings-key" type="password" placeholder="sk-…" autocomplete="new-password" spellcheck="false">
   <div class="settings-models">
    <div><label for="settings-research-model">视觉研究模型</label><select id="settings-research-model" required>
     <option value="gpt-6.1-sol">GPT-6.1 Sol · 均衡</option><option value="gpt-6.1-terra">GPT-6.1 Terra · 高效</option><option value="gpt-6-astra">GPT-6 Astra · 深度研究</option><option value="gpt-6-luna">GPT-6 Luna · 经济</option><option value="gpt-5.4">GPT-5.4</option><option value="gpt-5-mini">GPT-5 Mini</option><option value="gpt-4.1">GPT-4.1</option>
    </select></div>
    <div><label for="settings-image-model">图像生成模型</label><select id="settings-image-model" required>
     <option value="gpt-image-2">GPT Image 2</option><option value="gpt-image-2.5-flare">GPT Image 2.5 Flare</option><option value="gpt-image-2.5-sunburst">GPT Image 2.5 Sunburst</option><option value="gpt-image-2.6-flare">GPT Image 2.6 Flare</option><option value="gpt-image-2.6-sunburst">GPT Image 2.6 Sunburst</option>
    </select></div>
   </div>
   <button id="settings-save" type="submit">保存设置 ↗</button><p id="settings-message" role="status" aria-live="polite"></p>
  </form>
  <div class="settings-help">
   <p>选择动物后，点击“生成视觉说明”才会检索论文并请求生成说明；有色彩模拟时，点击“生成视觉模拟图”才会将图片发送给 OpenAI。只有视角示意时会在本地处理图片。没有密钥时仍可搜索动物并在本地预览图片。</p>
   <p>表单会把设置保存到本机 <code>see through your eyes atlas/.env</code>，立即生效。密钥只供服务端使用，页面不会回显；请勿写进网页源码或发到聊天中。保存设置不会调用付费接口，实际 API 调用按你的账户计费；模型权限在首次调用时验证。<a href="https://developers.openai.com/api/docs/models" target="_blank" rel="noopener noreferrer">查看官方模型目录 ↗</a></p>
   <details class="settings-manual"><summary>手动配置 .env 的方法</summary><p>也可以在本项目目录复制 <code>.env.example</code> 为 <code>.env</code>，填写：</p><pre>OPENAI_API_KEY=你的_API_Key\nOPENAI_RESEARCH_MODEL=gpt-6.1-sol\nOPENAI_IMAGE_MODEL=gpt-image-2</pre><p>手动修改文件后，重启 <code>npm start</code> 并刷新页面。</p></details>
  </div>
 </dialog>`;
 document.body.insertAdjacentHTML('beforeend',markup);
 const byId=id=>document.getElementById(id),modal=byId('settings-dialog'),form=byId('settings-form'),key=byId('settings-key'),research=byId('settings-research-model'),image=byId('settings-image-model'),message=byId('settings-message'),save=byId('settings-save');
 function choose(select,value){if(!value)return;if(![...select.options].some(option=>option.value===value)){const option=new Option(value,value);select.add(option);}select.value=value;}
 async function open(){if(!modal.open)modal.showModal();message.textContent='正在读取本机配置…';save.disabled=true;
  try{const config=await window.ApiClient.request('/api/status');choose(research,config.researchModel);choose(image,config.imageModel);message.textContent=config.aiConfigured?'已配置 API Key；填写新密钥可更新。':'尚未配置 API Key；可以先选择模型。';save.disabled=false;}
  catch(error){message.textContent=error.message;}
 }
 byId('settings-button')?.addEventListener('click',open);
 byId('settings-close').addEventListener('click',()=>modal.close());
 modal.addEventListener('close',()=>{key.value='';});
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;message.textContent='正在保存到本机…';
  const input={researchModel:research.value,imageModel:image.value};if(key.value.trim())input.apiKey=key.value.trim();
  try{const config=await window.ApiClient.request('/api/settings',{method:'POST',body:JSON.stringify(input)});key.value='';message.textContent=config.aiConfigured?'设置已保存。新模型将在下一次研究或生成时使用。':'模型设置已保存；填写 API Key 后可使用生成服务。';window.dispatchEvent(new CustomEvent('service-settings-saved',{detail:config}));}
  catch(error){message.textContent=error.message;}
  finally{save.disabled=false;}
 });
 window.ServiceSettings={open};
})();
