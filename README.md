# HD Icons — Cloudflare Pages Edition

基于 [xushier/HD-Icons](https://github.com/xushier/HD-Icons) 的 Cloudflare Pages 部署版本。

**Fork → 连接 Cloudflare → 自动部署。无需服务器，零费用。**

**架构**：Cloudflare Pages（静态前端）+ Pages Functions（API）+ R2（对象存储）+ jsDelivr（图片 CDN）

## 功能

- 浏览 1754+ 高清仪表盘图标（1024x1024）
- 按分类筛选：圆角 / 圆形 / 矢量 / 上传
- 搜索图标（Ctrl+K 快速聚焦）
- 单击复制图标 CDN 地址
- 放大预览
- 自定义图标上传 / 删除
- 日间 / 夜间模式
- 移动端自适应

## 部署步骤

### 1. Fork 两个仓库

你需要 fork 两个仓库到自己的 GitHub 账号下：

| 仓库 | 作用 | Fork 链接 |
|---|---|---|
| [xushier/HD-Icons](https://github.com/xushier/HD-Icons) | 图标源文件（1754+ 张高清图标） | [点击 Fork](https://github.com/xushier/HD-Icons/fork) |
| [mitukingprime/hd-icons-cf](https://github.com/mitukingprime/hd-icons-cf) | 本项目（Cloudflare 部署代码） | [点击 Fork](https://github.com/mitukingprime/hd-icons-cf/fork) |

Fork 完成后，你需要修改本项目中的 GitHub 用户名，让图标地址指向你自己的 fork。修改以下 4 个文件，将 `mitukingprime` 替换为**你的 GitHub 用户名**：

- `public/app.js` — 第 5 行和第 6 行的 URL
- `functions/api/sync.js` — 第 1 行的 URL
- `functions/api/icons.js` — 第 1 行的 URL
- `functions/api/stats.js` — 第 1 行的 URL

> **重要**：HD-Icons 仓库必须设为 **Public**，否则 jsDelivr CDN 无法访问图标图片。
>
> **提示**：如果你不想公开部署代码，可以在 fork 后将 `hd-icons-cf` 仓库改为 **Private**（Settings → Danger Zone → Change visibility）。Cloudflare Pages 连接 GitHub 后可以正常访问私有仓库，不影响部署。

### 2. 创建 R2 存储桶

在 Cloudflare Dashboard 上创建 R2 存储桶：

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单点击 **R2 Object Storage**
3. 点击 **Create bucket**
4. 输入存储桶名称：`hd-icons`
5. 点击 **Create bucket** 确认

> **注意**：存储桶名称**必须**是 `hd-icons`，与项目配置文件 `wrangler.toml` 中的 `bucket_name` 一致。如果使用其他名称，需要同步修改 `wrangler.toml` 中的 `bucket_name` 字段。

### 3. 在 Cloudflare 连接 GitHub 部署

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → 左侧菜单 **Workers & Pages**
2. 点击 **Create** → 选择 **Pages** → 选择 **Connect to Git**
3. 首次使用需授权 Cloudflare 访问你的 GitHub 账号，授权后选择你 fork 的 `hd-icons-cf` 仓库
4. 配置构建设置（**Set up builds and deployments**）：

| 配置项 | 值 | 说明 |
|---|---|---|
| **Project name** | `hd-icons`（或自定义） | Cloudflare 上的项目名 |
| **Production branch** | `main` | 生产分支 |
| **Framework preset** | `None` | 不选任何框架 |
| **Build command** | 留空 | 无需构建步骤 |
| **Build output directory** | `public` | 静态文件目录 |

5. 点击 **Save and Deploy**

> **关键点**：Build command 留空即可，Build output directory **必须**填 `public`。Cloudflare 会自动识别项目中的 `functions/` 目录作为 Pages Functions（即 API 后端），无需额外配置。

### 4. 绑定 R2 存储桶

首次部署完成后，Pages Functions 还无法访问 R2，需要手动绑定：

1. 进入你的项目页面 → **Settings** → **Functions**
2. 下拉找到 **R2 bucket bindings** → 点击 **Add binding**
3. 填写绑定信息：

| 配置项 | 值 |
|---|---|
| **Variable name** | `ICONS_BUCKET` |
| **R2 bucket** | 选择 `hd-icons` |

4. 保存后，回到 **Deployments** 页面，点击最新部署的 **Retry deployment**（重新部署使绑定生效）

> **重要**：Variable name **必须**填 `ICONS_BUCKET`，这与代码中的 `env.ICONS_BUCKET` 对应。绑定后必须重新部署才能生效。

### 5.（可选）绑定自定义域名

如果你有自己的域名，可以绑定到站点上：

1. 在 Cloudflare Dashboard → **Workers & Pages** → 你的项目 → **Custom domains**
2. 点击 **Add domain**，输入你的域名（如 `icons.yourdomain.com`）
3. 按提示完成 DNS 配置

> 域名需要已在 Cloudflare DNS 管理。添加后 Cloudflare 会自动配置 SSL 证书，无需额外操作。

### 6. 首次同步图标数据

打开你的站点地址（如 `https://hd-icons.pages.dev` 或你绑定的自定义域名）。

点击页面右上角的 **同步按钮（🔄）**，从 GitHub 拉取图标数据。同步完成后刷新页面即可看到所有图标。

也可以用命令行触发：

```bash
curl -X POST https://你的站点地址/api/sync
```

> 同步只需执行一次。图标数据会存储在 R2 中，后续访问无需再次同步。

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:8787
# 首次使用需点击同步按钮拉取图标数据
```

## 项目结构

```
hd-icons-cf/
├── functions/                 # Pages Functions (API)
│   ├── _middleware.js          # CORS 中间件
│   ├── api/
│   │   ├── icons.js            # GET /api/icons — 图标列表
│   │   ├── stats.js            # GET /api/stats — 分类统计
│   │   ├── sync.js             # POST /api/sync — 从 GitHub 同步
│   │   ├── upload.js           # POST /api/upload — 上传图片
│   │   └── delete.js           # POST /api/delete — 删除图片
│   └── r2/
│       └── [[path]].js         # GET /r2/* — R2 图片访问
├── public/                    # 静态前端
│   ├── index.html              # 主页面
│   ├── style.css               # 样式（亮/暗双主题）
│   └── app.js                  # 前端逻辑
├── wrangler.toml              # Cloudflare Pages 配置
├── package.json
└── README.md
```

## Cloudflare 免费额度

| 资源 | 免费额度 | 本项目预估用量 |
|---|---|---|
| Pages 部署 | 500 次/月 | 每次 push 消耗 1 次 |
| Pages Functions 请求 | 10 万次/天 | 远低于限额 |
| R2 存储 | 10 GB/月 | < 1 MB（元数据）+ 上传图片 |
| R2 读取 | 1000 万次/月 | 按访问量 |
| 自定义域名 | 无限 | 按需 |
| SSL 证书 | 自动 | 内置 |

## 鸣谢

- [xushier/HD-Icons](https://github.com/xushier/HD-Icons) — 原始图标项目，提供了 1754+ 张高清仪表盘图标

## 📜 免责声明

⚖️ **法律声明**：本仓库中图像的（几乎）所有产品名称、商标和注册商标均为其各自所有者的财产。仪表盘导航用户仅将本仓库中的所有图像用于识别目的。

📝 **使用说明**：这些图像文件中出现的名称、商标和品牌的使用不表示认可。

## License

MIT — 图标版权归各自所有者所有。
