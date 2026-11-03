---
title: ifor 个人网站
summary: 就是你正在看的这个网站：Astro 服务端渲染 + PostgreSQL，带管理后台、访客留言和 SeeCode 风格的动态图解。
tags: [网站, AI]
stack: [Astro, TypeScript, Tailwind CSS, PostgreSQL]
order: 3
art: loop
architecture:
  - title: ifor 的系统架构
    nodes:
      - { id: visitor, label: 访客浏览器, kind: client, x: 0, y: 0, note: 首页、项目详情和动态图解都由服务端按请求渲染；点“联系我”可以直接留言。 }
      - { id: owner, label: 后台, kind: client, x: 0, y: 2, note: /admin：用密码登录，编辑项目、上传图片、写图解，查看和处理留言。 }
      - { id: pages, label: 页面渲染, kind: service, x: 1, y: 0, note: Astro 7 的 Node 服务端模式：首页、项目详情、404；Markdown 正文用 marked 渲染，图片从 /media 输出并长期缓存。 }
      - { id: contact, label: 留言接口, kind: service, x: 1, y: 1, note: POST /api/messages：同一 IP 十分钟最多 5 条，隐藏的陷阱字段拦掉自动填表的机器人。 }
      - { id: guard, label: 登录与来源校验, kind: module, x: 1, y: 2, note: 中间件：后台页面和接口必须带有效的签名 Cookie，提交请求必须来自本站，防止跨站伪造。 }
      - { id: admin, label: 后台页面, kind: service, x: 2, y: 2, note: 项目的增删改、封面上传、图解 JSON 校验，留言的已读和删除。 }
      - { id: data, label: 数据层, kind: module, x: 2, y: 1, primary: true, note: projects、messages、media 三个模块，所有 SQL 都在这里；第一次访问时自动建表。 }
      - { id: sharp, label: 图片处理, kind: module, x: 3, y: 2, note: 上传的图片用 sharp 压成 webp，最宽 1600px。 }
      - { id: db, label: PostgreSQL, kind: store, x: 3, y: 1, note: 项目、留言和图片都存在这一个库里；整站打成 Docker 镜像部署。 }
    edges:
      - { from: visitor, to: pages, label: HTTP }
      - { from: visitor, to: contact, label: 联系我, async: true }
      - { from: owner, to: guard, label: 登录 Cookie }
      - { from: guard, to: admin }
      - { from: pages, to: data, label: 读项目 }
      - { from: contact, to: data, label: 写留言 }
      - { from: admin, to: data, label: 读写 }
      - { from: admin, to: sharp, label: 上传图片 }
      - { from: sharp, to: db, label: webp }
      - { from: data, to: db, label: SQL }
    steps:
      - { caption: 访客浏览网站、给我留言；我在后台管理内容, nodes: [visitor, owner] }
      - { caption: Astro 按请求渲染页面；留言接口限流防机器人；后台请求先过登录和来源校验, nodes: [pages, contact, guard] }
      - { caption: 后台页面负责编辑项目、上传图片、写图解、处理留言, nodes: [admin] }
      - { caption: 数据层统一读写数据库，上传的图片先压成 webp, nodes: [data, sharp] }
      - { caption: 所有内容存在 PostgreSQL，整站打成 Docker 镜像部署, nodes: [db] }
---

## 这是什么

就是你现在看到的这个网站。首页的神经网络动画、项目里的动态图解、右上角的“联系我”，以及背后的管理后台，都在同一个 Astro 项目里。

## 技术栈

- Astro 7（Node 服务端模式）+ Tailwind CSS 4
- PostgreSQL：项目、留言、图片都存在库里
- 后台：签名 Cookie 登录 + 来源校验；上传的图片用 sharp 压成 webp
- Docker 部署
