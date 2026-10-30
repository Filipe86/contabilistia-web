import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { InvoiceService } from '../services/invoiceservice';
import { Invoice, InvoiceLine } from '../models/invoice.model';
import { ClientService } from '../services/clientservice';
import { Client } from '../models/client.model';
import { Invoices } from './invoices';

describe('Invoices', () => {
  let component: Invoices;
  let fixture: ComponentFixture<Invoices>;
  let invoiceService: {
    deleteInvoice: ReturnType<typeof vi.fn>;
    associateInvoiceWithClient: ReturnType<typeof vi.fn>;
    getInvoices: ReturnType<typeof vi.fn>;
    getSNCAccounts: ReturnType<typeof vi.fn>;
    updateLineAccount: ReturnType<typeof vi.fn>;
  };
  let clientService: {
    activeClientId$: Observable<string>;
    clients$: Observable<Client[]>;
    getClients: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    clientService = {
      activeClientId$: of('client-id'),
      clients$: of([{ id: 'client-id', name: 'Cliente teste', nif: '501964843', createdAt: '' }]),
      getClients: vi.fn().mockReturnValue(of([{ id: 'client-id', name: 'Cliente teste', nif: '501964843', createdAt: '' }])),
    };
    invoiceService = {
      deleteInvoice: vi.fn(),
      associateInvoiceWithClient: vi.fn(),
      getInvoices: vi.fn(),
      getSNCAccounts: vi.fn(),
      updateLineAccount: vi.fn(),
    };
    invoiceService.getSNCAccounts.mockReturnValue(of([
      { code: '6231', description: 'Ferramentas e utensílios de desgaste rápido' },
      { code: '6242', description: 'Combustíveis' },
    ]));
    invoiceService.deleteInvoice.mockReturnValue(of(void 0));
    invoiceService.getInvoices.mockReturnValue(
      of([
        {
          id: 'inv-1',
          client: { id: 'client-id', name: 'Cliente teste', nif: '501964843' },
          supplier: 'Acme',
          supplierVat: '123456789',
          invoiceDate: '2024-01-15',
          totalAmount: 100,
          totalDeductibleVat: 20,
          rawAiResponse: '{"classified_lines":[]}'
        }
      ])
    );

    await TestBed.configureTestingModule({
      imports: [Invoices],
      providers: [
        provideRouter([]),
        { provide: InvoiceService, useValue: invoiceService },
        { provide: ClientService, useValue: clientService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Invoices);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load invoices on startup', () => {
    expect(invoiceService.getInvoices).toHaveBeenCalledWith('client-id');
    expect(component.invoices.length).toBe(1);
    expect(component.selectedInvoiceId).toBe('inv-1');
  });

  it('should summarize pending and validated invoices in the workspace', () => {
    const validatedInvoice = {
      ...component.invoices[0],
      id: 'inv-validated',
      validationStatus: 'validated' as const,
      totalDeductibleVat: 5,
    };
    component.invoices = [component.invoices[0], validatedInvoice];
    fixture.detectChanges();

    expect(component.pendingInvoicesCount).toBe(1);
    expect(component.validatedInvoicesCount).toBe(1);
    expect(component.deductibleVatTotal).toBe(25);
    expect(fixture.nativeElement.textContent).toContain('Documentos recebidos');
  });

  it('should replace the invoice list when refreshed', () => {
    const refreshedInvoice = { ...component.invoices[0], id: 'inv-2', supplier: 'New supplier' };
    invoiceService.getInvoices.mockReturnValue(of([refreshedInvoice]));

    component.loadInvoices();

    expect(component.invoices).toEqual([refreshedInvoice]);
    expect(component.selectedInvoiceId).toBe('inv-2');
  });

  it('reloads invoices after associating a pending invoice with a client', () => {
    const updatedInvoice = {
      ...component.invoices[0],
      client: { id: 'another-client', name: 'Outro cliente', nif: '501111111', createdAt: '' },
    };
    invoiceService.associateInvoiceWithClient.mockReturnValue(of(updatedInvoice));
    invoiceService.getInvoices.mockReturnValue(of([]));
    component.invoiceClientEdits[updatedInvoice.id] = 'another-client';

    component.associateInvoiceWithClient(updatedInvoice);

    expect(invoiceService.associateInvoiceWithClient).toHaveBeenCalledWith(updatedInvoice.id, 'another-client');
    expect(invoiceService.getInvoices).toHaveBeenCalledTimes(2);
    expect(component.invoices).toEqual([]);
    expect(component.validationMessage).toBe('Cliente associado à fatura com sucesso.');
  });

  it('should render invoices from an asynchronous response', async () => {
    const response = new Subject<Invoice[]>();
    invoiceService.getInvoices.mockReturnValue(response);
    fixture.autoDetectChanges();

    component.loadInvoices();
    response.next([{ ...component.invoices[0], id: 'inv-async', supplier: 'API supplier' }]);
    response.complete();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('API supplier');
    expect(fixture.nativeElement.textContent).not.toContain('Carregando faturas...');
  });

  it('should list service results without deriving an invoice status', () => {
    component.invoices = [
      {
        ...component.invoices[0],
        rawAiResponse: JSON.stringify({
          classified_lines: [{ original_description: 'Service line', review_alert: true }],
        }),
      },
    ];
    component.selectedInvoiceId = component.invoices[0].id;
    fixture.detectChanges();

    expect(component.getClassifiedLines(component.invoices[0])).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.invoice-state-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.invoice-item')?.textContent).toContain('Acme');
    expect(component.getClassifiedLines(component.invoices[0])[0].reviewAlert).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Mostrar filtros');
    expect(fixture.nativeElement.querySelector('.line-editor-grid')).toBeNull();
  });

  it('renders and saves the account stored for an invoice line', async () => {
    const line = {
      id: 'line-1',
      originalDescription: 'Material de escritório',
      suggestedSNCAccount: '6231',
      fiscalReasoning: 'Material consumível.',
      baseAmount: 100,
      vatRate: 23,
      deductibleVatThisLine: 23,
      reviewAlert: false,
      confidenceRate: 90,
      reviewAlertReasoning: '',
    };
    const invoice = { ...component.invoices[0], id: 'inv-2', classifiedLines: [line] };
    invoiceService.getInvoices.mockReturnValue(of([invoice]));
    invoiceService.updateLineAccount.mockReturnValue(of({ ...line, suggestedSNCAccount: '6242' }));
    component.loadInvoices(invoice.id);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.getClassifiedLines(invoice)).toEqual([line]);
    expect(component.getSelectedInvoice()).toBe(invoice);
    expect(fixture.nativeElement.querySelector('.line-account-editor input')).toBeNull();
    const editButton = fixture.nativeElement.querySelector('.line-account-edit-button') as HTMLButtonElement;
    expect(editButton.textContent).toContain('Editar conta');
    editButton.click();
    fixture.detectChanges();
    const cancelButton = fixture.nativeElement.querySelector('.line-account-cancel-button') as HTMLButtonElement;
    expect(cancelButton.textContent).toContain('Cancelar');
    cancelButton.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.line-account-edit-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const search: HTMLInputElement = fixture.nativeElement.querySelector('.line-account-editor input');
    expect(search.placeholder).toContain('6231 - Ferramentas e utensílios de desgaste rápido');
    expect(fixture.nativeElement.querySelector('.line-account-current').textContent)
      .toContain('6231 - Ferramentas e utensílios de desgaste rápido');
    search.value = 'Combustíveis';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.line-account-current').textContent)
      .toContain('6231 - Ferramentas e utensílios de desgaste rápido');
    const matchingAccounts = fixture.nativeElement.querySelectorAll('.snc-account-results button');
    expect(matchingAccounts).toHaveLength(1);
    expect(matchingAccounts[0].textContent).toContain('6242 - Combustíveis');
    (matchingAccounts[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.line-account-save-button') as HTMLButtonElement;
    saveButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(invoiceService.updateLineAccount).toHaveBeenCalledWith('inv-2', 'line-1', '6242');
    expect(invoiceService.getInvoices).toHaveBeenCalledTimes(2);
    expect(component.getSelectedInvoice()?.classifiedLines?.[0].suggestedSNCAccount).toBe('6242');
    expect(fixture.nativeElement.querySelector('.line-account-current').textContent).toContain('6242 - Combustíveis');
    expect(fixture.nativeElement.querySelector('.line-account-edit-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.line-account-editor input')).toBeNull();
  });

  it('filters SNC accounts by code and accent-insensitive description', () => {
    const line: InvoiceLine = {
      id: 'line-filter',
      originalDescription: '',
      suggestedSNCAccount: '',
      fiscalReasoning: '',
      baseAmount: 0,
      vatRate: 0,
      deductibleVatThisLine: 0,
      reviewAlert: false,
      confidenceRate: 0,
      reviewAlertReasoning: '',
    };
    component.lineAccountSearches[line.id] = '6231';
    expect(component.getFilteredSNCAccounts(line).map((account) => account.code)).toEqual(['6231']);

    component.lineAccountSearches[line.id] = 'utensilios desgaste';
    expect(component.getFilteredSNCAccounts(line).map((account) => account.code)).toEqual(['6231']);
  });

  it('cancels an SNC account edit and discards the temporary selection', async () => {
    const line: InvoiceLine = {
      id: 'line-cancel',
      originalDescription: 'Combustível',
      suggestedSNCAccount: '6231',
      fiscalReasoning: '',
      baseAmount: 10,
      vatRate: 23,
      deductibleVatThisLine: 0,
      reviewAlert: false,
      confidenceRate: 90,
      reviewAlertReasoning: '',
    };
    component.editLineAccount(line);
    component.lineAccountEdits[line.id] = '6242';
    component.lineAccountSearches[line.id] = 'Combustíveis';
    component.openLineAccountSearches.add(line.id);
    component.cancelLineAccountEdit(line);

    expect(component.editingLineAccountIds.has(line.id)).toBe(false);
    expect(component.openLineAccountSearches.has(line.id)).toBe(false);
    expect(component.lineAccountEdits[line.id]).toBe('6231');
    expect(component.lineAccountSearches[line.id]).toBe('');
    expect(invoiceService.updateLineAccount).not.toHaveBeenCalled();
  });

  it('requires two confirmations before deleting an invoice', () => {
    component.requestInvoiceDeletion();
    component.confirmInvoiceDeletion();

    expect(component.deleteConfirmationStep).toBe(2);
    expect(invoiceService.deleteInvoice).not.toHaveBeenCalled();

    component.confirmInvoiceDeletion();

    expect(invoiceService.deleteInvoice).toHaveBeenCalledWith('inv-1');
    expect(component.invoices).toHaveLength(0);
    expect(component.selectedInvoiceId).toBeNull();
    expect(component.deleteConfirmationStep).toBeNull();
  });
});
