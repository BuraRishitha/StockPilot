import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";

process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/stockpilot_test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-with-sufficient-length";
process.env.JWT_REFRESH_SECRET ||= "different-test-refresh-secret-with-length";

const [
  { default: app },
  { PaperPortfolio },
  { PaperTrade },
  { validatePaperOrder },
  { placePaperOrder, getPaperPortfolio },
  marketService,
  marketCalendar,
] = await Promise.all([
  import("../src/app.js"),
  import("../src/models/PaperPortfolio.js"),
  import("../src/models/PaperTrade.js"),
  import("../src/validators/investing.validator.js"),
  import("../src/services/investing.service.js"),
  import("../src/services/market.service.js"),
  import("../src/services/marketCalendar.service.js"),
]);

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

const mockSession = (t) =>
  t.mock.method(mongoose, "startSession", async () => ({
    async withTransaction(callback) {
      await callback();
    },
    async endSession() {},
  }));

test("market endpoints return simulated quotes and reject unknown symbols", async () => {
  const response = await fetch(`${baseUrl}/market/stocks?search=apple`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.isSimulated, true);
  assert.equal(body.data.stocks.length, 1);
  assert.equal(body.data.stocks[0].symbol, "AAPL");
  assert.equal(body.data.stocks[0].isSimulated, true);

  const unknown = await fetch(`${baseUrl}/market/stocks/UNKNOWN`);
  assert.equal(unknown.status, 404);
});

test("Indian equities, NSE/BSE identifiers, and indices are available as mock quotes", async () => {
  const response = await fetch(`${baseUrl}/market/stocks?search=500325`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.stocks[0].symbol, "RELIANCE");
  assert.equal(body.data.stocks[0].currency, "INR");
  assert.equal(body.data.stocks[0].isSimulated, true);
  assert.equal(marketService.getStock("NSE:RELIANCE").symbol, "RELIANCE");
  assert.equal(marketService.getStock("500325.BO").symbol, "RELIANCE");
  assert.equal(marketService.getStock("BSE:500325").exchangeIdentifiers.BSE, "500325");
  assert.equal(marketService.getStock("NIFTY 50").tradable, false);
  assert.deepEqual(
    ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "ITC", "BHARTIARTL", "SBIN"]
      .map((symbol) => marketService.getStock(symbol).currency),
    Array(8).fill("INR")
  );

  const statusResponse = await fetch(`${baseUrl}/market/status`);
  const statusBody = await statusResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(statusBody.data.marketStatus.timeZone, "Asia/Kolkata");
  assert.equal(statusBody.data.marketStatus.statusVerified, false);

  const inrQuotes = await fetch(`${baseUrl}/market/stocks?currency=INR`).then((result) => result.json());
  const usdQuotes = await fetch(`${baseUrl}/market/stocks?currency=USD`).then((result) => result.json());
  assert.ok(inrQuotes.data.stocks.length > 0);
  assert.ok(inrQuotes.data.stocks.every((quote) => quote.currency === "INR"));
  assert.ok(usdQuotes.data.stocks.length > 0);
  assert.ok(usdQuotes.data.stocks.every((quote) => quote.currency === "USD"));
});

test("Indian market status observes IST session boundaries, weekends, and mock holidays", () => {
  const at = (date) => new Date(date);
  assert.equal(marketCalendar.getIndianMarketStatus(at("2026-10-19T03:45:00.000Z")).status, "open");
  assert.equal(marketCalendar.getIndianMarketStatus(at("2026-10-19T10:00:00.000Z")).status, "closed");
  assert.equal(marketCalendar.getIndianMarketStatus(at("2026-10-18T04:00:00.000Z")).status, "weekend");
  const holiday = marketCalendar.getIndianMarketStatus(at("2026-10-02T04:00:00.000Z"));
  assert.equal(holiday.status, "holiday");
  assert.equal(holiday.reason, "Mahatma Gandhi Jayanti");
  assert.equal(holiday.statusVerified, false);
  assert.equal(marketCalendar.formatIndianDateTime(at("2026-10-19T03:45:00.000Z")), "19/10/2026, 09:15");
});

test("portfolio, watchlist, and paper-trade endpoints require authentication", async () => {
  const responses = await Promise.all([
    fetch(`${baseUrl}/watchlist`),
    fetch(`${baseUrl}/portfolio`),
    fetch(`${baseUrl}/portfolio/trades`),
  ]);

  assert.deepEqual(responses.map(({ status }) => status), [401, 401, 401]);
});

test("paper order validation rejects unknown symbols, invalid side, and non-positive shares", () => {
  assert.equal(validatePaperOrder({ symbol: "AAPL", side: "buy", quantity: 1 }).length, 0);
  assert.equal(validatePaperOrder({ symbol: "NSE:RELIANCE", side: "buy", quantity: 1 }).length, 0);
  assert.ok(validatePaperOrder({ symbol: "NOTREAL", side: "buy", quantity: 1 }).length > 0);
  assert.ok(validatePaperOrder({ symbol: "NIFTY50", side: "buy", quantity: 1 }).length > 0);
  assert.ok(validatePaperOrder({ symbol: "AAPL", side: "borrow", quantity: 1 }).length > 0);
  assert.ok(validatePaperOrder({ symbol: "AAPL", side: "buy", quantity: 0 }).length > 0);
});

test("paper buy order uses the server quote and updates cash and cost basis", async (t) => {
  const userId = new mongoose.Types.ObjectId();
  const portfolio = {
    currency: "USD",
    startingCash: 100000,
    cashBalance: 100000,
    positions: [],
    async save() {},
  };
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({
    session: async () => portfolio,
  }));
  t.mock.method(PaperTrade, "create", async ([trade]) => [{
    toObject: () => trade,
  }]);

  const result = await placePaperOrder(userId, {
    symbol: "AAPL",
    side: "buy",
    quantity: 2,
  });

  assert.equal(portfolio.cashBalance, 100000 - 2 * 192.84);
  assert.equal(portfolio.positions[0].symbol, "AAPL");
  assert.equal(portfolio.positions[0].quantity, 2);
  assert.equal(portfolio.positions[0].averageCost, 192.84);
  assert.equal(result.trade.executionPrice, 192.84);
  assert.equal(result.trade.mode, "paper");
  assert.equal(result.portfolio.isSimulated, true);
});

test("paper sell rejects overselling and allows selling owned shares", async (t) => {
  const portfolio = {
    currency: "USD",
    startingCash: 100000,
    cashBalance: 99000,
    positions: [{ symbol: "AAPL", quantity: 2, averageCost: 190 }],
    async save() {},
  };
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({
    session: async () => portfolio,
  }));
  t.mock.method(PaperTrade, "create", async ([trade]) => [{
    toObject: () => trade,
  }]);

  await assert.rejects(
    placePaperOrder(new mongoose.Types.ObjectId(), {
      symbol: "AAPL",
      side: "sell",
      quantity: 3,
    }),
    /Insufficient shares/
  );

  assert.equal(portfolio.positions[0].quantity, 2);
  const result = await placePaperOrder(new mongoose.Types.ObjectId(), {
    symbol: "AAPL",
    side: "sell",
    quantity: 1,
  });
  assert.equal(portfolio.positions[0].quantity, 1);
  assert.equal(result.trade.side, "sell");
});

test("paper buy rejects orders that exceed the user's cash balance", async (t) => {
  const portfolio = { currency: "USD", startingCash: 100000, cashBalance: 100, positions: [], async save() {} };
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({
    session: async () => portfolio,
  }));
  t.mock.method(PaperTrade, "create", async () => {
    throw new Error("A rejected order must not create a trade.");
  });

  await assert.rejects(
    placePaperOrder(new mongoose.Types.ObjectId(), {
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
    }),
    /Insufficient paper cash/
  );
  assert.equal(portfolio.cashBalance, 100);
});

test("new portfolios default to INR while existing USD portfolios retain their original denomination", async (t) => {
  const fresh = {
    currency: "INR",
    startingCash: 1000000,
    cashBalance: 1000000,
    positions: [],
    async save() {},
  };
  let portfolio = fresh;
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({ session: async () => portfolio }));

  const inr = await getPaperPortfolio(new mongoose.Types.ObjectId());
  assert.equal(inr.currency, "INR");
  assert.equal(inr.startingCash, 1000000);
  assert.equal(inr.cashBalance, 1000000);
  assert.equal(inr.totalProfitLoss, 0);

  portfolio = {
    currency: "USD",
    cashBalance: 100000,
    positions: [{ symbol: "AAPL", quantity: 1, averageCost: 190 }],
  };
  const usd = await getPaperPortfolio(new mongoose.Types.ObjectId());
  assert.equal(usd.currency, "USD");
  assert.equal(usd.startingCash, 100000);
  assert.equal(usd.cashBalance, 100000);
  assert.equal(usd.positions[0].currentPrice, 192.84);
});

test("Indian paper orders use INR quotes, resolve BSE aliases, and preserve numeric math", async (t) => {
  const portfolio = {
    currency: "INR",
    startingCash: 1000000,
    cashBalance: 1000000,
    positions: [],
    async save() {},
  };
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({ session: async () => portfolio }));
  t.mock.method(PaperTrade, "create", async ([trade]) => [{ toObject: () => trade }]);

  const result = await placePaperOrder(new mongoose.Types.ObjectId(), {
    symbol: "BSE:500325",
    side: "buy",
    quantity: 2,
  });
  assert.equal(result.trade.symbol, "RELIANCE");
  assert.equal(result.trade.currency, "INR");
  assert.equal(result.trade.total, 2695);
  assert.equal(portfolio.cashBalance, 997305);
  assert.equal(portfolio.positions[0].averageCost, 1347.5);
  assert.equal(result.portfolio.currency, "INR");
  assert.equal(result.portfolio.totalValue, 1000000);
});

test("paper orders cannot mix currencies or trade market indices", async (t) => {
  const portfolio = {
    currency: "USD",
    startingCash: 100000,
    cashBalance: 100000,
    positions: [],
    async save() {},
  };
  mockSession(t);
  t.mock.method(PaperPortfolio, "updateOne", async () => ({}));
  t.mock.method(PaperPortfolio, "findOne", () => ({ session: async () => portfolio }));

  await assert.rejects(
    placePaperOrder(new mongoose.Types.ObjectId(), { symbol: "RELIANCE", side: "buy", quantity: 1 }),
    /uses USD/
  );
  await assert.rejects(
    placePaperOrder(new mongoose.Types.ObjectId(), { symbol: "NIFTY50", side: "buy", quantity: 1 }),
    /uses USD/
  );
  assert.equal(portfolio.cashBalance, 100000);
  assert.equal(portfolio.positions.length, 0);
});
