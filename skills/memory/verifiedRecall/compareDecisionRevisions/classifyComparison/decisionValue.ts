export function fromQuote(field: string, quote: string): string | null {
  const prefix = `${field}:`;
  if (!quote.startsWith(prefix)) return null;
  return quote.slice(prefix.length).trim() || null;
}
