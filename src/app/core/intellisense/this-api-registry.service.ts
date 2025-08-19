import { Injectable } from '@angular/core';

export type JsType = 'string'|'number'|'boolean'|'any'|'void'|'object'|'Promise<any>'|string;
export interface MethodDef { sig: string; doc?: string; }
export interface PropDef   { type: JsType; doc?: string; }

export interface ThisObjectDef {
  doc?: string;
  methods?: Record<string, MethodDef>;
  props?:   Record<string, PropDef>;
}

@Injectable({ providedIn: 'root' })
export class ThisApiRegistry {
  private objects = new Map<string, ThisObjectDef>();

  // Ölçek için: aynı component'te birden çok sayfa/tenant kullanıyorsan scope ayırabilirsin
  private scopeKey = 'global';
  setScope(key: string) { this.scopeKey = key; }

  addObject(name: string, def: ThisObjectDef) { this.objects.set(name, def); }

  upsertObject(name: string, patch: Partial<ThisObjectDef>) {
    const cur = this.objects.get(name) ?? {};
    this.objects.set(name, {
      doc: patch.doc ?? cur.doc,
      props:   { ...(cur.props ?? {}),   ...(patch.props ?? {})   },
      methods: { ...(cur.methods ?? {}), ...(patch.methods ?? {}) },
    });
  }

  getRootNames() { return [...this.objects.keys()]; }
  get(name: string) { return this.objects.get(name); }

  // ——— Ölçek optimizasyonları: prefix filtre + LRU ———
  private memberCache = new Map<string, any[]>();
  private lruKeys: string[] = [];
  private LRU_MAX = 100;

  getMembers(obj: string, monaco: typeof import('monaco-editor')) {
    const o = this.objects.get(obj);
    if (!o) return [];
    const props = Object.entries(o.props ?? {}).map(([p, pd]) => ({
      label: p,
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: p,
      detail: `${obj}.${p}: ${pd.type}`,
    }));
    const methods = Object.entries(o.methods ?? {}).map(([m, md]) => ({
      label: md.sig?.startsWith('(') ? `${m}${md.sig}` : m,
      kind: monaco.languages.CompletionItemKind.Method,
      insertText: m,
      detail: `${obj}.${m}`,
    }));
    return [...props, ...methods];
  }

  getMembersByPrefix(obj: string, prefix: string, monaco: typeof import('monaco-editor')) {
    const key = `${obj}|${prefix.toLowerCase()}`;
    const hit = this.memberCache.get(key);
    if (hit) return hit;
    const all = this.getMembers(obj, monaco);
    const filtered = all.filter(x => x.label.toLowerCase().startsWith(prefix.toLowerCase())).slice(0, 100);
    this.memberCache.set(key, filtered);
    this.lruKeys.push(key);
    if (this.lruKeys.length > this.LRU_MAX) {
      const old = this.lruKeys.shift()!;
      this.memberCache.delete(old);
    }
    return filtered;
  }
} 