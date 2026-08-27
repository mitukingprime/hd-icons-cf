# HD Icons — Cloudflare Pages Edition

基于 [xushier/HD-Icons](https://github.com/xushier/HD-Icons) 的 Cloudflare Pages 部署版本。

**推送到 GitHub → Cloudflare 自动部署。**

**架构**：Cloudflare Pages（静态前端）+ Pages Functions（API）+ R2（对象存储）

## 功能

- 浏览 1754+ 高清仪表盘图标（1024x1024）
- 按分类筛选：圆角 / 圆形 / 矢量 / 上传
- 搜索图标（Ctrl+K 快速聚焦）
- 单击复制图标 CDN 地址
- 放大预览
- 自定义图标上传 / 删除
- 日间 / 夜间模式
- 移动端自适应
- GitHub Actions 每日自动同步

## 部署步骤

### 1. 推送到 GitHub

```bash
cd hd-icons-cf
git init
git add .
git commit -m "init: HD Icons Cloudflare Pages"
git remote add origin https://github.com/你的用户名/hd-icons-cf.git
git branch -M main
git push -u origin main
```

### 2. 创建 R2 存储桶

```bash
npm install -g wrangler
wrangler login
wrangler r2 bucket create hd-icons
```

### 3. 在 Cloudflare Dashboard 连接 GitHub

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择 `hd-icons-cf` 仓库
3. 配置构建设置：
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `public`
4. 点击 **Save and Deploy**

### 4. 绑定 R2 存储桶

部署成功后：

1. 进入项目 → **Settings** → **Functions** → **R2 bucket bindings**
2. 点击 **Add binding**：
   - Variable name: `ICONS_BUCKET`
   - R2 bucket: 选择 `hd-icons`
3. 回到 **Deployments**，点击最新部署的 **Retry deployment**

### 5. 首次同步

打开你的站点（`https://hd-icons.pages.dev`），点击右上角同步按钮。

### 6.（可选）设置 GitHub Actions 自动同步

在 GitHub 仓库 Settings → Secrets 中添加：
- `SITE_URL`: 你的站点地址（如 `https://hd-icons.pages.dev`）

之后 GitHub Actions 每天自动同步图标数据。

## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:8787
```

## 项目结构

```
hd-icons-cf/
├── functions/                 # Pages Functions (API)
│   ├── _middleware.js          # CORS 中间件
│   ├── api/
│   │   ├── icons.js            # GET /api/icons
│   │   ├── stats.js            # GET /api/stats
│   │   ├── sync.js             # POST /api/sync
│   │   ├── upload.js           # POST /api/upload
│   │   └── delete.js           # POST /api/delete
│   └── r2/
│       └── [[path]].js         # GET /r2/* (R2 图片)
├── public/                    # 静态前端
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .github/workflows/
│   ├── deploy.yml             # push 触发部署（备用）
│   └── sync.yml               # 每日自动同步
├── wrangler.toml              # Cloudflare Pages 配置
├── package.json
└── README.md
```

## License

MIT — 图标版权归各自所有者所有。
