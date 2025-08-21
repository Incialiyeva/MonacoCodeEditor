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

// Payments objesi
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

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    // Tek tek ekleme
    provideThisGlobal('form', form),
    provideThisGlobal('payments', payments),
    provideThisGlobal('analytics', analytics), // ← Analytics'i aktif et
    
    // Veya toplu ekleme
    // provideThisGlobals({
    //   form,
    //   payments,
    //   analytics
    // }),
  ]
})
export class FormsModule { } 