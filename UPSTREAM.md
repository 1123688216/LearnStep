# 项目来源与兼容说明

LearnStep 于 2026-09-29 从本地 Growth Loop 开发工作区整理创建，包括当时尚未提交的功能改动。不是一次全新重写，也不因更名改变原有贡献归属。

源工作区配置的 origin 为 https://github.com/1123688216/growth-loop-agent.git 。原 README 另有 https://github.com/redmaplewww/growth-loop-agent.git 的克隆说明；本次未联网核实两个仓库的关系或授权状态，仅保留来源线索。

新目录未复制原 .git 历史，没有设置远端、创建提交或推送。本地 Git 仓库仅用于建立独立边界，后续由项目所有者选择远端。

## 本次更名范围

- 产品页面、浏览器标题、Android 显示名称和 npm 包名改为 LearnStep/learnstep。
- 默认 Web 会话 cookie 为 learnstep_session，默认业务数据库为 data/learnstep.sqlite。
- RAGFlow Compose 项目为 learnstep-ragflow，数据卷按该项目分离；未启动容器。
- Python 包 growth_loop_*、Android application ID com.growthloop.agent 及历史文件名暂保留，避免将品牌整理扩大为包迁移。Android 安装标识仍与旧项目相同，不能以两个独立 App 同时安装。
- 历史日志和设计文档保留原名、测试背景及旧路径，当前状态见 docs/PROJECT_STATUS.md。

## 授权

本次未添加 MIT、Apache 等新的授权声明，也未确认继承代码可按这些许可再分发。公开仓库前核对来源许可、贡献归属及第三方资产要求；未确认时可先使用私有仓库。不要把本说明视为授予第三方代码许可。
