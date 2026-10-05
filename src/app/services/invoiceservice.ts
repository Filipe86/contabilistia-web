import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Invoice } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:3000/invoices';

  constructor(private http: HttpClient) {}

  private getFallbackInvoices(): Invoice[] {
    return [
      {
        id: 'demo-invoice-1',
        supplier: 'Papelaria e Gestão, Lda.',
        supplierVat: '503123456',
        invoiceDate: '2026-09-18',
        totalAmount: 845.4,
        totalVatSupported: 194.34,
        totalDeductibleVat: 194.34,
        confidenceRate: 85,
        status: 'suggested',
        classificationReason: 'Average model confidence (85.00%) is between 50% and 85%.',
        validationStatus: 'pending',
        validatedAt: null,
        rawAiResponse: JSON.stringify({
          classified_lines: [
            {
              original_description: 'Material de escritório',
              suggested_snc_account: '2111',
              fiscal_reasoning: 'Despesa operacional suportada por documento fiscal válido.',
              base_amount: 690,
              vat_rate: 23,
              deductible_vat_this_line: 158.7,
              review_alert: false,
              confidence_rate: 95,
            },
            {
              original_description: 'Serviço de impressão',
              suggested_snc_account: '6231',
              fiscal_reasoning: 'Necessita confirmação da natureza da despesa antes de validar dedução.',
              base_amount: 155.4,
              vat_rate: 23,
              deductible_vat_this_line: 35.64,
              review_alert: true,
              confidence_rate: 75,
            },
          ],
        }),
        createdAt: '2026-09-27T09:00:00.000Z',
      },
    ];
  }

  getInvoices(): Observable<Invoice[]> {
    console.log('Fetching invoices from API:', this.apiUrl);
    return this.http.get<Invoice[]>(this.apiUrl, {
      headers: { 'Cache-Control': 'no-cache' },
    }).pipe(
      catchError(() => of(this.getFallbackInvoices()))
    );
  }

  analyzeInvoice(image: File): Observable<{ invoiceId: string }> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http.post<{ invoiceId: string }>(`${this.apiUrl}/analyze`, formData);
  }

  validateInvoice(invoiceId: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${invoiceId}/validate`, {});
  }

  deleteInvoice(invoiceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${invoiceId}`);
  }
}