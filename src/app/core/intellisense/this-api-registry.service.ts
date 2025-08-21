import { Injectable } from '@angular/core';

export type JsType = 'string'|'number'|'boolean'|'any'|'void'|'object'|'Promise<any>'|string;
export interface MethodDef { sig: string; doc?: string; }
export interface PropDef   { type: JsType; doc?: string; }

export interface ThisObjectDef {
  doc?: string;
  methods?: Record<string, MethodDef>;
  props?:   Record<string, PropDef>;
}

/**
 * ThisApiRegistry - Monaco Editor için "this." context IntelliSense sağlayıcısı
 * 
 * Kullanım:
 * ```ts
 * // 1. Registry oluştur
 * const registry = new ThisApiRegistry();
 * 
 * // 2. Runtime nesneleri ekle (otomatik tanım çıkarma)
 * registry.addObjectFromValue('api', apiObj);
 * registry.addObjectFromValue('ui', uiObj);
 * 
 * // 3. Provider'ı kaydet
 * registerThisOnlyProvider(monaco, registry);
 * 
 * // 4. Canlı güncelleme (nesne değiştiğinde)
 * registry.refreshThisContext('api', updatedApiObj);
 * ```
 * 
 * Özellikler:
 * - Otomatik parametre çıkarma (normal/arrow functions)
 * - Getter/setter desteği
 * - Destructuring parametre desteği
 * - Rest parametre desteği (...args)
 * - Canlı güncelleme
 * - .d.ts üretimi
 */
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

  // ——— Değerden tanım çıkarma yardımcıları ———

  private _paramNames(fn: Function): string[] {
    try {
      const src = fn.toString().replace(/\/\*.*?\*\/|\/\/.*$/gm, '');
      
      // Arrow function kontrolü
      if (src.includes('=>')) {
        const arrowMatch = src.match(/^[^=]*=>\s*\(([^)]*)\)/);
        if (arrowMatch) {
          return this._parseParams(arrowMatch[1]);
        }
        // Tek parametre arrow function: x => ...
        const singleParamMatch = src.match(/^([^=]+)=>/);
        if (singleParamMatch) {
          const param = singleParamMatch[1].trim();
          return param ? [param] : [];
        }
      }
      
      // Normal function kontrolü
      const m = src.match(/^[^(]*\(([^)]*)\)/);
      if (!m) return [];
      
      return this._parseParams(m[1]);
    } catch (error) {
      console.warn('Parameter parsing failed for function:', fn.name || 'anonymous');
      return ['...args'];
    }
  }

  private _parseParams(paramString: string): string[] {
    if (!paramString.trim()) return [];
    
    return paramString
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(param => {
        // Default değerleri kaldır: param = defaultValue
        param = param.replace(/=.*$/, '');
        // Rest parametreleri koru: ...args
        if (param.startsWith('...')) return param;
        // Destructuring'i basitleştir: {a, b} -> ...obj
        if (param.startsWith('{') || param.startsWith('[')) return '...obj';
        return param;
      });
  }

  private _jsTypeOf(v: any): JsType {
    if (v === null || v === undefined) return 'any';
    if (Array.isArray(v)) return 'any[]' as JsType;
    
    // Getter/setter kontrolü
    if (typeof v === 'object' && (v.get || v.set)) {
      return 'any'; // Getter/setter'ları property olarak say
    }
    
    switch (typeof v) {
      case 'string':  return 'string';
      case 'number':  return 'number';
      case 'boolean': return 'boolean';
      case 'object':  return 'object';
      case 'function': return 'any'; // Function tipini any olarak işaretle
      default:        return 'any';
    }
  }

  /** Sadece değer ver → registry'ye otomatik tanım ekle */
  addObjectFromValue(name: string, value: any) {
    const def: ThisObjectDef = { props: {}, methods: {} };
    if (value && typeof value === 'object') {
      // Descriptor bazlı tarama (getter/setter için)
      const descriptors = Object.getOwnPropertyDescriptors(value);
      
      for (const [key, descriptor] of Object.entries(descriptors)) {
        // Getter/setter kontrolü
        if (descriptor.get || descriptor.set) {
          (def.props as any)[key] = { type: this._jsTypeOf(descriptor.get ? descriptor.get.call(value) : undefined) };
          continue;
        }
        
        // Normal property/method kontrolü
        const v = (value as any)[key];
        if (typeof v === 'function') {
          const params = this._paramNames(v);
          const sig = `(${params.map(p => `${p}: any`).join(', ')}) => any`;
          (def.methods as any)[key] = { sig };
        } else {
          (def.props as any)[key] = { type: this._jsTypeOf(v) };
        }
      }
    }
    this.upsertObject(name, def); // mevcutla birleştirir
    return def;                   // (opsiyonel) d.ts üretmek istersen kullan
  }

  /** (Opsiyonel) Çıkarımdan ambient .d.ts üret */
  generateDtsFromDef(name: string, def: ThisObjectDef) {
    const propLines = Object.entries(def.props ?? {})
      .map(([k, p]) => `    ${k}: ${p.type};`);
    const methodLines = Object.entries(def.methods ?? {})
      .map(([m, md]) => `    ${m}${md.sig?.startsWith('(') ? md.sig : '(): any'};`);
    return [
      'declare global {',
      `  var ${name}: {`,
      ...propLines,
      ...methodLines,
      '  };',
      '} export {};',
    ].join('\n');
  }

  /** Canlı güncelleme - nesne değiştiğinde tekrar çağır */
  refreshThisContext(name: string, value: any) {
    console.log(`🔄 Refreshing context for: ${name}`);
    return this.addObjectFromValue(name, value);
  }

  /** Tüm context'i temizle */
  clearContext() {
    this.objects.clear();
    this.memberCache.clear();
    this.lruKeys = [];
    console.log('🧹 Context cleared');
  }

  /** Context durumunu logla */
  logContext() {
    const roots = this.getRootNames();
    console.log('📊 Context status:', {
      rootCount: roots.length,
      roots: roots,
      cacheSize: this.memberCache.size,
      lruSize: this.lruKeys.length
    });
  }
}

/**
 * Basit wrapper - Runtime global'leri hızlıca kaydet
 * 
 * @param name Global obje adı (this.name)
 * @param value Runtime objesi
 * @param options Konfigürasyon seçenekleri
 */
export function registerRuntimeGlobal(
  name: string, 
  value: any, 
  options: { 
    emitDts?: boolean; 
    monaco?: any; 
    registry?: ThisApiRegistry;
  } = {}
) {
  const { emitDts = false, monaco, registry } = options;
  
  if (!registry) {
    console.warn('Registry not provided, skipping registration');
    return;
  }
  
  // Objeyi kaydet
  const def = registry.addObjectFromValue(name, value);
  
  // .d.ts üret ve yükle (isteğe bağlı)
  if (emitDts && monaco) {
    const dts = registry.generateDtsFromDef(name, def);
    monaco.languages.typescript.javascriptDefaults
      .addExtraLib(dts, `inmemory://this/${name}.d.ts`);
    console.log(`📝 Generated .d.ts for ${name}`);
  }
  
  console.log(`✅ Registered runtime global: ${name}`);
  return def;
} 