export function generateDemoPaymentReference(): string {
  const suffix = Date.now().toString().slice(-6);
  return `DEMO-${suffix}`;
}

export function generateDemoTrackingNumber(): string {
  const suffix = Date.now().toString().slice(-8);
  return `TRK${suffix}`;
}

export function buildDemoPaymentNote(paymentReference: string, trackingNumber: string): string {
  return `Demo payment reference: ${paymentReference}. Tracking number: ${trackingNumber}.`;
}
