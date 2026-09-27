import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expand invoice details when clicking Ver Detalhes', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.invoices = [
      {
        id: '1',
        supplier: 'Fornecedor Teste',
        supplierVat: 'PT123456789',
        invoiceDate: '2024-01-03',
        totalAmount: 150,
        totalVatSupported: 10,
        totalDeductibleVat: 20,
        rawAiResponse: '{"supplier":"Fornecedor Teste","totals":{"total_amount":150}}',
        createdAt: '2024-01-04T00:00:00.000Z'
      }
    ];

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.invoice-details');
    expect(details).toBeTruthy();
    expect(details.textContent).toContain('Fornecedor Teste');
  });
});
