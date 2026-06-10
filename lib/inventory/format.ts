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

const weightFactors: Record<string, number> = {
  milligram: 0.001,
  gram: 1,
  kilogram: 1000,
  ounce: 28.349523125,
  pound: 453.59237,
};

const volumeFactors: Record<string, number> = {
  millilitre: 1,
  litre: 1000,
  "fluid ounce": 29.5735295625,
};

export function convertInventoryQuantity(quantity: number, fromUnit: string, toUnit: string) {
  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return quantity;
  }

  const fromWeight = weightFactors[fromUnit.toLowerCase()];
  const toWeight = weightFactors[toUnit.toLowerCase()];
  if (fromWeight && toWeight) {
    return (quantity * fromWeight) / toWeight;
  }

  const fromVolume = volumeFactors[fromUnit.toLowerCase()];
  const toVolume = volumeFactors[toUnit.toLowerCase()];
  if (fromVolume && toVolume) {
    return (quantity * fromVolume) / toVolume;
  }

  return null;
}

export function unitsAreCompatible(fromUnit: string, toUnit: string) {
  return convertInventoryQuantity(1, fromUnit, toUnit) !== null;
}
