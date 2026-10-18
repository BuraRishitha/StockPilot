import assert from "node:assert/strict";
import { test } from "node:test";
import { formatIndianDate, formatIndianDateTime, formatMoney } from "../stockpilot-frontend/src/formatting.js";

test("INR formatter uses Indian digit grouping for dashboard amount scales", () => {
  assert.equal(formatMoney(1000), "₹1,000");
  assert.equal(formatMoney(10000), "₹10,000");
  assert.equal(formatMoney(100000), "₹1,00,000");
  assert.equal(formatMoney(10000000), "₹1,00,00,000");
  assert.match(formatMoney(1000000, "INR", true), /₹10L/);
  assert.match(formatMoney(10000000, "INR", true), /₹1Cr/);
});

test("currency-aware formatting preserves legacy USD labels and numeric values", () => {
  assert.equal(formatMoney(100000, "USD"), "$1,00,000.00");
  assert.equal(formatMoney(1234.56, "INR"), "₹1,234.56");
  assert.equal(Number("₹1,234.56".replace(/[₹,]/g, "")), 1234.56);
});

test("frontend transaction dates display in IST and DD/MM/YYYY format", () => {
  assert.equal(formatIndianDate("2026-10-19T03:45:00.000Z"), "19/10/2026");
  assert.equal(formatIndianDateTime("2026-10-19T03:45:00.000Z"), "19/10/2026, 09:15");
});
