import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { MonacoEditorComponent } from './components/monaco-editor.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent },         // Ana sayfa (landing page)
  { path: 'editor', component: MonacoEditorComponent },  // Editör sayfası
  { path: '**', redirectTo: '' }                         // Tanımsız URL'ler ana sayfaya yönlenir
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {} 