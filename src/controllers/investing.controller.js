import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as marketService from "../services/market.service.js";
import * as investingService from "../services/investing.service.js";

export const listStocks = asyncHandler(async (req, res) => {
  const stocks = marketService.listStocks(req.query.search, req.query.currency);
  res.status(200).json(new ApiResponse("Sample market quotes fetched.", {
    stocks,
    isSimulated: true,
    marketStatus: marketService.getMarketStatus(),
  }));
});

export const getMarketStatus = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse("Mock Indian market status fetched.", {
    marketStatus: marketService.getMarketStatus(),
  }));
});

export const getStock = asyncHandler(async (req, res) => {
  const stock = marketService.getStock(req.params.symbol);
  res.status(200).json(new ApiResponse("Sample market quote fetched.", { stock }));
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const result = await investingService.getWatchlist(req.user._id);
  res.status(200).json(new ApiResponse("Watchlist fetched.", result));
});

export const addWatchlistSymbol = asyncHandler(async (req, res) => {
  const result = await investingService.addWatchlistSymbol(req.user._id, req.body.symbol);
  res.status(200).json(new ApiResponse("Symbol added to watchlist.", result));
});

export const removeWatchlistSymbol = asyncHandler(async (req, res) => {
  const result = await investingService.removeWatchlistSymbol(req.user._id, req.params.symbol);
  res.status(200).json(new ApiResponse("Symbol removed from watchlist.", result));
});

export const getPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await investingService.getPaperPortfolio(req.user._id);
  res.status(200).json(new ApiResponse("Paper portfolio fetched.", { portfolio }));
});

export const createPaperOrder = asyncHandler(async (req, res) => {
  const result = await investingService.placePaperOrder(req.user._id, req.body);
  res.status(201).json(new ApiResponse("Paper order executed.", result));
});

export const getPaperTrades = asyncHandler(async (req, res) => {
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  const trades = await investingService.listPaperTrades(req.user._id, limit);
  res.status(200).json(new ApiResponse("Paper trades fetched.", { trades }));
});
