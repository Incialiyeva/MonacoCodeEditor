import type * as monacoNS from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';
import { registerRuntimeGlobal } from './this-api-registry.service';

/**
 * Toplu runtime global kayıt helper'ı
 * 
 * @param globals Record of global objects to register
 * @param options Registration options
 * 
 * @example
 * ```ts
 * const globals = {
 *   api, auth, orders, ui, test, form
 * };
 * 
 * registerRuntimeGlobals(globals, {
 *   emitDts: true,
 *   monaco: window.monaco,
 *   registry: this.thisApiRegistry
 * });
 * ```
 */
export function registerRuntimeGlobals(
  globals: Record<string, any>,
  options: { 
    emitDts?: boolean; 
    monaco: typeof monacoNS; 
    registry: ThisApiRegistry;
    refresh?: boolean;
  }
) {
  const { emitDts = true, monaco, registry, refresh = false } = options;
  
  console.log(`🚀 Registering ${Object.keys(globals).length} runtime globals...`);
  
  for (const [name, value] of Object.entries(globals)) {
    if (refresh && registry.get(name)) {
      console.log(`🔄 Refreshing existing global: ${name}`);
      registry.refreshThisContext(name, value);
    }
    
    registerRuntimeGlobal(name, value, {
      emitDts,
      monaco,
      registry
    });
  }
  
  console.log(`✅ All runtime globals registered successfully`);
  registry.logContext();
} 