# ifor

个人项目陈列室。名字取自 `if` + `for`：两个词共用中间那个 f。

用 [Astro](https://docs.astro.build)（Node 服务端模式）+ Tailwind CSS 4 + PostgreSQL 构建。项目信息和访客留言都存在数据库里，在 `/admin` 后台管理。

## 本地开发

需要 Node.js ≥ 22.22.0 和 Docker。

```bash
npm install
cp .env.example .env    # 填好数据库连接串和后台密码
npm run db:up           # 启动本地 PostgreSQL（127.0.0.1:5442）
npm run db:seed         # 第一次运行：把 db/seed 里的示例项目导入数据库
npm run dev             # http://localhost:4321
```

本地 `.env` 里的连接串用 `postgres://ifor:ifor@127.0.0.1:5442/ifor`。

其他命令：

```bash
npm run check    # 类型检查
npm run build    # 构建到 dist/
npm run db:down  # 停掉本地数据库
```

## 后台

打开 `/admin`，用 `ADMIN_PASSWORD` 登录。

- **项目**：新建、编辑、删除；上传封面（自动压成 webp）；正文用 Markdown，可以直接插入图片；取消勾选"在网站上显示"就变成草稿。
- **留言**：访客点网站右上角"联系我"发来的内容；可以标为已读或删除。侧栏会显示未读数。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串，表会在第一次访问时自动创建 |
| `ADMIN_PASSWORD` | 后台登录密码，至少 8 位 |
| `SESSION_SECRET` | 可选，签名登录 Cookie 的密钥；不设则由密码派生，改密码会让所有人重新登录 |
| `SITE_URL` | **构建时**传入的线上地址，如 `https://ifor.example.com`。不设的话线上后台的表单提交会被拦下 |

## 部署（Docker）

```bash
docker build --build-arg SITE_URL=https://你的域名 -t ifor-site .
docker run -d --name ifor-site -p 4321:4321 \
  -e DATABASE_URL=postgres://用户:密码@主机:5432/库名 \
  -e ADMIN_PASSWORD=你的后台密码 \
  -e SESSION_SECRET=一个长随机串 \
  ifor-site
```

前面放 Nginx 等反向代理时，记得转发域名和协议：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

第一次上线想带上示例项目，可以在本机对线上库跑一次导入（已存在的项目会跳过）：

```bash
DATABASE_URL=线上连接串 node scripts/seed.ts
```

## 结构

```
src/
  site.ts                 站点信息（名字、自我介绍）
  lib/                    数据库、项目、留言、图片、登录
  middleware.ts           后台登录和来源校验
  pages/                  首页、项目详情、404、图片输出、留言接口
  pages/admin/            后台页面
  components/             网站组件；admin/ 下是后台表单
  styles/global.css       颜色、字体、正文排版
db/seed/                  示例项目的 Markdown 和图片，只给 db:seed 用
scripts/seed.ts           导入脚本
```
