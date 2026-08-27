# HD Icons — Cloudflare Pages Edition

基于 [xushier/HD-Icons](https://github.com/xushier/HD-Icons) 的 Cloudflare Pages 部署版本。

**Fork → 连接 Cloudflare → 自动部署。无需服务器，零费用。**

**架构**：Cloudflare Pages（静态前端 + 内置图标）+ Pages Functions（API）+ R2 或 Workers KV（用户上传存储，二选一）

## 功能

- 浏览 1754+ 高清仪表盘图标（1024x1024）
- 按分类筛选：圆角 / 圆形 / 矢量 / 上传
- 搜索图标（Ctrl+K 快速聚焦）
- 单击复制图标地址
- 放大预览
- 自定义图标上传 / 删除
- 日间 / 夜间模式
- 移动端自适应

## 部署步骤

### 1. Fork 本项目

Fork 本项目到你的 GitHub 账号：


| 仓库                                                                        | 作用                           | Fork 链接                                                      |
| ------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| [mitukingprime/hd-icons-cf](https://github.com/mitukingprime/hd-icons-cf) | 本项目（含全部图标 + Cloudflare 部署代码） | [点击 Fork](https://github.com/mitukingprime/hd-icons-cf/fork) |


> **提示**：如果你不想公开部署代码，可以在 fork 后将仓库改为 **Private**（Settings → Danger Zone → Change visibility）。Cloudflare Pages 连接 GitHub 后可以正常访问私有仓库，不影响部署。



### 2. 选择存储方式

项目支持两种存储后端，**只需配置其中一个**。系统会自动检测使用哪种存储。

#### 方式一：Workers KV（推荐新手，免费无需信用卡）

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 **存储和数据库** →  **Workers** **KV**
3. 点击 **创建命名空间**
4. 输入名称：`hd-icons`
5. 点击 **创建**



#### 方式二：R2 存储桶（需要绑定信用卡）

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单点击 **存储和数据库** →  **R2 对象存储**
3. 点击 **创建存储桶**
4. 输入存储桶名称：`hd-icons`
5. 点击 **创建存储桶** 确认



### 3. 在 Cloudflare 连接 GitHub 部署

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → 左侧菜单 **计算** → **Workers & Pages**
2. 点击 **创建应用程序** → 底部选择 **Pages** → 选择 **导入现有 Git 存储库**
3. 首次使用需授权 Cloudflare 访问你的 GitHub 账号，授权后选择你 fork 的 `hd-icons-cf` 仓库
4. 配置构建设置：


| 配置项        | 值                | 说明               |
| ---------- | ---------------- | ---------------- |
| **项目名称**   | `hd-icons`（或自定义） | Cloudflare 上的项目名 |
| **生产分支**   | `main`           | 生产分支             |
| **架构框架**   | `None`           | 不选任何框架           |
| **构建命令**   | 留空               | 无需构建步骤           |
| **构建输出命令** | `public`         | 静态文件目录           |


1. 点击 **保存并部署**

> **关键点**：构建命令 留空即可，构建输出命令 **必须** 填 `public`。Cloudflare 会自动识别项目中的 `functions/` 目录作为 Pages Functions（即 API 后端），无需额外配置。



### 4. 绑定存储

首次部署完成后，Pages Functions 还无法访问存储，需要手动绑定（**只需配置 R2 或 KV 其中一个**）：

1. 进入你的项目页面 → **设置** → **绑定**

**如果使用 KV：**

1. 下拉找到 **KV 命名空间** → 点击
2. 填写绑定信息：


| 配置项         | 值             |
| ----------- | ------------- |
| **变量名称**    | `ICONS_KV`    |
| **KV 命名空间** | 选择 `hd-icons` |


**如果使用 R2：**

1. 下拉找到 **R2 存储桶** → 点击 
2. 填写绑定信息：


| 配置项        | 值              |
| ---------- | -------------- |
| **变量名称**   | `ICONS_BUCKET` |
| **R2 存储桶** | 选择 `hd-icons`  |


1. 保存后，回到 **部署** 页面，点击最新部署的 **重试部署**（重新部署使绑定生效）

> **重要**：变量名称 必须填 `ICONS_KV` 或 `ICONS_BUCKET`（与所选存储方式对应）。绑定后必须重新部署才能生效。



### 5.（可选）绑定自定义域名

如果你有自己的域名，可以绑定到站点上：

1. 在 Cloudflare Dashboard → **Workers & Pages** → 你的项目 → **自定义域**
2. 点击 **设置自定义域**，输入你的域名（如 `icons.yourdomain.com`）
3. 按提示完成 DNS 配置

> 域名需要已在 Cloudflare DNS 管理。添加后 Cloudflare 会自动配置 SSL 证书，无需额外操作。



### 6.（可选）配置登录保护

部署完成后，首次访问站点会弹出"设置管理员账号"窗口，设置用户名和密码即可。设置后，上传和删除功能需要登录才能使用，浏览图标无需登录。

如果不需要登录保护，忽略设置窗口，直接关闭即可（上传和删除对所有人开放）。

> 账号信息存储在所选存储后端（R2 或 KV）中，可以在登录后修改密码。如需重置密码，删除 `_meta/auth.json` 键即可重新设置（R2 在存储桶中删除该文件，KV 在 namespace 中删除该 key）。



### 7. 完成！

打开你的站点地址（如 `https://hd-icons.pages.dev` 或你绑定的自定义域名），即可看到全部 1754+ 图标。无需任何额外同步步骤，图标已内置在项目中。

> **提示**：如果有不需要的图标，可以到 `public/icons/` 对应的子目录下删除，提交后仓库会自动精简。删除后 Cloudflare 会自动重新部署。



## 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:8787
```

本地开发时，`wrangler.toml` 中配置 R2 或 KV 二选一：

- **R2**：取消注释 `[[r2_buckets]]` 段，运行 `npm run dev`（已内置 `--r2 ICONS_BUCKET`）
- **KV**：注释掉 R2 段，取消注释 `[[kv_namespaces]]` 并填入 namespace id，运行：
  ```bash
  npx wrangler pages dev public --kv ICONS_KV
  ```



## 项目结构

```
hd-icons-cf/
├── functions/                 # Pages Functions (API)
│   ├── _lib/
│   │   └── storage.js          # R2 / KV 存储抽象层
│   ├── _middleware.js          # CORS 中间件
│   ├── api/
│   │   ├── _middleware.js      # JWT Cookie 验证（POST 请求）
│   │   ├── check-auth.js       # GET /api/check-auth — 检查登录状态
│   │   ├── setup.js            # POST /api/setup — 首次设置管理员账号
│   │   ├── login.js            # POST /api/login — 登录
│   │   ├── logout.js           # POST /api/logout — 退出登录
│   │   ├── change-password.js  # POST /api/change-password — 修改密码
│   │   ├── icons.js            # GET /api/icons — 图标列表
│   │   ├── stats.js            # GET /api/stats — 分类统计
│   │   ├── upload.js           # POST /api/upload — 上传图片
│   │   └── delete.js           # POST /api/delete — 删除图片
│   └── r2/
│       └── [[path]].js         # GET /r2/* — 用户上传图片访问（R2 或 KV）
├── public/                    # 静态前端 + 内置图标
│   ├── icons/                  # 1754 张高清图标
│   │   ├── border-radius/      # 圆角图标 (PNG)
│   │   ├── circle/             # 圆形图标 (PNG)
│   │   └── svg/                # 矢量图标 (SVG)
│   ├── icons.json              # 图标元数据
│   ├── index.html              # 主页面
│   ├── style.css               # 样式（亮/暗双主题）
│   └── app.js                  # 前端逻辑
├── package.json
├── LICENSE
└── README.md
```



## Cloudflare 免费额度


| 资源                 | 免费额度      | 本项目预估用量        |
| ------------------ | --------- | -------------- |
| Pages 部署           | 500 次/月   | 每次 push 消耗 1 次 |
| Pages Functions 请求 | 10 万次/天   | 远低于限额          |
| KV 读取              | 10 万次/天   | 按访问量           |
| KV 写入              | 1000 次/天  | 上传/删除操作        |
| KV 存储              | 1 GB      | 元数据 + 上传图片     |
| R2 存储              | 10 GB/月   | 用户上传图片（R2 方案）  |
| R2 读取              | 1000 万次/月 | 按访问量（R2 方案）    |
| 自定义域名              | 无限        | 按需             |
| SSL 证书             | 自动        | 内置             |


> **提示**：KV 免费额度无需信用卡；R2 免费额度更高但需绑定信用卡。个人/小型站点通常 KV 已足够。



## 鸣谢

- [xushier/HD-Icons](https://github.com/xushier/HD-Icons) — 原始图标项目，提供了 1754+ 张高清仪表盘图标



## 📜 免责声明

⚖️ **法律声明**：本仓库中图像的（几乎）所有产品名称、商标和注册商标均为其各自所有者的财产。仪表盘导航用户仅将本仓库中的所有图像用于识别目的。

📝 **使用说明**：这些图像文件中出现的名称、商标和品牌的使用不表示认可。

