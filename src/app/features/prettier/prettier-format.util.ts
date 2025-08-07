import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';

export async function formatWithPrettier(code: string, language?: string): Promise<string> {
  try {
    const baseOptions = {
      tabWidth: 2,
      singleQuote: true,
      printWidth: 80,
      useTabs: false,
      semi: true,
      trailingComma: 'es5' as const,
      bracketSpacing: true,
      arrowParens: 'avoid' as const,
      endOfLine: 'lf' as const
    };

    if (language === 'html') {
      return await prettier.format(code, {
        parser: 'html',
        plugins: [parserHtml],
        ...baseOptions,
        htmlWhitespaceSensitivity: 'css' as const,
        singleQuote: false,
        bracketSameLine: false,
        printWidth: 120,
        tabWidth: 2,
        // HTML özel ayarları
        insertPragma: false,
        proseWrap: 'preserve' as const
      });
    } else if (language === 'sql') {
      // Gelişmiş SQL formatlama
      return formatSQL(code);
    } else {
      // JavaScript/TypeScript için
      return await prettier.format(code, {
        parser: 'babel',
        plugins: [parserBabel, parserEstree],
        ...baseOptions
      });
    }
  } catch (error) {
    console.error('Prettier formatting error:', error);
    return code; // Hata durumunda orijinal kodu döndür
  }
}

/**
 * Gelişmiş SQL Formatter
 */
function formatSQL(code: string): string {
  try {
    const lines = code.split('\n');
    const formattedLines: string[] = [];
    let indentLevel = 0;
    const indentSize = 2;

    for (let line of lines) {
      line = line.trim();
      
      if (!line || line.startsWith('--')) {
        formattedLines.push(line);
        continue;
      }

      const upperLine = line.toUpperCase();
      const words = line.split(/\s+/);

      // Closing keywords that decrease indent
      if (upperLine.startsWith('END') || 
          upperLine.startsWith(')') || 
          upperLine.includes(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Major SQL keywords - start at base level
      if (upperLine.startsWith('SELECT') || 
          upperLine.startsWith('INSERT') || 
          upperLine.startsWith('UPDATE') || 
          upperLine.startsWith('DELETE') || 
          upperLine.startsWith('CREATE') || 
          upperLine.startsWith('ALTER') || 
          upperLine.startsWith('DROP')) {
        indentLevel = 0;
        formattedLines.push(formatSQLKeywords(line));
        continue;
      }

      // Sub-clauses - indent once
      if (upperLine.startsWith('FROM') || 
          upperLine.startsWith('WHERE') || 
          upperLine.startsWith('GROUP BY') || 
          upperLine.startsWith('HAVING') || 
          upperLine.startsWith('ORDER BY') || 
          upperLine.startsWith('LIMIT') || 
          upperLine.startsWith('OFFSET')) {
        const indent = ' '.repeat(indentSize);
        formattedLines.push(indent + formatSQLKeywords(line));
        continue;
      }

      // JOIN clauses
      if (upperLine.includes('JOIN')) {
        const indent = ' '.repeat(indentSize);
        formattedLines.push(indent + formatSQLKeywords(line));
        continue;
      }

      // Values and conditions - deeper indent
      if (upperLine.startsWith('AND') || 
          upperLine.startsWith('OR') || 
          upperLine.startsWith('VALUES')) {
        const indent = ' '.repeat(indentSize * 2);
        formattedLines.push(indent + formatSQLKeywords(line));
        continue;
      }

      // Opening keywords that increase indent
      if (upperLine.includes('(') || 
          upperLine.startsWith('CASE') || 
          upperLine.startsWith('BEGIN')) {
        const indent = ' '.repeat(indentLevel * indentSize);
        formattedLines.push(indent + formatSQLKeywords(line));
        indentLevel++;
        continue;
      }

      // Default case
      const indent = ' '.repeat(indentLevel * indentSize);
      formattedLines.push(indent + formatSQLKeywords(line));
    }

    return formattedLines.join('\n');
  } catch (error) {
    console.error('SQL formatting error:', error);
    return code;
  }
}

/**
 * SQL keywords'ları büyük harfe çevir ve format et
 */
function formatSQLKeywords(line: string): string {
  const sqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON',
    'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
    'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'LIKE', 'BETWEEN',
    'IS', 'NULL', 'TRUE', 'FALSE',
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
    'DISTINCT', 'AS', 'ASC', 'DESC',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'VARCHAR', 'INTEGER', 'DECIMAL', 'DATE', 'DATETIME', 'TIME',
    'IF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'UNION', 'ALL', 'INTERSECT', 'EXCEPT'
  ];

  let formattedLine = line;
  
  // Keywords'ları büyük harfe çevir (word boundaries kullanarak)
  sqlKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formattedLine = formattedLine.replace(regex, keyword);
  });

  // Virgül sonrası boşluk ekle
  formattedLine = formattedLine.replace(/,(?!\s)/g, ', ');
  
  // Operatörler etrafında boşluk
  formattedLine = formattedLine.replace(/([<>=!]+)/g, ' $1 ');
  formattedLine = formattedLine.replace(/\s+/g, ' '); // Çoklu boşlukları tek boşluğa çevir
  
  return formattedLine.trim();
} 