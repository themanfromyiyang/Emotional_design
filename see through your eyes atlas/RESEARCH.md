# 按需研究与生成流程

2026-11-09：按用户最新要求，移除固定五个视角、旧四联画和蜜蜂静态资料模块，改为任意动物的在线检索流程。

## 数据路径

1. iNaturalist `/v1/taxa`：限定动物界、物种级别，按关键词、分类与页码查询；没有固定物种 ID 白名单。
2. `/v1/taxa/{id}`：读取确切学名、科属等祖先分类，验证所选记录属于动物。
3. Europe PMC `/webservices/rest/search`：分别以目标学名、属名、科名与视觉关键词查询标题／摘要；读取 core 元数据，按 DOI 或来源编号去重。
4. OpenAI Responses API：将上述真实获取的论文摘要交给 GPT，使用严格 JSON Schema 输出视觉说明、逐条证据、实测对象、近亲层级、引用和未知部分。
5. 服务端校验引用 ID 属于输入来源，且每条结论至少有摘要来源。无法证明论文本身或模型语义百分之百正确，因此 UI 明示候选与摘要边界。
6. OpenAI Images Edits：只将报告中证据层级最近的代表物种视觉约束发送给图像模型。模型结果仅作为整体色彩与对比参照，浏览器把变化施加到原图像素；额外生成的动物、图例或文字不会进入最终图片。

## 科学表达

本种 > 同属 > 同科。检索层级只是找资料的途径，不能直接用作证据等级。GPT 必须确认论文的研究对象与实验／综述性质，无法确认关系时不应使用。

不得将不相关研究、色素数量、热感受器或复眼形态直接编造成特定视觉画面。不得从 RGB 图像反推真实的紫外花纹或精确视野、分辨率。静态图无法表达的机制应只在说明中解释，不强行转为滤镜。

没有文献命中意味着“本次有限索引搜索没有找到”，不是“科学界没有研究”。检索失败、没有摘要、没有 API Key、模型拒绝或请求失败各自显式显示，均不填充预设动物说明。

## 验证与限制

帝王蝶端到端公开数据测试：本种 54 条、属 81 条、科 147 条命中，读取每层有限结果后得到 13 篇去重候选来源。数字为测试时快照，可能变化。没有把这些候选全部标为有效证据。

真实 GPT 调用需要用户自己的服务端 API Key。当前仅以 mock 验证请求结构、引用过滤、近亲代表选择、像素处理和缺少凭据时的流程，未做付费端到端调用。

## 官方接口依据

- iNaturalist：https://www.inaturalist.org/pages/api+recommended+practices
- Europe PMC：https://dev.europepmc.org/RestfulWebService
- Responses 结构化输出：https://developers.openai.com/api/docs/guides/structured-outputs
- 图像编辑接口：https://developers.openai.com/api/reference/resources/images/methods/edit
- 图像模型：https://developers.openai.com/api/docs/models/gpt-image-2

提示词、模型名与输入图片是实际请求的一部分。最终图像明确使用原图像素和模型输出的整体色彩统计进行处理，不直接展示模型重绘的画面。
