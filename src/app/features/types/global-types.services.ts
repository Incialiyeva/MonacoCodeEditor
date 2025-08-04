/**
 * Services Types Module
 * Ortak servis interface'leri ve türleri
 */

export const servicesTypes = {
  content: `
declare global {
  // Base Service Interface
  interface BaseService {
    id: string;
    name: string;
    version: string;
    isActive: boolean;
    initialize(): Promise<void>;
    destroy(): Promise<void>;
  }
  
  // Data Service Interface
  interface DataService extends BaseService {
    get<T>(id: string): Promise<T | null>;
    getAll<T>(params?: Record<string, any>): Promise<T[]>;
    create<T>(data: Partial<T>): Promise<T>;
    update<T>(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    count(params?: Record<string, any>): Promise<number>;
    exists(id: string): Promise<boolean>;
  }
  
  // Cache Service Interface
  interface CacheService extends BaseService {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    clear(): void;
    has(key: string): boolean;
    keys(): string[];
    size(): number;
  }
  
  // Log Service Interface
  interface LogService extends BaseService {
    log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error, data?: any): void;
    group(label: string): void;
    groupEnd(): void;
  }
  
  // Auth Service Interface
  interface AuthService extends BaseService {
    login(credentials: { username: string; password: string }): Promise<boolean>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getCurrentUser(): any;
    hasPermission(permission: string): boolean;
    hasRole(role: string): boolean;
    refreshToken(): Promise<string>;
  }
  
  // Notification Service Interface
  interface NotificationService extends BaseService {
    show(message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number): void;
    success(message: string, duration?: number): void;
    error(message: string, duration?: number): void;
    warning(message: string, duration?: number): void;
    info(message: string, duration?: number): void;
    clear(): void;
  }
  
  // Validation Service Interface
  interface ValidationService extends BaseService {
    validate(data: any, rules: ValidationRule[]): ValidationResult;
    isValid(data: any, rules: ValidationRule[]): boolean;
    getErrors(data: any, rules: ValidationRule[]): string[];
  }
  
  // Validation Types
  interface ValidationRule {
    field: string;
    type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
    message?: string;
    value?: any;
    validator?: (value: any) => boolean | string;
  }
  
  interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
  }
  
  interface ValidationError {
    field: string;
    message: string;
    value?: any;
  }
  
  // API Response Types
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
  
  interface ApiError {
    code: string;
    message: string;
    details?: any;
  }
  
  // Service Registry
  interface ServiceRegistry {
    get<T extends BaseService>(name: string): T | null;
    register<T extends BaseService>(name: string, service: T): void;
    unregister(name: string): boolean;
    has(name: string): boolean;
    list(): string[];
  }
  
  // Global service instances
  const dataService: DataService;
  const cacheService: CacheService;
  const logService: LogService;
  const authService: AuthService;
  const notificationService: NotificationService;
  const validationService: ValidationService;
  const serviceRegistry: ServiceRegistry;
}

export {};
`,
  targetFileSrc: 'global-types.services.d.ts'
}; 