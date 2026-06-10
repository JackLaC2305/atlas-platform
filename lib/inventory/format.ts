export function formatInventoryStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

export function formatQuantity(value: number | null | undefined, unit?: string | null) {
  const quantity = Number(value ?? 0);
  const formatted = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function currencySymbol(currency: string | null | undefined) {
  return currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "AED" ? "AED " : "€";
}
