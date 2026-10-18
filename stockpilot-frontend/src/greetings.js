const TIME_ZONE = "Asia/Kolkata";
const GREETING_BOUNDARIES = [5, 12, 17, 21];

const istClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const getIstParts = (date) =>
  Object.fromEntries(istClock.formatToParts(date).map(({ type, value }) => [type, value]));

export const getDisplayName = (user) => user?.fullName?.trim() || "Investor";

export const getTimeGreeting = (date = new Date()) => {
  const hour = Number(getIstParts(date).hour);
  if (hour >= 5 && hour < 12) return "Good morning ☀️";
  if (hour >= 12 && hour < 17) return "Good afternoon 🌤️";
  if (hour >= 17 && hour < 21) return "Good evening 🌆";
  return "Good night 🌙";
};

export const millisecondsUntilNextGreeting = (date = new Date()) => {
  const parts = getIstParts(date);
  const istCalendarTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    date.getMilliseconds()
  );
  let nextBoundary = new Date(istCalendarTime);
  nextBoundary.setUTCHours(GREETING_BOUNDARIES.find((hour) => hour > nextBoundary.getUTCHours()) ?? 5, 0, 0, 0);
  if (nextBoundary.getTime() <= istCalendarTime) {
    nextBoundary.setUTCDate(nextBoundary.getUTCDate() + 1);
  }
  return Math.max(1, nextBoundary.getTime() - istCalendarTime);
};
