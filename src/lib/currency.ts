export function formatCurrency(amount: number | string | null | undefined) {
  let num: number;
  if (typeof amount === "number") {
    num = isNaN(amount) ? 0 : amount;
  } else {
    const clean = String(amount ?? 0).replace(/[^0-9.]/g, "");
    num = parseFloat(clean) || 0;
  }
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
