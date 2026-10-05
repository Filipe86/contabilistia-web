export interface InvoiceLine {
  original_description: string;
  suggested_snc_account: string;
  fiscal_reasoning: string;
  base_amount: number;
  vat_rate: number;
  deductible_vat_this_line: number;
  review_alert: boolean;
}

export interface Invoice {
  id: string;
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
  rawAiResponse: string;
  createdAt: string;
}