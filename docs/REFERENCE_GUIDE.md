# 历史运行与 API 参考

> 从原 README 保留的详细说明。部分路径、端口与能力属于旧阶段。当前入口以 [LearnStep README](../README.md)、[当前状态](PROJECT_STATUS.md) 和 [脚本导航](../scripts/README.md) 为准。旧数据库、密钥、账号与模型没有随新项目复制。下方旧仓库 clone 地址是来源记录，不是 LearnStep 新仓库地址。

## 现在能做什么

| 能力 | 当前实现 | 入口 |
|---|---|---|
| 本地账号 | username 注册/登录、密码哈希、数据库会话、用户数据隔离 | `/login`、`/api/auth/*` |
| 今日昼夜工作台 | 白天看今日任务和随手一记，晚上看完成情况并进行三问收束 | 首页 |
| 学习闭环 | 目标能力拆解 → 可选初始诊断 → 首课 → 导师形成性评测 → 原子更新掌握度/任务 → 按需生成下一课 | `/api/diagnostics`、`/api/learning-program`、课程页 |
| AI 学习程序 | 保存完整路线但逐节生成内容；每节包含导师讲解、练习、交付物和 3 道巩固题，合格后才解锁并生成下一节 | `/api/learning-program`、`POST /api/tasks`、课程页 |
| 目标与计划 | 创建长期目标时必选三档基础；未完成诊断可从目标卡片继续；支持本周/长期视图、任务时间线和目标拆解 | `/api/goals`、`/api/learning-program`、计划页 |
| 个人资料库 | 粘贴文本或上传 TXT/PDF/DOCX，服务端提取纯文本、确定性分块并建立 FTS5 索引；扫描 PDF 会明确提示需要 OCR | `/api/knowledge-sources`、计划页“个人资料库” |
| 成长记录 | 学习记录、连续有效行动、XP 与 Coin 流水持久化 | `/api/activity-logs`、记录页/成长页 |
| 晚间回顾 | 统一总结当天记录，并依次追问最重要行动、真正理解和明日一步 | 首页晚报入口、Agent `review` 意图 |
| 微信入口 | 微信公众号首次验证、明文 XML 文本回调、签名校验、LLM 超时回退 | `/api/wechat` |
| Android App | 独立移动壳 v4；首页一屏 AI 会面，不堆功能、不产生首页纵向滚动 | `android/`、APK |
| 可复现调试 | doctor、build、install、run、smoke、logs；面向人和 AI | `scripts/debug-apk.ps1` |

## 产品形态

今日页按时间自动收纳内容。白天只显示今天要做的事和“随手一记”按钮；点击任务进入对应课程。晚上显示同款完成情况卡片和三问每日收束，不再同时堆叠白天与晚上的全部模块。

桌面端使用“导航栏 + 主内容”两栏结构，计划、课程、记录、成长保持独立入口，并且每页只保留顶部的一层大标题。计划页把本周任务和长期任务分开显示，创建目标时一并收集课程编排信息；课程页只负责学习和评测，不再重复创建目标。记录页默认展开今天并折叠更早记录；成长页只展示可验证的行动、投入和掌握证据。

个人资料库已经形成上传、解析、版本、分块、Embedding、目标范围和可审计检索底座。启用 workflow service 后，课程生成前会建立 RetrievalRun 并处理资料不足分支；但 EvidenceBundle 尚未传入 Tutor 的教学内容 Prompt，也没有块级引用门禁，因此现有课程仍不能标记为 `grounded`。RAG 保持为 Agent 可调用 Tool，不新增“RAG Agent”。

当用户有一个明确学习目标时，可从“课程”工作台（手机端位于“路线”的二级入口）进入 AI 学习程序。它不是一张静态课表：先由模型为主题编排教学骨架，再补成可执行的章节内容；每节都可向 AI 讲师追问、完成开放题并得到逐题反馈。课程正文、参考答案和每次评测记录都保存在服务端数据库，浏览器只缓存当前课程 ID，因此清空缓存或换设备重新登录后仍能继续学习；但它还不是多端实时同步或正式学习档案。

```mermaid
flowchart LR
  User[用户] --> Home[今日首页 / 微信对话]
  Home --> Agent[/api/agent]
  Agent --> Parse[规则解析与会话状态]
  Agent --> Model[可选 OpenAI-compatible LLM]
  Home --> Quiz[/api/quiz]
  Quiz --> Model
  Home --> Course[/api/learning-program]
  Course --> Model
  WeChat[微信公众号] --> WechatAPI[/api/wechat]
  WechatAPI --> Agent
  Home --> Demo[/api/demo]
  Demo --> Seed[确定性 demo 数据]
```

## 快速开始

### 环境要求

- Node.js 22 或更高版本（Android WebView CDP smoke 需要 Node 22 的 `WebSocket` 全局对象）
- npm
- Windows PowerShell（Android 电脑模拟器脚本按 Windows 环境编写）
- Android 调试需要本机 Android SDK、AVD 和 Java 21；详见 [Android 构建说明](../docs/ANDROID_BUILD.md)

### 本地 Web

```powershell
git clone https://github.com/redmaplewww/growth-loop-agent.git
Set-Location growth-loop-agent
npm.cmd install
Copy-Item -LiteralPath .env.example -Destination .env.local
npm.cmd run dev
```

打开 [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login)，先创建本地账号。默认 `LLM_PROVIDER=demo`，不需要 API Key；新账号会初始化一个入门目标和三项入门行动。生产式本地回归可以使用：

```powershell
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3000
```

网页必须通过 Next.js 服务访问，不能直接双击 HTML 或部署到纯静态托管。第一次在另一台电脑配置服务，请先看 [网页服务配置手册](../docs/WEB_SERVICE_SETUP.md)。

### 可选：启用成熟 RAG ingestion

默认不启动 Python 服务，资料仍走现有 TypeScript 回退，不影响网页运行。需要 LlamaIndex 分块时另开一个终端：

```powershell
Set-Location services\rag_ingestion
uv sync --extra dev --python D:\Python3.12\python.exe
.\.venv\Scripts\python.exe -m uvicorn growth_loop_rag.main:app --host 127.0.0.1 --port 8010
```

然后在根目录 `.env.local` 设置 `RAG_INGESTION_URL=http://127.0.0.1:8010` 并重启 Next.js。TXT/粘贴文本会直接采用 LlamaIndex；PDF/DOCX 还需要按 [ingestion 服务说明](../services/rag_ingestion/README.md) 单独运行官方 MinerU API，并在 Python 服务进程中设置 `MINERU_API_URL`。完整 MinerU 模型不会随 `uv sync` 下载。

### 可选：启用本地 Embedding 与资料级语义检索

先确认 BGE 与 Qwen 模型位于 `.env.example` 所示目录，然后另开一个终端启动服务：

```powershell
npm run embedding:service
```

Next.js 使用 `.env.local` 中的 `EMBEDDING_SERVICE_URL=http://127.0.0.1:8020` 调用该服务；修改环境变量后必须重启 Next.js。当前尚未增加资料库 UI 按钮，可通过资料级 API 或下面的真实冒烟脚本生成并查询当前 active ChunkSet：

```powershell
npm run embedding:smoke -- --model bge-m3 --query "这份资料主要讲了什么？"
npm run embedding:smoke -- --model qwen3-embedding-0.6b --query "这份资料主要讲了什么？"
```

脚本默认选择最近更新且已就绪的资料；可额外传入 `--source <sourceId>`。第一次运行会生成向量，重复运行会按模型输入哈希复用已有向量。

### 可选：启用可恢复课程工作流

默认不启动 Python 编排服务，Next.js 会继续执行现有 TypeScript 流程。需要验证 LangGraph checkpoint/interrupt 时另开终端：

```powershell
Set-Location services\workflow
uv sync --extra dev --python D:\Python3.12\python.exe
Set-Location ..\..
npm run workflow:service
```

然后在 `.env.local` 设置 `WORKFLOW_SERVICE_URL=http://127.0.0.1:8030`，并为 Next.js 与 workflow service 配置相同的 `WORKFLOW_SERVICE_TOKEN` 后重启两者。阶段 D 的来源课程接线完成前，`WORKFLOW_REQUIRE_SOURCES=false` 保留非 grounded 课程兼容路径；设为 `true` 时资料不足会中断并等待用户补充。详细变量、Pydantic AI 可选配置和边界见 [workflow service 说明](../services/workflow/README.md)。

### 检查项目

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
# 有受管 LLM 配置时，实际生成一门 Agent 课程并完成讲师追问、课后评分
npm.cmd run learning:smoke -- --require-llm
```

## 配置 LLM

服务端通过 OpenAI-compatible `/chat/completions` 调用模型。没有完整配置时，Agent 和测验会自动回退到本地规则，不会因为模型不可用阻塞页面或微信文本回复。

复制 `.env.example` 为 `.env.local` 后，按实际供应商填写以下变量：

```dotenv
LLM_PROVIDER=demo
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
```

也支持按 provider 读取对应变量，例如 `DEEPSEEK_BASE_URL`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`，以及 `OPENAI_*`、`GLM_*`。密钥只放在本机环境变量、部署平台 Secret 或受管配置工具中，不能提交到 GitHub。

服务状态：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/agent
```

返回值只包含模式、供应商和是否配置 endpoint/model 等非敏感状态，不返回 API Key。

## API 速查

### 账号与用户数据

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/register` | 使用 username、password 和可选 displayName 创建账号 |
| `POST` | `/api/auth/login` | 使用 username 和 password 登录 |
| `POST` | `/api/auth/logout` | 删除当前数据库会话并清除 Cookie |
| `GET` | `/api/auth/me` | 获取当前登录用户的非敏感信息 |
| `GET` | `/api/dashboard` | 获取当前用户的目标、任务、记录、积分和统计 |
| `POST` | `/api/goals` | 创建当前用户的长期目标；接收 `title`、`description`、可选 `targetDate`（`YYYY-MM-DD`，须为将来日期）、`weeklyHours`（1–40）、`background` 和 `selfLevel`，同事务写入 `goals` 与 `goal_learning_profiles` |
| `POST` | `/api/tasks` | 创建当前用户任务；传 `lessonId` 时按课程章节建任务并写入 `task_lesson_links` |
| `PATCH` | `/api/tasks/[id]` | 切换当前用户所属任务的完成状态 |
| `POST` | `/api/activity-logs` | 调用 Agent 整理输入，并保存行动记录和奖励流水 |

SQLite 默认保存在 `data/growth-loop.sqlite`。可通过 `.env.local` 中的 `SQLITE_DATABASE_PATH` 修改位置。数据库文件、WAL 和 SHM 文件均已加入 Git 忽略。

### Agent 对话

```powershell
$body = @{
  message = '今天学习了 Agent 的工具调用，终于理解它和普通聊天的区别'
  conversationId = 'demo-user'
  context = '当前路线：学习 Agent 并开发自己的 Agent'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:3000/api/agent `
  -ContentType 'application/json' `
  -Body $body
```

`POST /api/agent` 接收 `message`（必填）、`conversationId`、`output`、`context`。返回 `reply`、`intent`、`extracted`、`mode`、`provider` 和 `replySource`。`GET /api/agent` 返回当前非敏感配置状态。

### 理解测验

生成题目：

```powershell
$body = @{
  action = 'generate'
  topic = 'Agent 工具调用'
  content = 'Agent 会先理解目标，再选择工具并根据结果继续行动。'
  output = '我理解了工具调用是让模型连接外部能力的桥梁。'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/quiz -ContentType 'application/json' -Body $body
```

评分时提交 `action=grade`、原题目、学习底稿和 `answers`。如果模型已配置，返回 `gradedBy=llm`；否则返回 `gradedBy=rules`，并明确给出回看建议。

### AI 学习程序

课程状态：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/learning-program
```

生成课程、AI 讲师追问和课后评分都通过同一条 API 的 `generate`、`tutor`、`grade` 动作完成，三者都需要登录：`generate` 只接收 `goalId`，`tutor` 和 `grade` 只接收 `programId + lessonId`，请求体中不出现课程正文。登录后可用 `GET /api/learning-program?program=current` 读回当前课程。默认的 Agent 示例会生成 5 节课程，每节含讲解、练习、交付物和 3 道开放题。完整调用契约、回退语义与实际 LLM 回归命令见 [AI 学习程序说明](../docs/LEARNING_PROGRAM.md)。

### Demo 数据

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/demo
```

该接口继续提供确定性 seed，主要用于无账号 demo 和原型验收。登录后的工作台数据以 `/api/dashboard` 和 SQLite 为准，不再把 `/api/demo` 当作真实用户数据层。

## 微信公众号接入

当前实现的是“服务端回调 + 明文文本模式”，不是小程序登录或微信支付。配置步骤：

1. 准备公网 HTTPS 域名和可访问的 Next.js 部署。
2. 在部署 Secret 中配置 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`、`WECHAT_TOKEN`。
3. 微信公众平台服务器地址填写 `https://你的域名/api/wechat`。
4. 选择明文模式，完成首次 GET 签名验证。
5. 用文本消息 POST 回归；模型超时会自动使用本地回退话术。

详细签名规则、XML 字段、状态接口和当前边界见 [微信公众号接入说明](../docs/WECHAT_INTEGRATION.md)。当前 MVP 未启用安全模式/兼容模式的密文解密，正式上线前必须补齐加密回调、重放保护、限流和生产监控。

## Android APK

当前仓库已包含 Android 工程和 debug APK：

- 工程：[android/](../android/)
- APK：历史输出位置为 `artifacts/android/growth-loop-debug.apk`；LearnStep 不携带旧 APK，需要按 Android 构建说明重新生成。
- 电脑浏览器：`http://127.0.0.1:3000/`
- Android Emulator：`http://10.0.2.2:3000/`

启动本地服务后，在项目根目录执行：

```powershell
npm.cmd run android:debug   # build + sync + Gradle + install + launch
npm.cmd run android:run     # 使用现有 APK 安装并启动
npm.cmd run android:status
npm.cmd run android:stop
```

面向 AI 的完整调试顺序：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/debug-apk.ps1 -Action doctor
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/debug-apk.ps1 -Action run -Build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/debug-apk.ps1 -Action smoke
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/debug-apk.ps1 -Action logs
```

详见 [Android APK 调试手册](../docs/ANDROID_APK_DEBUG_AI.md) 和 [Android 移动端产品设计](../docs/ANDROID_MOBILE_PRODUCT_DESIGN.md)。APK 是 debug 签名，并默认从电脑模拟器读取远程 Next.js 服务；正式发布还需要 HTTPS、release keystore、AAB、真机回归和隐私合规。

## 文档地图

| 文档 | 内容 |
|---|---|
| [项目亮点与量化记录](../项目亮点.MD) | 当前可证明成果、后续差异化能力、量化指标与简历表述账本 |
| [开发者与 AI 手册](../docs/DEVELOPER_HANDBOOK.md) | 从 clone、配置、开发、测试到发布的完整交接手册 |
| [网页服务配置](../docs/WEB_SERVICE_SETUP.md) | 从干净 clone、环境变量到 Web/Node 服务验收；解释静态托管、API 和 Android 地址边界 |
| [公网 Demo 部署](../docs/DEMO_DEPLOYMENT.md) | Zeabur GitHub 部署、SQLite 持久化、LLM Secret、验收步骤与邀请测试边界 |
| [AI 学习程序](../docs/LEARNING_PROGRAM.md) | 通用课程编排、AI 讲师、课后评分、API 契约与 LLM smoke |
| [V1 实施方案](../docs/IMPLEMENTATION_PLAN_V1.md) | 教学质量优先总路线、可信来源、框架迁移与正式考核的版本边界 |
| [V0.4.2 实施方案](../docs/IMPLEMENTATION_PLAN_V042.md) | 诊断证据驱动的最小学习闭环：能力拆解、初始诊断、按需生成课程、盲评与掌握度回边 |
| [V0.4.3 实施方案](../docs/IMPLEMENTATION_PLAN_V043.md) | 结构化课程内容引擎、教学质量门禁、题目追溯，以及基础课件阅读器与待完成交互边界 |
| [V0.4.4 实施方案](../docs/IMPLEMENTATION_PLAN_V044.md) | 私有资料导入、Schema V8-V10、结构化父子切片、文本向量检索、可恢复课程编排、块级/题目级来源快照与 RAG 验收标准 |
| [资料驱动教学闭环子方案](../docs/IMPLEMENTATION_PLAN_V044_GROUNDED_TEACHING.md) | 目标资料绑定、本地 Agentic RAG Tool、LangGraph/Pydantic AI 最小主图、证据课程、来源题目、固定评分和联网资料补充的直接实施顺序 |
| [RAG 总体架构](../docs/RAG.MD) | 上传、链接、联网搜索、结构解析、父子切片、不可变 ChunkSet、检索快照与教学证据的统一关系 |
| [Agent 角色与信息边界](../docs/AGENT_ROLES.md) | 规划员/导师/考官/复盘员的职责、能看到什么、输出契约与复用矩阵 |
| [产品设计方案](../docs/PRODUCT_DESIGN_V1.md) | 产品目标、用户闭环、Agent、游戏化和微信路线 |
| [微信公众号接入](../docs/WECHAT_INTEGRATION.md) | 微信服务器配置、签名校验和文本回调 |
| [Android 构建](../docs/ANDROID_BUILD.md) | SDK、AVD、Capacitor 和 Android Studio |
| [Android APK 调试](../docs/ANDROID_APK_DEBUG_AI.md) | doctor/build/install/run/smoke/logs 调试链路 |
| [移动端产品设计](../docs/ANDROID_MOBILE_PRODUCT_DESIGN.md) | 一屏 AI 首页、底部导航和移动交互约束 |
| [.project-to-act](../.project-to-act/PROJECT_OVERVIEW.md) | 项目目标、范围、进度、版本和验收证据 |

## 数据、安全与发布边界

- 已有 SQLite 数据库和基于 Session 的本地多用户隔离；当前仍没有后台定时任务、数据导出、忘记密码或管理员系统。
- 用户资料原文件 BLOB、抽取文本和索引元数据保存在同一个 SQLite 数据库；公开 API 不接收客户端 `userId` 或文件路径。当前尚未实现资料导出、恢复和配额管理，部署时必须使用持久化卷并备份数据库。
- 密码字段保存在 `users.password_hash`，使用 scrypt 加盐处理；任何代码和文档都不得记录用户明文密码。
- `action_streak_days` 表示连续产生有效行动记录的天数，不是单纯点击按钮的签到天数。
- `goals.progress_percent` 已持久化；LLM 自动调整进度仍需增加服务端范围、证据和变化幅度校验。
- LLM 只负责理解、建议、出题和评分；任务、XP、积分等写操作应继续由规则和受控服务端处理。
- 不要提交 `.env.local`、API Key、微信 Token、`android/local.properties`、Android build 目录、模拟器镜像或本机 SDK 路径。
- 微信回调当前只支持明文文本；不要在未补齐加密、重放保护、限流和审计前接收生产敏感消息。
- 仓库目前没有单独的开源许可证文件；如需对外允许复用，请先补充许可证和第三方依赖声明。

## 常见问题

| 现象 | 处理 |
|---|---|
| 电脑能打开，APK 打不开 | 确认 Next 服务监听 `127.0.0.1:3000`，APK 使用的是 `10.0.2.2:3000`；先跑 `doctor` |
| 页面显示旧版本 | 重启 `next start` 或重新执行 `npm.cmd run dev`，再重新打开 APK；当前 APK 默认加载远程页面 |
| `smoke` 找不到页面 | 确认应用已启动、ADB 设备为 `device`，然后重新执行 `run` 再 `smoke` |
| LLM 没有返回 | 查看 `/api/agent` 状态和环境变量；没有完整配置时预期会走 demo/rules 回退 |
| 微信首次验证失败 | 检查公网 HTTPS、`WECHAT_TOKEN`、服务器 URL 和服务器时间；不要把 token 写进源码 |
| Android ADB `offline` | `npm.cmd run android:stop` 后重新 `npm.cmd run android:debug`，必要时重启 adb server |

## 贡献与提交

1. 从 `main` 创建短分支，修改前先阅读 `AGENTS.md` 和相关 `.project-to-act` 文档。
2. 只提交本次任务范围内的文件，避免把密钥、构建产物和模拟器缓存带入提交。
3. 至少运行 `typecheck`、`lint`、`build`；涉及 Android 时再运行 `android:debug`、`doctor`、`smoke`、`logs`。
4. 每次功能、接口、数据库结构或运行方式发生变化，都要在 README 的“变更记录”中标注 `新增`、`修改`、`修复` 或 `暂未实现`。
5. 提交信息说明意图，PR 描述列出变更、验证命令和已知边界。

## 当前版本

`0.2.0-prototype` · Android 移动壳 v4 · 已加入本地 SQLite、username 账号、数据库 Session 与首批用户数据持久化。生产级数据库、后台调度、微信加密模式、release 签名和真实用户验收属于后续版本范围。
