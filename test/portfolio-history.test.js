import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPaperPortfolioHistory,
  getPortfolioChartPoints,
} from "../stockpilot-frontend/src/portfolioHistory.js";

test("paper portfolio history reconstructs buy and sell order snapshots", () => {
  const history = buildPaperPortfolioHistory([
    {
      symbol: "RELIANCE",
      side: "sell",
      quantity: 1,
      executionPrice: 120,
      total: 120,
      createdAt: "2026-05-03T10:00:00.000Z",
    },
    {
      symbol: "RELIANCE",
      side: "buy",
      quantity: 2,
      executionPrice: 100,
      total: 200,
      createdAt: "2026-05-01T10:00:00.000Z",
    },
  ], 1000);

  assert.deepEqual(history.map((entry) => entry.totalValue), [1000, 1000, 1040]);
  assert.deepEqual(history.map((entry) => entry.event), [
    "Starting balance",
    "buy RELIANCE",
    "sell RELIANCE",
  ]);
});

test("portfolio history ignores malformed orders and chart points remain within bounds", () => {
  const history = buildPaperPortfolioHistory([
    { symbol: "BAD", side: "buy", quantity: "invalid", executionPrice: 2 },
    {
      symbol: "TCS",
      side: "buy",
      quantity: 1,
      executionPrice: 100,
      total: 100,
      createdAt: "2026-05-01T10:00:00.000Z",
    },
  ], 1000);
  const points = getPortfolioChartPoints(history, 520, 135);

  assert.equal(history.length, 2);
  assert.deepEqual(points.split(" ").map((point) => point.split(",").map(Number)), [
    [0, 67.5],
    [520, 67.5],
  ]);
  assert.equal(buildPaperPortfolioHistory([], 1000).length, 0);
});
