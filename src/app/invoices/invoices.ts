import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { InvoiceService } from '../services/invoiceservice';
import { Invoice, InvoiceLine, SNCAccount } from '../models/invoice.model';

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
  lineAccountEdits: Record<string, string> = {};
  lineAccountErrors: Record<string, string> = {};
  lineAccountSearches: Record<string, string> = {};
  editingLineAccountIds = new Set<string>();
  savingLineAccountIds = new Set<string>();
  openLineAccountSearches = new Set<string>();
  sncAccounts: SNCAccount[] = [];
  sncAccountsError = '';

  constructor(
    private invoiceService: InvoiceService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadSNCAccounts();
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

  loadSNCAccounts(): void {
    this.sncAccountsError = '';
    this.invoiceService.getSNCAccounts().subscribe({
      next: (accounts) => {
        this.sncAccounts = Array.isArray(accounts) ? accounts : [];
      },
      error: () => {
        this.sncAccounts = [];
        this.sncAccountsError = 'Não foi possível carregar o plano de contas SNC.';
      },
    });
  }

  getLineAccountLabel(line: InvoiceLine): string {
    const selectedCode = this.lineAccountEdits[line.id] ?? line.sncAccount?.code ?? line.suggestedSNCAccount;
    const selectedAccount = this.sncAccounts.find((account) => account.code === selectedCode);
    return selectedAccount
      ? `${selectedAccount.code} - ${selectedAccount.description}`
      : selectedCode;
  }

  getAssociatedSNCAccountLabel(line: InvoiceLine): string {
    const associatedCode = line.sncAccount?.code ?? line.suggestedSNCAccount;
    const associatedAccount = this.sncAccounts.find((account) => account.code === associatedCode);
    return associatedAccount
      ? `${associatedAccount.code} - ${associatedAccount.description}`
      : associatedCode || 'Sem conta associada';
  }

  getFilteredSNCAccounts(line: InvoiceLine): SNCAccount[] {
    const terms = this.getAccountSearchTerms(line);
    if (!terms.length) {
      return [];
    }

    return this.sncAccounts
      .filter((account) => this.matchesAccountSearch(account, terms))
      .slice(0, 50);
  }

  getSNCAccountMatchCount(line: InvoiceLine): number {
    const terms = this.getAccountSearchTerms(line);
    return terms.length ? this.sncAccounts.filter((account) => this.matchesAccountSearch(account, terms)).length : 0;
  }

  openSNCAccountSearch(line: InvoiceLine): void {
    this.openLineAccountSearches.add(line.id);
  }

  selectSNCAccount(line: InvoiceLine, account: SNCAccount): void {
    this.lineAccountEdits[line.id] = account.code;
    this.lineAccountSearches[line.id] = '';
    this.openLineAccountSearches.delete(line.id);
    delete this.lineAccountErrors[line.id];
  }

  editLineAccount(line: InvoiceLine): void {
    this.lineAccountEdits[line.id] = line.sncAccount?.code ?? line.suggestedSNCAccount;
    this.lineAccountSearches[line.id] = '';
    this.editingLineAccountIds.add(line.id);
    delete this.lineAccountErrors[line.id];
  }

  cancelLineAccountEdit(line: InvoiceLine): void {
    this.lineAccountEdits[line.id] = line.sncAccount?.code ?? line.suggestedSNCAccount;
    this.lineAccountSearches[line.id] = '';
    this.editingLineAccountIds.delete(line.id);
    this.openLineAccountSearches.delete(line.id);
    delete this.lineAccountErrors[line.id];
  }

  private normalizeAccountSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-PT')
      .trim();
  }

  private getAccountSearchTerms(line: InvoiceLine): string[] {
    return this.normalizeAccountSearch(this.lineAccountSearches[line.id] ?? '')
      .split(/\s+/)
      .filter(Boolean);
  }

  private matchesAccountSearch(account: SNCAccount, terms: string[]): boolean {
    const searchableValue = this.normalizeAccountSearch(`${account.code} ${account.description}`);
    return terms.every((term) => searchableValue.includes(term));
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

  getClassifiedLines(invoice: Invoice): InvoiceLine[] {
    if (invoice.classifiedLines?.length) {
      return invoice.classifiedLines;
    }

    const parsed = this.getParsedRawResponse(invoice);
    return Array.isArray(parsed?.classified_lines)
      ? parsed.classified_lines.map((line: any) => ({
          id: '',
          originalDescription: typeof line.original_description === 'string' ? line.original_description : '',
          suggestedSNCAccount: typeof line.suggested_snc_account === 'string' ? line.suggested_snc_account : '',
          fiscalReasoning: typeof line.fiscal_reasoning === 'string' ? line.fiscal_reasoning : '',
          baseAmount: line.base_amount ?? 0,
          vatRate: line.vat_rate ?? 0,
          deductibleVatThisLine: line.deductible_vat_this_line ?? 0,
          reviewAlert: line.review_alert === true,
          confidenceRate: line.confidence_rate ?? 0,
          reviewAlertReasoning: line.review_alert_reasoning ?? '',
        }))
      : [];
  }

  saveLineAccount(invoice: Invoice, line: InvoiceLine): void {
    if (this.savingLineAccountIds.has(line.id)) {
      return;
    }

    const account = this.lineAccountEdits[line.id] ?? line.suggestedSNCAccount;
    this.savingLineAccountIds.add(line.id);
    delete this.lineAccountErrors[line.id];

    this.invoiceService
      .updateLineAccount(invoice.id, line.id, account)
      .pipe(finalize(() => {
        this.savingLineAccountIds.delete(line.id);
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: (updatedLine) => {
          const selectedAccount = this.sncAccounts.find(
            (sncAccount) => sncAccount.code === updatedLine.suggestedSNCAccount,
          ) ?? null;
          this.invoices = this.invoices.map((currentInvoice) =>
            currentInvoice.id === invoice.id
              ? {
                  ...currentInvoice,
                  classifiedLines: (currentInvoice.classifiedLines ?? []).map((currentLine) =>
                    currentLine.id === updatedLine.id
                      ? { ...currentLine, ...updatedLine, sncAccount: selectedAccount }
                      : currentLine,
                  ),
                }
              : currentInvoice,
          );
          this.lineAccountEdits[line.id] = updatedLine.suggestedSNCAccount;
          this.editingLineAccountIds.delete(line.id);
          this.openLineAccountSearches.delete(line.id);
        },
        error: () => {
          this.lineAccountErrors[line.id] = 'Não foi possível guardar a conta SNC. Tente novamente.';
        },
      });
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
