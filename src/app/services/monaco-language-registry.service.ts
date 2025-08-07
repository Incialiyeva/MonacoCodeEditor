import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonacoLanguageRegistryService {
  private monaco: any;

  constructor() {}

  initializeLanguageServices(monaco: any): void {
    this.monaco = monaco;
    
    // HTML Language Service Configuration
    this.configureHTMLService();
    
    // CSS Language Service Configuration  
    this.configureCSSService();
    
    // JSON Language Service Configuration
    this.configureJSONService();
    
    // TypeScript/JavaScript (zaten aktif ama optimize edelim)
    this.optimizeTypeScriptService();
    
    console.log('[Monaco] All language services configured');
  }

  private configureHTMLService(): void {
    // HTML validation ve IntelliSense'i aktifleştir
    this.monaco.languages.html.htmlDefaults.setOptions({
      format: {
        tabSize: 2,
        insertSpaces: true,
        wrapLineLength: 120,
        unformatted: 'default="a,abbr,acronym,b,bdo,big,br,button,cite,code,dfn,em,i,img,input,kbd,label,map,object,q,samp,script,select,small,span,strong,sub,sup,textarea,tt,var"',
        contentUnformatted: 'pre,script,style',
        indentInnerHtml: false,
        preserveNewLines: true,
        maxPreserveNewLines: undefined,
        indentHandlebars: false,
        endWithNewline: false,
        extraLiners: 'head,body,/html',
        wrapAttributes: 'auto'
      },
      suggest: {
        html5: true,
        angular1: true,
        ionic: true
      },
      validate: true,
      lint: {
        // HTML linting rules
        compatibleVendorPrefixes: 'ignore',
        vendorPrefix: 'warning',
        duplicateProperties: 'warning',
        emptyRules: 'warning',
        importStatement: 'ignore',
        boxModel: 'ignore',
        universalSelector: 'ignore',
        zeroUnits: 'ignore',
        fontFaceProperties: 'warning',
        hexColorLength: 'error',
        argumentsInColorFunction: 'error',
        unknownProperties: 'warning',
        validProperties: true,
        ieHack: 'ignore',
        unknownVendorSpecificProperties: 'ignore',
        propertyIgnoredDueToDisplay: 'warning',
        important: 'ignore',
        float: 'ignore',
        idSelector: 'ignore'
      }
    });
  }

  private configureCSSService(): void {
    this.monaco.languages.css.cssDefaults.setOptions({
      validate: true,
      lint: {
        compatibleVendorPrefixes: 'ignore',
        vendorPrefix: 'warning',
        duplicateProperties: 'warning',
        emptyRules: 'warning',
        importStatement: 'ignore',
        boxModel: 'ignore',
        universalSelector: 'ignore',
        zeroUnits: 'ignore',
        fontFaceProperties: 'warning',
        hexColorLength: 'error',
        argumentsInColorFunction: 'error',
        unknownProperties: 'warning',
        validProperties: true,
        ieHack: 'ignore',
        unknownVendorSpecificProperties: 'ignore',
        propertyIgnoredDueToDisplay: 'warning',
        important: 'ignore',
        float: 'ignore',
        idSelector: 'ignore'
      }
    });

    // SCSS defaults
    this.monaco.languages.css.scssDefaults.setOptions({
      validate: true,
      lint: {
        compatibleVendorPrefixes: 'ignore',
        vendorPrefix: 'warning',
        duplicateProperties: 'warning',
        emptyRules: 'warning',
        importStatement: 'ignore',
        boxModel: 'ignore',
        universalSelector: 'ignore',
        zeroUnits: 'ignore',
        fontFaceProperties: 'warning',
        hexColorLength: 'error',
        argumentsInColorFunction: 'error',
        unknownProperties: 'warning',
        validProperties: true
      }
    });
  }

  private configureJSONService(): void {
    this.monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      schemas: [
        {
          uri: 'http://json-schema.org/draft-07/schema#',
          fileMatch: ['*'],
          schema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['object', 'array', 'string', 'number', 'boolean', 'null']
              }
            }
          }
        }
      ],
      enableSchemaRequest: true,
      schemaRequest: 'warning',
      schemaValidation: 'warning',
      comments: 'ignore',
      trailingCommas: 'ignore'
    });
  }

  private optimizeTypeScriptService(): void {
    // TypeScript compiler options
    const compilerOptions = {
      target: this.monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: this.monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: this.monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      skipLibCheck: true,
      strict: false,
      noImplicitAny: false,
      strictNullChecks: false,
      suppressImplicitAnyIndexErrors: true,
      noImplicitReturns: false,
      noImplicitThis: false,
      noUnusedLocals: false,
      noUnusedParameters: false
    };

    this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    this.monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    // Extra libs for better IntelliSense
    this.monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    this.monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Diagnostics options
    this.monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [1108, 1005, 1002, 1109]
    });

    this.monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [1108, 1005, 1002, 1109]
    });
  }

  // Language-specific helpers
  isLanguageServiceActive(language: string): boolean {
    switch (language) {
      case 'html':
        return !!this.monaco?.languages?.html;
      case 'css':
      case 'scss':
      case 'less':
        return !!this.monaco?.languages?.css;
      case 'json':
        return !!this.monaco?.languages?.json;
      case 'javascript':
      case 'typescript':
        return !!this.monaco?.languages?.typescript;
      default:
        return false;
    }
  }

  getLanguageCapabilities(language: string): string[] {
    const capabilities: string[] = [];
    
    if (this.isLanguageServiceActive(language)) {
      capabilities.push('syntax-highlighting');
      
      switch (language) {
        case 'html':
          capabilities.push('validation', 'auto-completion', 'formatting', 'hover');
          break;
        case 'css':
        case 'scss':
          capabilities.push('validation', 'auto-completion', 'color-picker', 'formatting');
          break;
        case 'json':
          capabilities.push('validation', 'schema-validation', 'auto-completion');
          break;
        case 'javascript':
        case 'typescript':
          capabilities.push('validation', 'semantic-checking', 'auto-completion', 'hover', 'go-to-definition', 'refactoring');
          break;
        default:
          capabilities.push('basic-support');
      }
    }
    
    return capabilities;
  }
} 