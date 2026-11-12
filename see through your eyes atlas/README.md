# 万物视野 · See Through Your Eyes

从地球上的地点出发，寻找附近有公开观察记录的动物，再进入有文献来源的物种视觉研究。网站名称在首页、研究页和浏览器标题中统一为 **万物视野 · See Through Your Eyes**。

## 启动

需要 Node.js 22 或更新版本。3D 场景使用 Three.js，首次运行先安装依赖：

```powershell
cd 'C:\Users\student\RiderProjects\Emotional_design\see through your eyes atlas'
npm install
npm start
```

- 正式首页与地球探索：<http://127.0.0.1:5181/>
- 物种视觉研究：<http://127.0.0.1:5181/research.html>
- 旧地址 `original.html` 会保留查询参数和物种链接，转到研究页。

首页可以拖动地球、单击选点、输入经纬度、调整查询半径，并查看附近物种。换点后会根据随站点打包的 Natural Earth 聚落数据显示附近地名；偏远地点会显示与最近聚落的距离。首页搜索和附近物种卡片会打开研究页。手机屏幕将地球放在记录列表上方。

## 研究与模拟

附近记录来自 iNaturalist；地球上的记录密度快照来自 GBIF，陆地轮廓和聚落地名来自 [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)。地名表示最近的已收录聚落，并非坐标的精确行政地址。观察记录不是完整物种名录，数量也不是个体数量。只展示允许使用的 CC0、CC BY、CC BY-SA 照片，并保留署名。

选择物种后，网站先向 GPT 提问“这种动物眼中的世界是怎么样的？”，用网页搜索获取有来源的自然语言回答，再把回答整理为视觉特征、第一视角想象、模拟建议、栖息地和未知部分。报告标明真正研究的物种及近亲关系。报告生成时不会创建 3D 环境；仅在栖息地描述和视觉证据齐备时显示“根据栖息地描述生成环境”按钮。点击后才将描述整理为地形、植被、水域与配色参数，并即时创建可行走的程序化场景。单张照片可按报告制作保守模拟。

首页右上角可配置 OpenAI API Key 和模型名称；生成报告会调用两次 Responses API，点击生成环境会调用一次 Responses API 制定场景参数，照片色彩模拟会在用户点击时调用图像编辑 API。附近查询无需 Key。3D 环境可显示宽视野、保守色彩变化和有研究支持的横向清晰带示意。

## 验证

```powershell
npm run check
npm run test:atlas
```

`test:live` 会访问 iNaturalist 与 Europe PMC，不调用付费 OpenAI API。

## 主要文件

- `index.html` / `atlas.js` / `atlas.css`：正式首页与地球探索。
- `research.html` / `app.js` / `style.css`：物种研究、照片模拟与交互场景界面。
- `world-simulation.js`：程序化 3D 环境、视野和色彩呈现。
- `research.cjs`：GPT 提问、网页来源整理、结构化报告及图像编辑。
- `nearby.cjs`：附近记录查询、节流与缓存。
- `server.cjs`：只监听本机的 HTTP 服务和 API。


???????????? iNaturalist ????????????? Wikidata ?????P225??????????? Wikimedia Commons ???P18?????????????????????????????????????????????????????????????????? API Key???????????????????????

## 社区观察补充（本地版）

首页导航与地球探索上方提供「补充生物信息」入口。可填写物种、地点、日期、观察者身份、栖息地与生活习性，并附加图片、视频、音频。最多 6 个附件，单个 4 MB、合计 8 MB；支持预览、移除和失败后重试。

观察资料通过同源 `/api/community` 接口保存到 `data/community/`（已忽略 Git），附件随 JSON 记录保存。最近记录仅返回摘要。此版本用于本地资料收集，尚未提供公网社区、审核与 AI 参考检索；AIGC 作品分享、点赞与推荐未整合。

验证：`npm run test:community`。
