import { Injectable } from '@angular/core';
import { format } from 'sql-formatter';

export interface SQLValidationResult {
  isValid: boolean;
  errors: Array<{
    message: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    code?: string;
  }>;
}

export interface SQLCompletionItem {
  label: string;
  kind: number; // Monaco completion item kind
  detail?: string;
  documentation?: string;
  insertText?: string;
  filterText?: string;
  sortText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedSQLLanguageService {
  private monaco: any;
  private disposables: any[] = [];

  // SQL Schema simulation (gerçek projede veritabanından gelir)
  private schema = {
    tables: [
      {
        name: 'users',
        columns: ['id', 'name', 'email', 'created_at', 'updated_at']
      },
      {
        name: 'orders',
        columns: ['id', 'user_id', 'total', 'status', 'created_at']
      },
      {
        name: 'products',
        columns: ['id', 'name', 'price', 'category_id', 'stock']
      },
      {
        name: 'categories',
        columns: ['id', 'name', 'description']
      }
    ],
    functions: [
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'NOW', 'CURRENT_DATE', 'CURRENT_TIME',
      'UPPER', 'LOWER', 'LENGTH', 'SUBSTRING', 'CONCAT', 'TRIM', 'COALESCE'
    ],
    keywords: [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
      'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'TRIGGER',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'USING',
      'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
      'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'LIKE', 'BETWEEN', 'IS', 'NULL',
      'TRUE', 'FALSE', 'DISTINCT', 'AS', 'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ]
  };

  constructor() {}

  registerSQLLanguageService(monaco: any): void {
    this.monaco = monaco;

    // SQL Completion Provider
    const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        return this.provideCompletionItems(model, position);
      }
    });

    // SQL Hover Provider
    const hoverProvider = monaco.languages.registerHoverProvider('sql', {
      provideHover: (model: any, position: any) => {
        return this.provideHover(model, position);
      }
    });

    // SQL Signature Help Provider
    const signatureProvider = monaco.languages.registerSignatureHelpProvider('sql', {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: (model: any, position: any) => {
        return this.provideSignatureHelp(model, position);
      }
    });

    // SQL Document Formatting Provider
    const formattingProvider = monaco.languages.registerDocumentFormattingEditProvider('sql', {
      provideDocumentFormattingEdits: (model: any, options: any) => {
        return this.provideDocumentFormattingEdits(model, options);
      }
    });

    // SQL Folding Range Provider
    const foldingProvider = monaco.languages.registerFoldingRangeProvider('sql', {
      provideFoldingRanges: (model: any) => {
        return this.provideFoldingRanges(model);
      }
    });

    this.disposables.push(
      completionProvider,
      hoverProvider,
      signatureProvider,
      formattingProvider,
      foldingProvider
    );

    console.log('[Enhanced SQL Language Service] Registered all providers');
  }

  private async provideCompletionItems(model: any, position: any): Promise<any> {
    const suggestions: SQLCompletionItem[] = [];
    const textBeforePointer = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const currentContext = this.getCurrentContext(textBeforePointer);

    // SQL Keywords
    if (currentContext.expectingKeyword) {
      this.schema.keywords.forEach(keyword => {
        suggestions.push({
          label: keyword,
          kind: this.monaco.languages.CompletionItemKind.Keyword,
          detail: 'SQL Keyword',
          insertText: keyword,
          sortText: '1-' + keyword
        });
      });
    }

    // Table names
    if (currentContext.expectingTable) {
      this.schema.tables.forEach(table => {
        suggestions.push({
          label: table.name,
          kind: this.monaco.languages.CompletionItemKind.Class,
          detail: `Table (${table.columns.length} columns)`,
          documentation: `Columns: ${table.columns.join(', ')}`,
          insertText: table.name,
          sortText: '2-' + table.name
        });
      });
    }

    // Column names
    if (currentContext.expectingColumn) {
      const tables = this.getTablesInScope(model.getValue());
      tables.forEach(tableName => {
        const table = this.schema.tables.find(t => t.name === tableName);
        if (table) {
          table.columns.forEach(column => {
            suggestions.push({
              label: column,
              kind: this.monaco.languages.CompletionItemKind.Field,
              detail: `Column from ${tableName}`,
              insertText: column,
              sortText: '3-' + column
            });
          });
        }
      });
    }

    // SQL Functions
    if (currentContext.expectingFunction) {
      this.schema.functions.forEach(func => {
        suggestions.push({
          label: func,
          kind: this.monaco.languages.CompletionItemKind.Function,
          detail: 'SQL Function',
          insertText: `${func}($1)`,
          sortText: '4-' + func
        });
      });
    }

    return { suggestions };
  }

  private getCurrentContext(textBeforePointer: string): any {
    const text = textBeforePointer.toUpperCase().trim();
    
    return {
      expectingKeyword: !text || text.endsWith(';') || text.endsWith('('),
      expectingTable: text.includes('FROM') && !text.includes('WHERE') && !text.includes('JOIN'),
      expectingColumn: text.includes('SELECT') || text.includes('WHERE') || text.includes('ORDER BY'),
      expectingFunction: text.includes('SELECT') || text.includes('WHERE')
    };
  }

  private getTablesInScope(sqlText: string): string[] {
    const tables: string[] = [];
    const fromMatches = sqlText.match(/FROM\s+(\w+)/gi);
    const joinMatches = sqlText.match(/JOIN\s+(\w+)/gi);
    
    if (fromMatches) {
      fromMatches.forEach(match => {
        const tableName = match.split(/\s+/)[1];
        if (tableName && !tables.includes(tableName.toLowerCase())) {
          tables.push(tableName.toLowerCase());
        }
      });
    }
    
    if (joinMatches) {
      joinMatches.forEach(match => {
        const tableName = match.split(/\s+/)[1];
        if (tableName && !tables.includes(tableName.toLowerCase())) {
          tables.push(tableName.toLowerCase());
        }
      });
    }
    
    return tables;
  }

  private provideHover(model: any, position: any): any {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const wordText = word.word.toLowerCase();

    // Table hover
    const table = this.schema.tables.find(t => t.name === wordText);
    if (table) {
      return {
        range: new this.monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: `**Table: ${table.name}**` },
          { value: `Columns: ${table.columns.join(', ')}` }
        ]
      };
    }

    // Function hover
    if (this.schema.functions.includes(wordText.toUpperCase())) {
      const functionDocs = this.getFunctionDocumentation(wordText.toUpperCase());
      return {
        range: new this.monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: `**${wordText.toUpperCase()}()**` },
          { value: functionDocs }
        ]
      };
    }

    return null;
  }

  private getFunctionDocumentation(funcName: string): string {
    const docs: Record<string, string> = {
      'COUNT': 'Returns the number of rows that match a condition',
      'SUM': 'Returns the sum of a numeric column',
      'AVG': 'Returns the average value of a numeric column',
      'MAX': 'Returns the largest value in a column',
      'MIN': 'Returns the smallest value in a column',
      'NOW': 'Returns the current date and time',
      'UPPER': 'Converts a string to uppercase',
      'LOWER': 'Converts a string to lowercase',
      'LENGTH': 'Returns the length of a string',
      'CONCAT': 'Concatenates two or more strings'
    };
    
    return docs[funcName] || 'SQL function';
  }

  private provideSignatureHelp(model: any, position: any): any {
    // Function signature help implementation
    const textBeforePointer = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const functionMatch = textBeforePointer.match(/(\w+)\s*\(/);
    if (functionMatch) {
      const funcName = functionMatch[1].toUpperCase();
      if (this.schema.functions.includes(funcName)) {
        return {
          value: {
            signatures: [
              {
                label: `${funcName}(column)`,
                documentation: this.getFunctionDocumentation(funcName),
                parameters: [
                  {
                    label: 'column',
                    documentation: 'The column or expression to process'
                  }
                ]
              }
            ],
            activeSignature: 0,
            activeParameter: 0
          }
        };
      }
    }

    return null;
  }

  private provideDocumentFormattingEdits(model: any, options: any): any {
    try {
      const formattedSQL = format(model.getValue(), {
        language: 'sql',
        tabWidth: options.tabSize || 2,
        useTabs: false,
        keywordCase: 'upper',
        dataTypeCase: 'upper',
        functionCase: 'upper'
      });

      return [
        {
          range: model.getFullModelRange(),
          text: formattedSQL
        }
      ];
    } catch (error) {
      console.error('SQL formatting error:', error);
      return [];
    }
  }

  private provideFoldingRanges(model: any): any {
    const foldingRanges: any[] = [];
    const lines = model.getLinesContent();
    
    let inMultilineComment = false;
    let commentStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Multiline comment folding
      if (line.includes('/*') && !inMultilineComment) {
        inMultilineComment = true;
        commentStart = i;
      }
      
      if (line.includes('*/') && inMultilineComment) {
        if (i > commentStart) {
          foldingRanges.push({
            start: commentStart + 1,
            end: i + 1,
            kind: this.monaco.languages.FoldingRangeKind.Comment
          });
        }
        inMultilineComment = false;
      }
      
      // SQL statement folding (basic)
      if (line.match(/^(CREATE|SELECT|INSERT|UPDATE|DELETE)\s/i)) {
        let statementEnd = i;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().endsWith(';') || lines[j + 1]?.trim().match(/^(CREATE|SELECT|INSERT|UPDATE|DELETE)\s/i)) {
            statementEnd = j;
            break;
          }
        }
        
        if (statementEnd > i + 1) {
          foldingRanges.push({
            start: i + 1,
            end: statementEnd + 1,
            kind: this.monaco.languages.FoldingRangeKind.Region
          });
        }
      }
    }
    
    return foldingRanges;
  }

  validateSQL(sqlCode: string): SQLValidationResult {
    const errors: any[] = [];
    
    try {
      // Bu gerçek projede SQL parser kullanılır
      // Şimdilik basit validasyon
      const statements = sqlCode.split(';').filter(s => s.trim());
      
      statements.forEach((statement, index) => {
        const trimmed = statement.trim().toUpperCase();
        
        if (trimmed.startsWith('SELECT') && !trimmed.includes('FROM')) {
          errors.push({
            message: 'SELECT statement requires FROM clause',
            line: index + 1,
            column: 1,
            severity: 'error' as const,
            code: 'missing-from'
          });
        }
        
        // Parentheses check
        const openCount = (statement.match(/\(/g) || []).length;
        const closeCount = (statement.match(/\)/g) || []).length;
        if (openCount !== closeCount) {
          errors.push({
            message: 'Mismatched parentheses',
            line: index + 1,
            column: 1,
            severity: 'error' as const,
            code: 'mismatched-parentheses'
          });
        }
      });
      
    } catch (error) {
      errors.push({
        message: `SQL parsing error: ${error}`,
        line: 1,
        column: 1,
        severity: 'error' as const,
        code: 'parse-error'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
} 