import { InteractionResponseType } from "discord-interactions";
import YahooFinance from "yahoo-finance2";
import { CommandOptionType, cmd } from "../types.js";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const fmt = (n: number | undefined, decimals = 2) =>
  n != null ? n.toFixed(decimals) : "N/A";

const fmtPrice = (price: number | undefined, changePct: number | undefined) => {
  const s = changePct != null && changePct >= 0 ? "+" : "";
  return `\`$${fmt(price)} (${s}${fmt(changePct)}%)\``;
};

const fmtLarge = (n: number | undefined) => {
  if (n == null) return "N/A";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
};

export default cmd(
  {
    name: "stonks",
    description: "Get stock data for a ticker",
    options: [
      {
        name: "ticker",
        description: "Stock ticker symbol",
        type: CommandOptionType.STRING,
        required: true,
      },
      {
        name: "extended",
        description: "Show extended company info",
        type: CommandOptionType.BOOLEAN,
        required: false,
      },
    ],
  },
  async ({ ticker, extended }) => {
    const symbol = ticker.toUpperCase().replace(/[^A-Z]/g, "");

    if (!symbol) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Invalid ticker." },
      };
    }

    const quote = await yahooFinance.quote(symbol);
    if (!quote?.regularMarketPrice) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `No data found for '${symbol}'.` },
      };
    }

    const change = quote.regularMarketChange ?? 0;
    const changePct = quote.regularMarketChangePercent ?? 0;

    const afterHours =
      quote.marketState !== "REGULAR" && quote.postMarketPrice != null;
    const ahChange = quote.postMarketChange ?? 0;

    const stonksLabel = (c: number) => {
      const emoji = c >= 0 ? "📈" : "📉";
      const not = c >= 0 ? "" : "not ";
      return `is ${not}stonks ${emoji}`;
    };

    if (!extended) {
      let content = `**${quote.symbol}** ${stonksLabel(change)} ${fmtPrice(quote.regularMarketPrice, changePct)}`;
      if (afterHours) {
        content += `\n🌙 After hours ${stonksLabel(ahChange)} ${fmtPrice(quote.postMarketPrice, quote.postMarketChangePercent)}`;
      }
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content },
      };
    }

    const name = quote.longName ?? quote.shortName ?? quote.symbol;
    const fields = [
      {
        name: "Price",
        value: `$${fmt(quote.regularMarketPrice)} (${change >= 0 ? "+" : ""}${fmt(changePct)}%)`,
        inline: true,
      },
      { name: "Open", value: `$${fmt(quote.regularMarketOpen)}`, inline: true },
      {
        name: "Previous Close",
        value: `$${fmt(quote.regularMarketPreviousClose)}`,
        inline: true,
      },
      {
        name: "Day Range",
        value: `$${fmt(quote.regularMarketDayLow)} - $${fmt(quote.regularMarketDayHigh)}`,
        inline: true,
      },
      {
        name: "52 Week Range",
        value: `$${fmt(quote.fiftyTwoWeekLow)} - $${fmt(quote.fiftyTwoWeekHigh)}`,
        inline: true,
      },
      {
        name: "Volume",
        value: fmtLarge(quote.regularMarketVolume),
        inline: true,
      },
      { name: "Market Cap", value: fmtLarge(quote.marketCap), inline: true },
      { name: "P/E (Trailing)", value: fmt(quote.trailingPE), inline: true },
      { name: "P/E (Forward)", value: fmt(quote.forwardPE), inline: true },
      {
        name: "EPS (TTM)",
        value: fmt(quote.epsTrailingTwelveMonths),
        inline: true,
      },
      {
        name: "Dividend Yield",
        value:
          quote.dividendYield != null ? `${fmt(quote.dividendYield)}%` : "N/A",
        inline: true,
      },
      {
        name: "Avg Analyst Rating",
        value: quote.averageAnalystRating ?? "N/A",
        inline: true,
      },
    ];

    if (afterHours) {
      fields.push({
        name: "After Hours",
        value: `$${fmt(quote.postMarketPrice)} (${ahChange >= 0 ? "+" : ""}${fmt(quote.postMarketChangePercent)}%)`,
        inline: true,
      });
    }

    const color = change >= 0 ? 0x2ecc71 : 0xe74c3c;

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: `${change >= 0 ? "📈" : "📉"} ${name} (${quote.symbol})`,
            description: `**${quote.fullExchangeName}** · ${quote.currency}`,
            color,
            fields,
            footer: { text: `Market state: ${quote.marketState}` },
          },
        ],
      },
    };
  },
);
