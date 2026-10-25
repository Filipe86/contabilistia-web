import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClientService } from './clientservice';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ClientService],
    });
    service = TestBed.inject(ClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('selects the first registered client by default', () => {
    let activeClientId = '';
    service.activeClientId$.subscribe((id) => {
      activeClientId = id;
    });
    service.getClients().subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush([
      { id: 'client-first', name: 'Cliente A', nif: '501964843', createdAt: '' },
      { id: 'client-second', name: 'Cliente B', nif: '501964843', createdAt: '' },
    ]);

    expect(activeClientId).toBe('client-first');
    expect(localStorage.getItem('contabilistia.activeClientId')).toBe('client-first');
  });

  it('keeps the selected client when the client list is refreshed', () => {
    service.clients$.subscribe();
    service.getClients().subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush([
      { id: 'client-first', name: 'Cliente A', nif: '501964843', createdAt: '' },
      { id: 'client-second', name: 'Cliente B', nif: '501964843', createdAt: '' },
    ]);
    service.setActiveClient('client-second');

    service.getClients().subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush([
      { id: 'client-first', name: 'Cliente A', nif: '501964843', createdAt: '' },
      { id: 'client-second', name: 'Cliente B', nif: '501964843', createdAt: '' },
    ]);

    expect(localStorage.getItem('contabilistia.activeClientId')).toBe('client-second');
  });

  it('does not let a pending client-list request overwrite a newly registered client', () => {
    let listedClients: { id: string; name: string; nif: string; createdAt: string }[] = [];
    service.getClients().subscribe((clients) => {
      listedClients = clients;
    });
    const delayedGet = httpMock.expectOne('http://localhost:3000/clients');

    service.createClient({ name: 'Cliente novo', nif: '501964843' }).subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush({
      id: 'client-new',
      name: 'Cliente novo',
      nif: '501964843',
      createdAt: '',
    });

    delayedGet.flush([]);
    expect(listedClients).toEqual([
      { id: 'client-new', name: 'Cliente novo', nif: '501964843', createdAt: '' },
    ]);
  });

  it('updates the cached client after a successful edit', () => {
    let listedClients: { id: string; name: string; nif: string; createdAt: string }[] = [];
    service.clients$.subscribe((clients) => {
      listedClients = clients;
    });
    service.getClients().subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush([
      { id: 'client-id', name: 'Nome antigo', nif: '501964843', createdAt: '' },
    ]);

    service.updateClient('client-id', { name: 'Nome novo', nif: '501964843' }).subscribe();
    httpMock.expectOne('http://localhost:3000/clients/client-id').flush({
      id: 'client-id',
      name: 'Nome novo',
      nif: '501964843',
      createdAt: '',
    });

    expect(listedClients[0].name).toBe('Nome novo');
  });

  it('removes the selected client and selects another cached client', () => {
    let activeClientId = '';
    service.activeClientId$.subscribe((id) => {
      activeClientId = id;
    });
    service.getClients().subscribe();
    httpMock.expectOne('http://localhost:3000/clients').flush([
      { id: 'client-first', name: 'Cliente A', nif: '501964843', createdAt: '' },
      { id: 'client-second', name: 'Cliente B', nif: '400000008', createdAt: '' },
    ]);
    service.setActiveClient('client-first');

    service.deleteClient('client-first').subscribe();
    httpMock.expectOne('http://localhost:3000/clients/client-first').flush(null);

    expect(activeClientId).toBe('client-second');
    expect(localStorage.getItem('contabilistia.activeClientId')).toBe('client-second');
  });
});
