import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client, ClientInput } from '../models/client.model';
import { ClientService } from '../services/clientservice';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class Clients implements OnInit {
  clients: Client[] = [];
  form: ClientInput = { name: '', nif: '' };
  editingId: string | null = null;
  loading = true;
  saving = false;
  deletingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly clientService: ClientService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.clientService.clients$.subscribe((clients) => {
      this.clients = clients;
    });
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar os clientes. Tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  submitClient(): void {
    const client = { name: this.form.name.trim(), nif: this.form.nif.replace(/\D/g, '') };
    if (!client.name || client.nif.length !== 9) {
      this.errorMessage = 'Indique o nome e um NIF válido com 9 dígitos.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const request = this.editingId
      ? this.clientService.updateClient(this.editingId, client)
      : this.clientService.createClient(client);
    request.subscribe({
      next: (savedClient) => {
        if (this.editingId) {
          this.clients = this.clients.map((item) =>
            item.id === savedClient.id ? savedClient : item,
          ).sort((first, second) => first.name.localeCompare(second.name, 'pt'));
          this.successMessage = 'Cliente atualizado com sucesso.';
        } else {
          this.clients = this.clients.some((item) => item.id === savedClient.id)
            ? this.clients
            : [...this.clients, savedClient]
              .sort((first, second) => first.name.localeCompare(second.name, 'pt'));
          this.successMessage = 'Cliente registado com sucesso.';
        }
        this.cancelEdit();
        this.saving = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        const apiMessage = typeof error.error?.message === 'string'
          ? error.error.message
          : Array.isArray(error.error?.message)
            ? error.error.message.join(' ')
            : '';
        this.errorMessage = error.status === 409
          ? 'Já existe um cliente com este NIF.'
          : error.status === 400
            ? apiMessage || 'Verifique o nome e o NIF indicado.'
            : error.status === 0
              ? 'Não foi possível contactar a API. Confirme que o servidor está iniciado.'
              : apiMessage || `Não foi possível ${this.editingId ? 'atualizar' : 'registar'} o cliente. Tente novamente.`;
        this.saving = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  editClient(client: Client): void {
    this.editingId = client.id;
    this.form = { name: client.name, nif: client.nif };
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = { name: '', nif: '' };
  }

  deleteClient(client: Client): void {
    if (!window.confirm(`Tem a certeza de que pretende remover o cliente ${client.name}?`)) {
      return;
    }

    this.deletingId = client.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.clientService.deleteClient(client.id).subscribe({
      next: () => {
        this.clients = this.clients.filter((item) => item.id !== client.id);
        if (this.editingId === client.id) {
          this.cancelEdit();
        }
        this.successMessage = 'Cliente removido com sucesso.';
        this.deletingId = null;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.status === 409
          ? (typeof error.error?.message === 'string'
            ? error.error.message
            : 'Não é possível remover um cliente associado a veículos ou documentos.')
          : 'Não foi possível remover o cliente. Tente novamente.';
        this.deletingId = null;
        this.changeDetector.markForCheck();
      },
    });
  }
}
