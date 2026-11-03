---
title: 重彩 Inkbloom
summary: 浏览器里的第一人称游戏：墨潮把世界的颜色抽走，你拿着笔刷把颜色还回来，或者按自己的想法重新涂。纸面墨线画风，无限野外加永久的城市副本。
tags: [游戏, 3D]
stack: [TypeScript, Three.js, WebGL 2, Vite]
order: 2
cover: ../assets/inkbloom.png
coverAlt: 墨线画风的野外：一棵棵多面体的树，远处是城市入口的塔楼
coverPosition: center 40%
architecture:
  - title: Inkbloom 的系统架构
    nodes:
      - { id: main, label: main.ts, kind: file, x: 0, y: 1, note: 页面入口：读档或建档，启动开放世界模式，显示开始菜单。 }
      - { id: mode, label: 开放世界模式, kind: module, x: 1, y: 1, note: 组合根：一个模式 = 一组系统 + 执行顺序。open-world.ts 是唯一知道所有系统的文件。 }
      - { id: input, label: 键鼠输入, kind: client, x: 2, y: 0, note: WASD 移动、跳跃、冲刺，左键还色，右键切换修复 / 涂鸦，滚轮换色。 }
      - { id: systems, label: 每帧系统, kind: service, x: 2, y: 1, note: player、scenes、interaction、tools、combat、save 等按固定顺序每帧运行；彼此不 import，只通过 GameContext 和事件协作。 }
      - { id: hud, label: HUD, kind: client, x: 1, y: 2, note: 左上角的目标提示、颜料和墨的数量、墨潮预警，每帧读状态更新 DOM。 }
      - { id: physics, label: AABB 物理, kind: module, x: 2, y: 2, note: 轴对齐盒子 + 空间哈希，自动上 0.55 米台阶；射线按网格 DDA 走，命中的面映射到表面编号，笔刷就知道涂到了哪面墙。 }
      - { id: world, label: 世界生成, kind: module, x: 3, y: 0, note: 纯函数：台地地形、群系、树、河和城市骨架都由（种子, 坐标）算出来；不依赖 Three.js，能在 Node 里测试。 }
      - { id: content, label: 设计数据, kind: file, x: 4, y: 0, note: 调色板、群系、建筑模板、数值、按键；改设计主要改这里，系统里不写魔法数字。 }
      - { id: patch, label: 补丁, kind: module, x: 3, y: 1, primary: true, note: 改存档的唯一入口：系统调 ctx.apply(patch)，成功后广播 patch:applied；以后联机也走同一套。 }
      - { id: state, label: 表面状态, kind: store, x: 4, y: 1, note: 每个表面一字节：0 抽色、1 原色、2+n 涂鸦第 n 色。存档、补丁、画面读的是同一个字节。 }
      - { id: render, label: 墨线渲染, kind: service, x: 3, y: 2, note: 每区块合并成一个网格、一个材质，写 G-buffer，后处理画纸、墨线、排线和水彩；饱和度 0 是线稿，1 是彩色。 }
      - { id: save, label: localStorage, kind: store, x: 4, y: 2, note: 防抖、补丁式写入；城市存档带布局指纹，生成器改了就重置这座城，而不是错位。 }
    edges:
      - { from: main, to: mode, label: 启动 }
      - { from: mode, to: systems, label: 组装 }
      - { from: input, to: systems, label: 每帧读取 }
      - { from: systems, to: hud, label: 读状态 }
      - { from: systems, to: physics, label: 碰撞与射线 }
      - { from: systems, to: world, label: 生成区块和城市 }
      - { from: world, to: content, label: 读取 }
      - { from: systems, to: patch, label: ctx.apply }
      - { from: patch, to: state, label: 唯一写入 }
      - { from: state, to: render, label: 状态纹理 }
      - { from: state, to: save, label: 防抖存档 }
    steps:
      - { caption: 页面入口读档，启动开放世界模式，把系统按顺序组装起来, nodes: [main, mode] }
      - { caption: 每帧按固定顺序跑系统：读输入、移动、场景、交互、笔刷，最后更新 HUD, nodes: [input, systems, hud] }
      - { caption: 世界由种子算出来：地形、群系、城市骨架都是纯函数, nodes: [world, content] }
      - { caption: 笔刷射线打到哪个表面，就生成一个补丁；补丁是改存档的唯一入口, nodes: [physics, patch] }
      - { caption: 每个表面一字节状态，同时驱动墨线渲染和存档, nodes: [state, render, save] }
---

## 这是什么

世界本来是彩色的。墨潮把颜色抽走，留下黑白线稿；你把颜色还回来，或者按自己的想法重新涂。

浏览器里的第一人称游戏，PC 键鼠操作，无限野外加永久的城市副本，纸面墨线画风。

## 怎么玩

- **还色**：修复笔刷还原原色，涂鸦笔刷自己选色；进度只看有没有颜色，不看是谁的颜色
- **颜料循环**：在野外的花田、浆果丛、矿脉、芦苇丛采集颜料和墨，城里的画室把墨提炼成通用颜料
- **街区与墨潮**：每个街区按上色比例分成抽色、清理中、有色、繁荣；每隔几分钟来一次墨潮，要用颜料把墨帘推回去
- **战斗**：抽色街区有墨怪据点，清空据点才能上色；墨怪看不见你时会用 A* 绕路追过来
- **通关**：全城有色即恢复，周围野外重新上色，然后去下一座城；恢复的城之间可以传送

## 技术

- 世界是种子的函数：只存玩家造成的改变，不存生成的内容
- 改存档只走补丁，为以后联机留好了同一套协议
- 每个表面一字节颜色状态，存档、补丁和画面永远一致
- 自写的墨线后处理渲染和 AABB 物理，基于 Three.js 和 WebGL 2
