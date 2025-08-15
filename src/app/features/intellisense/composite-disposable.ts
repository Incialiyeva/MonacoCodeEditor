export interface IDisposable {
  dispose(): void;
}

/**
 * CompositeDisposable - Manages multiple disposables in one place
 * Prevents memory leaks by ensuring all disposables are properly cleaned up
 */
export class CompositeDisposable implements IDisposable {
  private disposables: IDisposable[] = [];
  private disposed = false;

  /**
   * Add a disposable to the collection
   * @param disposable The disposable to add
   * @returns The added disposable for chaining
   */
  add<T extends IDisposable>(disposable: T): T {
    if (this.disposed) {
      console.warn('[CompositeDisposable] Attempting to add disposable after disposal');
      // Still dispose it to prevent memory leaks
      try {
        disposable.dispose();
      } catch (e) {
        console.warn('[CompositeDisposable] Failed to dispose added item:', e);
      }
      return disposable;
    }

    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Add multiple disposables at once
   * @param disposables Array of disposables to add
   */
  addAll(disposables: IDisposable[]): void {
    disposables.forEach(d => this.add(d));
  }

  /**
   * Remove a disposable from the collection (without disposing it)
   * @param disposable The disposable to remove
   * @returns true if found and removed, false otherwise
   */
  remove(disposable: IDisposable): boolean {
    if (this.disposed) return false;

    const index = this.disposables.indexOf(disposable);
    if (index > -1) {
      this.disposables.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove and dispose a specific disposable
   * @param disposable The disposable to remove and dispose
   * @returns true if found and disposed, false otherwise
   */
  removeAndDispose(disposable: IDisposable): boolean {
    if (this.remove(disposable)) {
      try {
        disposable.dispose();
        return true;
      } catch (e) {
        console.warn('[CompositeDisposable] Failed to dispose removed item:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Clear all disposables without disposing them
   */
  clear(): void {
    if (this.disposed) return;
    this.disposables = [];
  }

  /**
   * Dispose all disposables and clear the collection
   */
  dispose(): void {
    if (this.disposed) return;

    console.log(`[CompositeDisposable] Disposing ${this.disposables.length} items`);
    
    const errors: Error[] = [];
    
    this.disposables.forEach((disposable, index) => {
      try {
        disposable.dispose();
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.warn(`[CompositeDisposable] Failed to dispose item ${index}:`, error);
        errors.push(error);
      }
    });

    this.disposables = [];
    this.disposed = true;

    if (errors.length > 0) {
      console.error(`[CompositeDisposable] ${errors.length} disposal errors occurred`);
    }
  }

  /**
   * Check if this composite disposable has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Get the number of disposables in the collection
   */
  get size(): number {
    return this.disposables.length;
  }

  /**
   * Get all disposables (read-only)
   */
  get items(): readonly IDisposable[] {
    return this.disposables.slice();
  }

  /**
   * Create a new composite disposable with initial items
   */
  static from(...disposables: IDisposable[]): CompositeDisposable {
    const composite = new CompositeDisposable();
    composite.addAll(disposables);
    return composite;
  }
}

/**
 * AutoDisposable - Decorator for automatic disposal
 * Automatically disposes the property when the component is destroyed
 */
export function AutoDisposable() {
  return function (target: any, propertyKey: string) {
    const originalOnDestroy = target.ngOnDestroy;
    
    target.ngOnDestroy = function() {
      if (this[propertyKey] && typeof this[propertyKey].dispose === 'function') {
        try {
          this[propertyKey].dispose();
        } catch (e) {
          console.warn(`[AutoDisposable] Failed to dispose ${propertyKey}:`, e);
        }
      }
      
      if (originalOnDestroy) {
        originalOnDestroy.call(this);
      }
    };
  };
}

/**
 * DisposableManager - Utility for managing disposables in components
 */
export class DisposableManager {
  private composite = new CompositeDisposable();

  /**
   * Add a disposable
   */
  add<T extends IDisposable>(disposable: T): T {
    return this.composite.add(disposable);
  }

  /**
   * Add multiple disposables
   */
  addAll(disposables: IDisposable[]): void {
    this.composite.addAll(disposables);
  }

  /**
   * Remove a disposable
   */
  remove(disposable: IDisposable): boolean {
    return this.composite.remove(disposable);
  }

  /**
   * Remove and dispose a disposable
   */
  removeAndDispose(disposable: IDisposable): boolean {
    return this.composite.removeAndDispose(disposable);
  }

  /**
   * Dispose all managed disposables
   */
  dispose(): void {
    this.composite.dispose();
  }

  /**
   * Check if disposed
   */
  isDisposed(): boolean {
    return this.composite.isDisposed();
  }

  /**
   * Get size
   */
  get size(): number {
    return this.composite.size;
  }
} 