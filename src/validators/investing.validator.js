import { getStock } from "../services/market.service.js";

const asObject = (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? body : {};

export const validateWatchlistSymbol = (body) => {
  const errors = [];
  const symbol = asObject(body).symbol;
  if (typeof symbol !== "string" || !/^[A-Za-z0-9.:_-]{1,32}$/.test(symbol.trim())) {
    errors.push({ field: "symbol", message: "A valid stock symbol is required." });
  } else {
    try {
      getStock(symbol);
    } catch {
      errors.push({ field: "symbol", message: "Choose a symbol from the sample market." });
    }
  }
  return errors;
};

export const validatePaperOrder = (body) => {
  const errors = [];
  const { symbol, side, quantity } = asObject(body);

  if (typeof symbol !== "string" || !/^[A-Za-z0-9.:_-]{1,32}$/.test(symbol.trim())) {
    errors.push({ field: "symbol", message: "A valid stock symbol is required." });
  } else {
    try {
      if (!getStock(symbol).tradable) {
        errors.push({ field: "symbol", message: "Market indices cannot be traded." });
      }
    } catch {
      errors.push({ field: "symbol", message: "Choose a symbol from the sample market." });
    }
  }

  if (!["buy", "sell"].includes(side)) {
    errors.push({ field: "side", message: "Side must be buy or sell." });
  }

  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 1000000
  ) {
    errors.push({ field: "quantity", message: "Quantity must be greater than 0 and at most 1,000,000." });
  }

  return errors;
};
