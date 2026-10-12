# LearnStep 项目导航

更新：2026-09-29。从当前入口读起，再按功能找代码；不要把所有历史方案串行读完。

## 阅读顺序

1. [项目首页](../README.md)：功能、启动入口、目录结构。
2. [当前状态](PROJECT_STATUS.md)：实现范围和本次验证。
3. [架构边界](ARCHITECTURE_BOUNDARIES.md)、[角色契约](AGENT_ROLES.md)：后续修改应遵守的约束。
4. [脚本导航](../scripts/README.md)：选择合适的本地检查或维护入口。
5. [上传指南](PUBLISHING.md)：将新目录上传 GitHub。

## 按功能找代码

| 功能 | 入口 | 核心实现 |
| --- | --- | --- |
| 目标、课程准备 | app/api/goals/、app/api/learning-program/ | lib/learning-loop/service.ts |
| 自适应诊断 | app/api/diagnostics/ | lib/learning-loop/adaptive.ts、adaptive-diagnostic.ts |
| 导师与考官 | lib/agents/ | tutor.ts、examiner.ts、planner.ts、shared.ts |
| 成绩与任务联动 | API 的 grade 分支 | lib/db/programs.ts、course-tasks.ts |
| 评分请求幂等 | API 的 requestId 分支 | lib/db/grade-requests.ts |
| 课程质量 | lib/learning-program/ | quality.ts、grounding.ts |
| 资料上传与范围 | app/api/knowledge-sources/、app/api/goals/[id]/sources/ | lib/knowledge/、lib/db/goal-sources.ts |
| RAG 检索 | lib/knowledge/search-tool.ts | lib/db/retrieval.ts、lib/knowledge/ragflow-client.ts |
| 证据审核与缺口补充 | lib/knowledge/resolve-knowledge.ts | knowledge-gate.ts、evidence-review.ts |
| 可恢复流程 | lib/workflow/ | services/workflow/growth_loop_workflow/ |
| 用户与持久化 | lib/auth/、lib/db/ | schema.ts、index.ts、session.ts |
| 主界面与课堂 | app/ | dashboard-client.tsx、learning-studio.tsx、question-text.tsx |

lib/agent/ 是早期通用对话/复盘相关实现，lib/agents/ 是学习角色实现，不能因名称近似直接合并。Python 包仍保留 growth_loop_* 名称以兼容导入和启动命令。

## 服务配置

| 服务 | 说明 | 条件 |
| --- | --- | --- |
| Web | [网页配置](WEB_SERVICE_SETUP.md) | Node 22/24、npm；旧文档的机器路径需自行调整 |
| Workflow | [服务 README](../services/workflow/README.md) | 独立 Python 环境、共享私有 token |
| RAGFlow | [部署与绑定](RAGFLOW_DEPLOYMENT.md) | Docker、模型配置、账号/文档授权绑定 |
| 旧入库链路 | [入库服务](../services/rag_ingestion/README.md) | Python；PDF 等按需配置 MinerU |
| 本地编码 | [Embedding 服务](../services/embedding/README.md) | 模型路径及运行设备配置 |

全栈启动沿用已有端口，不适合直接与旧项目全栈并行。新目录没有复制任何 Python 虚拟环境、模型或已绑定 RAGFlow 数据集。

## 文档分类

| 分类 | 文件 | 阅读方式 |
| --- | --- | --- |
| 当前导航 | README.md、PROJECT_STATUS.md、PUBLISHING.md | 先读 |
| 架构与角色约束 | ARCHITECTURE_BOUNDARIES.md、AGENT_ROLES.md | 改相关代码前读，注意目标和现状区别 |
| 学习/RAG 专题 | LEARNING_RELIABILITY.md、KNOWLEDGE_GATE.md、RAG.MD、LEARNING_PROGRAM.md | 按主题查阅；部分段落保留历史阶段 |
| 新后端部署 | RAGFLOW_DEPLOYMENT.md | LearnStep Compose 名称以页首更新为准 |
| 开发和部署参考 | DEVELOPER_HANDBOOK.md、WEB_SERVICE_SETUP.md、DEMO_DEPLOYMENT.md | 对照当前入口，不直接照搬旧绝对路径 |
| 历史规划 | IMPLEMENTATION_PLAN_*.md、HANDOFF_V041.md、PRODUCT_DESIGN_V1.md | 设计背景，不是已完成清单 |
| 旧后端迁移方案 | RAG_LLAMA_INDEX_MIGRATION.md | 历史选型，不代表新的目标架构 |
| 扩展端 | ANDROID_*.md、WECHAT_INTEGRATION.md | 需要 Android/微信时再读 |
| 旧 README 详细说明 | REFERENCE_GUIDE.md | 保留 API 与运行细节，当前首页优先 |
| 历史验收 | [CHANGELOG](../CHANGELOG.md)、../.project-to-act/ | 说明对应日期的范围，不算本次重新验证 |

## 后续整理原则

- 当前状态集中写 PROJECT_STATUS，历史过程集中写 CHANGELOG。
- 新增设计方案写清“计划/实施中/验收范围”，不要在多个文件维护互相冲突的当前清单。
- 脚本暂保留原路径：测试存在跨文件引用，迁移前须查清依赖。
- 运行数据和构建产物留在忽略目录；需要演示数据应另建可审计的虚构 fixture。
- 新代码按现有业务目录归类，不因产品改名而批量改数据库字段或 Python 模块名。
