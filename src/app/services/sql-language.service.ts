import { Injectable } from '@angular/core';

export interface SQLDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4; // Error=1, Warning=2, Info=3, Hint=4
  message: string;
  code?: string | number;
  source: string;
}

export interface SQLCompletion {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  insertTextRules?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SQLLanguageService {
  private sqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON',
    'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
    'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'LIKE', 'BETWEEN',
    'IS', 'NULL', 'TRUE', 'FALSE', 'DISTINCT', 'AS', 'ASC', 'DESC',
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CAST', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];

  private sqlDataTypes = [
    'VARCHAR', 'CHAR', 'TEXT', 'INTEGER', 'INT', 'BIGINT', 'SMALLINT',
    'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'DOUBLE', 'BOOLEAN', 'BOOL',
    'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR', 'BLOB', 'CLOB'
  ];

  private sqlFunctions = [
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'UPPER', 'LOWER', 'LENGTH',
    'SUBSTRING', 'CONCAT', 'TRIM', 'NOW', 'CURRENT_DATE', 'CURRENT_TIME'
  ];

  constructor() {}

  async validateSQL(sqlCode: string): Promise<SQLDiagnostic[]> {
    const diagnostics: SQLDiagnostic[] = [];
    const statements = this.parseStatements(sqlCode);

    statements.forEach((statement, index) => {
      const statementDiagnostics = this.validateStatement(statement, index);
      diagnostics.push(...statementDiagnostics);
    });

    return diagnostics;
  }

  private parseStatements(sqlCode: string): { text: string; startLine: number; startChar: number }[] {
    const statements: { text: string; startLine: number; startChar: number }[] = [];
    const lines = sqlCode.split('\n');
    let currentStatement = '';
    let statementStartLine = 0;
    let statementStartChar = 0;
    let lineIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        lineIndex++;
        continue;
      }

      if (currentStatement === '') {
        statementStartLine = lineIndex;
        statementStartChar = line.indexOf(trimmedLine);
      }

      currentStatement += ' ' + trimmedLine;

      // Check for statement end
      if (trimmedLine.endsWith(';')) {
        statements.push({
          text: currentStatement.trim().replace(/;$/, ''),
          startLine: statementStartLine,
          startChar: statementStartChar
        });
        currentStatement = '';
      }

      lineIndex++;
    }

    // Add final statement if it doesn't end with semicolon
    if (currentStatement.trim()) {
      statements.push({
        text: currentStatement.trim(),
        startLine: statementStartLine,
        startChar: statementStartChar
      });
    }

    return statements;
  }

  private validateStatement(statement: { text: string; startLine: number; startChar: number }, index: number): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text.toUpperCase();
    const words = text.split(/\s+/);

    // Basic SQL statement validation
    if (text.startsWith('SELECT')) {
      diagnostics.push(...this.validateSelectStatement(statement, words));
    } else if (text.startsWith('INSERT')) {
      diagnostics.push(...this.validateInsertStatement(statement, words));
    } else if (text.startsWith('UPDATE')) {
      diagnostics.push(...this.validateUpdateStatement(statement, words));
    } else if (text.startsWith('DELETE')) {
      diagnostics.push(...this.validateDeleteStatement(statement, words));
    } else if (text.startsWith('CREATE TABLE')) {
      diagnostics.push(...this.validateCreateTableStatement(statement, words));
    }

    // Check for common typos
    diagnostics.push(...this.checkTypos(statement, words));

    // Check for balanced parentheses
    diagnostics.push(...this.checkParentheses(statement));

    return diagnostics;
  }

  private validateSelectStatement(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text.toUpperCase();

    if (!text.includes('FROM') && !this.isSimpleSelectStatement(text)) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 6 }
        },
        severity: 2, // Warning
        message: 'SELECT statement usually requires a FROM clause',
        source: 'sql-language-service',
        code: 'missing-from'
      });
    }

    return diagnostics;
  }

  private validateInsertStatement(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text.toUpperCase();

    if (!text.includes('INTO')) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 6 }
        },
        severity: 1, // Error
        message: 'INSERT statement requires INTO clause',
        source: 'sql-language-service',
        code: 'missing-into'
      });
    }

    if (!text.includes('VALUES') && !text.includes('SELECT')) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 6 }
        },
        severity: 1, // Error
        message: 'INSERT statement requires VALUES clause or SELECT subquery',
        source: 'sql-language-service',
        code: 'missing-values'
      });
    }

    return diagnostics;
  }

  private validateUpdateStatement(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text.toUpperCase();

    if (!text.includes('SET')) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 6 }
        },
        severity: 1, // Error
        message: 'UPDATE statement requires SET clause',
        source: 'sql-language-service',
        code: 'missing-set'
      });
    }

    return diagnostics;
  }

  private validateDeleteStatement(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text.toUpperCase();

    if (!text.includes('FROM')) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 6 }
        },
        severity: 1, // Error
        message: 'DELETE statement requires FROM clause',
        source: 'sql-language-service',
        code: 'missing-from'
      });
    }

    return diagnostics;
  }

  private validateCreateTableStatement(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text;

    // Check for table name
    const tableNameMatch = text.match(/CREATE\s+TABLE\s+(\w+)/i);
    if (!tableNameMatch) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + 12 }
        },
        severity: 1, // Error
        message: 'CREATE TABLE requires a table name',
        source: 'sql-language-service',
        code: 'missing-table-name'
      });
    }

    return diagnostics;
  }

  private checkTypos(statement: { text: string; startLine: number; startChar: number }, words: string[]): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const commonTypos: Record<string, string> = {
      'SELEC': 'SELECT',
      'FORM': 'FROM',
      'WHER': 'WHERE',
      'UPDAT': 'UPDATE',
      'DELET': 'DELETE',
      'CREAT': 'CREATE',
      'INSER': 'INSERT'
    };

    words.forEach((word, index) => {
      const correction = commonTypos[word];
      if (correction) {
        diagnostics.push({
          range: {
            start: { line: statement.startLine, character: statement.startChar },
            end: { line: statement.startLine, character: statement.startChar + word.length }
          },
          severity: 1, // Error
          message: `Did you mean '${correction}'?`,
          source: 'sql-language-service',
          code: 'typo'
        });
      }
    });

    return diagnostics;
  }

  private checkParentheses(statement: { text: string; startLine: number; startChar: number }): SQLDiagnostic[] {
    const diagnostics: SQLDiagnostic[] = [];
    const text = statement.text;
    
    const openCount = (text.match(/\(/g) || []).length;
    const closeCount = (text.match(/\)/g) || []).length;

    if (openCount !== closeCount) {
      diagnostics.push({
        range: {
          start: { line: statement.startLine, character: statement.startChar },
          end: { line: statement.startLine, character: statement.startChar + text.length }
        },
        severity: 1, // Error
        message: `Mismatched parentheses: ${openCount} opening, ${closeCount} closing`,
        source: 'sql-language-service',
        code: 'mismatched-parentheses'
      });
    }

    return diagnostics;
  }

  private isSimpleSelectStatement(text: string): boolean {
    // Allow simple statements like "SELECT 1", "SELECT NOW()", etc.
    return /^SELECT\s+[\w\d\(\)\*]+\s*$/i.test(text.trim());
  }

  async getCompletions(sqlCode: string, position: { line: number; character: number }): Promise<SQLCompletion[]> {
    const completions: SQLCompletion[] = [];

    // Add SQL keywords
    this.sqlKeywords.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: 14, // Keyword
        detail: 'SQL Keyword',
        insertText: keyword
      });
    });

    // Add data types
    this.sqlDataTypes.forEach(dataType => {
      completions.push({
        label: dataType,
        kind: 25, // TypeParameter
        detail: 'SQL Data Type',
        insertText: dataType
      });
    });

    // Add functions
    this.sqlFunctions.forEach(func => {
      completions.push({
        label: func,
        kind: 3, // Function
        detail: 'SQL Function',
        insertText: `${func}($1)`,
        insertTextRules: 4 // InsertAsSnippet
      });
    });

    return completions;
  }

  async getHover(sqlCode: string, position: { line: number; character: number }): Promise<any> {
    const lines = sqlCode.split('\n');
    if (position.line >= lines.length) return null;

    const line = lines[position.line];
    const word = this.getWordAtPosition(line, position.character);

    if (!word) return null;

    const upperWord = word.toUpperCase();

    // SQL Keyword documentation
    const keywordDocs: Record<string, string> = {
      'SELECT': 'Retrieves data from one or more tables',
      'FROM': 'Specifies the table(s) to retrieve data from',
      'WHERE': 'Filters rows based on specified conditions',
      'INSERT': 'Adds new rows to a table',
      'UPDATE': 'Modifies existing rows in a table',
      'DELETE': 'Removes rows from a table',
      'CREATE': 'Creates database objects like tables, views, etc.',
      'JOIN': 'Combines rows from two or more tables based on a related column'
    };

    const documentation = keywordDocs[upperWord];
    if (documentation) {
      return {
        contents: [
          { value: `**${upperWord}**` },
          { value: documentation }
        ]
      };
    }

    return null;
  }

  private getWordAtPosition(line: string, character: number): string | null {
    const words = line.split(/\s+/);
    let currentPosition = 0;

    for (const word of words) {
      const wordEnd = currentPosition + word.length;
      if (character >= currentPosition && character <= wordEnd) {
        return word;
      }
      currentPosition = wordEnd + 1; // +1 for space
    }

    return null;
  }
} 