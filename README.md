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
