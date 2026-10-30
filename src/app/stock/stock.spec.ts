import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Client } from '../models/client.model';
import { ClientService } from '../services/clientservice';
import { InvoiceService } from '../services/invoiceservice';
import { Stock } from './stock';

describe('Stock', () => {
  let component: Stock;
  let fixture: ComponentFixture<Stock>;
  let clientsSubject: BehaviorSubject<Client[]>;
  let activeClientIdSubject: BehaviorSubject<string>;
  let invoiceService: { getCurrentStock: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    clientsSubject = new BehaviorSubject<Client[]>([{
      id: 'client-id',
      name: 'Cliente teste',
      nif: '501964843',
      createdAt: '',
    }]);
    activeClientIdSubject = new BehaviorSubject('client-id');
    invoiceService = {
      getCurrentStock: vi.fn().mockReturnValue(of([{
        description: 'Cabo de rede',
        quantity: 4,
        unit: 'unidade',
        lastEntryAt: '2026-10-20T00:00:00.000Z',
      }])),
    };

    await TestBed.configureTestingModule({
      imports: [Stock],
      providers: [
        {
          provide: ClientService,
          useValue: {
            clients$: clientsSubject.asObservable(),
            activeClientId$: activeClientIdSubject.asObservable(),
          },
        },
        { provide: InvoiceService, useValue: invoiceService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Stock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and displays stock for the active client', () => {
    expect(invoiceService.getCurrentStock).toHaveBeenCalledWith('client-id');
    expect(component.activeClient?.name).toBe('Cliente teste');
    expect(fixture.nativeElement.textContent).toContain('Cabo de rede');
    expect(fixture.nativeElement.textContent).toContain('4 unidade');
  });

  it('shows an error when the stock request fails', () => {
    invoiceService.getCurrentStock.mockReturnValue(throwError(() => new Error('API error')));

    component.loadStock();

    expect(component.errorMessage).toBe('Não foi possível carregar o stock. Tente novamente.');
  });
});
