# Stock Monitor — Tech Design

## 1. 项目概述

Stock Monitor 是一个全栈实时股票监控平台，支持 A 股、港股、美股三大市场。用户可以管理自选股、查看行情、设置价格预警、浏览行业板块和市场扫描结果。系统通过 Server-Sent Events (SSE) 实现行情数据的实时推送，并根据各市场交易时段自动调整轮询频率。

## 2. 功能列表

### 2.1 Dashboard（总览）

- 展示主要指数行情（上证、深证、恒生、道琼斯、纳斯达克、标普 500 等）
- 自选股预览卡片
- 市场涨跌幅热力图
- Scanner 快速入口（涨幅榜 / 跌幅榜 / 活跃股）

### 2.2 Market（市场行情）

- 按地区（美股、A 股、港股）分组展示市场指数
- 指数实时报价与涨跌幅

### 2.3 Stocks（自选股）

- 自选股的增删管理（支持空格/逗号分隔批量添加）
- 卡片视图与表格视图切换
- 按市场分组显示
- 价格变动闪烁动画
- 点击跳转至个股详情

### 2.4 Industry（行业板块）

- 按市场分类展示行业 ETF（美股 Sector SPDRs、A 股行业 ETF、港股行业 ETF）
- 实时报价与涨跌幅

### 2.5 Scanner（市场扫描）

- 涨幅榜（Top Gainers）
- 跌幅榜（Top Losers）
- 活跃股（Most Active）
- 热门趋势股（Trending）

### 2.6 Stock Detail（个股详情）

- K 线图 / 面积图，支持多种时间维度（1 分钟、5 分钟、15 分钟、日线）
- 成交量柱状图
- 基本面数据（市盈率、市净率、市值、收益等）
- 分析师评级与目标价

### 2.7 Alerts（价格预警）

- 创建预警规则（价格上穿 / 下穿阈值、涨跌幅阈值）
- 预警规则的启用 / 禁用 / 重置 / 删除
- 预警冷却时间配置
- 预警历史记录
- 未读预警计数与标记已读
- Header 中的铃铛实时提醒

### 2.8 Settings（设置）

- 自选股管理
- 预警规则管理
- 轮询间隔配置
- 默认视图切换

## 3. 技术栈

| 层级 | 技术 | 版本 |
| --- | --- | --- |
| **后端框架** | NestJS | 10.x |
| **ORM** | TypeORM | 0.3.x |
| **数据库** | MySQL | - |
| **数据源** | yahoo-finance2 | 3.x |
| **实时通信** | Server-Sent Events (SSE) | - |
| **前端框架** | React | 19.x |
| **构建工具** | Vite | 6.x |
| **路由** | React Router | 7.x |
| **图表** | lightweight-charts | - |
| **样式** | Less | - |
| **Monorepo 管理** | concurrently | - |
| **包管理器** | pnpm | - |
| **语言** | TypeScript (后端) / JavaScript JSX (前端) | - |

## 4. 系统架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite :3333)                   │
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Dashboard   │ │ Market     │ │ Stocks     │ │ Stock Detail     │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                       │
│  │ Industry   │ │ Scanner    │ │ Settings   │                       │
│  └────────────┘ └────────────┘ └────────────┘                       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Hooks: useQuoteSSE | useWatchlist | useAlertRules | useFlash   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│            │ SSE (实时行情)                    │ REST API             │
└────────────┼──────────────────────────────────┼──────────────────────┘
             │  Vite Proxy /api → :4444         │
┌────────────▼──────────────────────────────────▼──────────────────────┐
│                      Backend (NestJS :4444)                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                     Quote Engine (核心引擎)                       ││
│  │  · 交易时段: 10 秒轮询  ·  非交易时段: 5 分钟轮询                ││
│  │  · 拉取指数 + ETF + 自选股行情                                    ││
│  │  · SSE 广播: snapshot / update / alert / heartbeat               ││
│  └──────────────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                     Alert Engine (预警引擎)                       ││
│  │  · 每次 tick 评估预警规则                                         ││
│  │  · 触发后写入历史记录并通过 SSE 推送                               ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Stock      │ │ Watchlist  │ │ Alert      │ │ Scanner          │  │
│  │ Module     │ │ Module     │ │ Module     │ │ Module           │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │
│  ┌────────────┐                                                      │
│  │ Detail     │                                                      │
│  │ Module     │                                                      │
│  └────────────┘                                                      │
└────────────┬──────────────────────────────────┬──────────────────────┘
             │                                  │
┌────────────▼──────────┐         ┌─────────────▼─────────────────────┐
│  MySQL (stock_monitor) │         │  Yahoo Finance API                │
│                        │         │  · quote       · chart            │
│  · watchlist           │         │  · quoteSummary · screener        │
│  · alert_rules         │         │  · trendingSymbols                │
│  · alert_history       │         │                                   │
└────────────────────────┘         └───────────────────────────────────┘
```

## 5. 后端模块详解

### 5.1 App Module (`app.module.ts`)

根模块，配置 TypeORM 连接 MySQL 数据库 `stock_monitor`，聚合所有业务模块。

### 5.2 Stock Module

| 文件 | 职责 |
| --- | --- |
| `stock.controller.ts` | `GET /api/quote?symbols=` — 批量获取股票实时报价 |
| `stock.service.ts` | 调用 yahoo-finance2 获取报价，对 A 股（上交所 `.SS` / 深交所 `.SZ`）、港股（`.HK`）进行符号标准化 |

### 5.3 Watchlist Module

| 文件 | 职责 |
| --- | --- |
| `watchlist.controller.ts` | `GET /api/watchlist` / `POST /api/watchlist` / `DELETE /api/watchlist/:symbol` |
| `watchlist.service.ts` | 自选股的增删查操作 |
| `watchlist.entity.ts` | 实体定义: `id`, `symbol`, `name`, `market`, `createdAt`, `updatedAt` |

### 5.4 Quote Engine Module

| 文件 | 职责 |
| --- | --- |
| `quote-engine.controller.ts` | `GET /api/quotes/stream` (SSE) / `GET /api/quotes/snapshot` |
| `quote-engine.service.ts` | 核心 tick 引擎：轮询 Yahoo Finance 获取指数、ETF、自选股行情，通过 SSE 广播给所有客户端 |
| `market-hours.ts` | 各市场交易时段判断（A 股 9:30-15:00，港股 9:30-16:00，美股 9:30-16:00 ET） |

**SSE 事件类型：**

| 事件 | 说明 |
| --- | --- |
| `snapshot` | 首次连接时推送全量快照 |
| `update` | 每次 tick 推送增量更新 |
| `alert` | 预警触发时推送 |
| `heartbeat` | 保活心跳 |

**轮询策略：**

- 交易时段（任一市场开盘）：每 10 秒
- 非交易时段：每 5 分钟

### 5.5 Alert Module

| 文件 | 职责 |
| --- | --- |
| `alert.controller.ts` | 预警规则 CRUD + 历史查询 + 未读计数 + 标记已读 |
| `alert.service.ts` | 预警规则与历史记录的数据库操作 |
| `alert-engine.service.ts` | 每次 tick 评估所有启用的规则，满足条件时触发预警并写入历史 |
| `alert-rule.entity.ts` | 实体: `ruleId`, `symbol`, `type`, `threshold`, `enabled`, `cooldownMinutes`, `triggered` |
| `alert-history.entity.ts` | 实体: `id`, `ruleId`, `symbol`, `message`, `quoteSnapshot`, `read`, `createdAt` |

### 5.6 Scanner Module

| 文件 | 职责 |
| --- | --- |
| `scanner.controller.ts` | `GET /api/scanner/gainers` / `losers` / `active` / `trending` |
| `scanner.service.ts` | 通过 Yahoo Finance screener 和 trendingSymbols 接口获取市场扫描数据 |

### 5.7 Detail Module

| 文件 | 职责 |
| --- | --- |
| `detail.controller.ts` | `GET /api/stock/:symbol/chart` / `GET /api/stock/:symbol/detail` |
| `detail.service.ts` | 获取 K 线图数据（支持 1m/5m/15m/1d）和个股详细信息（财务数据、分析师评级） |

## 6. 前端架构详解

### 6.1 路由

| 路径 | 组件 | 说明 |
| --- | --- | --- |
| `/` | `DashboardPage` | 总览 |
| `/market` | `MarketPage` | 市场指数 |
| `/stocks` | `StocksPage` | 自选股 |
| `/industry` | `IndustryPage` | 行业板块 |
| `/scanner` | `ScannerPage` | 市场扫描 |
| `/stock/:symbol` | `StockDetailPage` | 个股详情 |
| `/settings` | `SettingsPage` | 设置 |
| `*` | 重定向至 `/` | 兜底 |

### 6.2 核心组件

| 组件 | 功能 |
| --- | --- |
| `AppHeader` | 顶部导航栏，包含页面链接和预警铃铛 |
| `StockCard` | 自选股卡片，展示价格与涨跌，支持闪烁动画 |
| `StockTable` | 自选股表格，展示详细行情数据 |
| `StockChart` | 基于 lightweight-charts 的 K 线 / 面积图 + 成交量图 |
| `StockInput` | 股票代码输入框，支持批量添加 |
| `AlertBell` | Header 预警铃铛，展示未读预警数量和预警列表 |
| `MarketGroup` | 市场分组容器，带市场标识 |

### 6.3 自定义 Hooks

| Hook | 功能 |
| --- | --- |
| `useQuoteSSE` | 建立 SSE 连接，提供实时行情数据的 React Context，管理连接生命周期 |
| `useWatchlist` | 自选股 CRUD 操作，维护自选股列表状态 |
| `useAlertRules` | 预警规则 CRUD、启用/禁用/重置操作 |
| `useFlash` | 检测价格变化方向（上涨/下跌），驱动闪烁动画 |
| `useStockPolling` | 定时轮询行情接口（SSE 的降级方案） |

### 6.4 工具函数 (`utils/format.js`)

提供成交量、市值、换手率、百分比、市盈率等金融数据的格式化函数，以及按市场分组的工具方法。

## 7. 数据库设计

```sql
-- 数据库: stock_monitor (MySQL)

-- 自选股
CREATE TABLE watchlist (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    symbol      VARCHAR(20) NOT NULL,
    name        VARCHAR(100),
    market      VARCHAR(10),            -- US / HK / SH / SZ
    createdAt   DATETIME DEFAULT NOW(),
    updatedAt   DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- 预警规则
CREATE TABLE alert_rules (
    ruleId          INT AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20) NOT NULL,
    type            VARCHAR(20) NOT NULL,   -- price_above / price_below / change_pct
    threshold       DECIMAL(20,4) NOT NULL,
    enabled         BOOLEAN DEFAULT TRUE,
    cooldownMinutes INT DEFAULT 60,
    triggered       BOOLEAN DEFAULT FALSE,
    createdAt       DATETIME DEFAULT NOW(),
    updatedAt       DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- 预警历史
CREATE TABLE alert_history (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    ruleId        INT NOT NULL,
    symbol        VARCHAR(20) NOT NULL,
    message       TEXT,
    quoteSnapshot JSON,
    `read`        BOOLEAN DEFAULT FALSE,
    createdAt     DATETIME DEFAULT NOW()
);
```

## 8. API 接口一览

### Stock

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/quote?symbols=AAPL,600519` | 批量获取报价 |

### Watchlist

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/watchlist` | 获取自选股列表 |
| POST | `/api/watchlist` | 添加自选股 `{ symbols: string[] }` |
| DELETE | `/api/watchlist/:symbol` | 删除自选股 |

### Quote Engine

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET (SSE) | `/api/quotes/stream` | 实时行情推送 |
| GET | `/api/quotes/snapshot` | 当前行情快照 |

### Alerts

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/alerts/rules` | 获取预警规则列表 |
| POST | `/api/alerts/rules` | 创建预警规则 |
| PUT | `/api/alerts/rules/:id` | 更新预警规则 |
| DELETE | `/api/alerts/rules/:id` | 删除预警规则 |
| PUT | `/api/alerts/rules/:id/reset` | 重置预警触发状态 |
| GET | `/api/alerts/history?limit=50` | 获取预警历史 |
| GET | `/api/alerts/history/unread-count` | 获取未读预警数量 |
| PUT | `/api/alerts/history/read` | 标记所有预警已读 |

### Scanner

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/scanner/gainers?count=25` | 涨幅榜 |
| GET | `/api/scanner/losers?count=25` | 跌幅榜 |
| GET | `/api/scanner/active?count=25` | 活跃股 |
| GET | `/api/scanner/trending` | 热门趋势股 |

### Stock Detail

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/stock/:symbol/chart?interval=1m&range=1d` | K 线图数据 |
| GET | `/api/stock/:symbol/detail` | 个股详细信息 |

## 9. 数据流

```
Yahoo Finance API
       │
       ▼
Quote Engine (NestJS)
  · 定时轮询 yahoo-finance2
  · 交易时段 10s / 非交易时段 5min
       │
       ├──▶ Alert Engine
       │      · 逐条评估预警规则
       │      · 触发 → 写入 alert_history
       │      · 通过 SSE 推送 alert 事件
       │
       ▼
SSE Broadcast ──────────────────▶ React Frontend
  · snapshot (首次全量)              · useQuoteSSE 消费 SSE 流
  · update (增量更新)                · 更新 Context 中的行情状态
  · alert (预警触发)                 · 触发组件重渲染 + 闪烁动画
  · heartbeat (保活)
```

## 10. 开发与运行

### 环境要求

- Node.js 18+
- pnpm
- MySQL 8.x（数据库名: `stock_monitor`，默认端口 3306）

### 快速启动

```bash
# 安装依赖
pnpm install:all

# 启动开发环境（同时启动前后端）
pnpm dev
```

| 服务 | 地址 |
| --- | --- |
| Frontend | http://localhost:3333 |
| Backend API | http://localhost:4444/api |

### 项目脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 同时启动前后端开发服务 |
| `pnpm dev:backend` | 仅启动后端（NestJS watch 模式） |
| `pnpm dev:frontend` | 仅启动前端（Vite dev server） |
| `pnpm install:all` | 安装前后端所有依赖 |
| `pnpm format` | Prettier 格式化 |
| `pnpm lint` | ESLint 检查 |

## 11. 目录结构

```
stock/
├── docs/                         # 项目文档
├── backend/                      # NestJS 后端
│   └── src/
│       ├── main.ts               # 应用入口
│       ├── app.module.ts         # 根模块
│       ├── stock/                # 股票报价模块
│       ├── watchlist/            # 自选股模块
│       ├── quote-engine/         # 实时行情引擎
│       ├── alert/                # 预警系统
│       ├── scanner/              # 市场扫描
│       └── detail/               # 个股详情
└── frontend/                     # React 前端
    └── src/
        ├── App.jsx               # 根组件 + 路由
        ├── pages/                # 页面组件
        ├── components/           # 通用组件
        ├── hooks/                # 自定义 Hooks
        └── utils/                # 工具函数
```
