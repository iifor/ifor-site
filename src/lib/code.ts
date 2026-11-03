// 首页里那些"代码"是用 token 拼出来的，方便按语法着色
export type TokenKind = 'kw' | 'str' | 'cm' | 'tx';
export type Token = { kind: TokenKind; text: string };
export type CodeLine = { indent?: number; tokens: Token[] };

export const kw = (text: string): Token => ({ kind: 'kw', text });
export const str = (text: string): Token => ({ kind: 'str', text: `"${text}"` });
export const cm = (text: string): Token => ({ kind: 'cm', text });
export const tx = (text: string): Token => ({ kind: 'tx', text });

export const line = (tokens: Token[], indent = 0): CodeLine => ({ indent, tokens });

/** ["a", "b"] → "a", "b" 交替着色 */
export function strList(items: string[]): Token[] {
  return items.flatMap((item, i) => (i === 0 ? [str(item)] : [tx(', '), str(item)]));
}
