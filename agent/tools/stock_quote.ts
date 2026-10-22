import { defineTool } from "eve/tools";
import { z } from "zod";
import { getStockQuote, normalizeTicker } from "../../bot/lib/stocks.js";

export default defineTool({
  description:
    "Look up the latest available Yahoo Finance quotes for ticker symbols. Use for stock prices, market performance, comparisons, and pre-/after-market prices. Quotes may be delayed: use currency, marketState, and each session's timestamp; do not present extended-hours prices as the regular-session price. This returns quotes, not historical charts or news explaining price moves.",
  inputSchema: z.object({
    symbols: z.array(z.string().min(1).max(33)).min(1).max(10)
      .describe("Ticker symbols, e.g. AAPL, MSFT, BRK-B, 0700.HK, or ^GSPC."),
  }),
  async execute({ symbols }) {
    const quotes = await Promise.all(symbols.map(async (ticker) => {
      let symbol: string;
      try {
        symbol = normalizeTicker(ticker);
      } catch {
        return { symbol: ticker, error: "Invalid ticker symbol." };
      }

      try {
        const quote = await getStockQuote(symbol);
        if (!quote) return { symbol, error: "No quote data found." };

        return {
          symbol: quote.symbol,
          name: quote.longName ?? quote.shortName ?? quote.symbol,
          currency: quote.currency ?? null,
          exchange: quote.fullExchangeName ?? quote.exchange,
          marketState: quote.marketState,
          regular: {
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange ?? null,
            changePercent: quote.regularMarketChangePercent ?? null,
            timestamp: quote.regularMarketTime?.toISOString() ?? null,
            open: quote.regularMarketOpen ?? null,
            previousClose: quote.regularMarketPreviousClose ?? null,
            low: quote.regularMarketDayLow ?? null,
            high: quote.regularMarketDayHigh ?? null,
            volume: quote.regularMarketVolume ?? null,
          },
          preMarket: quote.preMarketPrice == null ? null : {
            price: quote.preMarketPrice,
            change: quote.preMarketChange ?? null,
            changePercent: quote.preMarketChangePercent ?? null,
            timestamp: quote.preMarketTime?.toISOString() ?? null,
          },
          postMarket: quote.postMarketPrice == null ? null : {
            price: quote.postMarketPrice,
            change: quote.postMarketChange ?? null,
            changePercent: quote.postMarketChangePercent ?? null,
            timestamp: quote.postMarketTime?.toISOString() ?? null,
          },
          marketCap: quote.marketCap ?? null,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
          trailingPE: quote.trailingPE ?? null,
          forwardPE: quote.forwardPE ?? null,
          eps: quote.epsTrailingTwelveMonths ?? null,
          dividendYield: quote.dividendYield ?? null,
          averageAnalystRating: quote.averageAnalystRating ?? null,
        };
      } catch {
        return { symbol, error: "Yahoo Finance quote lookup failed. Try again later." };
      }
    }));

    return { source: "Yahoo Finance", fetchedAt: new Date().toISOString(), quotes };
  },
});
