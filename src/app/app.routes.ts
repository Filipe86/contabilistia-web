import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { WorkspaceShell } from './workspace/workspace-shell';
import { Invoices } from './invoices/invoices';
import { Vehicles } from './vehicles/vehicles';
import { Clients } from './clients/clients';

export const routes: Routes = [
  { path: '', component: LandingPage },
  {
    path: 'backoffice',
    component: WorkspaceShell,
    children: [
      { path: '', redirectTo: 'documents', pathMatch: 'full' },
      { path: 'documents', component: Invoices },
      { path: 'vehicles', component: Vehicles },
      { path: 'clients', component: Clients },
    ],
  },
  { path: 'demo', redirectTo: '/backoffice/documents' },
  { path: 'invoices', redirectTo: '/backoffice/documents' },
  { path: 'vehicles', redirectTo: '/backoffice/vehicles' },
  { path: '**', redirectTo: '' }
];
