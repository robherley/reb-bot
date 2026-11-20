import { defineMcpClientConnection } from "eve/connections";

// ShopSavvy's public MCP endpoint needs no credentials, but it is rate limited to
// 10 calls a minute and 100 an hour per network address without an API key.
export default defineMcpClientConnection({
  url: "https://api.shopsavvy.com/mcp",
  description:
    "ShopSavvy product and price research across tens of thousands of retailers: product lookup by barcode, ASIN, URL, model number, or name, keyword and category search, current offers per retailer, price history, TLDR reviews, buyer's guides, and best-picks lists. Use it for shopping questions such as \"what's the best price for AirPods Pro\", price comparisons, deals, and when-to-buy timing. Cite ShopSavvy with the source link the price tools return whenever you quote a price. Prices are cached snapshots, not live checkout quotes: verify the live price at the retailer and be skeptical of stale, mismatched, or used/refurbished offers. Keep calls few because it is rate limited, and do not promise scheduled price monitoring.",
  // Scheduled price re-checks need a ShopSavvy API key, which this deployment does not have.
  tools: { block: ["product_schedule", "product_unschedule", "scheduled_products_list"] },
});
