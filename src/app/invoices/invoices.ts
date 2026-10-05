import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { InvoiceService } from '../services/invoiceservice';
import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices implements OnInit {
  invoices: Invoice[] = [];
  selectedInvoiceId: string | null = null;
  sortField: 'date' | 'supplier' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  isLoading = false;

  constructor(
    private invoiceService: InvoiceService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  get sortedInvoices(): Invoice[] {
    return [...this.invoices].sort((a, b) => {
      const direction = this.sortDirection === 'asc' ? 1 : -1;

      if (this.sortField === 'supplier') {
        return (a.supplier || '').localeCompare(b.supplier || '') * direction;
      }

      const dateA = new Date(a.invoiceDate || '1970-01-01').getTime();
      const dateB = new Date(b.invoiceDate || '1970-01-01').getTime();
      return (dateA - dateB) * direction;
    });
  }

  loadInvoices(): void {
    this.isLoading = true;

    this.invoiceService
      .getInvoices()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          const normalizedInvoices = Array.isArray(data) ? data : [];
          this.invoices = [...normalizedInvoices];
          this.selectedInvoiceId = normalizedInvoices[0]?.id ?? null;
        },
        error: (err) => {
          console.error('Erro ao carregar faturas:', err);
          this.invoices = [];
          this.selectedInvoiceId = null;
        }
      });
  }

  changeSort(field: 'date' | 'supplier'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortField = field;
    this.sortDirection = field === 'supplier' ? 'asc' : 'desc';
  }

  toggleDetails(invoiceId: string): void {
    this.selectedInvoiceId = invoiceId;
  }

  getSelectedInvoice(): Invoice | null {
    if (!this.sortedInvoices.length) {
      return null;
    }

    if (!this.selectedInvoiceId) {
      this.selectedInvoiceId = this.sortedInvoices[0].id;
    }

    return this.sortedInvoices.find((invoice) => invoice.id === this.selectedInvoiceId) ?? this.sortedInvoices[0];
  }

  getParsedRawResponse(invoice: Invoice): any {
    if (!invoice.rawAiResponse) {
      return null;
    }

    try {
      return JSON.parse(invoice.rawAiResponse);
    } catch {
      return null;
    }
  }

  getClassifiedLines(invoice: Invoice): any[] {
    const parsed = this.getParsedRawResponse(invoice);
    return Array.isArray(parsed?.classified_lines) ? parsed.classified_lines : [];
  }

}
