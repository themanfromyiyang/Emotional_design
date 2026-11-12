# 万物视野 · See Through Your Eyes

项目仅维护以下两套网页服务。整理日期：2026-11-12。

| 服务 | 入口 | 源码 |
| --- | --- | --- |
| 最新本地版 | http://127.0.0.1:5181/ | `see through your eyes atlas/` |
| 公共网页版 | https://themanfromyiyang.github.io/Emotional_design/ | `atlas-github-pages/site/` 前端 + `atlas-public-site/` Sites 服务 |

Sites 地址为 https://see-through-your-eyes-atlas-2026.fuzzyloom4.chatgpt.site/ ，同时提供网页和 AI API。GitHub Pages 前端调用该 API，因此两个公共目录均需保留。部署关联保存在 `atlas-public-site/.openai/hosting.json`；该目录有独立 Git 仓库。

## 启动本地版

从项目根目录执行：

```powershell
cd 'see through your eyes atlas'
npm install
npm start
```

研究页面为 http://127.0.0.1:5181/research.html 。`original.html` 是兼容旧链接的跳转入口，不是另一套版本。

## 公共版维护

GitHub Pages 前端位于 `atlas-github-pages/site/`，Sites 页面位于 `atlas-public-site/public/`，公开 API 位于 `atlas-public-site/app/api/`。修改时需同步相关文件；本地 Node 后端与公开 Worker 后端不能直接互相覆盖。

```powershell
cd atlas-github-pages
node check-pages.mjs
```

```powershell
cd atlas-public-site
node scripts/check-public.mjs
npm run build
npm start -- --port 5182
```

5182 仅用于公共版的本地验证，日常本地服务使用 5181。

## 整理记录

旧版 `see through your eyes/`（5180）和早期独立原型 `Through-Their-Eyes-Walking.html` 已移出项目，归档至同级目录 `../Emotional_design-retired-20261112/`。旧版 5180 服务已停止；历史提交仍可在根仓库查看。

设计文档、场景素材和参考文件已统一移至 `design/`，不作为独立网页服务维护。本次整理不修改线上部署。

## 文件夹导航

| 目录 | 用途 |
| --- | --- |
| `see through your eyes atlas/` | 本地网站源码、运行资源与测试 |
| `atlas-github-pages/` | GitHub Pages 前端及检查、发布准备脚本 |
| `atlas-public-site/` | 公共网站与 API，包含独立 Git 仓库及部署配置 |
| `design/vision/` | 设计简报与天鹅视觉说明（原 `vision/`） |
| `design/journey/` | 体验旅程分镜与生成提示词（原 `journey/`） |
| `design/Scene/` | 场景图片、环境贴图与 Figma 状态（原 `Scene/`） |
| `design/references/主界面参考/` | 主界面参考目录，目前为空 |
| `design/references/模拟环境参考/` | 模拟环境 HTML 参考资料 |

两个参考目录原位于 `see through your eyes atlas/`。网站运行所需的 `assets/`、`data/` 仍保留在源码目录中。

`.codex/`、`.idea/`、`.workbuddy/` 为工具配置；各项目的依赖、缓存和构建产物保留原位。整理仅移动设计资料，不删除文件，也不覆盖已有代码改动。
## 合并的 GitHub Pages 发布快照

根目录的 HTML、JavaScript、CSS、assets/ 与 vendor/ 来自 gh-pages 分支，作为发布快照保留。本地开发仍使用 see through your eyes atlas/。本次合并未改变线上部署来源。

公开网站：<https://themanfromyiyang.github.io/Emotional_design/>

GitHub Pages 托管地球探索与物种视觉研究前端。动物数据、视觉报告和模拟环境通过独立的公开 API 服务获取。地图及记录密度快照随前端发布。

访客在设置中填写自己的 OpenAI 或 DeepSeek API Key 后，可生成视觉报告；需要图像生成时须填写 OpenAI API Key。密钥只保存在当前浏览器标签页的 `sessionStorage` 中，并在对应生成请求中发送给 API 服务。网站源码和部署环境均不包含站长的密钥。
