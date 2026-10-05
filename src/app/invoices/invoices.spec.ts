import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { InvoiceService } from '../services/invoiceservice';
import { Invoice } from '../models/invoice.model';
import { Invoices } from './invoices';

describe('Invoices', () => {
  let component: Invoices;
  let fixture: ComponentFixture<Invoices>;
  let invoiceService: {
    deleteInvoice: ReturnType<typeof vi.fn>;
    getInvoices: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    invoiceService = { deleteInvoice: vi.fn(), getInvoices: vi.fn() };
    invoiceService.deleteInvoice.mockReturnValue(of(void 0));
    invoiceService.getInvoices.mockReturnValue(
      of([
        {
          id: 'inv-1',
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
      providers: [provideRouter([]), { provide: InvoiceService, useValue: invoiceService }],
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
    expect(invoiceService.getInvoices).toHaveBeenCalled();
    expect(component.invoices.length).toBe(1);
    expect(component.selectedInvoiceId).toBe('inv-1');
  });

  it('should replace the invoice list when refreshed', () => {
    const refreshedInvoice = { ...component.invoices[0], id: 'inv-2', supplier: 'New supplier' };
    invoiceService.getInvoices.mockReturnValue(of([refreshedInvoice]));

    component.loadInvoices();

    expect(component.invoices).toEqual([refreshedInvoice]);
    expect(component.selectedInvoiceId).toBe('inv-2');
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
    expect(component.getClassifiedLines(component.invoices[0])[0].review_alert).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Mostrar filtros');
    expect(fixture.nativeElement.querySelector('.line-editor-grid')).toBeNull();
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
