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
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        [/[0-9]+/, 'number'],
        [/['"`]/, 'string', '@string'],
        [/--.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment']
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
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TABLE', 'INDEX',
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'GROUP', 'HAVING', 'JOIN',
      'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
      'UNION', 'ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IS', 'NULL', 'NOT NULL',
      'ASC', 'DESC', 'LIMIT', 'OFFSET', 'TOP', 'DISTINCT', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN',
      'REFERENCES', 'CONSTRAINT', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'IDENTITY', 'SEQUENCE',
      'TRIGGER', 'PROCEDURE', 'FUNCTION', 'VIEW', 'SCHEMA', 'DATABASE', 'USER', 'GRANT', 'REVOKE',
      'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION', 'BEGIN', 'END', 'DECLARE', 'SET', 'EXEC',
      'EXECUTE', 'CALL', 'RETURN', 'IF', 'WHILE', 'FOR', 'LOOP', 'BREAK', 'CONTINUE', 'GOTO',
      'EXCEPTION', 'HANDLER', 'SIGNAL', 'RESIGNAL', 'GET', 'DIAGNOSTICS', 'CONDITION'
    ]
  });
} 