import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Client } from '../models/client.model';
import { ClientService } from '../services/clientservice';
import { Clients } from './clients';

describe('Clients', () => {
  let component: Clients;
  let fixture: ComponentFixture<Clients>;
  let clientService: {
    clients$: Observable<Client[]>;
    createClient: ReturnType<typeof vi.fn>;
    deleteClient: ReturnType<typeof vi.fn>;
    getClients: ReturnType<typeof vi.fn>;
    updateClient: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    clientService = {
      clients$: of([]),
      createClient: vi.fn(),
      deleteClient: vi.fn(),
      getClients: vi.fn().mockReturnValue(of([])),
      updateClient: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [Clients],
      providers: [{ provide: ClientService, useValue: clientService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Clients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('adds a registered client to the visible list immediately', () => {
    const savedClient: Client = {
      id: 'client-id',
      name: 'Cliente novo',
      nif: '501964843',
      createdAt: '',
    };
    clientService.createClient.mockReturnValue(of(savedClient));
    component.form = { name: ' Cliente novo ', nif: '501 964 843' };

    component.submitClient();

    expect(clientService.createClient).toHaveBeenCalledWith({ name: 'Cliente novo', nif: '501964843' });
    expect(component.clients).toContain(savedClient);
    expect(component.successMessage).toBe('Cliente registado com sucesso.');
    expect(component.form).toEqual({ name: '', nif: '' });
    expect(component.saving).toBe(false);
  });

  it('shows the API validation reason when registration fails', () => {
    clientService.createClient.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Indique um NIF português válido com 9 dígitos.' },
    })));
    component.form = { name: 'Cliente novo', nif: '501964842' };

    component.submitClient();

    expect(component.errorMessage).toBe('Indique um NIF português válido com 9 dígitos.');
    expect(component.saving).toBe(false);
  });

  it('updates the client being edited', () => {
    const client: Client = {
      id: 'client-id',
      name: 'Nome antigo',
      nif: '501964843',
      createdAt: '',
    };
    const updatedClient = { ...client, name: 'Nome atualizado' };
    clientService.updateClient.mockReturnValue(of(updatedClient));
    component.clients = [client];
    component.editClient(client);
    component.form = { name: ' Nome atualizado ', nif: '501 964 843' };

    component.submitClient();

    expect(clientService.updateClient)
      .toHaveBeenCalledWith('client-id', { name: 'Nome atualizado', nif: '501964843' });
    expect(component.clients).toEqual([updatedClient]);
    expect(component.successMessage).toBe('Cliente atualizado com sucesso.');
    expect(component.editingId).toBeNull();
  });

  it('removes a client after confirmation', () => {
    const client: Client = {
      id: 'client-id',
      name: 'Cliente removido',
      nif: '501964843',
      createdAt: '',
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    clientService.deleteClient.mockReturnValue(of(void 0));
    component.clients = [client];

    component.deleteClient(client);

    expect(clientService.deleteClient).toHaveBeenCalledWith('client-id');
    expect(component.clients).toEqual([]);
    expect(component.successMessage).toBe('Cliente removido com sucesso.');
  });
});
