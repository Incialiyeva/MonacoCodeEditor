/**
 * Monaco Types Manager
 * Global tür tanımlama sistemi yöneticisi
 */

import { coreTypes } from './global-types.core';
import { jkContextTypes } from './global-types.jk-context';
import { servicesTypes } from './global-types.services';
import { customTypes } from './global-types.custom';

// Tür tanımları için interface
export interface TypeDefinition {
  content: string;
  targetFileSrc: string;
}

// Modül türleri
export type ModuleType = 'core' | 'jkContext' | 'services' | 'custom';

// Modül mapping'i
const MODULE_MAP: Record<ModuleType, TypeDefinition> = {
  core: coreTypes,
  jkContext: jkContextTypes,
  services: servicesTypes,
  custom: customTypes
};

export class MonacoTypesManager {
  private monaco: any;
  private loadedModules: Set<ModuleType> = new Set();
  private extraLibList: TypeDefinition[] = [];

  constructor(monaco: any) {
    this.monaco = monaco;
  }

  /**
   * Tüm modülleri yükle
   */
  loadAllModules(): void {
    const modules: ModuleType[] = ['core', 'jkContext', 'services', 'custom'];
    this.loadModules(modules);
  }

  /**
   * Belirli modülleri yükle
   */
  loadModules(modules: ModuleType[]): void {
    modules.forEach(module => {
      if (!this.loadedModules.has(module)) {
        this.loadModule(module);
      }
    });
  }

  /**
   * Sadece belirli modülleri yükle (diğerlerini kaldır)
   */
  loadOnly(modules: ModuleType[]): void {
    // Önce tüm modülleri kaldır
    this.clearAllModules();
    
    // Sonra belirtilen modülleri yükle
    this.loadModules(modules);
  }

  /**
   * Tek modül yükle
   */
  private loadModule(moduleType: ModuleType): void {
    const module = MODULE_MAP[moduleType];
    if (module) {
      this.addExtraLib(module);
      this.loadedModules.add(moduleType);
      console.log(`Module loaded: ${moduleType}`);
    } else {
      console.warn(`Module not found: ${moduleType}`);
    }
  }

  /**
   * ExtraLib ekle
   */
  private addExtraLib(typeDef: TypeDefinition): void {
    try {
      this.monaco.languages.typescript.javascriptDefaults.addExtraLib(
        typeDef.content,
        typeDef.targetFileSrc
      );
      
      this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
        typeDef.content,
        typeDef.targetFileSrc
      );
      
      this.extraLibList.push(typeDef);
      console.log(`ExtraLib added: ${typeDef.targetFileSrc}`);
    } catch (error) {
      console.error(`Error adding ExtraLib ${typeDef.targetFileSrc}:`, error);
    }
  }

  /**
   * ExtraLib kaldır
   */
  private removeExtraLib(typeDef: TypeDefinition): void {
    try {
      this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(typeDef.targetFileSrc);
      this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(typeDef.targetFileSrc);
      
      const index = this.extraLibList.findIndex(lib => lib.targetFileSrc === typeDef.targetFileSrc);
      if (index > -1) {
        this.extraLibList.splice(index, 1);
      }
      
      console.log(`ExtraLib removed: ${typeDef.targetFileSrc}`);
    } catch (error) {
      console.error(`Error removing ExtraLib ${typeDef.targetFileSrc}:`, error);
    }
  }

  /**
   * Tüm modülleri temizle
   */
  clearAllModules(): void {
    this.extraLibList.forEach(lib => {
      this.removeExtraLib(lib);
    });
    
    this.loadedModules.clear();
    console.log('All modules cleared');
  }

  /**
   * Yüklenen modülleri listele
   */
  getLoadedModules(): ModuleType[] {
    return Array.from(this.loadedModules);
  }

  /**
   * ExtraLib listesini al
   */
  getExtraLibList(): TypeDefinition[] {
    return [...this.extraLibList];
  }

  /**
   * Modül yüklü mü kontrol et
   */
  isModuleLoaded(moduleType: ModuleType): boolean {
    return this.loadedModules.has(moduleType);
  }

  /**
   * Özel tür tanımı ekle
   */
  addCustomType(content: string, filename: string): void {
    const customType: TypeDefinition = {
      content,
      targetFileSrc: filename
    };
    
    this.addExtraLib(customType);
    console.log(`Custom type added: ${filename}`);
  }

  /**
   * Özel tür tanımı kaldır
   */
  removeCustomType(filename: string): void {
    const customType = this.extraLibList.find(lib => lib.targetFileSrc === filename);
    if (customType) {
      this.removeExtraLib(customType);
    }
  }

  /**
   * TypeScript ayarlarını güncelle
   */
  updateTypeScriptSettings(settings: any): void {
    this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: this.monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: this.monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ['node_modules/@types'],
      ...settings
    });
  }

  /**
   * JavaScript ayarlarını güncelle
   */
  updateJavaScriptSettings(settings: any): void {
    this.monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: this.monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: this.monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ['node_modules/@types'],
      ...settings
    });
  }
} 