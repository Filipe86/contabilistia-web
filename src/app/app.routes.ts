import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { Invoices } from './invoices/invoices';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'demo', component: Invoices },
  { path: '**', redirectTo: '' }
];
