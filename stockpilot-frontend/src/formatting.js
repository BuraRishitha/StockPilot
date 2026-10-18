export const formatMoney = (value, currency = "INR", compact = false) => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const options = {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: currency === "INR" ? 0 : 2,
  };
  return new Intl.NumberFormat("en-IN", options).format(safeValue);
};

export const formatIndianDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));

export const formatIndianDateTime = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
