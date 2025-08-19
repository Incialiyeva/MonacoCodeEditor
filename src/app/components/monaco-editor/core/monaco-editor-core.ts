import { isPlatformBrowser } from '@angular/common';
import { initializeMonacoIntelliSense, MonacoIntelliSenseProvider } from '../../../features/intellisense/monaco-intellisense.provider';
import { MonacoLanguageRegistryService } from '../../../services/monaco-language-registry.service';
import { EnhancedSQLLanguageService } from '../../../services/enhanced-sql-language.service';
import { MonacoEditorFileManagerService } from '../services/monaco-editor-file-manager.service';
import { MonacoEditorHoverService } from '../services/monaco-editor-hover.service';
import { ThisApiRegistry } from '../../../core/intellisense/this-api-registry.service';
import { registerThisOnlyProvider } from '../../../core/intellisense/this-only-provider';
import type { Environment } from 'monaco-editor';

declare global {
  interface Window {
    require: any;
    monaco: any;
    MonacoEnvironment?: Environment | undefined;
  }
}

export class MonacoEditorCore {
  editor: any;
  intelliSenseProvider: MonacoIntelliSenseProvider | null = null;
  hoverProvider: any = null;
  private thisApiRegistry: ThisApiRegistry | null = null;
  private thisProviderDisposable: any = null;

  constructor(
    private platformId: Object,
    private monacoLanguageRegistry: MonacoLanguageRegistryService,
    private enhancedSQLService: EnhancedSQLLanguageService,
    private fileManager: MonacoEditorFileManagerService,
    private hoverService: MonacoEditorHoverService
  ) {}

  initializeMonaco(editorContainer: HTMLElement, selectedScriptIndex: number, editorTheme: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject(new Error('Browser platform required'));
        return;
      }

      if (typeof window.require === 'function') {
        window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
        const env: Environment = {
          getWorkerUrl: function (workerId: string, label: string) {
            const baseUrl = window.location.origin + '/assets/monaco';
            return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
              self.MonacoEnvironment = {
                baseUrl: '${baseUrl}'
              };
              importScripts('${baseUrl}/vs/base/worker/workerMain.js');
            `)}`;
          }
        };
        window.MonacoEnvironment = env;

        window.require(['vs/editor/editor.main'], () => {
          this.configureMonacoLanguages();
          this.monacoLanguageRegistry.initializeLanguageServices(window.monaco);
          this.enhancedSQLService.registerSQLLanguageService(window.monaco);
          this.intelliSenseProvider = initializeMonacoIntelliSense(window.monaco);

          // JS dil servis ayarı (yalnızca JS)
          const js = window.monaco.languages.typescript.javascriptDefaults;
          js.setCompilerOptions({
            noLib: true,                // DOM/Node/ES lib'leri kapalı → yabancı öneri yok
            checkJs: true,
            allowNonTsExtensions: true,
          });

          // Registry'yi doldur + provider kaydı
          this.thisApiRegistry = new ThisApiRegistry();
          // (İstersen sayfa/tenant bağlamına göre scope ver)
          this.thisApiRegistry.setScope('global:v1');

          // — Buraya kendi servislerini ekliyorsun —
          // Örnek:
          this.thisApiRegistry.addObject('api', {
            doc: 'Backend API',
            props: { baseUrl: { type: 'string' } },
            methods: {
              getUser:   { sig: '(id: number) => Promise<any>' },
              listUsers: { sig: '() => Promise<any[]>' },
            }
          });
          this.thisApiRegistry.addObject('ui', {
            doc: 'UI helpers',
            methods: { toast: { sig: '(msg: string) => void' } }
          });

          // Orders servisi
          this.thisApiRegistry.addObject('orders', {
            doc: 'Order management service',
            methods: {
              get:    { sig: '(id: number) => Promise<any>' },
              list:   { sig: '(status?: string) => Promise<any[]>' },
              cancel: { sig: '(id: number) => Promise<void>' },
            }
          });

          // Auth servisi
          this.thisApiRegistry.addObject('auth', {
            doc: 'Authentication service',
            props: { 
              isLoggedIn: { type: 'boolean' },
              user: { type: 'object' }
            },
            methods: {
              login:    { sig: '(credentials: any) => Promise<boolean>' },
              logout:   { sig: '() => void' },
              getToken: { sig: '() => string' }
            }
          });

          // Provider kaydı
          this.thisProviderDisposable = registerThisOnlyProvider(window.monaco, this.thisApiRegistry);

          const selectedScript = this.fileManager.getScriptTemplate(selectedScriptIndex);
          if (selectedScript) {
            const language = this.fileManager.detectLanguageFromCode(selectedScript.code);
            
            // JS modeli için özel ayarlar
            const isJavaScript = language === 'javascript';
            const editorOptions: any = {
              value: selectedScript.code,
              language: language,
              theme: editorTheme,
              automaticLayout: true,
              glyphMargin: true,
              parameterHints: { enabled: true },
            };

            if (isJavaScript) {
              // Sadece JS modelinde geçerli - this. dışında öneri kapalı
              editorOptions.quickSuggestions = { other: false, comments: false, strings: false };
              editorOptions.suggestOnTriggerCharacters = false;
              editorOptions.wordBasedSuggestions = 'off';
              editorOptions.tabCompletion = 'off';
              editorOptions.suggest = { 
                showWords: false, 
                preview: false, 
                showVariables: false, 
                showFunctions: true, 
                showMethods: true, 
                showClasses: true 
              };
            } else {
              // Diğer diller için normal ayarlar
              editorOptions.suggestOnTriggerCharacters = true;
              editorOptions.quickSuggestions = {
                other: true,
                comments: true,
                strings: true
              };
              editorOptions.acceptSuggestionOnCommitCharacter = true;
              editorOptions.acceptSuggestionOnEnter = 'on';
              editorOptions.tabCompletion = 'on';
              editorOptions.wordBasedSuggestions = 'currentDocument';
              editorOptions.suggest = {
                localityBonus: true,
                snippetsPreventQuickSuggestions: false,
                showIcons: true,
                maxVisibleSuggestions: 12,
                insertMode: 'replace',
                filterGraceful: true,
                showKeywords: true,
                showSnippets: true,
                showWords: true,
                showClasses: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
                showIssues: true,
                showUsers: true,
                showColors: true
              };
            }

            // Ortak ayarlar
            Object.assign(editorOptions, {
              typescript: {
                suggest: {
                  includeCompletionsForModuleExports: true,
                  includeCompletionsWithSnippetText: true,
                  includeCompletionsWithInsertText: true
                }
              },
              javascript: {
                suggest: {
                  includeCompletionsForModuleExports: true,
                  includeCompletionsWithSnippetText: true,
                  includeCompletionsWithInsertText: true
                }
              },
              folding: true,
              foldingStrategy: 'auto',
              showFoldingControls: 'always',
              unfoldOnClickAfterEndOfLine: false,
              foldingHighlight: true,
              foldingImportsByDefault: false,
              links: true,
              colorDecorators: true,
              lightbulb: {
                enabled: true
              },
              codeActionsOnSave: {
                'source.organizeImports': true
              },
              formatOnPaste: true,
              formatOnType: true,
              autoIndent: 'full',
              bracketPairColorization: {
                enabled: true
              },
              guides: {
                bracketPairs: 'active',
                bracketPairsHorizontal: 'active',
                highlightActiveBracketPair: true,
                indentation: true,
                highlightActiveIndentation: true
              },
              unicodeHighlight: {
                ambiguousCharacters: true,
                invisibleCharacters: true
              },
              inlineSuggest: {
                enabled: true
              },
              stickyScroll: {
                enabled: true
              }
            });

            this.editor = window.monaco.editor.create(editorContainer, editorOptions);

            // JS modeli için özel event handler'lar
            if (isJavaScript) {
              // Ctrl+Space'i tamamen engelle (politikamız: sadece this.)
              this.editor.onKeyDown((e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.code?.toLowerCase() === 'space')) {
                  e.preventDefault(); 
                  e.stopPropagation?.();
                }
              });

              // Sadece 'this.' veya 'this.obj.' yazılınca biz açalım
              this.editor.onDidType((ch: string) => {
                if (ch !== '.') return;
                const pos = this.editor.getPosition();
                const model = this.editor.getModel();
                if (!pos || !model) return;
                const left = model.getLineContent(pos.lineNumber).slice(0, pos.column);

                if (/\bthis\.$/.test(left) || /\bthis\.\w+\.$/.test(left)) {
                  this.editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                }
              });
            }

            this.initializeHoverProvider();
            this.addContextMenuActions();

            console.log('Monaco editor mounted with script:', selectedScript.name, 'and theme:', editorTheme);
            resolve(this.editor);
          } else {
            console.error('Script template not found for index:', selectedScriptIndex);
            reject(new Error('Script template not found'));
          }
        });
      } else {
        console.error('Monaco loader.js (window.require) bulunamadı!');
        reject(new Error('Monaco loader not found'));
      }
    });
  }

  private addContextMenuActions() {
    if (!this.editor || !window.monaco) return;

    this.editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [window.monaco.KeyMod.Alt | window.monaco.KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: async (ed: any) => {
        // This will be handled by the main component
      }
    });

    this.editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [window.monaco.KeyMod.Ctrl | window.monaco.KeyCode.F5],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.0,
      run: async (ed: any) => {
        // This will be handled by the main component
      }
    });

    this.editor.addAction({
      id: 'debug-code',
      label: 'Debug Code',
      keybindings: [window.monaco.KeyCode.F5],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.1,
      run: async (ed: any) => {
        // This will be handled by the main component
      }
    });

    this.editor.addAction({
      id: 'open-in-live-server',
      label: 'Open in Live Server',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.5,
      run: (ed: any) => {
        // This will be handled by the main component
      }
    });
  }

  private initializeHoverProvider() {
    if (!isPlatformBrowser(this.platformId) || !window.monaco) return;

    // TypeScript/JavaScript için hover provider
    this.hoverProvider = window.monaco.languages.registerHoverProvider('typescript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();

        const hoverInfo = this.hoverService.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);

        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // JavaScript için de aynı provider'ı kaydet
    window.monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();

        const hoverInfo = this.hoverService.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);

        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // HTML için hover provider
    window.monaco.languages.registerHoverProvider('html', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);

        const htmlInfo = this.hoverService.getHTMLHoverInfo(wordText, lineContent);

        if (htmlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: htmlInfo.contents
          };
        }
        return null;
      }
    });

    // SQL için hover provider
    window.monaco.languages.registerHoverProvider('sql', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word.toUpperCase();
        const lineContent = model.getLineContent(position.lineNumber);

        const sqlInfo = this.hoverService.getSQLHoverInfo(wordText, lineContent);

        if (sqlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: sqlInfo.contents
          };
        }
        return null;
      }
    });
  }

  private configureMonacoLanguages(): void {
    if (!window.monaco) return;

    this.configureHTMLSupport();
    this.configureSQLSupport();
  }

  private configureHTMLSupport(): void {
    const monaco = window.monaco;

    monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'div',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<div>\n\t$0\n</div>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML div element'
          },
          {
            label: 'span',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<span>$0</span>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML span element'
          },
          {
            label: 'h1',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<h1>$0</h1>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML h1 element'
          },
          {
            label: 'p',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<p>$0</p>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML paragraph element'
          }
        ];

        return { suggestions };
      }
    });
  }

  private configureSQLSupport(): void {
    const monaco = window.monaco;

    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'SELECT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL SELECT statement'
          },
          {
            label: 'FROM',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'FROM $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL FROM clause'
          },
          {
            label: 'WHERE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'WHERE $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL WHERE clause'
          },
          {
            label: 'INSERT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'INSERT INTO $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL INSERT statement'
          }
        ];

        return { suggestions };
      }
    });
  }

  destroy() {
    if (this.editor) {
      this.editor.dispose();
    }
    if (this.hoverProvider) {
      this.hoverProvider.dispose();
    }
    if (this.thisProviderDisposable) {
      this.thisProviderDisposable.dispose();
    }
  }
} 