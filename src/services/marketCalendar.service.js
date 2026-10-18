const TIME_ZONE = "Asia/Kolkata";
const CALENDAR_YEAR = 2026;

const mockHolidays = {
  "2026-01-26": "Republic Day",
  "2026-03-04": "Holi",
  "2026-03-26": "Shri Ram Navami",
  "2026-03-31": "Mahavir Jayanti",
  "2026-04-03": "Good Friday",
  "2026-04-14": "Dr. B. R. Ambedkar Jayanti",
  "2026-05-01": "Maharashtra Day",
  "2026-05-27": "Bakri Id",
  "2026-06-26": "Muharram",
  "2026-09-14": "Ganesh Chaturthi",
  "2026-10-02": "Mahatma Gandhi Jayanti",
  "2026-10-20": "Dussehra",
  "2026-11-09": "Diwali-Balipratipada",
  "2026-11-24": "Guru Nanak Jayanti",
  "2026-12-25": "Christmas",
};

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const getIndianMarketStatus = (now = new Date()) => {
  const parts = Object.fromEntries(
    istFormatter.formatToParts(now).map(({ type, value }) => [type, value])
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const holiday = mockHolidays[date];
  const isWeekend = weekday === 0 || weekday === 6;
  const calendarSupported = Number(parts.year) === CALENDAR_YEAR;

  let status;
  let reason;
  if (holiday) {
    status = "holiday";
    reason = holiday;
  } else if (isWeekend) {
    status = "weekend";
    reason = "Indian markets are closed on weekends.";
  } else if (minutes < 9 * 60 + 15) {
    status = "pre-open";
    reason = "Regular trading has not started.";
  } else if (minutes < 15 * 60 + 30) {
    status = "open";
    reason = "Within the regular-session schedule.";
  } else {
    status = "closed";
    reason = "The regular trading session has ended.";
  }

  return {
    exchange: "NSE/BSE",
    timeZone: TIME_ZONE,
    localDate: date,
    localTime: `${parts.hour}:${parts.minute}`,
    status,
    reason,
    session: { open: "09:15", close: "15:30" },
    calendarYear: CALENDAR_YEAR,
    calendarSupported,
    statusVerified: false,
    holidayCalendarLabel: `Static mock holiday calendar${calendarSupported ? ` (${CALENDAR_YEAR})` : " unavailable for this year"}`,
  };
};

export const formatIndianDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

export const formatIndianDateTime = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
