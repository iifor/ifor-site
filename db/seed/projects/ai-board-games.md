---
title: 硅基桌游
summary: 通用 AI 对战平台：用 TypeScript 声明一个游戏的流程、规则和提示词，由引擎调度 AI 玩家完成对局，并在前台实时播放与回放。
tags: [AI, 桌游]
stack: [TypeScript, React, Express, PostgreSQL]
order: 1
art: seats
architecture:
  - title: 硅基桌游的系统架构
    nodes:
      - { id: client, label: 对局舞台, kind: client, x: 0, y: 0, note: C 端（React 19 + Vite）：大厅、对局舞台、历史与回放；和后台共用 shared 包里的协议类型。 }
      - { id: admin, label: 管理后台, kind: client, x: 0, y: 2, note: B 端（React + antd）：配置供应商、模型、玩家和音色，开对局、看 Trace、用调试台。 }
      - { id: gateway, label: 实时网关, kind: service, x: 1, y: 0, note: WebSocket：客户端先 hello，再逐个 ack；按顺序推送舞台事件，实时和回放走同一条路。 }
      - { id: tts, label: 语音合成, kind: external, x: 1, y: 1, note: 按座位音色合成发言语音（Azure、Mimo），按音色和文本缓存；失败就退回字幕或浏览器朗读。 }
      - { id: api, label: REST API, kind: service, x: 1, y: 2, note: Express：管理员登录，供应商、模型、玩家、音色的增删改，创建和调试对局，游戏目录。 }
      - { id: bus, label: 事件总线, kind: module, x: 2, y: 0, note: 进程内事件：对局有新事件、AI 任务入队、观众确认进度、状态变化。 }
      - { id: runtime, label: 对局运行时, kind: service, x: 2, y: 1, primary: true, note: 在一个事务里锁定对局 → 调用引擎 advance → 写回快照、AI 任务和舞台事件，提交后通知事件总线。 }
      - { id: db, label: PostgreSQL, kind: store, x: 2, y: 2, note: 对局快照、AI 任务、舞台事件，以及供应商、模型、玩家、音色等配置。 }
      - { id: worker, label: AI Worker, kind: service, x: 3, y: 0, note: 事件驱动 + 定时兜底轮询：领取 AI 任务，主模型失败切备用模型，结果交回运行时。 }
      - { id: llm, label: 模型供应商, kind: ai, x: 4, y: 0, note: OpenAI 兼容的 Chat Completions 接口，要求返回 JSON；每个座位可以接不同的模型。 }
      - { id: engine, label: 引擎, kind: module, x: 3, y: 1, note: 纯运行时：解释阶段图、调度 AI、校验合法性、隔离信息、重试兜底；不碰网络、时间和随机数。 }
      - { id: games, label: 游戏定义, kind: module, x: 4, y: 1, note: 辩论赛、狼人杀……每个游戏 = 阶段图 + 规则纯函数 + 提示词模板，通过注册表提供给前后端。 }
    edges:
      - { from: client, to: gateway, label: WebSocket }
      - { from: admin, to: api, label: HTTP }
      - { from: api, to: runtime, label: 开局与调试 }
      - { from: api, to: db, label: 读写配置 }
      - { from: runtime, to: engine, label: advance }
      - { from: engine, to: games, label: GameSpec }
      - { from: runtime, to: db, label: 事务写回 }
      - { from: runtime, to: bus, label: 提交后通知 }
      - { from: bus, to: worker, label: AI 任务 }
      - { from: worker, to: llm, label: 调用, async: true }
      - { from: worker, to: runtime, label: AI 结果 }
      - { from: bus, to: gateway, label: 新事件 }
      - { from: gateway, to: tts, label: 合成语音 }
    steps:
      - { caption: 观众在舞台上看对局，管理员在后台配置模型、玩家和音色, nodes: [client, admin] }
      - { caption: 实时网关推送舞台事件并配上语音，REST API 处理后台操作, nodes: [gateway, tts, api] }
      - { caption: 对局运行时在一个事务里推进对局，并写回 PostgreSQL, nodes: [runtime, db] }
      - { caption: 引擎解释游戏的阶段图，规则和提示词来自游戏定义, nodes: [engine, games] }
      - { caption: 事件总线通知 AI Worker 领取任务、调用模型，结果再交回运行时, nodes: [bus, worker, llm] }

  - title: 一局辩论赛是怎么跑起来的
    nodes:
      - { id: spec, label: 辩论赛 GameSpec, kind: file, x: 0, y: 1, note: 用 TypeScript 声明角色（正方 ×4、反方 ×4、评委）和 6 个阶段：辩题公布、立论、攻辩、总结陈词、评委点评、最佳辩手。 }
      - { id: setup, label: 开局, kind: module, x: 1, y: 1, note: 校验人数，按声明分配座位：正反方各 4 人，其余都是评委；随机抽一个辩题写进状态。 }
      - { id: engine, label: 引擎推进, kind: module, x: 2, y: 1, primary: true, note: advance 是纯函数：沿阶段图一步步走，走到需要 AI 发言的阶段就停下，产出 AI 请求和舞台事件。 }
      - { id: prompt, label: 提示词组装, kind: module, x: 2, y: 0, note: 平台契约 + 身份（正方 / 反方 / 评委）+ 规则 + 这个座位能看到的历史发言 + 本阶段要求，比如立论不超过 300 字。 }
      - { id: worker, label: AI Worker, kind: service, x: 3, y: 0, note: 领取 AI 任务去调用模型；主模型失败自动换备用模型。 }
      - { id: llm, label: 辩手与评委, kind: ai, x: 4, y: 0, note: 每个座位可以接不同供应商的模型，要求返回 JSON。 }
      - { id: check, label: 校验与兜底, kind: decision, x: 4, y: 1, note: 解析 → 合法性 → 内容校验（字数上限）；不合格带上原因重问，次数用尽就用兜底发言“我方坚持己方立场”。 }
      - { id: result, label: 判定结果, kind: decision, x: 2, y: 2, note: 汇总评委的判决和最佳辩手投票，得出胜方和 MVP。 }
      - { id: db, label: PostgreSQL, kind: store, x: 3, y: 2, note: 每次推进在一个事务里写回快照、AI 任务和舞台事件。 }
      - { id: stage, label: 对战舞台, kind: client, x: 4, y: 2, note: 正方在左、反方在右、评委在席，按顺序播放发言并配上语音；回放走同一条路。 }
    edges:
      - { from: spec, to: setup, label: 编译 }
      - { from: setup, to: engine, label: 初始快照 }
      - { from: engine, to: prompt, label: 轮到发言 }
      - { from: prompt, to: worker, label: AI 请求, async: true }
      - { from: worker, to: llm, label: 调用 }
      - { from: llm, to: check, label: JSON 回复 }
      - { from: check, to: engine, label: 发言入局 }
      - { from: engine, to: result, label: 终局 }
      - { from: engine, to: db, label: 事务写回 }
      - { from: db, to: stage, label: 按序推送 }
    steps:
      - { caption: GameSpec 声明阶段和角色，开局分配正反方、评委并抽辩题, nodes: [spec, setup] }
      - { caption: 引擎沿阶段图推进，走到立论、攻辩、总结就停下等 AI 发言, nodes: [engine] }
      - { caption: 按座位组装提示词，AI Worker 调用各自的模型, nodes: [prompt, worker, llm] }
      - { caption: 回复先过解析、合法性和字数校验，不合格就重问，实在不行用兜底发言, nodes: [check] }
      - { caption: 每一步在事务里写进 PostgreSQL，舞台按顺序播放发言, nodes: [db, stage] }
      - { caption: 评委判决和最佳辩手投票汇总成最终结果, nodes: [result] }

  - title: 一局狼人杀是怎么跑起来的
    nodes:
      - { id: board, label: 板子与身份, kind: file, x: 0, y: 1, note: 预女猎白等板子是狼人杀 GameSpec 的变体；开局按板子给 12 名 AI 分配身份，身份只有本人知道。 }
      - { id: engine, label: 引擎推进, kind: module, x: 1, y: 1, primary: true, note: 夜晚、警长竞选、白天、死亡、赛后五组阶段拼成一张阶段图；每一步都是纯函数，不碰网络、时间和随机数。 }
      - { id: visibility, label: 信息隔离, kind: module, x: 2, y: 0, note: 状态按可见性声明投影：狼人夜聊只进狼人频道，女巫的药只有女巫知道；主持频道的运营信息任何 AI 都看不到。 }
      - { id: prompt, label: 提示词组装, kind: module, x: 3, y: 0, note: 每个 AI 只拿到自己能看见的历史和状态，再加上身份和本阶段要求。 }
      - { id: llm, label: 12 名 AI 玩家, kind: ai, x: 4, y: 0, note: 经 AI Worker 调用各自的模型，返回发言、投票或技能目标。 }
      - { id: check, label: 行动校验, kind: decision, x: 4, y: 1, note: 解析 → 合法性（目标能不能选、技能能不能用）→ 内容校验；不合格重问，用尽后走兜底。 }
      - { id: triggers, label: 触发器, kind: module, x: 0, y: 2, note: 有人出局就派发事件，插入遗言、猎人开枪、移交警徽等阶段，结束后回到原流程；狼人自爆直接跳进黑夜。 }
      - { id: verdict, label: 胜负判定, kind: decision, x: 1, y: 2, note: 每一步之后都检查：狼人全部出局好人胜，屠边狼人胜；最多打 6 天。 }
      - { id: db, label: PostgreSQL, kind: store, x: 3, y: 2, note: 快照、AI 任务、舞台事件在同一个事务里写入，所以随时能回放。 }
      - { id: stage, label: 圆桌舞台, kind: client, x: 4, y: 2, note: 按公开视角播放：观众看不到身份，赛后复盘才全部揭晓。 }
    edges:
      - { from: board, to: engine, label: 开局 }
      - { from: engine, to: visibility, label: 需要行动 }
      - { from: visibility, to: prompt, label: 可见信息 }
      - { from: prompt, to: llm, label: AI 请求, async: true }
      - { from: llm, to: check, label: JSON 回复 }
      - { from: check, to: engine, label: 行动入局 }
      - { from: engine, to: triggers, label: 有人出局 }
      - { from: engine, to: verdict, label: 每步检查 }
      - { from: engine, to: db, label: 事务写回 }
      - { from: db, to: stage, label: 公开视角 }
    steps:
      - { caption: 选一个板子，开局按板子给 12 名 AI 分配身份, nodes: [board] }
      - { caption: 引擎沿着夜晚、警长竞选、白天的阶段图推进，每步都是纯函数, nodes: [engine] }
      - { caption: 按可见性给每个 AI 投影它能看到的信息，再组装提示词, nodes: [visibility, prompt] }
      - { caption: AI 玩家返回行动，先校验目标和技能是否合法，不合法就重问, nodes: [llm, check] }
      - { caption: 有人出局就插入遗言、开枪等阶段；每一步后检查胜负, nodes: [triggers, verdict] }
      - { caption: 所有变化写进 PostgreSQL，舞台按公开视角播放，复盘时才揭晓身份, nodes: [db, stage] }
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
