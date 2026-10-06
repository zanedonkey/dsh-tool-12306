interface Cookie {
  name: string;
  value: string;
  path: string;
  expiresAt: number;
}
const QUERY_URL = 'https://kyfw.12306.cn/';
// A bounded, in-memory jar for anonymous cookies from the query host only.
export class AnonymousCookies {
  private readonly values = new Map<string, Cookie>();
  constructor(private readonly now = Date.now) {}
  private prune(): void {
    for (const [key, cookie] of this.values) if (cookie.expiresAt <= this.now()) this.values.delete(key);
  }
  update(headers: Headers, url = new URL(QUERY_URL)): void {
    if (url.origin !== 'https://kyfw.12306.cn') return;
    this.prune();
    for (const raw of headers.getSetCookie()) {
      if (raw.length > 4096) continue;
      const [pair = '', ...parts] = raw.split(';');
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!/^[!#$%&'*+\-.^_`|~\dA-Za-z]+$/.test(name) || /[^\x21-\x7e]|[;,\\]/.test(value)) continue;
      const attrs = new Map(parts.map(part => {
        const index = part.indexOf('=');
        return index < 0 ? [part.trim().toLowerCase(), ''] : [part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim()];
      }));
      const domain = attrs.get('domain')?.toLowerCase().replace(/^\./, '');
      if (domain !== undefined && domain !== 'kyfw.12306.cn' && domain !== '12306.cn') continue;
      const lastSlash = url.pathname.lastIndexOf('/');
      const defaultPath = lastSlash > 0 ? url.pathname.slice(0, lastSlash) : '/';
      const candidate = attrs.get('path');
      const path = candidate?.startsWith('/') ? candidate : defaultPath;
      let expiresAt = Infinity;
      const expires = Date.parse(attrs.get('expires') ?? '');
      if (Number.isFinite(expires)) expiresAt = expires;
      const age = attrs.get('max-age');
      if (age !== undefined && /^-?\d+$/.test(age) && Number.isFinite(Number(age))) expiresAt = this.now() + Number(age) * 1000;
      const key = `${name}\n${path}`;
      if (expiresAt <= this.now() || value === '') this.values.delete(key);
      else if (this.values.has(key) || this.values.size < 128) this.values.set(key, { name, value, path, expiresAt });
    }
  }
  header(url = new URL(QUERY_URL)): string {
    if (url.origin !== 'https://kyfw.12306.cn') return '';
    this.prune();
    return [...this.values.values()]
      .filter(cookie => url.pathname === cookie.path || (url.pathname.startsWith(cookie.path) && (cookie.path.endsWith('/') || url.pathname[cookie.path.length] === '/')))
      .sort((a, b) => b.path.length - a.path.length)
      .map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  }
  clear(): void { this.values.clear(); }
}
