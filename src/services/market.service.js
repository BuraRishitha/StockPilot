import { ApiError } from "../utils/ApiError.js";
import { getIndianMarketStatus } from "./marketCalendar.service.js";

const updatedAt = new Date().toISOString();

const indianEquities = [
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", exchangeIdentifiers: { NSE: "RELIANCE", BSE: "500325" }, aliases: ["RELIANCE.NS", "500325.BO", "NSE:RELIANCE", "BSE:500325"], price: 1347.5, change: 12.4, changePercent: 0.93, previousClose: 1335.1, currency: "INR", tradable: true },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", exchangeIdentifiers: { NSE: "TCS", BSE: "532540" }, aliases: ["TCS.NS", "532540.BO", "NSE:TCS", "BSE:532540"], price: 3245.6, change: -18.2, changePercent: -0.56, previousClose: 3263.8, currency: "INR", tradable: true },
  { symbol: "INFY", name: "Infosys", exchange: "NSE", exchangeIdentifiers: { NSE: "INFY", BSE: "500209" }, aliases: ["INFY.NS", "500209.BO", "NSE:INFY", "BSE:500209"], price: 1550.25, change: 8.75, changePercent: 0.57, previousClose: 1541.5, currency: "INR", tradable: true },
  { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", exchangeIdentifiers: { NSE: "HDFCBANK", BSE: "500180" }, aliases: ["HDFCBANK.NS", "500180.BO", "NSE:HDFCBANK", "BSE:500180"], price: 1680.4, change: 6.2, changePercent: 0.37, previousClose: 1674.2, currency: "INR", tradable: true },
  { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", exchangeIdentifiers: { NSE: "ICICIBANK", BSE: "532174" }, aliases: ["ICICIBANK.NS", "532174.BO", "NSE:ICICIBANK", "BSE:532174"], price: 1210.8, change: -4.1, changePercent: -0.34, previousClose: 1214.9, currency: "INR", tradable: true },
  { symbol: "ITC", name: "ITC", exchange: "NSE", exchangeIdentifiers: { NSE: "ITC", BSE: "500875" }, aliases: ["ITC.NS", "500875.BO", "NSE:ITC", "BSE:500875"], price: 420.15, change: 2.35, changePercent: 0.56, previousClose: 417.8, currency: "INR", tradable: true },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE", exchangeIdentifiers: { NSE: "BHARTIARTL", BSE: "532454" }, aliases: ["BHARTIARTL.NS", "532454.BO", "NSE:BHARTIARTL", "BSE:532454"], price: 1950.7, change: 15.3, changePercent: 0.79, previousClose: 1935.4, currency: "INR", tradable: true },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", exchangeIdentifiers: { NSE: "SBIN", BSE: "500112" }, aliases: ["SBIN.NS", "500112.BO", "NSE:SBIN", "BSE:500112"], price: 835.25, change: -3.6, changePercent: -0.43, previousClose: 838.85, currency: "INR", tradable: true },
];

const indianIndices = [
  { symbol: "NIFTY50", name: "NIFTY 50", exchange: "NSE", exchangeIdentifiers: { NSE: "NIFTY 50" }, aliases: ["NIFTY", "NIFTY 50", "NSE:NIFTY50"], price: 25500.4, change: 125.8, changePercent: 0.5, previousClose: 25374.6, currency: "INR", tradable: false, assetType: "index" },
  { symbol: "SENSEX", name: "SENSEX", exchange: "BSE", exchangeIdentifiers: { BSE: "SENSEX" }, aliases: ["BSE:SENSEX"], price: 83300.7, change: 410.25, changePercent: 0.49, previousClose: 82890.45, currency: "INR", tradable: false, assetType: "index" },
  { symbol: "BANKNIFTY", name: "NIFTY Bank", exchange: "NSE", exchangeIdentifiers: { NSE: "NIFTY BANK" }, aliases: ["NIFTYBANK", "NIFTY BANK", "NSE:BANKNIFTY"], price: 57500.2, change: -95.4, changePercent: -0.17, previousClose: 57595.6, currency: "INR", tradable: false, assetType: "index" },
];

const legacyUsdQuotes = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", price: 192.84, change: 2.16, changePercent: 1.13, previousClose: 190.68, currency: "USD", tradable: true },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", price: 428.76, change: 1.92, changePercent: 0.45, previousClose: 426.84, currency: "USD", tradable: true },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", price: 135.58, change: -1.24, changePercent: -0.91, previousClose: 136.82, currency: "USD", tradable: true },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", price: 186.51, change: 1.31, changePercent: 0.71, previousClose: 185.2, currency: "USD", tradable: true },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", price: 176.42, change: -0.62, changePercent: -0.35, previousClose: 177.04, currency: "USD", tradable: true },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", price: 521.18, change: 4.72, changePercent: 0.91, previousClose: 516.46, currency: "USD", tradable: true },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", price: 248.5, change: -3.84, changePercent: -1.52, previousClose: 252.34, currency: "USD", tradable: true },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", price: 205.77, change: 0.83, changePercent: 0.4, previousClose: 204.94, currency: "USD", tradable: true },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", price: 279.36, change: 1.06, changePercent: 0.38, previousClose: 278.3, currency: "USD", tradable: true },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE", price: 98.44, change: -0.28, changePercent: -0.28, previousClose: 98.72, currency: "USD", tradable: true },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE Arca", price: 548.2, change: 2.42, changePercent: 0.44, previousClose: 545.78, currency: "USD", tradable: true },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", price: 470.65, change: 1.84, changePercent: 0.39, previousClose: 468.81, currency: "USD", tradable: true },
];

const quotes = [...indianEquities, ...indianIndices, ...legacyUsdQuotes].map((quote) => ({
  ...quote,
  aliases: quote.aliases || [],
  exchangeIdentifiers: quote.exchangeIdentifiers || { [quote.exchange]: quote.symbol },
  assetType: quote.assetType || "equity",
  updatedAt,
  isSimulated: true,
  dataLabel: "Illustrative sample data — not live market prices",
}));

const normalizeIdentifier = (identifier) =>
  String(identifier)
    .trim()
    .toUpperCase()
    .replace(/^(NSE|BSE):/, "")
    .replace(/\.(NS|BO)$/, "");

export const listStocks = (search = "", currency) => {
  const query = String(search).trim().toLowerCase();
  return quotes.filter((quote) => {
    if (currency && quote.currency !== currency) return false;
    if (!query) return true;
    const searchable = [
      quote.symbol,
      quote.name,
      quote.exchange,
      ...Object.values(quote.exchangeIdentifiers),
      ...quote.aliases,
    ];
    return searchable.some((value) => value.toLowerCase().includes(query));
  });
};

export const getStock = (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  const quote = quotes.find((item) =>
    item.symbol === normalized ||
    Object.values(item.exchangeIdentifiers).some((value) => value.toUpperCase() === normalized) ||
    item.aliases.some((alias) => normalizeIdentifier(alias) === normalized)
  );
  if (!quote) throw new ApiError(404, "Stock symbol not found in the sample market.");
  return quote;
};

export const getMarketStatus = (now = new Date()) => ({
  ...getIndianMarketStatus(now),
  isSimulated: true,
  dataLabel: "Mock calendar status — not verified exchange status",
});
