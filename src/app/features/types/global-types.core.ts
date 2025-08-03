/**
 * Core Global Types Module
 * Temel window ve global fonksiyon tanımları
 */

export const coreTypes = {
  content: `
declare global {
  // Global fonksiyonlar
  function alert(message: string): void;
  function confirm(message: string): boolean;
  function prompt(message: string, defaultValue?: string): string | null;
  
  // Console API
  interface Console {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    clear(): void;
  }
  
  // Window uzantıları
  interface Window {
    console: Console;
    location: Location;
    history: History;
    localStorage: Storage;
    sessionStorage: Storage;
    
    // Custom window properties
    monaco?: any;
    require?: any;
    MonacoEnvironment?: any;
  }
  
  // Global değişkenler
  const console: Console;
  const window: Window;
  const document: Document;
  const location: Location;
  const history: History;
  const localStorage: Storage;
  const sessionStorage: Storage;
}

export {};
`,
  targetFileSrc: 'global-types.core.d.ts'
}; 