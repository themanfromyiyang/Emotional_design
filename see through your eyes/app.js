(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const species = window.SPECIES;
  let selected = species.find(item => item.id === location.hash.slice(1)) || species[1];
  let comparing = false;
  let restoreFocus = null;
  function renderList() {
    const query = $('search').value.trim().toLocaleLowerCase();
    const visible = species.filter(s => `${s.name} ${s.latin}`.toLocaleLowerCase().includes(query));
    $('species-list').replaceChildren(...visible.map(s => {
      const button = document.createElement('button');
      button.className = `species-button${s.id === selected.id ? ' selected' : ''}`;
      button.dataset.species = s.id;
      button.setAttribute('aria-pressed', String(s.id === selected.id));
      button.innerHTML = `<svg class="species-icon" viewBox="0 0 40 40" aria-hidden="true">${s.icon}</svg><span><strong>${s.name}</strong><small>${s.latin}</small></span><span class="arrow" aria-hidden="true">↗</span>`;
      button.addEventListener('click', () => select(s));
      return button;
    }));
    $('empty').hidden = visible.length !== 0;
  }
  function select(s) {
    const focusId = document.activeElement?.dataset?.species;
    selected = s;
    $('animal-layer').style.backgroundPosition = s.position;
    $('scene').setAttribute('aria-label', `${s.name}视角的池畔草地，GPT 生成的艺术示意`);
    $('scene-label').textContent = `${s.latin.toUpperCase()} · ${s.name}`;
    $('lens-number').textContent = `PERSPECTIVE ${s.number} / ${s.latin.toUpperCase()}`;
    $('lens-title').textContent = s.title;
    $('lens-description').textContent = s.description;
    $('evidence-badge').textContent = s.level;
    $('view-kind').textContent = s.kind;
    $('field-guide').hidden = s.id !== 'swan';
    $('compare').disabled = s.id === 'human';
    if (s.id === 'human') comparing = false;
    setMode(comparing);
    renderList();
    if (focusId) document.querySelector(`[data-species="${focusId}"]`)?.focus({preventScroll:true});
  }
  function updateSplit() {
    const n = Number($('divider').value);
    $('human-layer').style.clipPath = `inset(0 ${100-n}% 0 0)`;
    $('split-line').style.left = `${n}%`;
    $('divider-value').value = `${n}%`;
    $('divider').setAttribute('aria-valuetext', `人类画面 ${n}%，${selected.name}画面 ${100-n}%`);
    // Clip the conceptual field diagram to the animal side during comparison.
    $('field-guide').style.clipPath = comparing ? `inset(0 0 0 ${n}%)` : 'none';
  }
  function setMode(enabled) {
    comparing = enabled;
    ['human-layer','split-line','human-label','slider-wrap'].forEach(id => $(id).hidden = !enabled);
    $('single').classList.toggle('active', !enabled);
    $('compare').classList.toggle('active', enabled);
    $('single').setAttribute('aria-pressed', String(!enabled));
    $('compare').setAttribute('aria-pressed', String(enabled));
    updateSplit();
  }
  function openDialog(content) {
    restoreFocus = document.activeElement;
    $('dialog-content').innerHTML = content;
    $('evidence-dialog').showModal();
    $('evidence-dialog').scrollTop = 0;
    $('close-dialog').focus();
  }
  function evidence(s) {
    openDialog(`<h2 id="dialog-title">${s.name}：证据与边界</h2><p class="latin">${s.latin}</p><span class="evidence-badge">${s.level}</span><h3>研究告诉我们什么</h3><p>${s.finding}</p><h3>画面如何转译</h3><p>${s.interpretation}</p><h3>我们尚不能声称什么</h3><p class="limit">${s.limit}</p><h3>文献入口</h3>${s.sources.length ? s.sources.map(source => `<p class="source"><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title} ↗</a><br><small>${source.type}</small></p>`).join('') : '<p>人类图像仅作视觉参照，不作为生理研究材料。</p>'}`);
  }
  $('search').addEventListener('input', renderList);
  $('species-list').addEventListener('keydown', e => {
    if (!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)) return;
    const buttons = [...$('species-list').querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length-1 : (i + (['ArrowDown','ArrowRight'].includes(e.key) ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  });
  $('single').addEventListener('click', () => setMode(false));
  $('compare').addEventListener('click', () => setMode(true));
  $('divider').addEventListener('input', updateSplit);
  $('open-evidence').addEventListener('click', () => evidence(selected));
  $('show-fox').addEventListener('click', () => evidence(species.find(s => s.id === 'fox')));
  $('close-dialog').addEventListener('click', () => $('evidence-dialog').close());
  $('evidence-dialog').addEventListener('close', () => restoreFocus?.focus({preventScroll:true}));
  $('evidence-dialog').addEventListener('click', e => {
    const box = $('evidence-dialog').getBoundingClientRect();
    if (e.target === $('evidence-dialog') && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) $('evidence-dialog').close();
  });
  $('show-method').addEventListener('click', () => openDialog(`<h2 id="dialog-title">一个场景，多种解释。</h2><p>本版由 GPT 一次生成四联画：人类基准、蜜蜂假色、犬二色视觉示意，以及小天鹅的近自然色背景。赤狐依据相近的感光色素研究，共用犬的二色示意图。</p><h3>固定的场景</h3><p>池塘、柳树、弯曲小径与近处花丛。通过共用构图，让观看者可以对照同一位置的颜色关系。生成图之间仍有局部细节漂移，不构成像素级配准。</p><h3>研究 → 约束 → 生成</h3><p>从本物种的测量或行为实验提取线索；缺少资料时标注近亲与亲缘层级；将支持的差异写入提示词，保留未知内容，再由 GPT 生成艺术表达。</p><p class="limit">屏幕无法显示额外色维。没有多光谱输入、视锥响应建模和物种行为校验，因此这些图像不是科学校准后的视觉模拟器。</p><h3>当前版本的范围</h3><p>共 5 个条目、1 个场景。当前依据来自学术论文；尚未将纪录片片段作为证据。后续每个纪录片条目应记录片名、集数、时间码，并与原始研究交叉核对。</p>`));
  $('fullscreen').addEventListener('click', async () => {
    try { await $('scene-frame').requestFullscreen(); }
    catch { openDialog('<h2 id="dialog-title">展开画面</h2><p>当前浏览器不支持页面全屏。可以使用浏览器的全屏模式放大查看。</p>'); }
  });
  const img = new Image();
  img.onerror = () => {
    $('scene-label').textContent = '场景图片未能加载';
    $('scene').setAttribute('aria-label','场景图片未能加载，请确认 assets 文件夹完整');
    $('view-kind').textContent = '请确认 assets 文件夹完整';
  };
  img.src = 'assets/park-vision-atlas.png';
  select(selected);
})();
