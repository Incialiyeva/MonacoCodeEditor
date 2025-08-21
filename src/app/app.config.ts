import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideThisGlobal } from './core/intellisense/di/this-globals.token';

// Form objesi (örnek)
const form = {
  isValid: false,
  isDirty: false,
  isSubmitting: false,
  errors: {} as Record<string, any>,
  values: {} as Record<string, any>,
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

// Payments objesi (örnek)
const payments = {
  processPayment(amount: number, currency: string) { /* ... */ },
  getBalance() { return 1000; },
  currency: 'USD',
  supportedCurrencies: ['USD', 'EUR', 'TRY'],
  getExchangeRate(from: string, to: string) { /* ... */ }
};

// Analytics objesi
const analytics = {
  track(event: string, data?: any) { /* ... */ },
  pageView(page: string) { /* ... */ },
  userAction(action: string, properties?: any) { /* ... */ },
  isEnabled: true,
  userId: null as string | null
};

// Test servisi (yeni eklenen)
const testService = {
  name: 'Test Service',
  version: '2.0.0',
  isActive: true,
  data: [1, 2, 3, 4, 5],
  config: { debug: true, timeout: 3000 },
  runTest(testName: string) { /* ... */ },
  getResults() { return this.data; },
  validateInput(input: string) { return input.length > 0; },
  async fetchData(url: string) { /* ... */ }
};

// Notification servisi (YENİ EKLEME)
const notification = {
  // Properties
  isEnabled: true,
  soundEnabled: false,
  defaultDuration: 5000,
  position: 'top-right',
  queue: [] as any[],
  
  // Methods
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

// Storage servisi (YENİ EKLEME)
const storage = {
  // Properties
  isAvailable: true,
  maxSize: '50MB',
  usedSpace: '12MB',
  encryptionEnabled: false,
  
  // Methods
  set(key: string, value: any) { /* ... */ },
  get(key: string) { /* ... */ },
  remove(key: string) { /* ... */ },
  clear() { /* ... */ },
  has(key: string) { /* ... */ },
  keys() { return [] as string[]; },
  size() { return 0; },
  setEncryption(enabled: boolean) { /* ... */ },
  backup() { /* ... */ },
  restore(backupData: any) { /* ... */ }
};

// Temel servisler
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

const orders = {
  get(id: number) { /* ... */ },
  list(status?: string) { /* ... */ },
  cancel(id: number) { /* ... */ }
};

const ui = {
  toast(msg: string) { /* ... */ }
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    
    // Runtime globals for Monaco IntelliSense - sadece temel olanları ekle
    provideThisGlobal('api', api),
    provideThisGlobal('auth', auth),
    provideThisGlobal('test', test),
    
    // YENİ EKLEME: Database servisi
    provideThisGlobal('database', {
      connection: 'mongodb://localhost:27017',
      isConnected: true,
      collections: ['users', 'orders', 'products'],
      connect() { /* ... */ },
      disconnect() { /* ... */ },
      query(sql: string) { /* ... */ },
      insert(table: string, data: any) { /* ... */ },
      update(table: string, id: number, data: any) { /* ... */ },
      delete(table: string, id: number) { /* ... */ }
    }),
    
    // YENİ EKLEME: Notification servisi
    provideThisGlobal('notification', notification),
    
    // YENİ EKLEME: Logger servisi (DI test için)
    provideThisGlobal('logger', {
      level: 'info',
      isEnabled: true,
      log(message: string, level?: 'debug' | 'info' | 'warn' | 'error') { /* ... */ },
      debug(message: string) { /* ... */ },
      info(message: string) { /* ... */ },
      warn(message: string) { /* ... */ },
      error(message: string, error?: any) { /* ... */ },
      setLevel(level: 'debug' | 'info' | 'warn' | 'error') { /* ... */ },
      enable() { /* ... */ },
      disable() { /* ... */ }
    }),
    
    // YENİ EKLEME: Storage servisi
    provideThisGlobal('storage', storage),
  ]
};
