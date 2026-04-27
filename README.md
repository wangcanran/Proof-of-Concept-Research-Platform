# 中国人民大学图灵数智概念验证平台 2026

科研项目管理系统 — 一个全栈研究管理平台，支持多角色权限控制和完整的项目生命周期管理。

## 📋 项目概述

本平台为科研机构提供一体化的项目申报、审核、资金管理和成果转化解决方案。系统支持四种用户角色：

- **申请人 (APPLICANT)** — 创建和管理研究项目
- **评审人 (REVIEWER)** — 审核项目申请和分配任务
- **助理 (ASSISTANT)** — 协助项目管理和资金审计
- **管理员 (ADMIN)** — 系统配置、用户管理和监控

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + Vite + TypeScript + Element Plus + Pinia |
| **后端** | Node.js + Express + Prisma ORM |
| **数据库** | MySQL 8.0+ |
| **测试** | Playwright (E2E) |

## 🚀 快速开始

### 前置要求

- Node.js 20.19.0 或 22.12.0+
- MySQL 8.0+
- npm 或 yarn

### 安装与启动

#### 1. 后端启动

```bash
cd backend
npm install
npm run dev          # 开发模式（自动重载）
npm start            # 生产模式
```

后端服务运行在 `http://localhost:3001`

#### 2. 前端启动

```bash
cd frontend/research-project-frontend
npm install
npm run dev          # 开发服务器
```

前端应用运行在 `http://localhost:5173`

## 📦 项目结构

```
.
├── backend/                          # 后端服务
│   ├── app.js                       # Express 主入口
│   ├── prisma.config.ts             # Prisma ORM 配置
│   ├── research-system/
│   │   └── src/utils/database.ts    # 数据库工具和测试数据
│   └── package.json
│
└── frontend/research-project-frontend/  # 前端应用
    ├── src/
    │   ├── router/index.ts          # 路由和权限守卫
    │   ├── stores/                  # Pinia 状态管理
    │   ├── api/                     # API 调用层
    │   └── views/                   # 页面组件（按角色分类）
    │       ├── applicant/           # 申请人页面
    │       ├── reviewer/            # 评审人页面
    │       ├── assistant/           # 助理页面
    │       ├── admin/               # 管理员页面
    │       └── funds/               # 资金管理页面
    └── package.json
```

## 🔐 核心功��

### 项目管理
- 申请人创建和提交研究项目
- 评审人审核项目申请
- 项目进度跟踪和阶段管理
- 项目详情查看和编辑

### 资金管理
- 预算申请和审批
- 支出管理和报销流程
- 资金执行情况统计
- 支出趋势分析

### 成果管理
- 研究成果登记
- 成果转化和转移
- 成果详情管理

### 系统管理
- 用户管理和角色分配
- 部门管理
- 系统配置和监控
- 系统日志和性能分析
- 数据备份管理

### 通知系统
- 实时通知中心
- 系统消息推送

## 🔑 认证与授权

系统采用基于角色的访问控制 (RBAC)：

- **认证方式** — Token 存储在浏览器本地存储
- **权限检查** — 路由守卫基于用户角色和权限元数据
- **角色映射** — 每个角色对应专属的仪表板路由

| 角色 | 仪表板路由 |
|------|-----------|
| APPLICANT | `/applicant/dashboard` |
| REVIEWER | `/reviewer/dashboard` |
| ASSISTANT | `/assistant/dashboard` |
| ADMIN | `/admin/dashboard` |

## 📝 常用命令

### 前端开发

```bash
cd frontend/research-project-frontend

npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run type-check       # TypeScript 类型检查
npm run lint             # ESLint 检查和修复
npm run format           # Prettier 代码格式化
npm run test:e2e         # 运行 E2E 测试
npm run test:e2e -- --project=chromium  # 仅在 Chromium 运行
```

### 后端开发

```bash
cd backend

npm run dev              # 开发模式（nodemon 自动重载）
npm start                # 生产模式
```

## 🖥 生产环境：将代码更新到服务器

生产环境使用 **Nginx** 托管前端静态资源、**Node.js + pm2** 运行后端 API。更新应用代码有两种常见方式：（一）在服务器上 **Git 拉取**；（二）本机 **已 commit 的仓库打压缩包**，经 **scp** 上传后覆盖。IP、路径、pm2 进程名请按你方实际环境替换。

**务必先完成下方「1. 确认 Nginx 静态资源根目录」**，再执行任意方式中的 `rsync`：静态文件必须同步到与 Nginx `root` **一致** 的目录，否则会出现「磁盘已更新、浏览器仍加载旧 `index-*.js`」的问题。

### 1. 先确认 Nginx 静态资源根目录（非常重要）

在服务器上执行：

```bash
sudo nginx -T 2>&1 | grep -nE "listen|server_name|default_server|root "
```

记下对外提供站点（例如 `listen 80` 且 `server_name` 为你的 IP 或域名）对应的那一行，例如：

```text
root /var/www/research;
```

后续 `rsync dist/` 时的目标目录 **必须与这里的 `root` 完全一致**（下文中记为 `$NGINX_ROOT`）。若你的配置为 `root /var/www/html/;`，则 `$NGINX_ROOT` 为 `/var/www/html`。

### 2. 方式一：在服务器上 Git 拉取后更新

适用于服务器能直接访问 Git 远程仓库时。

```bash
cd ~/Proof-of-Concept-Research-Platform
git pull
```

（若使用其他分支，先切换到目标分支并更新到要部署的提交。）

然后按 **第 4 节** 在服务器上执行后端安装与重启、前端构建与 `rsync`（将其中 `rsync` 的目录换为第 1 步得到的 `$NGINX_ROOT`）。

### 3. 方式二：本机打包 + scp + 服务器覆盖

适用于不便在服务器上 `git pull`、或希望用本机已 commit 的快照发布时。以下假定本机为 **Windows**，仓库在 `D:\python_code\Proof-of-Concept-Research-Platform`，且**当前分支上需要的改动已 commit**；服务器用户与 IP 仅为示例，请替换。

#### 3.1 本机：生成压缩包

在**项目仓库根目录**执行（`cmd` 下可先 `cd /d D:\python_code\Proof-of-Concept-Research-Platform`；**PowerShell** 下用 `cd D:\python_code\Proof-of-Concept-Research-Platform`）。

ZIP：

```bat
git archive --format=zip -o ..\poc-update.zip HEAD
```

或打成 tar.gz：

```bat
git archive --format=tar.gz -o ..\poc-update.tar.gz HEAD
```

`git archive` 产物的根目录即仓库根目录下的文件，**没有**外层的 `Proof-of-Concept-Research-Platform` 文件夹。上述命令把压缩包写到仓库的上一层目录，即 `D:\python_code\poc-update.zip`（或 `.tar.gz`），**避免**将 `-o` 指到无写权限的路径（如系统盘根目录以外的错误相对路径）。

#### 3.2 本机：上传到服务器

ZIP：

```bat
scp D:\python_code\poc-update.zip ruc@10.77.110.6:~/
```

tar.gz：

```bat
scp D:\python_code\poc-update.tar.gz ruc@10.77.110.6:~/
```

#### 3.3 服务器：备份 `.env`、解压、覆盖项目目录

```bash
cp -a ~/Proof-of-Concept-Research-Platform/backend/.env ~/backend.env.bak 2>/dev/null || true
```

解压 **ZIP**：

```bash
cd ~
unzip -o poc-update.zip -d ~/deploy-tmp
```

解压 **tar.gz**：

```bash
cd ~
mkdir -p ~/deploy-tmp
tar -xzf poc-update.tar.gz -C ~/deploy-tmp
```

将 `deploy-tmp` 中的内容同步到已有克隆目录（`git archive` 展开后没有外层仓库名目录，内容直接在 `deploy-tmp/` 下）：

```bash
rsync -a --delete ~/deploy-tmp/ ~/Proof-of-Concept-Research-Platform/
```

恢复后端环境变量文件：

```bash
cp -a ~/backend.env.bak ~/Proof-of-Concept-Research-Platform/backend/.env 2>/dev/null || true
```

#### 3.4 服务器：安装依赖、构建、发布静态资源

与 **第 4 节** 相同。其中发布前端的 `rsync` 目标**必须**使用第 1 步确认的 `$NGINX_ROOT`（见第 4 节说明）。若你当前 Nginx 的 `root` 为 `/var/www/html/`，则与下述「第 4 节」示例一致。

#### 3.5 服务器：清理临时文件

```bash
rm -rf ~/deploy-tmp ~/poc-update.zip
```

若上传的是 tar.gz，将 `poc-update.zip` 换为 `poc-update.tar.gz` 并删除即可。

### 4. 服务器上：后端 + 前端 + Nginx（两种方式共用）

在服务器上**项目已更新**（`git pull` 或方式二 `rsync` 覆盖）后执行。

**后端：**

```bash
cd ~/Proof-of-Concept-Research-Platform/backend
npm ci
# 若使用 Prisma 且本次包含 schema 变更，再执行（按项目实际命令为准）：
# npx prisma migrate deploy

pm2 restart research-api
pm2 save
```

`research-api` 为 pm2 中的进程名，请与 `pm2 list` 中显示的名称一致。

**前端构建并发布到 Nginx 静态目录：**

```bash
cd ~/Proof-of-Concept-Research-Platform/frontend/research-project-frontend
npm ci
npm run build
sudo rsync -av --delete dist/ "$NGINX_ROOT"/
```

将 `"$NGINX_ROOT"` 换为第 1 步中的实际路径，例如：

```bash
sudo rsync -av --delete dist/ /var/www/html/
```

或：

```bash
sudo rsync -av --delete dist/ /var/www/research/
```

`--delete` 会删除目标目录中已不在本次构建中的旧文件，避免残留旧 hash 的 JS。

仅**修改了 Nginx 配置文件**时才需要执行：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

只更新静态文件时，一般 **不必** 重载 Nginx。

### 5. 自检

在服务器上检查首页引用的主包是否为当前构建（hash 会随每次构建变化）：

```bash
curl -sS "http://127.0.0.1/" | grep -oE 'src="/assets/index-[^"]+\.js"'
```

若这里仍是旧的 `index-xxxxx.js`，说明 **实际对外访问的 `server` 块** 与 `rsync` 使用的目录不一致，或还有反向代理/其他端口，需回到第 1 步对照完整 `server { }` 配置排查。

本地或远程浏览器请 **强刷**（Ctrl+F5）或 **无痕窗口** 再试，避免只缓存了旧 `index.html`。

### 6. 建议的发布顺序

1. 先更新服务器上的项目代码（方式一或方式二），再按顺序执行：后端（`npm ci` → 迁移（如有）→ `pm2 restart`）→ 前端（`npm ci` → `build` → `rsync` 到 `$NGINX_ROOT`）。
2. 若某次仅改前端，可只执行第 4 节中的前端与 `rsync`；仅改后端可只执行第 4 节中的后端命令。

## 🗄️ 数据库配置

### 连接信息

- **主机** — localhost
- **端口** — 3306
- **用户** — root
- **数据库** — research_system

### 初始化

数据库连接和测试数据由 `backend/research-system/src/utils/database.ts` 管理。

**⚠️ 注意** — 数据库凭证目前硬编码在 `backend/app.js` 中，生产环境应移至 `.env` 文件。

## 🌍 环境配置

### 前端环境变量

- `.env.development` — 开发环境配置
- `.env.production` — 生产环境配置

### 后端环境变量

建议创建 `.env` 文件配置以下变量：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=research_system
NODE_ENV=development
PORT=3001
```

## 📌 重要提示

1. **清理工作** — 前端 `/reviewer` 和 `/admin` 目录下存在多个备份文件（以 `1` 或 `copy` 前缀），建议清理或合并
2. **多个入口文件** — 后端存在多个启动文件（`app.js`, `server.js`, `test.js` 等），主入口为 `app.js`
3. **安全性** — 数据库密���和敏感信息应通过环境变量管理，不应硬编码
4. **测试覆盖** — 后端缺少自动化测试，建议补充单元测试和集成测试

## 📚 相关文档

- [CLAUDE.md](./CLAUDE.md) — Claude Code 开发指南
- [前端 README](./frontend/research-project-frontend/README.md) — 前端项目详情

## 📞 支持

如有问题或建议，请提交 Issue 或联系开发团队。
