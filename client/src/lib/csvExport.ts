/**
 * CSV Export Utility
 */

export function exportPaymentsToCSV(payments: any[]) {
  const headers = [
    "ID",
    "Amount",
    "Currency",
    "Status",
    "Payer Wallet",
    "Merchant Wallet",
    "Transaction Hash",
    "Created At",
    "Updated At",
  ];

  const rows = payments.map((payment) => [
    payment.id,
    payment.amount,
    payment.currency,
    payment.status,
    payment.payerWallet || "",
    payment.merchantWallet || "",
    payment.txHash || "",
    new Date(payment.createdAt).toISOString(),
    new Date(payment.updatedAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `payments-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportInvoicesToCSV(invoices: any[]) {
  const headers = [
    "Invoice Number",
    "Amount",
    "Currency",
    "Status",
    "Customer Name",
    "Customer Email",
    "Description",
    "Due Date",
    "Payment ID",
    "Created At",
  ];

  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    invoice.amount,
    invoice.currency,
    invoice.status,
    invoice.customerName || "",
    invoice.customerEmail,
    invoice.description || "",
    invoice.dueDate ? new Date(invoice.dueDate).toISOString() : "",
    invoice.paymentId || "",
    new Date(invoice.createdAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `invoices-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportInvoiceToCSV(invoice: any) {
  exportInvoicesToCSV([invoice]);
}

