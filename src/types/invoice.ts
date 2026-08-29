export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "unpaid"
  | "past_due"
  | "cancelled";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in INR
  amount: number; // in INR
  taxRate: number; // e.g. 18 for 18% GST
  taxAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  razorpayInvoiceId?: string;
  customerId: string;
  subscriptionId?: string;
  paymentId?: string;
  subtotal: number; // in INR
  taxAmount: number; // in INR (18% GST)
  totalAmount: number; // in INR
  currency: "INR";
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  lineItems: InvoiceLineItem[];
  pdfUrl?: string;
  paymentLinkUrl?: string;
  createdAt: string;
}
