import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export function normalizeTicker(ticker: string): string {
  const symbol = ticker.trim().toUpperCase().replace(/^\$/, "");
  // Preserve Yahoo symbols such as BRK-B, 0700.HK, ^GSPC, and BTC-USD.
  if (!/^[A-Z0-9^][A-Z0-9.^=\-]{0,31}$/.test(symbol)) {
    throw new Error("Invalid ticker. Use a symbol such as AAPL, BRK-B, or 0700.HK.");
  }
  return symbol;
}

export async function getStockQuote(ticker: string) {
  const symbol = normalizeTicker(ticker);
  const quote = await yahooFinance.quote(symbol);
  if (!quote || quote.regularMarketPrice == null) return null;
  return quote;
}
