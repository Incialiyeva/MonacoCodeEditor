/**
 * SQL Validation Utilities
 * Provides validation functions for SQL code
 */

import { ValidationResult } from './html-validation.util';

/**
 * Validates SQL code for common syntax errors
 * @param code - The SQL code to validate
 * @returns ValidationResult with validation status and errors
 */
export function validateSQL(code: string): ValidationResult {
  const errors: string[] = [];
  const lines = code.split('\n');
  let currentStatement = '';
  let lineNumber = 0;

  const fullCode = code.replace(/\s+/g, ' ').trim();
  const lowerFullCode = fullCode.toLowerCase();
  const sqlKeywords = ['select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop'];
  const foundKeywords = sqlKeywords.filter(keyword => lowerFullCode.includes(keyword));

  if (foundKeywords.length === 0) {
    return { isValid: true, errors: [] };
  }

  lines.forEach((line, index) => {
    lineNumber = index + 1;
    const trimmedLine = line.trim();
    if (trimmedLine) currentStatement += ' ' + trimmedLine;

    const lowerLine = trimmedLine.toLowerCase();
    const words = lowerLine.split(/\s+/);

    // ✅ Yazım hatası kontrolü
    if (words.includes('selec')) {
      errors.push(`Typo: 'SELEC' should be 'SELECT' at line ${lineNumber}`);
    }
    if (words.includes('form')) {
      errors.push(`Typo: 'FORM' should be 'FROM' at line ${lineNumber}`);
    }
    if (words.includes('wher')) {
      errors.push(`Typo: 'WHER' should be 'WHERE' at line ${lineNumber}`);
    }
    if (words.includes('orde')) {
      errors.push(`Typo: 'ORDE' should be 'ORDER' at line ${lineNumber}`);
    }
    if (words.includes('grou')) {
      errors.push(`Typo: 'GROU' should be 'GROUP' at line ${lineNumber}`);
    }
    if (words.includes('havin')) {
      errors.push(`Typo: 'HAVIN' should be 'HAVING' at line ${lineNumber}`);
    }

    // ✅ SELECT kontrolü
    if (lowerLine.startsWith('select')) {
      if (!lowerLine.includes('from') && !currentStatement.toLowerCase().includes('from')) {
        errors.push(`Missing FROM clause at line ${lineNumber}`);
      }

      const selectPart = lowerLine.substring(lowerLine.indexOf('select') + 6).trim();
      if (selectPart && !selectPart.includes('from')) {
        const colPart = selectPart.split(/\s+/);
        if (colPart.length > 1 && !selectPart.includes(',')) {
          errors.push(`Possible missing comma between columns near '${selectPart}' at line ${lineNumber}`);
        }
      }
    }

    // ✅ INSERT kontrolü
    if (lowerLine.startsWith('insert')) {
      if (!lowerLine.includes('into')) {
        errors.push(`Missing INTO clause for INSERT at line ${lineNumber}`);
      }
      if (!lowerLine.includes('values') && !currentStatement.toLowerCase().includes('values')) {
        errors.push(`Missing VALUES clause for INSERT at line ${lineNumber}`);
      }
    }

    // ✅ UPDATE kontrolü
    if (lowerLine.startsWith('update')) {
      if (!lowerLine.includes('set') && !currentStatement.toLowerCase().includes('set')) {
        errors.push(`Missing SET clause at line ${lineNumber}`);
      }
    }

    // ✅ DELETE kontrolü
    if (lowerLine.startsWith('delete')) {
      if (!lowerLine.includes('from') && !currentStatement.toLowerCase().includes('from')) {
        errors.push(`Missing FROM clause at line ${lineNumber}`);
      }
    }

    // ✅ WHERE kontrolü
    if (lowerLine.startsWith('where')) {
      const whereClause = lowerLine.substring(lowerLine.indexOf('where') + 5).trim();
      if (
        whereClause &&
        !/=|like|in|between|is null|is not null|>|<|>=|<=|!=/.test(whereClause)
      ) {
        errors.push(`Incomplete WHERE clause at line ${lineNumber}`);
      }
    }

    // ✅ AND/OR + ORDER/GROUP kontrolü
    if (lowerLine.includes('and order by') || lowerLine.includes('or order by')) {
      errors.push(`Invalid syntax: AND/OR cannot be used before ORDER BY at line ${lineNumber}`);
    }
    if (lowerLine.includes('and group by') || lowerLine.includes('or group by')) {
      errors.push(`Invalid syntax: AND/OR cannot be used before GROUP BY at line ${lineNumber}`);
    }

    // ✅ ORDER BY
    if (lowerLine.startsWith('order by')) {
      const orderClause = lowerLine.substring(8).trim();
      if (!orderClause) {
        errors.push(`ORDER BY requires column name at line ${lineNumber}`);
      }
    }

    // ✅ GROUP BY
    if (lowerLine.startsWith('group by')) {
      const groupClause = lowerLine.substring(8).trim();
      if (!groupClause) {
        errors.push(`GROUP BY requires column name at line ${lineNumber}`);
      }
    }

    // ✅ HAVING
    if (lowerLine.startsWith('having')) {
      const havingClause = lowerLine.substring(6).trim();
      if (!havingClause) {
        errors.push(`HAVING requires condition at line ${lineNumber}`);
      }
    }

    // ✅ JOIN kontrolü
    if (lowerLine.includes('join') && !lowerLine.includes('on')) {
      if (!currentStatement.toLowerCase().includes('on')) {
        errors.push(`JOIN requires ON clause at line ${lineNumber}`);
      }
    }

    // ✅ LIMIT / OFFSET
    if (lowerLine.startsWith('limit')) {
      const limitVal = lowerLine.substring(5).trim();
      if (!/^\d+$/.test(limitVal)) {
        errors.push(`LIMIT requires numeric value at line ${lineNumber}`);
      }
    }
    if (lowerLine.startsWith('offset')) {
      const offsetVal = lowerLine.substring(6).trim();
      if (!/^\d+$/.test(offsetVal)) {
        errors.push(`OFFSET requires numeric value at line ${lineNumber}`);
      }
    }

    // ✅ Parantez eşleşmesi
    const openParens = (trimmedLine.match(/\(/g) || []).length;
    const closeParens = (trimmedLine.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Mismatched parentheses at line ${lineNumber}`);
    }
  });

  // ✅ Tam ifade bazlı kontroller (statement düzeyinde)
  const statements = fullCode.split(';').filter(stmt => stmt.trim());
  statements.forEach((stmt, idx) => {
    const lowerStmt = stmt.toLowerCase();
    if (lowerStmt.includes('select') && !lowerStmt.includes('from')) {
      errors.push(`SELECT statement requires FROM clause (statement ${idx + 1})`);
    }
    if (lowerStmt.includes('insert') && !lowerStmt.includes('values') && !lowerStmt.includes('select')) {
      errors.push(`INSERT statement requires VALUES or SELECT subquery (statement ${idx + 1})`);
    }
    if (lowerStmt.includes('update') && !lowerStmt.includes('set')) {
      errors.push(`UPDATE statement requires SET clause (statement ${idx + 1})`);
    }
    if (lowerStmt.includes('delete') && !lowerStmt.includes('from')) {
      errors.push(`DELETE statement requires FROM clause (statement ${idx + 1})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
} 