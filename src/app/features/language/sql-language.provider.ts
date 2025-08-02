/**
 * SQL Language Provider for Monaco Editor
 * Provides syntax highlighting and language support for SQL
 */

export function registerSQLLanguage(monaco: any): void {
  // SQL dil desteğini kaydet
  monaco.languages.register({ id: 'sql' });
  
  monaco.languages.setMonarchTokensProvider('sql', {
    defaultToken: '',
    tokenPostfix: '.sql',
    ignoreCase: true,
    tokenizer: {
      root: [
        // Keywords
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@operators': 'operator',
            '@functions': 'predefined',
            '@types': 'type',
            '@default': 'identifier'
          }
        }],
        // Numbers
        [/[0-9]+/, 'number'],
        [/[0-9]*\.[0-9]+/, 'number'],
        // Strings
        [/'/, 'string', '@string'],
        [/"/, 'string', '@string'],
        [/`/, 'string', '@string'],
        // Comments
        [/--.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        // Operators
        [/[+\-*/=<>!&|]/, 'operator'],
        [/[(),;]/, 'delimiter'],
        // Whitespace
        [/[ \t\r\n]+/, 'white']
      ],
      comment: [
        [/[^*/]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment']
      ],
      string: [
        [/[^'"]+/, 'string'],
        [/['"]/, 'string', '@pop']
      ]
    },
    keywords: [
      // DML - Data Manipulation Language
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT',
      'FROM', 'WHERE', 'HAVING', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'TOP',
      'INTO', 'VALUES', 'SET',
      
      // DDL - Data Definition Language
      'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'RENAME',
      'TABLE', 'INDEX', 'VIEW', 'SCHEMA', 'DATABASE', 'TRIGGER', 'PROCEDURE', 'FUNCTION',
      'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'AUTO_INCREMENT',
      'CONSTRAINT', 'CHECK', 'REFERENCES', 'CASCADE', 'RESTRICT', 'SET NULL',
      
      // Joins
      'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
      'ON', 'USING', 'NATURAL',
      
      // Aggregation
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'ALL',
      
      // Conditions
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
      'EXISTS', 'NOT EXISTS', 'ALL', 'ANY', 'SOME', 'REGEXP', 'RLIKE',
      
      // Functions
      'COALESCE', 'NULLIF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM',
      'DATE', 'NOW', 'CURRENT_TIMESTAMP', 'YEAR', 'MONTH', 'DAY',
      'IF', 'IFNULL', 'GREATEST', 'LEAST',
      
      // Transactions
      'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
      
      // Control Flow
      'IF', 'WHILE', 'FOR', 'LOOP', 'BREAK', 'CONTINUE', 'GOTO',
      'EXCEPTION', 'HANDLER', 'SIGNAL', 'RESIGNAL',
      
      // Other
      'AS', 'ASC', 'DESC', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
      'WITH', 'RECURSIVE', 'CTE', 'OVER', 'PARTITION BY', 'ROWS', 'RANGE',
      'GRANT', 'REVOKE', 'DENY', 'EXEC', 'EXECUTE', 'CALL', 'RETURN',
      'DECLARE', 'SET', 'GET', 'DIAGNOSTICS', 'CONDITION',
      
      // Additional SQL keywords
      'ADD', 'MODIFY', 'CHANGE', 'DROP', 'RENAME', 'INDEX', 'KEY',
      'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT',
      'IDENTITY', 'SEQUENCE', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'VIEW',
      'SCHEMA', 'DATABASE', 'USER', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK',
      'SAVEPOINT', 'TRANSACTION', 'BEGIN', 'END', 'DECLARE', 'SET', 'EXEC',
      'EXECUTE', 'CALL', 'RETURN', 'IF', 'WHILE', 'FOR', 'LOOP', 'BREAK',
      'CONTINUE', 'GOTO', 'EXCEPTION', 'HANDLER', 'SIGNAL', 'RESIGNAL',
      'GET', 'DIAGNOSTICS', 'CONDITION', 'WITH', 'RECURSIVE', 'CTE',
      'OVER', 'PARTITION BY', 'ROWS', 'RANGE', 'UNION', 'UNION ALL',
      'INTERSECT', 'EXCEPT', 'AS', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
      'TOP', 'DISTINCT', 'ALL', 'ANY', 'SOME', 'EXISTS', 'NOT EXISTS',
      'IN', 'NOT IN', 'LIKE', 'NOT LIKE', 'REGEXP', 'RLIKE', 'BETWEEN',
      'NOT BETWEEN', 'IS NULL', 'IS NOT NULL', 'IS', 'IS NOT',
      'AND', 'OR', 'NOT', 'XOR', 'MOD', 'DIV', '<=>', '!=', '<>',
      '<=', '>=', '<', '>', '=', '+', '-', '*', '/', '%', '&', '|', '^',
      '<<', '>>', '~', '!', '&&', '||'
    ],
    operators: [
      '=', '<>', '!=', '<', '<=', '>', '>=', '<=>',
      '+', '-', '*', '/', '%', 'DIV', 'MOD',
      'AND', 'OR', 'NOT', 'XOR',
      'IN', 'LIKE', 'REGEXP', 'RLIKE',
      'IS', 'IS NOT', 'BETWEEN', 'NOT BETWEEN',
      '&', '|', '^', '<<', '>>', '~', '!', '&&', '||'
    ],
    functions: [
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT',
      'COALESCE', 'NULLIF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'CONCAT', 'SUBSTRING', 'SUBSTR', 'LENGTH', 'CHAR_LENGTH',
      'UPPER', 'UCASE', 'LOWER', 'LCASE', 'TRIM', 'LTRIM', 'RTRIM',
      'DATE', 'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
      'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
      'DATE_FORMAT', 'STR_TO_DATE', 'TIMESTAMP', 'UNIX_TIMESTAMP',
      'ROUND', 'CEIL', 'CEILING', 'FLOOR', 'ABS', 'POW', 'POWER',
      'SQRT', 'RAND', 'RANDOM', 'PI', 'EXP', 'LN', 'LOG', 'LOG10',
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
      'DEGREES', 'RADIANS', 'HEX', 'UNHEX', 'BIN', 'OCT',
      'BIT_COUNT', 'BIT_LENGTH', 'CHAR', 'ASCII', 'ORD',
      'REPEAT', 'REVERSE', 'SPACE', 'REPLACE', 'INSERT',
      'LOCATE', 'POSITION', 'INSTR', 'FIND_IN_SET',
      'LEFT', 'RIGHT', 'MID', 'SUBSTRING_INDEX',
      'LPAD', 'RPAD', 'LENGTH', 'CHAR_LENGTH', 'BIT_LENGTH',
      'IF', 'IFNULL', 'NULLIF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'GREATEST', 'LEAST', 'COALESCE', 'ISNULL',
      'USER', 'DATABASE', 'SCHEMA', 'VERSION', 'CONNECTION_ID',
      'LAST_INSERT_ID', 'ROW_COUNT', 'FOUND_ROWS',
      'CONCAT_WS', 'GROUP_CONCAT', 'JSON_OBJECT', 'JSON_ARRAY',
      'JSON_EXTRACT', 'JSON_UNQUOTE', 'JSON_QUOTE', 'JSON_CONTAINS',
      'JSON_CONTAINS_PATH', 'JSON_DEPTH', 'JSON_LENGTH', 'JSON_KEYS',
      'JSON_SEARCH', 'JSON_TYPE', 'JSON_VALID', 'JSON_SCHEMA_VALID',
      'JSON_SCHEMA_VALIDATION_REPORT', 'JSON_PRETTY', 'JSON_STORAGE_SIZE',
      'JSON_STORAGE_FREE', 'JSON_TABLE', 'JSON_VALUE', 'JSON_QUERY'
    ],
    types: [
      'INT', 'INTEGER', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT',
      'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL',
      'CHAR', 'VARCHAR', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT',
      'BINARY', 'VARBINARY', 'BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB',
      'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
      'ENUM', 'SET', 'JSON', 'GEOMETRY', 'POINT', 'LINESTRING',
      'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON',
      'GEOMETRYCOLLECTION', 'BOOLEAN', 'BOOL', 'BIT',
      'SERIAL', 'BIGSERIAL', 'SMALLSERIAL', 'MONEY', 'UUID',
      'XML', 'CIDR', 'INET', 'MACADDR', 'BIT VARYING',
      'INTERVAL', 'TIME WITH TIME ZONE', 'TIMESTAMP WITH TIME ZONE'
    ]
  });
} 