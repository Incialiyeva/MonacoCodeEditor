import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideThisGlobal, provideThisGlobals } from '../../core/intellisense/di/this-globals.token';

// Form objesi
const form = {
  // Form özellikleri
  isValid: false,
  isDirty: false,
  isSubmitting: false,
  errors: {} as Record<string, any>,
  values: {} as Record<string, any>,
  
  // Form metodları
  setValue(field: string, value: any) { /* ... */ },
  getValue(field: string) { return this.values[field]; },
  validate() { /* ... */ },
  submit() { /* ... */ },
  reset() { /* ... */ },
  setErrors(errors: object) { /* ... */ },
  clearErrors() { /* ... */ },
  isFieldValid(field: string) { /* ... */ },
  getFieldError(field: string) { /* ... */ }
};




// Analytics objesi
const analytics = {
  track(event: string, data?: any) { /* ... */ },
  pageView(page: string) { /* ... */ },
  userAction(action: string, properties?: any) { /* ... */ },
  isEnabled: true,
  userId: null as string | null
};

// Database objesi (YENİ!)
const database = {
  // Veritabanı bağlantı durumu
  isConnected: true,
  connectionString: 'postgresql://localhost:5432/myapp',
  
  // CRUD işlemleri
  async query(sql: string, params?: any[]) { 
    console.log('Executing query:', sql, 'with params:', params);
    return [{ id: 1, name: 'Test User' }]; 
  },
  
  async findOne(table: string, where: Record<string, any>) { 
    console.log('Finding one in', table, 'where:', where);
    return { id: 1, name: 'Test User' }; 
  },
  
  async findAll(table: string, options?: { limit?: number; offset?: number }) { 
    console.log('Finding all in', table, 'options:', options);
    return [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]; 
  },
  
  async insert(table: string, data: Record<string, any>) { 
    console.log('Inserting into', table, 'data:', data);
    return { id: 3, ...data }; 
  },
  
  async update(table: string, where: Record<string, any>, data: Record<string, any>) { 
    console.log('Updating', table, 'where:', where, 'data:', data);
    return { affectedRows: 1 }; 
  },
  
  async delete(table: string, where: Record<string, any>) { 
    console.log('Deleting from', table, 'where:', where);
    return { affectedRows: 1 }; 
  },
  
  // Transaction işlemleri
  async beginTransaction() { console.log('Beginning transaction'); },
  async commit() { console.log('Committing transaction'); },
  async rollback() { console.log('Rolling back transaction'); },
  
  // Utility metodları
  escape(value: string) { return `'${value.replace(/'/g, "''")}'`; },
  getTableInfo(table: string) { 
    return {
      columns: ['id', 'name', 'email', 'created_at'],
      primaryKey: 'id',
      indexes: ['idx_name', 'idx_email']
    }; 
  }
};

// API objesi (YENİ!)
const api = {
  // Base URL
  baseUrl: 'https://api.example.com',
  
  // HTTP metodları
  async get(endpoint: string, params?: Record<string, any>) {
    console.log('GET request to:', endpoint, 'params:', params);
    return { data: { id: 1, name: 'Test User' }, status: 200 };
  },
  
  async post(endpoint: string, data?: any) {
    console.log('POST request to:', endpoint, 'data:', data);
    return { data: { id: 2, ...data }, status: 201 };
  },
  
  async put(endpoint: string, data?: any) {
    console.log('PUT request to:', endpoint, 'data:', data);
    return { data: { id: 1, ...data }, status: 200 };
  },
  
  async patch(endpoint: string, data?: any) {
    console.log('PATCH request to:', endpoint, 'data:', data);
    return { data: { id: 1, ...data }, status: 200 };
  },
  
  async delete(endpoint: string) {
    console.log('DELETE request to:', endpoint);
    return { data: null, status: 204 };
  },
  
  // Utility metodları
  setAuthToken(token: string) { 
    console.log('Setting auth token:', token);
    this.authToken = token; 
  },
  
  getAuthToken() { return this.authToken; },
  
  setBaseUrl(url: string) { 
    console.log('Setting base URL:', url);
    this.baseUrl = url; 
  },
  
  // Private property
  authToken: null as string | null
};

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    // Tek tek ekleme
    provideThisGlobal('form', form),
   
    provideThisGlobal('analytics', analytics),
    provideThisGlobal('database', database), // ← YENİ: Database objesi
    provideThisGlobal('api', api), // ← YENİ: API objesi
    
    // Veya toplu ekleme
    // provideThisGlobals({
    //   form,
    
    //   analytics,
    //   database,
    //   api
    // }),
  ]
})
export class FormsModule { } 