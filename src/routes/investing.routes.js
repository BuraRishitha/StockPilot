import { Router } from "express";
import * as controller from "../controllers/investing.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validatePaperOrder, validateWatchlistSymbol } from "../validators/investing.validator.js";

export const marketRouter = Router();
marketRouter.get("/status", controller.getMarketStatus);
marketRouter.get("/stocks", controller.listStocks);
marketRouter.get("/stocks/:symbol", controller.getStock);

export const investingRouter = Router();
investingRouter.use("/watchlist", protect);
investingRouter.use("/portfolio", protect);
investingRouter.get("/watchlist", controller.getWatchlist);
investingRouter.post("/watchlist", validateRequest(validateWatchlistSymbol), controller.addWatchlistSymbol);
investingRouter.delete("/watchlist/:symbol", controller.removeWatchlistSymbol);
investingRouter.get("/portfolio", controller.getPortfolio);
investingRouter.get("/portfolio/trades", controller.getPaperTrades);
investingRouter.post("/portfolio/orders", validateRequest(validatePaperOrder), controller.createPaperOrder);
