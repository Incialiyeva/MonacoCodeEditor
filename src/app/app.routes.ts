import { Routes } from '@angular/router';
import { MonacoEditorComponent } from './components/monaco-editor/monaco-editor.component';
import { LandingPageComponent } from './landing-page/landing-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'editor', component: MonacoEditorComponent }
];
