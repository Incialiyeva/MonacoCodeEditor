import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface IntelliSenseFile {
  path: string;
  sha256: string;
  version?: string;
  priority?: number;
}

export interface IntelliSenseManifest {
  version: string;
  files: IntelliSenseFile[];
  metadata?: {
    description?: string;
    author?: string;
    lastUpdated?: string;
  };
}

export interface LoadedDefinition {
  path: string;
  content: string;
  sha256: string;
  disposable?: any;
}

@Injectable({
  providedIn: 'root'
})
export class IntelliSenseManifestLoader {
  private loadedDefinitions = new Map<string, LoadedDefinition>();
  private manifestCache: IntelliSenseManifest | null = null;
  private baseUrl = 'assets/intellisense/';

  constructor(private http: HttpClient) {}

  /**
   * Load manifest and definitions incrementally
   */
  loadFromManifest(manifestPath: string = 'defs.manifest.json'): Observable<LoadedDefinition[]> {
    const fullPath = `${this.baseUrl}${manifestPath}`;
    
    return this.http.get<IntelliSenseManifest>(fullPath).pipe(
      tap(manifest => {
        console.log(`[IntelliSense] Loading manifest v${manifest.version} with ${manifest.files.length} files`);
        this.manifestCache = manifest;
      }),
      map(manifest => manifest.files),
      map(files => files.sort((a, b) => (b.priority || 0) - (a.priority || 0))),
      map(files => files.map(file => this.loadDefinitionIfChanged(file))),
      catchError(error => {
        console.error('[IntelliSense] Failed to load manifest:', error);
        return throwError(() => new Error(`Manifest loading failed: ${error.message}`));
      })
    );
  }

  /**
   * Load single definition file if changed (SHA256 check)
   */
  private loadDefinitionIfChanged(file: IntelliSenseFile): Observable<LoadedDefinition> {
    const existing = this.loadedDefinitions.get(file.path);
    
    // If already loaded with same SHA256, skip
    if (existing && existing.sha256 === file.sha256) {
      console.log(`[IntelliSense] Skipping ${file.path} (unchanged)`);
      return of(existing);
    }

    // Dispose old definition if exists
    if (existing && existing.disposable) {
      try {
        existing.disposable.dispose();
      } catch (e) {
        console.warn(`[IntelliSense] Failed to dispose ${file.path}:`, e);
      }
    }

    // Load new definition
    return this.loadDefinitionFile(file);
  }

  /**
   * Load definition file content
   */
  private loadDefinitionFile(file: IntelliSenseFile): Observable<LoadedDefinition> {
    const fullPath = `${this.baseUrl}${file.path}`;
    
    return this.http.get(fullPath, { responseType: 'text' }).pipe(
      map(content => {
        const definition: LoadedDefinition = {
          path: file.path,
          content,
          sha256: file.sha256
        };
        
        this.loadedDefinitions.set(file.path, definition);
        console.log(`[IntelliSense] Loaded ${file.path} (${content.length} chars)`);
        
        return definition;
      }),
      catchError(error => {
        console.error(`[IntelliSense] Failed to load ${file.path}:`, error);
        return throwError(() => new Error(`Failed to load ${file.path}: ${error.message}`));
      })
    );
  }

  /**
   * Get currently loaded definitions
   */
  getLoadedDefinitions(): LoadedDefinition[] {
    return Array.from(this.loadedDefinitions.values());
  }

  /**
   * Get definition by path
   */
  getDefinition(path: string): LoadedDefinition | undefined {
    return this.loadedDefinitions.get(path);
  }

  /**
   * Check if definition is loaded and up-to-date
   */
  isDefinitionCurrent(path: string, expectedSha256: string): boolean {
    const loaded = this.loadedDefinitions.get(path);
    return loaded?.sha256 === expectedSha256;
  }

  /**
   * Dispose all loaded definitions
   */
  disposeAll(): void {
    console.log(`[IntelliSense] Disposing ${this.loadedDefinitions.size} definitions`);
    
    this.loadedDefinitions.forEach((def, path) => {
      if (def.disposable) {
        try {
          def.disposable.dispose();
        } catch (e) {
          console.warn(`[IntelliSense] Failed to dispose ${path}:`, e);
        }
      }
    });
    
    this.loadedDefinitions.clear();
  }

  /**
   * Dispose specific definition
   */
  disposeDefinition(path: string): boolean {
    const def = this.loadedDefinitions.get(path);
    if (def && def.disposable) {
      try {
        def.disposable.dispose();
        this.loadedDefinitions.delete(path);
        console.log(`[IntelliSense] Disposed ${path}`);
        return true;
      } catch (e) {
        console.warn(`[IntelliSense] Failed to dispose ${path}:`, e);
        return false;
      }
    }
    return false;
  }

  /**
   * Set disposable for a definition (called by Monaco provider)
   */
  setDefinitionDisposable(path: string, disposable: any): void {
    const def = this.loadedDefinitions.get(path);
    if (def) {
      def.disposable = disposable;
    }
  }

  /**
   * Get manifest cache
   */
  getManifest(): IntelliSenseManifest | null {
    return this.manifestCache;
  }
} 