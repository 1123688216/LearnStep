# 上传 GitHub

只上传新的 LearnStep 目录，不上传旧项目目录，也不把旧 .git 拷进来。

## 已准备

- npm 包名、产品展示名称与新项目一致。
- 保留 package-lock.json 和 Python 依赖描述，方便重建环境。
- 私有 .env、数据库及嵌套备份、APK、模型、node_modules、虚拟环境、缓存、运行日志均不作为项目交付文件。
- .gitignore 覆盖嵌套数据库文件、密钥容器和本地输出目录。
- 历史记录与当前入口分开，来源说明保留在 UPSTREAM.md。

## 创建远端前

1. 阅读 [来源说明](../UPSTREAM.md)，确认公开分发权限。没有确认时先建私有仓库。
2. 新建名为 LearnStep 的空仓库。不要在网页上预先生成 README，以免首次推送产生额外历史。
3. 在新目录运行 git status --short，确认没有真实账号数据、密钥或运行产物；不要添加 -f 强行绕过忽略规则。
4. 当前版本没有配好你的远端地址，下方占位地址须自行替换。

## 本地提交与推送

以下步骤由你在确认文件清单后执行。本次整理没有执行提交或推送。

```powershell
git add .
git diff --cached --stat
# 查看暂存内容，确认没有私有信息后再提交
git diff --cached
git commit -m "Initialize LearnStep from Growth Loop"
git remote add origin https://github.com/YOUR_ACCOUNT/LearnStep.git
git push -u origin main
```

如果 origin 已存在，先查看 git remote -v 再决定是否修改，不重复添加。不要把真实 Key 写入命令行、示例配置或 README。公开运行日志前先检查是否含用户答案和资料正文。

## GitHub 项目简介

LearnStep：基于 Agent 与 RAG 的自适应学习助手，串联目标诊断、按需课程、答疑考核、能力画像与进度反馈，支持资料引用审核及部分流程恢复。

可选 Topics：ai-agent、rag、langgraph、nextjs、typescript、adaptive-learning。

演示截图、部署地址、性能数字和教学效果数据应在实际获得后补充，本次不填造数据。
