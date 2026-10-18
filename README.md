# StockPilot

StockPilot is an India-focused paper-investing application for exploring clearly
labelled sample NSE/BSE instruments, maintaining a watchlist, and practicing
buys and sells in an isolated simulated portfolio. It is a portfolio/demo
project, not a brokerage or investment service.

## Features

- Email-verified registration, login, JWT access tokens, rotating httpOnly
  refresh cookies, logout, and password reset.
- Indian-market sample equities for Reliance Industries, TCS, Infosys, HDFC
  Bank, ICICI Bank, ITC, Bharti Airtel, and SBI.
- NSE and BSE identifiers, company-name/ticker search, and NIFTY 50, SENSEX,
  and NIFTY Bank sample indices.
- New paper portfolios use INR with ₹10,00,000 simulated starting funds.
  Watchlists, holdings, cost basis, buying power, P/L, and trade history are
  scoped to the authenticated user.
- Paper orders use prices selected by the backend, enforce available cash and
  share limits, and persist portfolio/trade changes transactionally.
- Existing USD-denominated portfolios remain USD and retain their old sample
  instruments and numeric balances. No automatic FX conversion or data
  migration is performed. Instrument lists are shown in the portfolio's
  currency; INR and USD values are never mixed in one paper portfolio.
- Responsive React dashboard pages: Overview, Markets, Watchlist, Portfolio,
  Activity, and Account.
- Market and portfolio values are simulation-only; there is no real-money
  trading or payment functionality.

## Technology

- Backend: Node.js, Express, MongoDB, and Mongoose.
- Frontend: React, Vite, and Lucide icons.
- Authentication: JWT access tokens, httpOnly refresh-token cookies, bcrypt,
  request validation, and SMTP email verification/reset.

## Indian market support and limitations

- INR is the default currency for newly created paper portfolios and new
  portfolio documents. Existing USD portfolios are preserved and displayed in
  USD. There is no historical currency conversion.
- The quote catalogue is fixed illustrative data marked as simulated; it is
  not a live feed, recommendation, or current exchange price.
- `GET /api/v1/market/status` reports a mock NSE/BSE session using Asia/Kolkata,
  weekdays, a 09:15–15:30 IST regular-session schedule, and a static 2026 demo
  holiday fixture. The fixture is not an official or verified exchange
  calendar. Outside its listed coverage and at all times, the application does
  not verify exchange status. Confirm actual holidays and market status with
  the exchanges before relying on them.
- Indices can be searched and watched but cannot be traded.
- Existing retail inventory, sales, procurement, analytics, and account APIs
  remain mounted in the backend for compatibility; they are not the investing
  dashboard's primary product flow.
- No licensed market-data provider or brokerage is configured.

## Setup

Use Node.js and npm. MongoDB Atlas or a MongoDB replica set is required for
database transactions. Configure the backend's existing `.env` file locally;
never commit it. Required variable **names** are:

```text
MONGO_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
```

Optional backend variable names:

```text
PORT
NODE_ENV
CLIENT_URL
JWT_ACCESS_EXPIRES
JWT_REFRESH_EXPIRES
JWT_REFRESH_EXPIRES_MS
EMAIL_VERIFICATION_EXPIRES_MS
PASSWORD_RESET_EXPIRES_MS
MAX_LOGIN_ATTEMPTS
LOCK_DURATION_MS
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM
COOKIE_SECURE
```

The frontend optionally accepts `VITE_API_BASE_URL`; it defaults to
`http://localhost:5000/api/v1`. Use `http://localhost:5173` as `CLIENT_URL` for
the default Vite origin. In non-production development only, the backend also
allows the corresponding `localhost`/`127.0.0.1` loopback alias.

### Run the backend

From the backend project directory:

```powershell
npm install
npm run dev
```

The API listens on port `5000` by default. Health check:

```text
GET http://localhost:5000/api/v1/health
```

### Run the frontend

In another terminal:

```powershell
Set-Location .\stockpilot-frontend
npm install
npm run dev
```

Vite listens on port `5173`.

## Authentication and profile API

All endpoints use the `/api/v1` prefix. Access-token-protected endpoints accept
`Authorization: Bearer <access-token>`; refresh tokens are handled with the
httpOnly cookie.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Create an account and send email verification |
| `POST` | `/api/v1/auth/verify-email` | Public | Verify an email with its one-time token |
| `POST` | `/api/v1/auth/resend-verification` | Public | Request another verification email |
| `POST` | `/api/v1/auth/login` | Public | Sign in and issue access/refresh credentials |
| `POST` | `/api/v1/auth/refresh-token` | Cookie | Rotate refresh credentials |
| `POST` | `/api/v1/auth/logout` | JWT | Revoke the current refresh session |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request a password reset link |
| `POST` | `/api/v1/auth/reset-password` | Public | Consume a one-time reset token |
| `GET` | `/api/v1/auth/me` | JWT | Read the authenticated user |
| `GET`, `PUT` | `/api/v1/profile/me` | JWT | Read or update profile details |
| `PUT` | `/api/v1/profile/me/password` | JWT | Change the authenticated user's password |

## Investing API

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/market/stocks?currency=INR&search=...` | Public | Sample quotes and market context |
| `GET` | `/api/v1/market/stocks/:symbol` | Public | Lookup by canonical symbol or NSE/BSE alias |
| `GET` | `/api/v1/market/status` | Public | Mock Indian session/calendar status |
| `GET`, `POST` | `/api/v1/watchlist` | JWT | Read or add a symbol |
| `DELETE` | `/api/v1/watchlist/:symbol` | JWT | Remove a symbol |
| `GET` | `/api/v1/portfolio` | JWT | Paper balance, holdings, and valuation |
| `POST` | `/api/v1/portfolio/orders` | JWT | Simulated buy/sell |
| `GET` | `/api/v1/portfolio/trades` | JWT | Simulated order history |

All quote responses carry simulation metadata. Paper order bodies accept
canonical tickers and supported NSE/BSE aliases; the server chooses the quote
and calculates execution totals.

## Testing

Run the backend's full automated suite, including auth/reset, paper-investing,
Indian market/calendar, and frontend number/date formatting tests:

```powershell
npm test
```

Build the frontend for production:

```powershell
Set-Location .\stockpilot-frontend
npm run build
```

Automated auth email tests use mocked SMTP and reserved `.test` addresses.
Automated paper-trading tests use isolated in-memory persistence mocks; they do
not place real trades or modify real accounts.
