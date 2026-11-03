---
title: AI Board Games
summary: 通用 AI 对战平台：用 TypeScript 声明一个游戏的流程、规则和提示词，由引擎调度 AI 玩家完成对局，并在前台实时播放与回放。
tags: [AI, 桌游]
stack: [TypeScript, React, Express, PostgreSQL]
order: 1
art: seats
---

## 这是什么

一个游戏 = 声明式的阶段图（`GameSpec`）+ 规则纯函数 + 提示词模板。引擎负责推进流程、调度 AI 玩家、校验行动是否合法、隔离每个玩家能看到的信息；前台用一个通用舞台实时播放对局，结束后还能回放。

首版有两个游戏：**辩论赛**和**狼人杀标准 12 人局**。

## 狼人杀 12 人局

预女猎白配置：狼人 ×4、预言家、女巫、猎人、白痴、平民 ×4。十二个座位上都是 AI 玩家，引擎按阶段调度发言、投票和夜间行动。

## 技术栈

- pnpm workspace、TypeScript strict、zod
- 前端：React 19 + Vite
- 服务端：Express + WebSocket，数据库 PostgreSQL 16

## 做的过程中

[写写踩过的坑、学到的东西。]
