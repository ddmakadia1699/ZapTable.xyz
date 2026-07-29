// Currency formatting shared by server and client components.
export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain number.
    return `${currency} ${amount.toFixed(2)}`;
  }
}
