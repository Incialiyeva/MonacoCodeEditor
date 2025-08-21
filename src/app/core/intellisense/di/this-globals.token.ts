import { InjectionToken, Provider } from '@angular/core';

/**
 * Injection token for registering runtime globals that will be available in Monaco's "this." context
 */
export const THIS_GLOBALS = new InjectionToken<Record<string, any>>('THIS_GLOBALS');

/**
 * Provider helper for registering a single runtime global
 * 
 * @param name Global obje adı (this.name)
 * @param value Runtime objesi
 * @returns Angular provider
 * 
 * @example
 * ```ts
 * // any-feature.module.ts
 * import { provideThisGlobal } from './di/this-globals.token';
 * 
 * const form = { /* form objesi *\/ };
 * 
 * @NgModule({
 *   providers: [
 *     provideThisGlobal('form', form),
 *    
 * })
 * export class FeatureModule {}
 * ```
 */
export function provideThisGlobal(name: string, value: any): Provider {
  return { 
    provide: THIS_GLOBALS, 
    multi: true, 
    useValue: { [name]: value } 
  };
}

/**
 * Provider helper for registering multiple runtime globals at once
 * 
 * @param globals Record of global objects
 * @returns Angular provider
 * 
 * @example
 * ```ts
 * // any-feature.module.ts
 * import { provideThisGlobals } from './di/this-globals.token';
 * 
 * const globals = {
 *   form: { /* form objesi *\/ },
 *  
 *   analytics: { /* analytics objesi *\/ }
 * };
 * 
 * @NgModule({
 *   providers: [
 *     provideThisGlobals(globals),
 *   ]
 * })
 * export class FeatureModule {}
 * ```
 */
export function provideThisGlobals(globals: Record<string, any>): Provider {
  return { 
    provide: THIS_GLOBALS, 
    multi: true, 
    useValue: globals 
  };
} 