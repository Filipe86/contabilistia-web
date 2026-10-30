import { Client } from './client.model';

export interface InvoiceLine {
  id: string;
  originalDescription: string;
  isStockItem?: boolean;
  stockQuantity?: number;
  stockUnit?: string;
  suggestedSNCAccount: string;
  fiscalReasoning: string;
  baseAmount: number;
  vatRate: number;
  deductibleVatThisLine: number;
  reviewAlert: boolean;
  confidenceRate: number;
  reviewAlertReasoning: string;
  sncAccount?: SNCAccount | null;
}

export interface SNCAccount {
  code: string;
  description: string;
}

export interface Invoice {
  id: string;
  client: Client | null;
  supplier: string;
  supplierVat: string;
  invoiceDate: string;
  totalAmount: number;
  totalVatSupported: number;
  totalDeductibleVat: number;
  confidenceRate: number;
  status: 'classified' | 'suggested' | 'requires_review';
  classificationReason: string;
  validationStatus: 'pending' | 'validated';
  validatedAt: string | null;
  classifiedLines?: InvoiceLine[];
  rawAiResponse: string;
  createdAt: string;
}
