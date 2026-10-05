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
  validationFilter: 'pending' | 'all' = 'pending';
  isLoading = false;
  selectedFile: File | null = null;
  isAnalyzing = false;
  isValidating = false;
  isDeleting = false;
  deleteConfirmationStep: 1 | 2 | null = null;
  deleteError = '';
  deleteMessage = '';
  uploadError = '';
  uploadMessage = '';
  validationError = '';
  validationMessage = '';

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

  get visibleInvoices(): Invoice[] {
    return this.validationFilter === 'pending'
      ? this.sortedInvoices.filter((invoice) => invoice.validationStatus !== 'validated')
      : this.sortedInvoices;
  }

  get pendingInvoicesCount(): number {
    return this.invoices.filter((invoice) => invoice.validationStatus !== 'validated').length;
  }

  loadInvoices(preferredInvoiceId?: string): void {
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
          this.selectedInvoiceId = this.visibleInvoices.some((invoice) => invoice.id === preferredInvoiceId)
            ? preferredInvoiceId ?? null
            : this.visibleInvoices[0]?.id ?? null;
        },
        error: (err) => {
          console.error('Erro ao carregar faturas:', err);
          this.invoices = [];
          this.selectedInvoiceId = null;
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.uploadError = '';
    this.uploadMessage = '';

    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
      this.selectedFile = null;
      this.uploadError = 'Selecione uma imagem JPEG ou PNG.';
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  analyzeInvoice(event: Event): void {
    event.preventDefault();
    if (!this.selectedFile || this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;
    this.uploadError = '';
    this.uploadMessage = '';

    this.invoiceService
      .analyzeInvoice(this.selectedFile)
      .pipe(
        finalize(() => {
          this.isAnalyzing = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          this.uploadMessage = 'Documento analisado e guardado com sucesso.';
          this.selectedFile = null;
          this.loadInvoices(result.invoiceId);
        },
        error: (error) => {
          this.uploadError = error?.error?.message || 'Não foi possível analisar o documento. Tente novamente.';
        },
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

  setValidationFilter(filter: 'pending' | 'all'): void {
    this.validationFilter = filter;
    if (!this.visibleInvoices.some((invoice) => invoice.id === this.selectedInvoiceId)) {
      this.selectedInvoiceId = this.visibleInvoices[0]?.id ?? null;
    }
  }

  validateInvoice(invoice: Invoice): void {
    if (this.isValidating || invoice.validationStatus === 'validated') {
      return;
    }

    this.isValidating = true;
    this.validationError = '';
    this.validationMessage = '';

    this.invoiceService
      .validateInvoice(invoice.id)
      .pipe(
        finalize(() => {
          this.isValidating = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (validatedInvoice) => {
          this.invoices = this.invoices.map((currentInvoice) =>
            currentInvoice.id === validatedInvoice.id ? validatedInvoice : currentInvoice,
          );
          this.validationMessage = 'Fatura validada com sucesso.';
          this.selectedInvoiceId = this.visibleInvoices[0]?.id ?? null;
        },
        error: () => {
          this.validationError = 'Não foi possível validar a fatura. Tente novamente.';
        },
      });
  }

  requestInvoiceDeletion(): void {
    this.deleteConfirmationStep = 1;
    this.deleteError = '';
    this.deleteMessage = '';
  }

  cancelInvoiceDeletion(): void {
    if (!this.isDeleting) {
      this.deleteConfirmationStep = null;
      this.deleteError = '';
    }
  }

  confirmInvoiceDeletion(): void {
    if (this.deleteConfirmationStep === 1) {
      this.deleteConfirmationStep = 2;
      return;
    }

    const invoice = this.getSelectedInvoice();
    if (this.deleteConfirmationStep !== 2 || !invoice || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.deleteError = '';
    this.invoiceService
      .deleteInvoice(invoice.id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.invoices = this.invoices.filter((currentInvoice) => currentInvoice.id !== invoice.id);
          this.selectedInvoiceId = this.visibleInvoices[0]?.id ?? null;
          this.deleteConfirmationStep = null;
          this.deleteMessage = 'Fatura eliminada com sucesso.';
        },
        error: () => {
          this.deleteError = 'Não foi possível eliminar a fatura. Tente novamente.';
        },
      });
  }

  getSelectedInvoice(): Invoice | null {
    if (!this.visibleInvoices.length) {
      return null;
    }

    if (!this.visibleInvoices.some((invoice) => invoice.id === this.selectedInvoiceId)) {
      this.selectedInvoiceId = this.visibleInvoices[0].id;
    }

    return this.visibleInvoices.find((invoice) => invoice.id === this.selectedInvoiceId) ?? this.visibleInvoices[0];
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

  getStatusLabel(status: Invoice['status']): string {
    switch (status) {
      case 'classified':
        return 'Classificada';
      case 'suggested':
        return 'Sugerida';
      case 'requires_review':
        return 'Requer revisão';
    }
  }

}
