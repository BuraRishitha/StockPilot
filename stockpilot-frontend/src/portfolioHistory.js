export const buildPaperPortfolioHistory = (trades, startingCash = 0) => {
  const orderedTrades = [...(trades || [])]
    .filter((trade) =>
      Number.isFinite(Number(trade.quantity)) &&
      Number.isFinite(Number(trade.executionPrice)) &&
      Number(trade.quantity) > 0 &&
      Number(trade.executionPrice) >= 0 &&
      ["buy", "sell"].includes(trade.side)
    )
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

  if (!orderedTrades.length) return [];

  let cash = Number(startingCash) || 0;
  const positions = new Map();
  const history = [{
    createdAt: orderedTrades[0].createdAt,
    totalValue: cash,
    event: "Starting balance",
  }];

  for (const trade of orderedTrades) {
    const quantity = Number(trade.quantity);
    const price = Number(trade.executionPrice);
    const total = Number.isFinite(Number(trade.total)) ? Number(trade.total) : quantity * price;
    const position = positions.get(trade.symbol) || { quantity: 0, averageCost: 0, lastPrice: price };

    if (trade.side === "buy") {
      const newQuantity = position.quantity + quantity;
      position.averageCost =
        (position.quantity * position.averageCost + total) / newQuantity;
      position.quantity = newQuantity;
      cash -= total;
    } else {
      position.quantity = Math.max(0, position.quantity - quantity);
      cash += total;
    }
    position.lastPrice = price;
    if (position.quantity > 0) positions.set(trade.symbol, position);
    else positions.delete(trade.symbol);

    const investedValue = [...positions.values()].reduce(
      (sum, current) => sum + current.quantity * current.lastPrice,
      0
    );
    history.push({
      createdAt: trade.createdAt,
      totalValue: Math.round((cash + investedValue + Number.EPSILON) * 100) / 100,
      event: `${trade.side} ${trade.symbol}`,
    });
  }

  return history;
};

export const getPortfolioChartPoints = (history, width = 520, height = 135, padding = 8) => {
  if (!history.length) return "";
  if (history.length === 1) return `0,${height - padding} ${width},${height - padding}`;

  const values = history.map((entry) => Number(entry.totalValue));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = range
        ? height - padding - ((value - minValue) / range) * (height - 2 * padding)
        : height / 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};
