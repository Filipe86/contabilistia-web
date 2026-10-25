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

  it('should fetch only invoices belonging to the selected client', () => {
    let result: unknown;
    let requestFailed = false;
    service.getInvoices('client-id').subscribe({
      next: (invoices) => {
        result = invoices;
      },
      error: () => {
        requestFailed = true;
      },
    });

    const req = httpTestingController.expectOne((request) =>
      request.url === 'http://localhost:3000/invoices'
      && request.params.get('clientId') === 'client-id',
    );
    expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(requestFailed).toBe(true);
    expect(result).toBeUndefined();
  });

  it('should send a DELETE request for an invoice', () => {
    service.deleteInvoice('invoice-1').subscribe();

    const req = httpTestingController.expectOne('http://localhost:3000/invoices/invoice-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should send a PATCH request to update a line SNC account', () => {
    service.updateLineAccount('invoice-1', 'line-1', '6242').subscribe();

    const req = httpTestingController.expectOne('http://localhost:3000/invoices/invoice-1/lines/line-1/account');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ suggestedSNCAccount: '6242' });
    req.flush({ id: 'line-1', suggestedSNCAccount: '6242' });
  });

  it('should fetch the SNC account catalogue', () => {
    let accounts: { code: string; description: string }[] | undefined;
    service.getSNCAccounts().subscribe((result) => {
      accounts = result;
    });

    const req = httpTestingController.expectOne('http://localhost:3000/invoices/snc-accounts');
    expect(req.request.method).toBe('GET');
    req.flush([{ code: '6242', description: 'Combustíveis' }]);

    expect(accounts).toEqual([{ code: '6242', description: 'Combustíveis' }]);
  });
});
