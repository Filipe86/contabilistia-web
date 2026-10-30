import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Invoice, InvoiceLine, SNCAccount } from '../models/invoice.model';
import { StockItem } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:3000/invoices';

  constructor(private http: HttpClient) {}

  getInvoices(clientId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(this.apiUrl, {
      params: { clientId },
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  getSNCAccounts(): Observable<SNCAccount[]> {
    return this.http.get<SNCAccount[]>(`${this.apiUrl}/snc-accounts`);
  }

  getCurrentStock(clientId: string): Observable<StockItem[]> {
    return this.http.get<StockItem[]>(`${this.apiUrl}/stock`, {
      params: { clientId },
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  analyzeInvoice(image: File, clientId: string): Observable<{ invoiceId: string }> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('clientId', clientId);

    return this.http.post<{ invoiceId: string }>(`${this.apiUrl}/analyze`, formData);
  }

  associateInvoiceWithClient(invoiceId: string, clientId: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${invoiceId}/client`, { clientId });
  }

  validateInvoice(invoiceId: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${invoiceId}/validate`, {});
  }

  updateLineAccount(invoiceId: string, lineId: string, suggestedSNCAccount: string): Observable<InvoiceLine> {
    return this.http.patch<InvoiceLine>(
      `${this.apiUrl}/${invoiceId}/lines/${lineId}/account`,
      { suggestedSNCAccount },
    );
  }

  deleteInvoice(invoiceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${invoiceId}`);
  }
}