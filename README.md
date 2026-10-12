# LearnStep

基于 Agent 与 RAG 的个人自适应学习助手：从学习目标出发，经诊断、课程、答疑与考核，用答题证据推进下一步学习。

> 当前是原型源码整理版，不是生产 SaaS。由 Growth Loop 当前工作区整理而来，保留未提交功能；未携带用户数据、密钥、模型或旧 Git 历史。见 [来源说明](UPSTREAM.md)。

## 最近变更

**2026-09-29：** 建立独立项目，统一产品显示名称，分离默认数据库、会话及 Docker 项目名，整理文档与脚本入口。历史记录见 [CHANGELOG](CHANGELOG.md)，验证结果见 [当前状态](docs/PROJECT_STATUS.md)。

## 核心功能

- **目标与诊断**：拆分能力，通过逐题评分和规则调整诊断难度。
- **按需教学**：生成课程骨架，结合画像生成当前课节，支持课堂答疑。
- **考核闭环**：保存答案与题目快照，更新掌握度、完成任务并解锁下一课。
- **资料辅助**：目标级资料范围、RAGFlow 已绑定文档检索、引用快照与证据审核。
- **可靠性**：部分 LangGraph 流程恢复、业务动作复用、带 requestId 的评分请求幂等。

边界：旧上传/联网入库链路与 RAGFlow 并存；Pydantic AI 和 TypeScript 模型调用并存。checkpoint 不保证所有外部操作恰好一次，功能验收不等于真人教学效果验证。

## 项目入口

| 想做什么 | 阅读入口 |
| --- | --- |
| 理解目录与开发位置 | [项目导航](docs/README.md) |
| 查看当前能力和限制 | [当前状态](docs/PROJECT_STATUS.md) |
| 启动完整服务或运行测试 | [脚本分类](scripts/README.md) |
| 配置 RAGFlow | [部署说明](docs/RAGFLOW_DEPLOYMENT.md) |
| 上传 GitHub | [上传指南](docs/PUBLISHING.md) |
| 查 API、Android、微信的旧说明 | [详细参考](docs/REFERENCE_GUIDE.md) |

## 最小 Web 启动

要求 Node.js **22.x 或 24.x**、npm。此方式无需 Docker/Python，demo 可预览界面和示例交互，不表示真实模型教学已启用。

```powershell
npm ci
# 仅首次创建；已有 .env.local 时不要覆盖
Copy-Item -LiteralPath .env.example -Destination .env.local
npm run dev
```

打开 [本地登录页](http://127.0.0.1:3000/login)，建立新账号。默认 LLM_PROVIDER=demo，真实模型 Key 留空；默认数据库为 data/learnstep.sqlite，首次运行由应用建立。

真实课程、评分及资料处理需要相应模型和服务配置。Python 环境、模型文件及 RAGFlow 数据集需要另行准备，见 [服务配置](docs/README.md#服务配置)。

## 完整本机服务

Windows 保留三个入口：start-all.cmd、stop-all.cmd、restart-frontend.cmd。全量启动会检查并启动 Docker/RAGFlow、解析、编码、workflow 和前端，**不是零配置的一键安装器**。

统一启动前端默认 3011，单独 npm run dev 默认 3000。新 Compose 项目为 learnstep-ragflow，不接管旧项目数据卷；其余端口仍沿用原默认值。不要与原 Growth Loop 全栈同时启动，除非配置独立端口。部分启动器会复用已有健康服务，因此目录独立不代表所有服务端口独立。

## 目录结构

```text
LearnStep/
├─ app/                  页面、组件与 API
├─ lib/
│  ├─ agents/            规划、教学、考核角色与模型调用
│  ├─ learning-loop/     诊断与课程业务流程
│  ├─ learning-program/  内容契约、质量检查与草稿
│  ├─ knowledge/         解析、检索、证据审核与联网
│  ├─ workflow/          Python 工作流业务桥接
│  └─ db/                数据表、事务与持久化
├─ services/             workflow / rag_ingestion / embedding
├─ deploy/ragflow/       RAGFlow Docker 配置
├─ scripts/              测试、运维与维护脚本
├─ docs/                 导航、架构约束、历史设计
├─ android/              Capacitor Android 工程
├─ .env.example          无真实密钥的配置模板
├─ CHANGELOG.md          历史更新与验收
└─ UPSTREAM.md           来源与兼容说明
```

data/、.runtime/、.next/、node_modules/ 是本地运行目录，不随仓库分发。本次保留业务源码位置，避免破坏导入关系。

## 开发检查

```powershell
npm run typecheck
npm run lint
npm run verify:learning
npm run build
```

verify:learning 编排 21 个隔离/模拟套件。其他 smoke 脚本不一定没有副作用；真实模型及维护脚本见 [脚本导航](scripts/README.md)。

## 开发与来源

修改前阅读 [AGENTS.md](AGENTS.md)、[架构边界](docs/ARCHITECTURE_BOUNDARIES.md) 和 [角色契约](docs/AGENT_ROLES.md)。README 保留当前入口及最近变更，详细日志写入 CHANGELOG。实现状态以代码和对应验证为准，不能把计划当成完成。

当前未添加新的开源许可证；公开上传前按 [来源说明](UPSTREAM.md) 核实继承代码授权，不因更名抹去来源。
