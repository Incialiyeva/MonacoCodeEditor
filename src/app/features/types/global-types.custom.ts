/**
 * Custom Types Module
 * Kullanıcı tanımlı özel türler ve interface'ler
 */

export const customTypes = {
  content: `
declare global {
  // Common Entity Types
  interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    isActive: boolean;
    isDeleted: boolean;
  }
  
  // User Types
  interface User extends BaseEntity {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    lastLoginAt?: Date;
    isOnline: boolean;
  }
  
  // Form Types
  interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'file';
    value?: any;
    required?: boolean;
    disabled?: boolean;
    visible?: boolean;
    placeholder?: string;
    options?: FormFieldOption[];
    validation?: FormFieldValidation;
  }
  
  interface FormFieldOption {
    value: any;
    label: string;
    disabled?: boolean;
  }
  
  interface FormFieldValidation {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  }
  
  interface FormData {
    [key: string]: any;
  }
  
  // Table Types
  interface TableColumn {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'action' | 'custom';
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => string;
  }
  
  interface TableRow {
    id: string;
    [key: string]: any;
  }
  
  interface TableData {
    columns: TableColumn[];
    rows: TableRow[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
  }
  
  // Dialog Types
  interface DialogConfig {
    title: string;
    content: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
    closable?: boolean;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }
  
  // Event Types
  interface EventHandler {
    (event: Event, ...args: any[]): void;
  }
  
  interface EventMap {
    [eventName: string]: EventHandler[];
  }
  
  // Async Types
  type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
  type SyncFunction<T = any> = (...args: any[]) => T;
  
  // Utility Types
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  
  type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  
  type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
  
  type Nullable<T> = T | null;
  
  type NonNullable<T> = T extends null | undefined ? never : T;
  
  // Function Types
  type VoidFunction = () => void;
  type AsyncVoidFunction = () => Promise<void>;
  
  // Promise Types
  type ResolvedPromise<T> = Promise<T>;
  type RejectedPromise = Promise<never>;
  
  // Array Types
  type NonEmptyArray<T> = [T, ...T[]];
  type ReadonlyArray<T> = readonly T[];
  
  // Object Types
  type Record<K extends keyof any, T> = {
    [P in K]: T;
  };
  
  type Partial<T> = {
    [P in keyof T]?: T[P];
  };
  
  type Required<T> = {
    [P in keyof T]-?: T[P];
  };
  
  type Readonly<T> = {
    readonly [P in keyof T]: T[P];
  };
  
  type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
  };
  
  type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
  
  type Exclude<T, U> = T extends U ? never : T;
  
  type Extract<T, U> = T extends U ? T : never;
  
  type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
  
  type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
  
  type ConstructorParameters<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer P) => any ? P : never;
  
  type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R ? R : any;
  
  type ThisParameterType<T> = T extends (this: infer U, ...args: any[]) => any ? U : unknown;
  
  type OmitThisParameter<T> = unknown extends ThisParameterType<T> ? T : T extends (...args: infer A) => infer R ? (...args: A) => R : T;
  
  type NoInfer<T> = [T][T extends any ? 0 : never];
  
  type ThisType<T> = T;
}

export {};
`,
  targetFileSrc: 'global-types.custom.d.ts'
}; 