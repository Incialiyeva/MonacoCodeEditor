import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonacoEditorComponent } from '../components/monaco-editor.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: true,
  imports: [CommonModule, MonacoEditorComponent]
})
export class LandingPageComponent {
  isModalOpen = false;
  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  openEditorModal() {
    if (this.isBrowser) {
      this.isModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeEditorModal() {
    this.isModalOpen = false;
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }
} 