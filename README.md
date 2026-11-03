# ifor

个人项目陈列室。名字取自 `if` + `for`：两个词共用中间那个 f。

用 [Astro](https://docs.astro.build) + Tailwind CSS 4 构建，输出纯静态页面。

## 开发

需要 Node.js ≥ 22.22.0（Astro 7.4.1 的要求）。

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # 类型检查
npm run build    # 输出到 dist/
npm run preview  # 本地预览构建结果
```

## 添加一个项目

在 `src/content/projects/` 里新建一个 Markdown 文件，文件名就是网址：`zombie.md` → `/projects/zombie/`。

```md
---
title: 项目名
summary: 一两句话介绍，会显示在首页卡片上
tags: [AI, 游戏]          # 首页筛选条由所有项目的标签自动生成
stack: [TypeScript, React]
order: 3                  # 越小越靠前
cover: ../../assets/projects/xxx.png   # 可选，封面图放在 src/assets/projects/
coverAlt: 封面图的文字描述
coverPosition: center 30% # 可选，封面裁切位置
demo: https://...         # 可选，在线试玩
source: https://...       # 可选，源码
---

正文用 Markdown 写：做了什么、怎么做的、踩过的坑。
```

字段定义在 `src/content.config.ts`。

## 个人信息

名字、自我介绍、GitHub、邮箱都在 `src/site.ts` 里改。链接留空就不显示。

## 结构

```
src/
  site.ts              站点信息
  content.config.ts    项目字段定义
  content/projects/    每个项目一个 Markdown
  assets/projects/     项目图片（构建时自动压缩成 webp）
  styles/global.css    颜色、字体、深浅色主题、正文排版
  layouts/Layout.astro
  components/          Header、Footer、ProjectCard、CodeLines 等
  pages/               首页、项目详情、404
```

深色是默认主题。浅色通过 `<html data-theme="light">` 切换，颜色变量都在 `global.css` 顶部。
