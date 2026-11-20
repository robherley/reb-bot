import { defineInstructions } from "eve/instructions";

export default defineInstructions({
  content: `ShopSavvy prices and availability are cached snapshots, not live quotes. Every offer carries a last-checked date, so before you state a price, check how old it is and best-effort verify it: open the retailer's product page (web_search, or curl it in the sandbox) and compare, falling back to \`shopsavvy__product_offers_retailer\` for a single store. Treat anything not checked today, any link that resolves to a different model, variant or refurbished listing, and any row from an unfamiliar reseller or marketplace seller as stale or suspect: say so instead of quoting it as the price. Cite ShopSavvy plus the retailer you actually verified, and when a retailer blocks automated checks or you cannot confirm, label the price unverified rather than guessing.`,
});
