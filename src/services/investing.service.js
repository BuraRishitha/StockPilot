import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { getStock, listStocks } from "./market.service.js";
import { PaperPortfolio } from "../models/PaperPortfolio.js";
import { PaperTrade } from "../models/PaperTrade.js";
import { Watchlist } from "../models/Watchlist.js";

export const getWatchlist = async (userId) => {
  const watchlist = await Watchlist.findOne({ user: userId }).lean();
  const symbols = watchlist?.symbols || [];
  return { symbols: symbols.map((symbol) => getStock(symbol)) };
};

export const addWatchlistSymbol = async (userId, symbol) => {
  const quote = getStock(symbol);
  const watchlist = await Watchlist.findOneAndUpdate(
    { user: userId },
    { $addToSet: { symbols: quote.symbol } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return { symbols: watchlist.symbols.map((item) => getStock(item)) };
};

export const removeWatchlistSymbol = async (userId, symbol) => {
  const quote = getStock(symbol);
  const watchlist = await Watchlist.findOneAndUpdate(
    { user: userId },
    { $pull: { symbols: quote.symbol } },
    { new: true }
  ).lean();
  return { symbols: (watchlist?.symbols || []).map((item) => getStock(item)) };
};

const ensurePortfolio = async (userId, session) => {
  await PaperPortfolio.updateOne(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        currency: "INR",
        startingCash: 1000000,
        cashBalance: 1000000,
        positions: [],
      },
    },
    { upsert: true, session, setDefaultsOnInsert: true }
  );
  return PaperPortfolio.findOne({ user: userId }).session(session);
};

const getStartingCash = (portfolio) =>
  portfolio.startingCash ?? (portfolio.currency === "USD" ? 100000 : 1000000);

export const getPaperPortfolio = async (userId) => {
  const session = await mongoose.startSession();
  let portfolio;
  try {
    await session.withTransaction(async () => {
      portfolio = await ensurePortfolio(userId, session);
    });
  } finally {
    await session.endSession();
  }

  const positions = portfolio.positions.map((position) => {
    const quote = getStock(position.symbol);
    const marketValue = roundMoney(position.quantity * quote.price);
    const costBasis = roundMoney(position.quantity * position.averageCost);
    return {
      symbol: position.symbol,
      quantity: position.quantity,
      averageCost: position.averageCost,
      currentPrice: quote.price,
      marketValue,
      unrealizedProfitLoss: roundMoney(marketValue - costBasis),
      changePercent: quote.changePercent,
    };
  });
  const investedValue = roundMoney(positions.reduce((sum, position) => sum + position.marketValue, 0));
  const startingCash = getStartingCash(portfolio);
  return {
    mode: "paper",
    isSimulated: true,
    currency: portfolio.currency,
    startingCash,
    cashBalance: portfolio.cashBalance,
    investedValue,
    totalValue: roundMoney(portfolio.cashBalance + investedValue),
    totalProfitLoss: roundMoney(portfolio.cashBalance + investedValue - startingCash),
    positions,
  };
};

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export const placePaperOrder = async (userId, { symbol, side, quantity }) => {
  const quote = getStock(symbol);
  const executionPrice = quote.price;
  const total = roundMoney(executionPrice * quantity);
  const session = await mongoose.startSession();
  let trade;

  try {
    await session.withTransaction(async () => {
      const portfolio = await ensurePortfolio(userId, session);
      if (quote.currency !== portfolio.currency) {
        throw new ApiError(
          400,
          `This paper portfolio uses ${portfolio.currency}; ${quote.currency} instruments cannot be traded in it.`
        );
      }
      if (!quote.tradable) {
        throw new ApiError(400, "Market indices are not tradable in paper mode.");
      }
      portfolio.startingCash ??= getStartingCash(portfolio);
      let position = portfolio.positions.find((item) => item.symbol === quote.symbol);

      if (side === "buy") {
        if (portfolio.cashBalance < total) {
          throw new ApiError(400, "Insufficient paper cash for this order.");
        }
        const oldQuantity = position?.quantity || 0;
        const newQuantity = oldQuantity + quantity;
        const averageCost =
          roundMoney((oldQuantity * (position?.averageCost || 0) + total) / newQuantity);

        if (position) {
          position.quantity = newQuantity;
          position.averageCost = averageCost;
        } else {
          portfolio.positions.push({ symbol: quote.symbol, quantity, averageCost });
        }
        portfolio.cashBalance = roundMoney(portfolio.cashBalance - total);
      } else {
        if (!position || position.quantity + Number.EPSILON < quantity) {
          throw new ApiError(400, "Insufficient shares for this paper sell order.");
        }
        position.quantity = roundMoney(position.quantity - quantity);
        portfolio.cashBalance = roundMoney(portfolio.cashBalance + total);
        if (position.quantity <= 0) {
          portfolio.positions = portfolio.positions.filter((item) => item.symbol !== quote.symbol);
        }
      }

      await portfolio.save({ session });
      [trade] = await PaperTrade.create(
        [{
          user: userId,
          symbol: quote.symbol,
          side,
          quantity,
          executionPrice,
          total,
          currency: quote.currency,
          mode: "paper",
        }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    trade: trade.toObject(),
    portfolio: await getPaperPortfolio(userId),
  };
};

export const listPaperTrades = async (userId, limit = 20) =>
  PaperTrade.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();

export { listStocks };
