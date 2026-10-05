import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvoiceService } from './invoiceservice';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), InvoiceService],
    });
    service = TestBed.inject(InvoiceService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return fallback demo invoices when backend is unavailable', () => {
    let result: any[] | undefined;

    service.getInvoices().subscribe((invoices) => {
      result = invoices;
    });

    const req = httpTestingController.expectOne('http://localhost:3000/invoices');
    expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(result?.length).toBe(1);
    expect(result?.[0].supplier).toBe('Papelaria e Gestão, Lda.');
  });
});
