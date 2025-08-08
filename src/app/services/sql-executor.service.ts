import { Injectable } from '@angular/core';

declare const window: any;

export interface SQLResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowsAffected?: number;
  error?: string;
  executionTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SQLExecutorService {
  private db: any = null;
  private SQL: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeSQL();
  }

  private async initializeSQL(): Promise<void> {
    try {
      // SQL.js'i dinamik olarak yükle
      if (!window.initSqlJs) {
        // SQL.js CDN'den yükle
        await this.loadSQLJs();
      }

      this.SQL = await window.initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Yeni bir veritabanı oluştur
      this.db = new this.SQL.Database();
      this.isInitialized = true;
      console.log('SQL.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQL.js:', error);
    }
  }

  private loadSQLJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load SQL.js'));
      document.head.appendChild(script);
    });
  }

  async executeSQL(sqlCode: string): Promise<SQLResult> {
    if (!this.isInitialized || !this.db) {
      await this.initializeSQL();
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'SQL engine not initialized'
        };
      }
    }

    const startTime = performance.now();

    try {
      // SQL kodunu statement'lara böl
      const statements = this.parseStatements(sqlCode);
      const results: any[] = [];
      let totalRowsAffected = 0;

      for (const statement of statements) {
        if (!statement.trim()) continue;

        const result = this.db.exec(statement);
        
        if (result.length > 0) {
          // SELECT sorgusu - sonuçlar var
          const queryResult = result[0];
          results.push({
            columns: queryResult.columns,
            values: queryResult.values,
            statement: statement
          });
        } else {
          // INSERT, UPDATE, DELETE, CREATE vs. - değişiklik sayısı
          totalRowsAffected += this.db.getRowsModified();
          results.push({
            statement: statement,
            rowsAffected: this.db.getRowsModified()
          });
        }
      }

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        data: results,
        rowsAffected: totalRowsAffected,
        executionTime: executionTime
      };

    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        error: error.message || 'SQL execution failed',
        executionTime: executionTime
      };
    }
  }

  private parseStatements(sqlCode: string): string[] {
    // Yorumları temizle ve statement'lara böl
    const cleanCode = sqlCode
      .split('\n')
      .map(line => {
        // Satır içi yorumları kaldır
        const commentIndex = line.indexOf('--');
        return commentIndex !== -1 ? line.substring(0, commentIndex) : line;
      })
      .join('\n')
      .trim();

    // Noktalı virgülle böl
    return cleanCode
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
  }

  // Veritabanını sıfırla
  resetDatabase(): void {
    if (this.SQL) {
      this.db = new this.SQL.Database();
    }
  }

  // Mevcut tabloları listele
  async getTables(): Promise<string[]> {
    if (!this.isInitialized || !this.db) {
      return [];
    }

    try {
      const result = this.db.exec("SELECT name FROM sqlite_master WHERE type='table';");
      if (result.length > 0) {
        return result[0].values.map((row: any) => row[0]);
      }
      return [];
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  }

  // Tablo yapısını getir
  async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.isInitialized || !this.db) {
      return [];
    }

    try {
      const result = this.db.exec(`PRAGMA table_info(${tableName});`);
      if (result.length > 0) {
        return result[0].values.map((row: any) => ({
          cid: row[0],
          name: row[1],
          type: row[2],
          notnull: row[3],
          defaultValue: row[4],
          pk: row[5]
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting table schema:', error);
      return [];
    }
  }
} 