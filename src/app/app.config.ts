import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideThisGlobal } from './core/intellisense/di/this-globals.token';
import { provideZonelessChangeDetection } from '@angular/core';

// Test objeleri
const api = { 
  baseUrl: 'https://api.example.com', 
  getUser(id: number) { /* ... */ },
  listUsers() { /* ... */ }
};

const auth = { 
  isLoggedIn: false, 
  user: {},
  login(credentials: any) { /* ... */ },
  logout() { /* ... */ },
  getToken() { return ''; }
};

const test = { 
  name: 'Test Service',
  version: 1.0,
  isActive: true,
  data: [1, 2, 3],
  config: { debug: true, timeout: 5000 },
  runTest(testName: string, options?: any) { /* ... */ },
  getResults() { return []; },
  validate(input: string, rules: string[]) { return true; },
  async fetchData(url: string, params?: object) { /* ... */ }
};

const database = {
  connection: 'mongodb://localhost:27017',
  isConnected: true,
  collections: ['users', 'orders', 'products'],
  connect() { /* ... */ },
  disconnect() { /* ... */ },
  query(sql: string) { /* ... */ },
  insert(table: string, data: any) { /* ... */ },
  update(table: string, id: number, data: any) { /* ... */ },
  delete(table: string, id: number) { /* ... */ }
};

const form = {
  isValid: false,
  isDirty: false,
  isSubmitting: false,
  errors: {} as any,
  values: {} as any,
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

const notification = {
  isEnabled: true,
  soundEnabled: false,
  defaultDuration: 5000,
  position: 'top-right',
  queue: [],
  show(message: string, type?: 'info' | 'success' | 'warning' | 'error') { /* ... */ },
  success(message: string, duration?: number) { /* ... */ },
  error(message: string, duration?: number) { /* ... */ },
  warning(message: string, duration?: number) { /* ... */ },
  info(message: string, duration?: number) { /* ... */ },
  clear() { /* ... */ },
  clearAll() { /* ... */ },
  setPosition(position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') { /* ... */ },
  enableSound() { /* ... */ },
  disableSound() { /* ... */ }
};

// 🆕 YENİ: Enum-like obje (heuristic: Enum ikonu)
const status = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// 🆕 YENİ: Namespace-like obje (heuristic: Module ikonu)
const utils = {
  format: {
    date(date: Date) { return date.toISOString(); },
    currency(amount: number) { return `$${amount.toFixed(2)}`; },
    phone(phone: string) { return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'); }
  },
  validate: {
    email(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); },
    phone(phone: string) { return /^\d{10}$/.test(phone.replace(/\D/g, '')); },
    required(value: any) { return value !== null && value !== undefined && value !== ''; }
  },
  math: {
    sum(...numbers: number[]) { return numbers.reduce((a, b) => a + b, 0); },
    average(...numbers: number[]) { return this.sum(...numbers) / numbers.length; },
    round(value: number, decimals: number = 2) { return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals); }
  }
};

// 🆕 YENİ: Event-heavy obje (heuristic: Class ikonu, ama event'ler Event ikonu)
const events = {
  listeners: new Map(),
  addEventListener(event: string, callback: Function) { /* ... */ },
  removeEventListener(event: string, callback: Function) { /* ... */ },
  emit(event: string, data?: any) { /* ... */ },
  onUserLogin(callback: Function) { /* ... */ },
  onUserLogout(callback: Function) { /* ... */ },
  onDataChange(callback: Function) { /* ... */ },
  onError(callback: Function) { /* ... */ }
};

const logger = {
  log(message: string, level: 'info' | 'warn' | 'error' = 'info') { /* ... */ },
  info(message: string) { /* ... */ },
  warn(message: string) { /* ... */ },
  error(message: string) { /* ... */ }
};

const storage = {
  get(key: string) { /* ... */ },
  set(key: string, value: any) { /* ... */ },
  remove(key: string) { /* ... */ },
  clear() { /* ... */ }
};

// 🆕 YENİ: DI yöntemiyle obje ekleme
const analytics = {
  isEnabled: true,
  userId: null as string | null,
  track(event: string, data?: any) { /* ... */ },
  pageView(page: string) { /* ... */ },
  userAction(action: string, properties?: any) { /* ... */ },
  setUserId(id: string) { /* ... */ },
  getSessionData() { return {}; }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // This globals via DI
    provideThisGlobal('api', api),
    provideThisGlobal('auth', auth),
    provideThisGlobal('test', test),
    provideThisGlobal('database', database),
    provideThisGlobal('form', form),
    provideThisGlobal('notification', notification),
    provideThisGlobal('status', status),
    provideThisGlobal('utils', utils),
    provideThisGlobal('events', events),
    provideThisGlobal('logger', logger),
    provideThisGlobal('storage', storage),
    provideThisGlobal('analytics', analytics),
    provideZonelessChangeDetection(),
  ]
};
