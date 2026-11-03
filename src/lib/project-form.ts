import type { Project, ProjectInput } from './projects';
import { parseDiagrams } from './architecture';

// 后台表单的原始值（全是字符串），出错时原样回填
export type ProjectFormValues = {
  id: string;
  title: string;
  summary: string;
  tags: string;
  stack: string;
  order: string;
  published: boolean;
  coverId: string;
  coverAlt: string;
  coverPosition: string;
  art: string;
  demo: string;
  source: string;
  body: string;
  architecture: string;
};

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const emptyProjectValues = (order: number): ProjectFormValues => ({
  id: '',
  title: '',
  summary: '',
  tags: '',
  stack: '',
  order: String(order),
  published: true,
  coverId: '',
  coverAlt: '',
  coverPosition: 'center',
  art: '',
  demo: '',
  source: '',
  body: '',
  architecture: '',
});

export const projectToValues = (p: Project): ProjectFormValues => ({
  id: p.id,
  title: p.title,
  summary: p.summary,
  tags: p.tags.join(', '),
  stack: p.stack.join(', '),
  order: String(p.order),
  published: p.published,
  coverId: p.coverId ? String(p.coverId) : '',
  coverAlt: p.coverAlt ?? '',
  coverPosition: p.coverPosition,
  art: p.art ?? '',
  demo: p.demo ?? '',
  source: p.source ?? '',
  body: p.body,
  // 只有一张图时写成对象，多张时写成数组
  architecture:
    p.architecture.length === 0
      ? ''
      : JSON.stringify(p.architecture.length === 1 ? p.architecture[0] : p.architecture, null, 2),
});

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const list = (value: string) =>
  value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);

function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** 读表单并校验；没有错误时 input 可以直接写库（封面 id 由调用方再决定） */
export function readProjectForm(form: FormData) {
  const values: ProjectFormValues = {
    id: str(form, 'id').toLowerCase(),
    title: str(form, 'title'),
    summary: str(form, 'summary'),
    tags: str(form, 'tags'),
    stack: str(form, 'stack'),
    order: str(form, 'order'),
    published: form.get('published') === 'on',
    coverId: str(form, 'coverId'),
    coverAlt: str(form, 'coverAlt'),
    coverPosition: str(form, 'coverPosition') || 'center',
    art: str(form, 'art'),
    demo: str(form, 'demo'),
    source: str(form, 'source'),
    body: String(form.get('body') ?? '').replace(/\r\n/g, '\n').trim(),
    architecture: String(form.get('architecture') ?? '').trim(),
  };

  const errors: string[] = [];
  if (!values.title) errors.push('标题不能为空');
  if (!values.summary) errors.push('简介不能为空');
  if (!/^-?\d+$/.test(values.order)) errors.push('排序要填整数');
  if (values.demo && !isHttpUrl(values.demo)) errors.push('在线试玩地址要以 http:// 或 https:// 开头');
  if (values.source && !isHttpUrl(values.source)) errors.push('源码地址要以 http:// 或 https:// 开头');

  let architecture: ProjectInput['architecture'] = [];
  if (values.architecture) {
    try {
      const parsed = parseDiagrams(JSON.parse(values.architecture));
      architecture = parsed.specs;
      errors.push(...parsed.errors.map((e) => `图解：${e}`));
    } catch {
      errors.push('图解不是合法的 JSON（检查逗号、引号和括号）');
    }
  }

  const input: ProjectInput = {
    title: values.title,
    summary: values.summary,
    tags: list(values.tags),
    stack: list(values.stack),
    order: Number(values.order),
    published: values.published,
    coverId: values.coverId ? Number(values.coverId) : null,
    coverAlt: values.coverAlt || null,
    coverPosition: values.coverPosition,
    art: values.art === 'seats' ? 'seats' : null,
    demo: values.demo || null,
    source: values.source || null,
    body: values.body,
    architecture,
  };

  return { values, input, errors };
}
