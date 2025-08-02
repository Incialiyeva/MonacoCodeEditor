import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { MonacoEditorComponent } from './components/monaco-editor.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'editor', component: MonacoEditorComponent },
  { path: '**', redirectTo: '' }
];
