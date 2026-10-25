import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Client } from '../models/client.model';
import { ClientService } from '../services/clientservice';

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.css',
})
export class WorkspaceShell implements OnInit {
  clients: Client[] = [];
  activeClientId = '';
  clientsError = '';

  constructor(
    private readonly clientService: ClientService,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.clientService.clients$.subscribe((clients) => {
      this.clients = clients;
      this.changeDetector.markForCheck();
    });
    this.clientService.activeClientId$.subscribe((clientId) => {
      this.activeClientId = clientId;
      this.changeDetector.markForCheck();
    });
    this.clientService.getClients().subscribe({
      error: () => {
        this.clientsError = 'Não foi possível carregar os clientes. Tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }

  get isClientsPage(): boolean {
    return this.router.url.endsWith('/clients');
  }

  get canShowWorkspaceContent(): boolean {
    return Boolean(this.activeClientId) || this.isClientsPage;
  }

  selectClient(clientId: string): void {
    this.clientService.setActiveClient(clientId);
  }
}
