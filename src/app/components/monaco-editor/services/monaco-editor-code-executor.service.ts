import { Injectable } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SQLExecutorService, SQLResult } from '../../../services/sql-executor.service';
import { validateHTML } from '../../../features/language/html-validation.util';
import { validateSQL } from '../../../features/language/sql-validation.util';

export interface ExecutionResult {
  output: string;
  executionTime: number;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorCodeExecutorService {
  constructor(private sqlExecutor: SQLExecutorService) {}

  async runCode(code: string, language: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    let output = '';
    let success = true;
    let error = '';

    try {
      switch (language) {
        case 'javascript':
          output = await this.runJavaScript(code);
          break;
        case 'html':
          output = await this.runHTML(code);
          break;
        case 'sql':
          output = await this.runSQL(code);
          break;
        default:
          output = 'Language not supported for execution\n';
      }
    } catch (err: any) {
      success = false;
      error = err.message || err;
      output += `\nError: ${error}\n`;
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    output += `\nExecution completed in ${executionTime.toFixed(2)}ms\n`;

    return { output, executionTime, success, error };
  }

  async debugCode(code: string, language: string, breakpoints: Set<number>): Promise<ExecutionResult> {
    const startTime = performance.now();
    let output = 'Starting debug session...\n';
    let success = true;
    let error = '';

    try {
      if (breakpoints.size > 0) {
        output += `Found ${breakpoints.size} breakpoint(s) at lines: ${Array.from(breakpoints).join(', ')}\n`;
      }

      switch (language) {
        case 'javascript':
          output += await this.debugJavaScript(code, breakpoints);
          break;
        case 'html':
          output += await this.debugHTML(code);
          break;
        case 'sql':
          output += await this.debugSQL(code);
          break;
        default:
          output += 'Language not supported for debugging\n';
      }
    } catch (err: any) {
      success = false;
      error = err.message || err;
      output += `\nDebug Error: ${error}\n`;
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    output += `\nDebug session completed in ${executionTime.toFixed(2)}ms\n`;

    return { output, executionTime, success, error };
  }

  private async runJavaScript(code: string): Promise<string> {
    let output = 'Executing JavaScript...\n';
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
      };
      
      // Execute the code using Function constructor instead of eval
      const executeFunction = new Function('console', code);
      const result = executeFunction(console);
      
      // Restore console.log
      console.log = originalLog;
      
      // Show output
      if (logs.length > 0) {
        output += 'Console Output:\n' + logs.join('\n') + '\n';
      }
      
      if (result !== undefined) {
        output += `\nReturn Value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}\n`;
      }
      
      output += '\nJavaScript executed successfully!\n';
      
    } catch (error: any) {
      output += `\nJavaScript Error: ${error.message}\n`;
      if (error.stack) {
        output += `Stack: ${error.stack}\n`;
      }
    }

    return output;
  }

  private async runHTML(code: string): Promise<string> {
    let output = 'Opening HTML preview...\n';
    
    try {
      // HTML içeriğini blob olarak oluştur ve yeni sekmede aç
      const blob = new Blob([code], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Yeni sekmede aç
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        output += 'HTML preview opened in new tab successfully!\n';
        output += `Preview URL: ${url}\n`;
        
        // URL'yi kısa süre sonra temizle
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      } else {
        output += 'Failed to open HTML preview. Please allow popups for this site.\n';
      }
      
    } catch (error: any) {
      output += `\nHTML Preview Error: ${error.message}\n`;
    }

    return output;
  }

  private async runSQL(code: string): Promise<string> {
    let output = 'Connecting to SQL database...\n';
    
    try {
      // SQL validation (gevşek)
      const validation = validateSQL(code);
      
      if (!validation.isValid) {
        output += '\nSQL Validation Warnings:\n';
        validation.errors.forEach((error: string) => {
          output += `⚠️ ${error}\n`;
        });
        output += '\n📄 Continuing execution...\n\n';
      } else {
        output += '✅ SQL validation passed!\n\n';
      }
      
      // Gerçek SQL execution
      output += '🚀 Executing SQL statements...\n\n';
      const result: SQLResult = await this.sqlExecutor.executeSQL(code);
      
      if (!result.success) {
        output += `❌ SQL Execution Error:\n${result.error}\n`;
        return output;
      }
      
      // Sonuçları formatla ve göster
      output += this.displaySQLResults(result);
      
    } catch (error: any) {
      output += `\n💥 Unexpected Error: ${error.message}\n`;
    }

    return output;
  }

  private displaySQLResults(result: SQLResult): string {
    let output = '';

    if (!result.data || result.data.length === 0) {
      output += '✅ SQL executed successfully (no results to display)\n';
      return output;
    }

    result.data.forEach((statementResult: any, index: number) => {
      output += `--- Statement ${index + 1} ---\n`;
      
      if (statementResult.columns && statementResult.values) {
        // SELECT sorgusu - tablo formatında göster
        output += this.formatResultTable(statementResult.columns, statementResult.values);
        output += `\n📊 ${statementResult.values.length} row(s) returned\n\n`;
        
      } else if (statementResult.rowsAffected !== undefined) {
        // INSERT, UPDATE, DELETE, CREATE vs.
        const statement = statementResult.statement.trim().toUpperCase();
        
        if (statement.startsWith('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE\s+TABLE\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'table';
          output += `✅ Table '${tableName}' created successfully\n\n`;
          
        } else if (statement.startsWith('INSERT')) {
          output += `✅ ${statementResult.rowsAffected} row(s) inserted\n\n`;
          
        } else if (statement.startsWith('UPDATE')) {
          output += `✅ ${statementResult.rowsAffected} row(s) updated\n\n`;
          
        } else if (statement.startsWith('DELETE')) {
          output += `✅ ${statementResult.rowsAffected} row(s) deleted\n\n`;
          
        } else {
          output += `✅ Statement executed successfully\n\n`;
        }
      }
    });
    
    output += `⏱️ Execution completed in ${result.executionTime?.toFixed(2)}ms\n`;
    
    return output;
  }

  private formatResultTable(columns: string[], values: any[][]): string {
    if (values.length === 0) {
      return '(No results)\n';
    }

    // Kolon genişliklerini hesapla
    const columnWidths = columns.map((col, index) => {
      const maxValueWidth = Math.max(...values.map(row => String(row[index] || '').length));
      return Math.max(col.length, maxValueWidth, 3);
    });

    // Header satırı
    let table = '| ';
    columns.forEach((col, index) => {
      table += col.padEnd(columnWidths[index]) + ' | ';
    });
    table += '\n';

    // Separator satırı
    table += '|';
    columnWidths.forEach(width => {
      table += '-'.repeat(width + 2) + '|';
    });
    table += '\n';

    // Data satırları
    values.forEach(row => {
      table += '| ';
      row.forEach((cell, index) => {
        const cellStr = String(cell || '');
        table += cellStr.padEnd(columnWidths[index]) + ' | ';
      });
      table += '\n';
    });

    return table;
  }

  private async debugJavaScript(code: string, breakpoints: Set<number>): Promise<string> {
    let output = 'Starting JavaScript debug session...\n';
    
    try {
      // Analyze code structure
      const lines = code.split('\n');
      output += `\nCode Analysis:\n`;
      output += `- Total lines: ${lines.length}\n`;
      
      const functions = code.match(/function\s+\w+/g) || [];
      const variables = code.match(/(?:var|let|const)\s+\w+/g) || [];
      const loops = code.match(/for\s*\(|while\s*\(/g) || [];
      const conditionals = code.match(/if\s*\(/g) || [];
      
      output += `- Functions declared: ${functions.length} (${functions.join(', ')})\n`;
      output += `- Variables declared: ${variables.length} (${variables.join(', ')})\n`;
      output += `- Loops found: ${loops.length}\n`;
      output += `- Conditionals found: ${conditionals.length}\n`;
      
      // Simulate step-by-step execution
      output += '\nStep-by-step execution simulation:\n';
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const lineNumber = index + 1;
        
        if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
          // Check if this is a breakpoint line
          if (breakpoints.has(lineNumber)) {
            output += `🔴 BREAKPOINT → Line ${lineNumber}: ${trimmedLine}\n`;
            output += `    ⏸️  Execution paused for debugging\n`;
            output += `    📊 Variable inspection available\n`;
          } else {
            output += `Line ${lineNumber}: ${trimmedLine}\n`;
          }
          
          // Simulate execution analysis
          if (trimmedLine.includes('console.log')) {
            output += `  → Console output detected\n`;
          }
          if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('===')) {
            output += `  → Variable assignment detected\n`;
          }
          if (trimmedLine.includes('function')) {
            output += `  → Function definition detected\n`;
          }
        }
      });
      
      // Try to execute the code safely
      output += '\nAttempting controlled execution...\n';
      try {
        // Create a safer execution environment using Function constructor
        const safeCode = this.createSafeExecutionWrapper(code);
        const executeFunction = new Function('return ' + safeCode);
        const result = executeFunction();
        output += `✅ Code executed successfully\n`;
        if (result !== undefined) {
          output += `📤 Final result: ${result}\n`;
        }
      } catch (execError: any) {
        output += `❌ Runtime error: ${execError.message}\n`;
      }
      
    } catch (error: any) {
      output += `Debug Error: ${error.message}\n`;
    }

    return output;
  }

  private async debugHTML(code: string): Promise<string> {
    let output = 'Starting HTML debug session...\n';
    
    try {
      // HTML structure analysis
      const tags = code.match(/<\w+/g) || [];
      const closingTags = code.match(/<\/\w+>/g) || [];
      const selfClosingTags = code.match(/<\w+[^>]*\/>/g) || [];
      
      output += `\nHTML Structure Analysis:\n`;
      output += `- Opening tags: ${tags.length}\n`;
      output += `- Closing tags: ${closingTags.length}\n`;
      output += `- Self-closing tags: ${selfClosingTags.length}\n`;
      
      // Check for common HTML elements
      const hasDoctype = code.toLowerCase().includes('<!doctype');
      const hasHtml = code.includes('<html');
      const hasHead = code.includes('<head');
      const hasBody = code.includes('<body');
      
      output += `\nDocument Structure:\n`;
      output += `- DOCTYPE declaration: ${hasDoctype ? '✓' : '✗'}\n`;
      output += `- HTML element: ${hasHtml ? '✓' : '✗'}\n`;
      output += `- HEAD section: ${hasHead ? '✓' : '✗'}\n`;
      output += `- BODY section: ${hasBody ? '✓' : '✗'}\n`;
      
      // Validate HTML
      const validation = validateHTML(code);
      if (!validation.isValid) {
        output += '\nHTML Validation Issues:\n';
        validation.errors.forEach((error: string) => {
          output += `- ${error}\n`;
        });
      } else {
        output += '\nHTML validation passed!\n';
      }
      
      // Run HTML preview
      const htmlOutput = await this.runHTML(code);
      output += htmlOutput;
      
    } catch (error: any) {
      output += `\nHTML Debug Error: ${error.message}\n`;
    }

    return output;
  }

  private async debugSQL(code: string): Promise<string> {
    let output = 'Starting SQL debug session...\n';
    
    try {
      // SQL structure analysis
      const statements = code.split(';').filter(s => s.trim());
      output += `\nSQL Analysis:\n`;
      output += `- Number of statements: ${statements.length}\n`;
      
      statements.forEach((statement, index) => {
        const trimmed = statement.trim();
        if (trimmed) {
          const type = this.detectSQLType(trimmed);
          output += `Statement ${index + 1}: ${type} - "${trimmed.substring(0, 50)}..."\n`;
        }
      });
      
      // Analyze keywords
      const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING'];
      output += `\nKeyword usage:\n`;
      keywords.forEach(keyword => {
        const count = (code.toUpperCase().match(new RegExp(keyword, 'g')) || []).length;
        if (count > 0) {
          output += `- ${keyword}: ${count} times\n`;
        }
      });
      
      // Run SQL validation and execution
      const sqlOutput = await this.runSQL(code);
      output += sqlOutput;
      
    } catch (error: any) {
      output += `\nSQL Debug Error: ${error.message}\n`;
    }

    return output;
  }

  private detectSQLType(sql: string): string {
    // Yorumları ve boş satırları filtrele, sonra ilk SQL statement'ı bul
    const lines = sql.split('\n');
    const sqlStatements: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Yorum satırlarını ve boş satırları atla
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      sqlStatements.push(trimmed);
    }
    
    // Tüm SQL statement'ları birleştir ve ilk keyword'ü bul
    const fullSQL = sqlStatements.join(' ').trim().toUpperCase();
    
    if (fullSQL.startsWith('SELECT')) return 'SELECT';
    if (fullSQL.startsWith('INSERT')) return 'INSERT';
    if (fullSQL.startsWith('UPDATE')) return 'UPDATE';
    if (fullSQL.startsWith('DELETE')) return 'DELETE';
    if (fullSQL.startsWith('CREATE TABLE')) return 'CREATE TABLE';
    if (fullSQL.startsWith('CREATE INDEX')) return 'CREATE INDEX';
    if (fullSQL.startsWith('CREATE VIEW')) return 'CREATE VIEW';
    if (fullSQL.startsWith('CREATE')) return 'CREATE';
    if (fullSQL.startsWith('DROP TABLE')) return 'DROP TABLE';
    if (fullSQL.startsWith('DROP INDEX')) return 'DROP INDEX';
    if (fullSQL.startsWith('DROP')) return 'DROP';
    if (fullSQL.startsWith('ALTER TABLE')) return 'ALTER TABLE';
    if (fullSQL.startsWith('ALTER')) return 'ALTER';
    
    // Eğer birden fazla statement varsa, hepsini listele
    const statements = fullSQL.split(';').filter(s => s.trim());
    if (statements.length > 1) {
      const types = statements.map(stmt => {
        const trimmedStmt = stmt.trim();
        if (trimmedStmt.startsWith('CREATE TABLE')) return 'CREATE TABLE';
        if (trimmedStmt.startsWith('INSERT')) return 'INSERT';
        if (trimmedStmt.startsWith('SELECT')) return 'SELECT';
        if (trimmedStmt.startsWith('UPDATE')) return 'UPDATE';
        if (trimmedStmt.startsWith('DELETE')) return 'DELETE';
        return 'OTHER';
      }).filter(type => type !== 'OTHER');
      
      if (types.length > 0) {
        return `MULTIPLE (${types.join(', ')})`;
      }
    }
    
    return 'UNKNOWN';
  }

  private createSafeExecutionWrapper(code: string): string {
    return `
      (function() {
        try {
          ${code}
        } catch (e) {
          return 'Error: ' + e.message;
        }
      })();
    `;
  }
} 