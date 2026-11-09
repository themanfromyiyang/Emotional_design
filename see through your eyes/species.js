/* Each record separates measured evidence, proxy evidence, and image interpretation.
   Atlas positions: human = top-left, bee = top-right, dog = bottom-left, swan = bottom-right. */
window.SPECIES = [
  {
    id:'human', name:'人类', latin:'Homo sapiens', number:'00', position:'0% 0%',
    icon:'<path d="M13 34v-5c0-3 3-5 7-5s7 2 7 5v5M20 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/><path d="M5 20h5M30 20h5"/>',
    title:'从熟悉的世界出发。', description:'先记住花朵、树影与水面的颜色。人的画面是这次观察的参照；换一种生命，看看哪些差异开始浮现。',
    level:'基准画面', kind:'人类参照 / 生成场景',
    finding:'本图使用普通 RGB 屏幕呈现的自然色彩，作为视觉对照的参照。它是一幅生成的风景，不是对真实公园的测量。',
    interpretation:'在所有视角中保留池塘、柳树、小径与花丛的整体构图。人类画面不进行动物视觉解释。',
    limit:'这一基准不代表每个人的色觉都相同，也不包含真实场景的光谱信息。',
    sources:[]
  },
  {
    id:'bee', name:'西方蜜蜂', latin:'Apis mellifera', number:'01', position:'100% 0%',
    icon:'<ellipse cx="20" cy="23" rx="6" ry="10"/><path d="M15 19h10M14 24h12M16 29h8M17 13l-4-5M23 13l4-5M14 21C0 19 5 5 13 13l5 5M26 21C40 19 35 5 27 13l-5 5M14 25l-6 5M26 25l6 5"/>',
    title:'花朵，还有另一种语言。', description:'蜜蜂的色觉涉及紫外、蓝与绿敏感受体。这里用假色表达不同的光谱线索，让熟悉的花丛变得陌生；紫色并不是“蜜蜂眼里的紫外线”。',
    level:'A · 本物种研究', kind:'假色示意 / 非真实色彩',
    finding:'西方蜜蜂的视觉系统具有紫外、蓝、绿三类光谱受体。2012 年的条件训练实验考察了蜜蜂在不同颜色刺激之间学习区分的能力。',
    interpretation:'生成图以紫蓝、浅蓝和灰绿组织画面，帮助读者注意“人类色彩并非唯一编码”。花心的深色图案只是紫外花纹概念的艺术表达。',
    limit:'未测量画中植物的物种与反射光谱，不能断言这些花具有图中所示的紫外纹路。未模拟复眼分辨率、偏振感知或闪烁融合频率。复眼不等于蜂窝状的重复画面。',
    sources:[{title:'Reser et al. (2012) · Honeybees (Apis mellifera) Learn Color Discriminations via Differential Conditioning Independent of Long Wavelength (Green) Photoreceptor Modulation',url:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0048577',type:'同行评议 · 行为实验'},{title:'Townson et al. (1998) · Honeybee Blue- and Ultraviolet-Sensitive Opsins',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6793122/',type:'同行评议 · 生理研究'}]
  },
  {
    id:'dog', name:'家犬', latin:'Canis lupus familiaris', number:'02', position:'0% 100%',
    icon:'<path d="M11 15 5 9 4 23l7-2M29 15l6-6 1 14-7-2M11 15q9-6 18 0v11q-9 13-18 0ZM17 26h6l-3 4ZM20 30v4M15 20h1M24 20h1"/>',
    title:'少一些红绿，不少一个世界。', description:'犬的行为实验支持二色视觉。黄与蓝是这幅示意的主要线索，红花和绿叶之间的区别被减弱；这不意味着犬只看得到黑白。',
    level:'A · 本物种研究', kind:'二色视觉 / 艺术转译',
    finding:'Neitz、Geist 与 Jacobs（1989）使用颜色匹配和光谱敏感性行为测试，结果支持犬具有二色视觉。',
    interpretation:'GPT 生成图以蓝、黄、灰褐为主，降低红绿之间的视觉差别。保留人类基准的整体场景布局，便于观察颜色关系的变化。',
    limit:'这是定性解释，不是经过光谱输入与犬视锥模型校准的模拟。没有据此推断所有犬的视力、夜视能力或精确视野角度。',
    sources:[{title:'Neitz, Geist & Jacobs (1989) · Color vision in the dog',url:'https://doi.org/10.1017/S0952523800004430',type:'同行评议 · 行为实验'}]
  },
  {
    id:'swan', name:'小天鹅', latin:'Cygnus columbianus', number:'03', position:'100% 100%',
    icon:'<path d="M6 28q14 12 28-1l-13-2c-9-3 5-11 2-17-2-5-8-3-8 1 0 2 3 3 5 1M15 8l-5 3 6 1M10 25q5-5 10 0M6 35h28"/>',
    title:'视野，围绕生活展开。', description:'侧置的眼睛让我们注意身体两侧，前方则有双眼重叠区域。研究将雁鸭类的视野构型与取食方式联系起来；天鹅视角不只是从高空俯看。',
    level:'A · 视野研究', kind:'视野概念示意 / 非定量',
    finding:'Cantlay 等（2023）比较了 39 种雁鸭类的双眼视野构型，包含小天鹅。研究讨论取食生态与视野构型的关联；测量视野边界并不等于测量视觉敏锐度。',
    interpretation:'保留近自然色画面，用三段叠层提示侧向观看与前方双眼重叠。区域宽度仅为讲解排版，不表示视野角度，也没有把单张图片变成真实全景。',
    limit:'本版未获得可用于生成的小天鹅视锥光谱数据，因此不虚构天鹅的紫外色彩、不指定总视野角度、不模糊正前方。图像略冷的调色仅是生成风格，不是生理结论。',
    sources:[{title:'Cantlay et al. (2023) · Binocular vision and foraging in ducks, geese and swans (Anatidae)',url:'https://pubmed.ncbi.nlm.nih.gov/37670586/',type:'同行评议 · 39 种雁鸭类比较研究'}]
  },
  {
    id:'fox', name:'赤狐', latin:'Vulpes vulpes', number:'04', position:'0% 100%',
    icon:'<path d="M7 5l12 9 14-9-2 20-11 11L9 25ZM7 5l7 16M33 5l-7 16M10 24l10 7 10-7M14 22h2M24 22h2M18 30h4l-2 3Z"/>',
    title:'亲缘之外，让证据说话。', description:'赤狐也有直接的感光色素研究：实验发现两类视锥色素，与犬的结果相近。本版共用蓝黄示意，但相近的受体并不等于完全相同的感知。',
    level:'A · 本物种生理研究', kind:'二色视觉线索 / 共用示意',
    finding:'Jacobs 等（1993）用视网膜电图闪烁测光研究家犬、岛屿灰狐、赤狐与北极狐，发现这些受试犬科动物具有两类视锥色素。赤狐因此不必只依靠家犬的近亲推断。',
    interpretation:'基于相近的感光色素线索，赤狐暂与家犬共用蓝黄艺术示意。画面复用是一项展示选择，不代表两种动物的视觉完全相同。',
    limit:'生理测量不能单独复原主观颜色。此图不表达赤狐的准确色觉阈值、视觉敏锐度或暗光表现，也不把家犬的行为实验结果等同于赤狐的行为证据。',
    sources:[{title:'Jacobs, Deegan, Crognale & Fenwick (1993) · Photopigments of dogs and foxes and their implications for canid vision',url:'https://pubmed.ncbi.nlm.nih.gov/8424924/',type:'同行评议 · 包含赤狐的视网膜电图研究'}]
  }
];
