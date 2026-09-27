import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InvoiceService } from '../invoiceservice';
import { Invoices } from './invoices';

describe('Invoices', () => {
  let component: Invoices;
  let fixture: ComponentFixture<Invoices>;
  let invoiceService: jasmine.SpyObj<InvoiceService>;

  beforeEach(async () => {
    invoiceService = jasmine.createSpyObj<InvoiceService>('InvoiceService', ['getInvoices']);
    invoiceService.getInvoices.and.returnValue(
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
      providers: [{ provide: InvoiceService, useValue: invoiceService }],
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
});
