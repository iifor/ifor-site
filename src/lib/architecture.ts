// 项目架构图的数据格式。写法参考 SeeCode：只描述有什么、怎么连、大概在哪，
// 坐标、连线走向、动画都由 ArchitectureDiagram 组件计算。

export const NODE_KINDS = [
  'client',
  'service',
  'module',
  'store',
  'external',
  'ai',
  'file',
  'role',
  'phase',
  'decision',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export type ArchNode = {
  id: string;
  label: string;
  kind: NodeKind;
  /** 网格坐标：x 是第几列，y 是第几行，可以用小数微调 */
  x: number;
  y: number;
  /** 点开节点时显示的说明 */
  note?: string;
  /** 最重要的那个节点，用强调色 */
  primary?: boolean;
};

export type ArchEdge = {
  from: string;
  to: string;
  label?: string;
  /** 异步 / 事件，用虚线 */
  async?: boolean;
};

export type ArchStep = { caption: string; nodes: string[] };

export type ArchitectureSpec = {
  title?: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
  /** 搭建顺序；不写就按列从左到右 */
  steps?: ArchStep[];
};

export const KIND_LABELS: Record<NodeKind, string> = {
  client: '前端',
  service: '服务',
  module: '模块',
  store: '存储',
  external: '外部',
  ai: 'AI',
  file: '文件',
  role: '角色',
  phase: '阶段',
  decision: '判定',
};

export const ARCHITECTURE_EXAMPLE: ArchitectureSpec = {
  nodes: [
    { id: 'web', label: '浏览器', kind: 'client', x: 0, y: 0, note: '访客看到的页面' },
    { id: 'api', label: 'API 服务', kind: 'service', x: 1, y: 0, primary: true, note: '处理请求的核心' },
    { id: 'db', label: 'PostgreSQL', kind: 'store', x: 2, y: 0, note: '存业务数据' },
    { id: 'llm', label: '大模型', kind: 'ai', x: 2, y: 1, note: '生成内容' },
  ],
  edges: [
    { from: 'web', to: 'api', label: 'HTTP' },
    { from: 'api', to: 'db', label: '读写' },
    { from: 'api', to: 'llm', label: '调用', async: true },
  ],
  steps: [
    { caption: '访客在浏览器里发起请求', nodes: ['web'] },
    { caption: 'API 服务接住请求', nodes: ['api'] },
    { caption: '读写数据库，并调用大模型', nodes: ['db', 'llm'] },
  ],
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isCoord = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 12;

/** 校验后台填的 JSON；返回规范化后的数据或错误列表 */
export function parseArchitecture(input: unknown): { spec?: ArchitectureSpec; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(input)) return { errors: ['最外层要是一个对象，包含 nodes 和 edges'] };
  if (!Array.isArray(input.nodes) || input.nodes.length === 0) errors.push('nodes 要是非空数组');
  if (!Array.isArray(input.edges)) errors.push('edges 要是数组');
  if (errors.length) return { errors };

  const ids = new Set<string>();
  const nodes: ArchNode[] = [];
  (input.nodes as unknown[]).forEach((raw, i) => {
    const where = `第 ${i + 1} 个节点`;
    if (!isObject(raw)) return errors.push(`${where}要是对象`);
    const { id, label, kind, x, y, note, primary } = raw;
    if (!isText(id, 40) || !/^[\w-]+$/.test(String(id))) return errors.push(`${where}的 id 只能用字母、数字、下划线和横线`);
    if (ids.has(id as string)) return errors.push(`节点 id「${id}」重复了`);
    ids.add(id as string);
    if (!isText(label, 24)) errors.push(`节点「${id}」的 label 要填，最多 24 个字`);
    if (!NODE_KINDS.includes(kind as NodeKind)) errors.push(`节点「${id}」的 kind 只能是 ${NODE_KINDS.join(' / ')}`);
    if (!isCoord(x) || !isCoord(y)) errors.push(`节点「${id}」的 x、y 要是 0–12 之间的数字`);
    if (note !== undefined && !isText(note, 300)) errors.push(`节点「${id}」的 note 最多 300 个字`);
    nodes.push({
      id: id as string,
      label: String(label ?? ''),
      kind: kind as NodeKind,
      x: Number(x),
      y: Number(y),
      ...(note ? { note: String(note) } : {}),
      ...(primary === true ? { primary: true } : {}),
    });
  });

  const edges: ArchEdge[] = [];
  (input.edges as unknown[]).forEach((raw, i) => {
    const where = `第 ${i + 1} 条连线`;
    if (!isObject(raw)) return errors.push(`${where}要是对象`);
    const { from, to, label } = raw;
    if (!ids.has(from as string)) return errors.push(`${where}的 from「${from}」不是已有节点`);
    if (!ids.has(to as string)) return errors.push(`${where}的 to「${to}」不是已有节点`);
    if (from === to) return errors.push(`${where}不能连到自己`);
    if (label !== undefined && !isText(label, 20)) errors.push(`${where}的 label 最多 20 个字`);
    edges.push({
      from: from as string,
      to: to as string,
      ...(label ? { label: String(label) } : {}),
      ...(raw.async === true ? { async: true } : {}),
    });
  });

  let steps: ArchStep[] | undefined;
  if (input.steps !== undefined) {
    if (!Array.isArray(input.steps)) {
      errors.push('steps 要是数组');
    } else {
      steps = [];
      (input.steps as unknown[]).forEach((raw, i) => {
        const where = `第 ${i + 1} 步`;
        if (!isObject(raw) || !isText(raw.caption, 80) || !Array.isArray(raw.nodes)) {
          return errors.push(`${where}要有 caption（最多 80 字）和 nodes 数组`);
        }
        const unknown = (raw.nodes as unknown[]).filter((n) => !ids.has(n as string));
        if (unknown.length) errors.push(`${where}里的节点不存在：${unknown.join('、')}`);
        steps!.push({ caption: String(raw.caption), nodes: raw.nodes as string[] });
      });
    }
  }

  if (errors.length) return { errors };
  const title = isText(input.title, 40) ? String(input.title) : undefined;
  return { spec: { ...(title ? { title } : {}), nodes, edges, ...(steps?.length ? { steps } : {}) }, errors };
}

/** 一个项目可以有多张图：接受单个对象或数组 */
export function parseDiagrams(input: unknown): { specs: ArchitectureSpec[]; errors: string[] } {
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return { specs: [], errors: ['数组里至少要有一张图'] };
  const specs: ArchitectureSpec[] = [];
  const errors: string[] = [];
  list.forEach((item, i) => {
    const parsed = parseArchitecture(item);
    if (parsed.spec) specs.push(parsed.spec);
    const prefix = list.length > 1 ? `第 ${i + 1} 张图：` : '';
    errors.push(...parsed.errors.map((e) => prefix + e));
  });
  return { specs: errors.length ? [] : specs, errors };
}
