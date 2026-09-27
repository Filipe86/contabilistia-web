import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { InvoiceService } from '../invoiceservice';
import { Invoice } from '../models/invoice.model';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class Invoices implements OnInit {
  invoices: Invoice[] = [];
  selectedInvoiceId: string | null = null;
  startDate = '';
  endDate = '';
  sortField: 'date' | 'supplier' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  filtersVisible = false;
  isLoading = false;

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  get filteredInvoices(): Invoice[] {
    const filtered = this.invoices.filter((invoice) => this.matchesDateFilter(invoice));

    return [...filtered].sort((a, b) => {
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

  matchesDateFilter(invoice: Invoice): boolean {
    const invoiceDate = (invoice.invoiceDate || '').slice(0, 10);

    if (this.startDate && invoiceDate < this.startDate) {
      return false;
    }

    if (this.endDate && invoiceDate > this.endDate) {
      return false;
    }

    return true;
  }

  clearDateFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedInvoiceId = null;
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
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
    if (!this.filteredInvoices.length) {
      return null;
    }

    if (!this.selectedInvoiceId) {
      this.selectedInvoiceId = this.filteredInvoices[0].id;
    }

    return this.filteredInvoices.find((invoice) => invoice.id === this.selectedInvoiceId) ?? this.filteredInvoices[0];
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
