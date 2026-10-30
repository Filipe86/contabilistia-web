import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Client } from '../models/client.model';
import { StockItem } from '../models/stock.model';
import { ClientService } from '../services/clientservice';
import { InvoiceService } from '../services/invoiceservice';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock.html',
  styleUrl: './stock.css',
})
export class Stock implements OnInit {
  stock: StockItem[] = [];
  clients: Client[] = [];
  activeClient: Client | null = null;
  private activeClientId = '';
  private loadRevision = 0;
  loading = true;
  errorMessage = '';

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly clientService: ClientService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.clientService.clients$.subscribe((clients) => {
      this.clients = clients;
      this.activeClient = clients.find((client) => client.id === this.activeClientId) ?? null;
      this.changeDetector.markForCheck();
    });
    this.clientService.activeClientId$.subscribe((clientId) => {
      this.activeClientId = clientId;
      this.activeClient = this.clients.find((client) => client.id === clientId) ?? null;
      this.loadStock();
    });
  }

  loadStock(): void {
    if (!this.activeClientId) {
      this.loadRevision += 1;
      this.stock = [];
      this.loading = false;
      this.errorMessage = '';
      return;
    }

    const requestedClientId = this.activeClientId;
    const requestedRevision = ++this.loadRevision;
    this.loading = true;
    this.errorMessage = '';
    this.stock = [];
    this.invoiceService.getCurrentStock(requestedClientId).subscribe({
      next: (stock) => {
        if (requestedRevision !== this.loadRevision) {
          return;
        }
        this.stock = stock;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (requestedRevision !== this.loadRevision) {
          return;
        }
        this.errorMessage = 'Não foi possível carregar o stock. Tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
