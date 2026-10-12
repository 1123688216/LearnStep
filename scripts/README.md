# 脚本导航

脚本保留原位置，以保持 package.json、跨脚本调用和测试夹具路径兼容。按用途选择入口，不建议逐个执行目录中的脚本。

## 日常入口

| 入口（在项目根目录） | 用途 | 影响 |
| --- | --- | --- |
| npm run dev | 只启动 Web，默认 3000 | 会建立/读取本项目数据库 |
| start-all.cmd | 启动完整本机依赖和前端 3011 | 会启动 Docker、服务；缺少镜像时可能下载 |
| stop-all.cmd | 停止受管进程和本项目 Compose | 中断运行中任务，保留数据 |
| restart-frontend.cmd | 只重启受管前端 | 不重启其他服务，可能中断请求 |
| scripts/project-stack.ps1 -Action Check | 配置/依赖检查入口 | 不主动启动完整业务；未初始化配置时可报错 |

完整启动依赖模型路径、Python 环境等预先准备。LearnStep Compose 名称为 learnstep-ragflow，但端口默认值与旧项目相同；不要直接同时启动两套全栈。未受管的手动进程不通过端口强杀。

## 开发验证

| 入口 | 范围 |
| --- | --- |
| npm run typecheck | TypeScript 类型检查 |
| npm run lint | 静态规则检查 |
| npm run build | 生产构建，会产生 .next/ |
| npm run verify:learning | 固定列表中的 21 个隔离/模拟回归套件 |
| npm run learning:continuous:smoke | 模拟条件下连续三课流程与请求重放 |
| npm run workflow:test | Python workflow 测试，需本项目的虚拟环境 |

verify-learning.mjs 是学习回归的集中入口，其清单覆盖模型传输、内容结构、证据审核、资料范围、课程重生成、评分与下一课、权限一致性、恢复、渲染和连续学习。本次是否通过见 [当前状态](../docs/PROJECT_STATUS.md)。

## 真实调用与诊断

以下不属于“随便执行的无成本检查”：

- `*-live.mjs`：真实模型、联网或业务验收，按文件说明准备测试账号与环境。
- `real-course-probe.mjs`、`learning-loop-isolated.mjs --live`：显式真实模型模式，可能消耗额度。
- `learning-program-smoke.mjs`、`topic-probe.mjs`、`embedding-smoke.mjs`：不能仅凭 smoke 名称断言无网络或无写入，执行前看参数和配置。
- `fts-probe.mjs`、`validate-chunking.mjs`、`validate-database-schema.mjs`：读取对象和初始化行为取决于数据库配置，不默认针对空库。

## 数据维护与部署

| 脚本 | 用途 |
| --- | --- |
| migrate-database.mjs | 数据库结构迁移 |
| sync-course-tasks.mjs | 为指定账号同步课程任务 |
| ragflow-import.mjs | 将明确账号/文档绑定到 RAGFlow 快照 |
| seed-draft-ui-smoke.mjs | 答题草稿相关演示/测试数据准备 |
| ragflow-stack.ps1 | 本项目 RAGFlow 初始化、状态、日志、启停 |
| start-rag-stack.ps1 / stop-rag-stack.ps1 | 底层依赖服务管理 |
| start-embedding-service.ps1 / start-workflow-service.ps1 | 单服务启动 |
| android-emulator.ps1 / debug-apk* | Android 本地构建与调试 |

维护脚本可能修改数据，不能用它们替代只读排查。真实模型验收与隔离测试结果分开记录。
