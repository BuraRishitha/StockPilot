import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell,
  Check, ChevronDown, CircleHelp, Clock3, Command, Eye, EyeOff, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Star, TrendingUp, Wallet, X,
} from "lucide-react";
import { api } from "./api.js";
import { formatIndianDate, formatIndianDateTime, formatMoney } from "./formatting.js";
import { getDisplayName, getTimeGreeting, millisecondsUntilNextGreeting } from "./greetings.js";
import { buildPaperPortfolioHistory, getPortfolioChartPoints } from "./portfolioHistory.js";

const money = (value, currency = "INR", compact = false) =>
  formatMoney(value, currency, compact);

const percent = (value) => `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)}%`;
const currentPathname = () =>
  window.location.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [greeting, setGreeting] = useState(() => getTimeGreeting());
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [tradeStock, setTradeStock] = useState(null);
  const [tradeSide, setTradeSide] = useState("buy");
  const [busy, setBusy] = useState(false);
  const searchRequestId = useRef(0);

  useEffect(() => {
    let timeoutId;
    const updateAtNextBoundary = () => {
      setGreeting(getTimeGreeting());
      timeoutId = window.setTimeout(updateAtNextBoundary, millisecondsUntilNextGreeting());
    };

    timeoutId = window.setTimeout(updateAtNextBoundary, millisecondsUntilNextGreeting());
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const focusMarketSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = document.getElementById("market-search");
        if (input) {
          event.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", focusMarketSearch);
    return () => window.removeEventListener("keydown", focusMarketSearch);
  }, []);

  const refreshData = useCallback(async (activeToken) => {
    const [watchlistData, portfolioData, tradeData, profileData] = await Promise.all([
      api.watchlist(activeToken),
      api.portfolio(activeToken),
      api.trades(activeToken),
      api.profile(activeToken),
    ]);
    const marketData = await api.stocks("", portfolioData.portfolio?.currency || "INR");
    setStocks(marketData.stocks || []);
    setMarketStatus(marketData.marketStatus || null);
    setWatchlist(watchlistData.symbols || []);
    setPortfolio(portfolioData.portfolio);
    setTrades(tradeData.trades || []);
    setUser(profileData.user);
  }, []);

  useEffect(() => {
    const pathname = currentPathname();
    const verificationToken = new URLSearchParams(window.location.search).get("token");
    if (pathname === "/verify-email") {
      if (!verificationToken) {
        setError("Verification link is missing its token. Request a new verification email.");
        setAuthReady(true);
        return;
      }

      api.verifyEmail(verificationToken)
        .then(() => {
          setNotice("Email verified. You can now sign in.");
          window.history.replaceState({}, "", "/");
        })
        .catch((err) => setError(err.message))
        .finally(() => setAuthReady(true));
      return;
    }

    if (pathname === "/reset-password") {
      setAuthReady(true);
      return;
    }

    api.refresh()
      .then(async (data) => {
        setToken(data.accessToken);
        if (data.user) setUser(data.user);
        await refreshData(data.accessToken);
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, [refreshData]);

  const run = async (action, successMessage) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (email, password) => {
    await run(async () => {
      const data = await api.login(email, password);
      setToken(data.accessToken);
      setUser(data.user);
      await refreshData(data.accessToken);
    });
  };

  const handleRegister = async (input) => {
    await run(async () => {
      await api.register(input);
      setNotice("Account created. Check your email for a verification link before signing in.");
    });
  };

  const handleUpdateProfile = async (profile) =>
    run(async () => {
      const result = await api.updateProfile(token, profile);
      setUser(result.user);
    }, "Profile details updated.");

  const handleChangePassword = async (passwords) =>
    run(async () => {
      await api.changePassword(token, passwords);
      setToken("");
      setUser(null);
      setPortfolio(null);
      setWatchlist([]);
      setTrades([]);
    }, "Password changed. Please sign in again.");

  const handleLogout = async () => {
    await run(async () => {
      try { await api.logout(token); } finally {
        setToken("");
        setUser(null);
        setPortfolio(null);
        setWatchlist([]);
        setTrades([]);
      }
    }, "You have been signed out.");
  };

  const handleSearch = async (value) => {
    setSearch(value);
    const requestId = ++searchRequestId.current;
    setSearching(true);
    try {
      const result = await api.stocks(value, portfolio?.currency || "INR");
      if (requestId === searchRequestId.current) {
        setStocks(result.stocks || []);
        setError("");
      }
    } catch (err) {
      if (requestId === searchRequestId.current) setError(err.message);
    } finally {
      if (requestId === searchRequestId.current) setSearching(false);
    }
  };

  const toggleWatch = async (stock) => {
    await run(async () => {
      const inWatchlist = watchlist.some((item) => item.symbol === stock.symbol);
      const result = inWatchlist
        ? await api.removeFromWatchlist(token, stock.symbol)
        : await api.addToWatchlist(token, stock.symbol);
      setWatchlist(result.symbols || []);
    }, watchlist.some((item) => item.symbol === stock.symbol) ? "Removed from watchlist." : "Added to watchlist.");
  };

  const openTrade = (stock, side = "buy") => {
    setTradeStock(stock);
    setTradeSide(side);
    setError("");
  };

  const submitTrade = async (side, quantity) => {
    await run(async () => {
      await api.placeOrder(token, { symbol: tradeStock.symbol, side, quantity });
      await refreshData(token);
      setTradeStock(null);
    }, `${side === "buy" ? "Buy" : "Sell"} order completed in paper mode.`);
  };

  const filteredStocks = useMemo(() => {
    if (view === "Watchlist") return watchlist;
    return stocks;
  }, [stocks, view, watchlist]);

  if (!authReady) return <div className="loading-screen"><div className="brand-mark">S</div><span>Preparing your workspace…</span></div>;
  if (!token) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        setNotice={setNotice}
        setError={setError}
        notice={notice}
        error={error}
        busy={busy}
      />
    );
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Markets", icon: TrendingUp },
    { label: "Watchlist", icon: Star },
    { label: "Portfolio", icon: Wallet },
    { label: "Activity", icon: Activity },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>stock<span className="brand-light">pilot</span></span>
          <button className="icon-button close-menu" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="account-switcher">
          <div className="account-avatar">{(user?.fullName || "S").slice(0, 1).toUpperCase()}</div>
          <div className="account-copy"><strong>{user?.fullName || "Investor"}</strong><span>Personal account</span></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">MENU</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${view === label ? "active" : ""}`} onClick={() => { setView(label); setMobileMenu(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Activity" && <span className="nav-count">{trades.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="paper-card"><div className="paper-icon"><ShieldCheck size={17} /></div><div><strong>Paper mode</strong><span>Simulated trading only</span></div><span className="live-dot" /></div>
          <button className="nav-item" onClick={() => setView("Account")}><Settings2 size={18} /><span>Account settings</span></button>
          <button className="nav-item" onClick={handleLogout}><LogOut size={18} /><span>Sign out</span></button>
          <div className="sidebar-footer">© 2026 StockPilot <span>v1.0.0</span></div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{view}</strong></div>
          <div className="topbar-actions">
            <div className="market-status" title={marketStatus?.dataLabel}>
              <span className="live-dot" />
              {marketStatus
                ? `Mock NSE/BSE · ${marketStatus.status} · ${marketStatus.localTime} IST`
                : "Mock Indian market data"}
            </div>
            <button className="icon-button top-icon" aria-label="Notifications" onClick={() => setNotice("You’re all caught up.")}><Bell size={18} /><i /></button>
            <div className="top-avatar">{(user?.fullName || "S").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-wrap">
          {notice && <div className="notice-banner"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>}
          {error && <div className="error-banner">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={16} /></button></div>}

          {view === "Overview" && (
            <Overview
              user={user}
              greeting={greeting}
              portfolio={portfolio}
              stocks={stocks}
              watchlist={watchlist}
              trades={trades}
              onNavigate={setView}
              onTrade={openTrade}
              onWatch={toggleWatch}
            />
          )}
          {view === "Markets" && (
            <Markets
              stocks={filteredStocks}
              marketStatus={marketStatus}
              search={search}
              onSearch={handleSearch}
              searching={searching}
              watchlist={watchlist}
              onWatch={toggleWatch}
              onTrade={openTrade}
            />
          )}
          {view === "Watchlist" && (
            <Markets
              stocks={filteredStocks}
              marketStatus={marketStatus}
              search={search}
              onSearch={handleSearch}
              searching={searching}
              watchlist={watchlist}
              onWatch={toggleWatch}
              onTrade={openTrade}
              watchOnly
            />
          )}
          {view === "Portfolio" && <Portfolio portfolio={portfolio} onTrade={openTrade} onNavigate={setView} />}
          {view === "Activity" && <ActivityView trades={trades} />}
          {view === "Account" && (
            <AccountView
              user={user}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
              busy={busy}
            />
          )}
        </div>
        <footer className="app-footer"><span>Prices are simulated for demonstration. Not investment advice.</span><span>Secure session <ShieldCheck size={14} /></span></footer>
      </main>
      {tradeStock && <TradeModal stock={tradeStock} side={tradeSide} onClose={() => setTradeStock(null)} onSubmit={submitTrade} busy={busy} />}
    </div>
  );
}

function AuthScreen({ onLogin, onRegister, setNotice, setError, notice, error, busy }) {
  const [mode, setMode] = useState(
    currentPathname() === "/reset-password" || new URLSearchParams(window.location.search).has("token")
      ? "reset"
      : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const verificationToken = new URLSearchParams(window.location.search).get("token");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", businessName: "" });
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "forgot") {
      try {
        await api.forgotPassword(form.email);
        setNotice("If the account exists, a password reset link has been sent.");
      } catch (err) { setError(err.message); }
    } else if (mode === "reset") {
      if (!verificationToken) {
        setError("Reset link is missing its token. Request a new reset link.");
        return;
      }
      try {
        await api.resetPassword(verificationToken, form.password);
        window.history.replaceState({}, "", "/");
        setMode("login");
        setNotice("Password reset. Sign in with your new password.");
      } catch (err) { setError(err.message); }
    } else if (mode === "register") {
      await onRegister({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        businessName: form.businessName,
      });
    } else {
      await onLogin(form.email, form.password);
    }
  };

  const resendVerification = async () => {
    const email = form.email.trim();
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    setResending(true);
    try {
      await api.resendVerification(email);
      setNotice("If an unverified account exists for that address, a verification email has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const heading = mode === "register" ? "Start your paper portfolio" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Invest with clarity.";
  const description = mode === "register"
    ? "Create your StockPilot account. No brokerage connection or real-money trading."
    : mode === "forgot"
      ? "Enter your account email and we’ll send a secure reset link if it exists."
      : mode === "reset"
        ? "Set a new password for your account."
        : "Your markets, watchlist, and paper portfolio — all in one place.";

  return (
    <div className="auth-page">
      <div className="auth-brand"><div className="brand-mark">S</div><span>stock<span className="brand-light">pilot</span></span></div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="eyebrow"><Sparkles size={15} /> PAPER INVESTING, REIMAGINED</div>
          <h1>Make your next<br />move a <span>smart one.</span></h1>
          <p>Explore sample market data, build a watchlist, and practice with a simulated portfolio — without putting real money at risk.</p>
          <div className="auth-mini-chart"><div className="chart-line"><svg viewBox="0 0 520 145" preserveAspectRatio="none"><defs><linearGradient id="authGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#65dc9c" stopOpacity=".27" /><stop offset="100%" stopColor="#65dc9c" stopOpacity="0" /></linearGradient></defs><path d="M0 116 C38 106 44 78 77 88 S121 116 152 87 S193 69 225 80 S266 54 296 67 S344 91 371 54 S420 59 446 28 S486 42 520 12 L520 145 L0 145 Z" fill="url(#authGradient)" /><path d="M0 116 C38 106 44 78 77 88 S121 116 152 87 S193 69 225 80 S266 54 296 67 S344 91 371 54 S420 59 446 28 S486 42 520 12" fill="none" stroke="#66dfa0" strokeWidth="3" /></svg></div><span>Practice without pressure</span></div>
          <div className="auth-proof"><div className="proof-avatars"><i>A</i><i>M</i><i>J</i></div><span>A calmer way to learn the market</span></div>
        </section>
        <section className="auth-card">
          <div className="auth-card-heading"><h2>{heading}</h2><p>{description}</p></div>
          {notice && <div className="notice-banner"><Check size={16} />{notice}</div>}
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && <>
              <label>Full name<input required minLength="2" maxLength="100" autoComplete="name" value={form.fullName} onChange={change("fullName")} placeholder="Alex Morgan" /></label>
              <label>Business name<input required minLength="2" maxLength="100" value={form.businessName} onChange={change("businessName")} placeholder="Morgan Investments" /></label>
              <label>Phone number<input required type="tel" autoComplete="tel" value={form.phone} onChange={change("phone")} placeholder="+91 98765 43210" /></label>
            </>}
            {mode !== "reset" && <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={change("email")} placeholder="you@example.com" /></label>}
            {(mode === "login" || mode === "register" || mode === "reset") && <label>{mode === "reset" ? "New password" : "Password"}<div className="password-field"><input required type={showPassword ? "text" : "password"} minLength="8" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={change("password")} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
            {mode === "login" && <button type="button" className="forgot-link" onClick={() => setMode("forgot")}>Forgot password?</button>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Reset password"}<ArrowRight size={17} /></button>
          </form>
          {mode === "login" && <button type="button" className="back-login" onClick={resendVerification} disabled={resending}>{resending ? "Sending…" : "Resend verification email"}</button>}
          {mode === "login" || mode === "register" ? <p className="auth-switch">{mode === "login" ? "New to StockPilot?" : "Already have an account?"}<button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Sign in"}</button></p> : <button className="back-login" onClick={() => { setMode("login"); setNotice(""); setError(""); }}><ArrowLeftRight size={15} /> Back to sign in</button>}
          <div className="auth-security"><ShieldCheck size={15} /> Encrypted sessions · Simulated trades only</div>
        </section>
      </div>
      <div className="auth-bottom"><span>© 2026 StockPilot</span><span>Sample market data · No financial advice</span></div>
    </div>
  );
}

function Overview({ user, greeting, portfolio, stocks, watchlist, trades, onNavigate, onTrade, onWatch }) {
  const featured = stocks.slice(0, 5);
  const name = getDisplayName(user);
  const currency = portfolio?.currency || "INR";
  const hasCompleteOrderHistory = trades.length < 50;
  const history = hasCompleteOrderHistory
    ? buildPaperPortfolioHistory(trades, portfolio?.startingCash)
    : [];
  return <>
    <div className="welcome-row"><div><div className="eyebrow light-eyebrow"><span className="live-dot" /> YOUR PAPER ACCOUNT</div><h1>{greeting}, {name}<span className="wave">✦</span></h1><p>Here’s what’s happening in your investing workspace today.</p></div><button className="button button-dark" onClick={() => onNavigate("Markets")}><Search size={16} /> Explore markets</button></div>
    <div className="stats-grid">
      <StatCard label="Total portfolio value" value={money(portfolio?.totalValue, currency)} change={portfolio?.totalProfitLoss} currency={currency} icon={Wallet} accent />
      <StatCard label="Invested" value={money(portfolio?.investedValue, currency)} detail={`${portfolio?.positions?.length || 0} open positions`} currency={currency} icon={TrendingUp} />
      <StatCard label="Available cash" value={money(portfolio?.cashBalance, currency)} detail="Paper funds" currency={currency} icon={Command} />
      <StatCard label="Watchlist" value={String(watchlist.length).padStart(2, "0")} detail="Symbols tracked" icon={Eye} />
    </div>
    <section className="content-grid overview-grid">
      <div className="panel portfolio-panel">
        <div className="panel-heading"><div><h2>Portfolio performance</h2><p>{history.length ? "Order snapshots from paper trades · holdings marked at last execution price" : "Illustrative mock trend · not account history"}</p></div><span className="sim-tag"><span className="live-dot" /> SIMULATED</span></div>
        <div className="portfolio-total">{money(portfolio?.totalValue, currency)}<span className={(portfolio?.totalProfitLoss || 0) >= 0 ? "positive" : "negative"}>{(portfolio?.totalProfitLoss || 0) >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{money(Math.abs(portfolio?.totalProfitLoss || 0), currency)} total P/L</span></div>
        <PortfolioChart history={history} hasCompleteOrderHistory={hasCompleteOrderHistory} />
        {history.length > 0 && <div className="chart-caption"><span>{formatIndianDate(history[0].createdAt)} · Starting balance</span><span>{formatIndianDate(history.at(-1).createdAt)} · Latest order snapshot</span></div>}
      </div>
      <div className="panel watch-panel">
        <div className="panel-heading"><div><h2>Your watchlist</h2><p>Keep an eye on your picks</p></div><button className="text-button" onClick={() => onNavigate("Watchlist")}>View all <ArrowRight size={14} /></button></div>
        {watchlist.length ? <div className="watch-list">{watchlist.slice(0, 5).map((stock) => <StockRow key={stock.symbol} stock={stock} onTrade={onTrade} onWatch={onWatch} watched />)}</div> : <EmptyState title="Your list is ready" text="Add stocks from Markets to track them here." action="Browse markets" onClick={() => onNavigate("Markets")} />}
      </div>
    </section>
    <section className="panel market-panel">
      <div className="panel-heading"><div><h2>Market highlights</h2><p>Indian equities & indices · mock data</p></div><button className="text-button" onClick={() => onNavigate("Markets")}>Explore markets <ArrowRight size={14} /></button></div>
      <div className="market-table-wrap"><table className="market-table"><thead><tr><th>Asset</th><th>Price</th><th>24h change</th><th>Exchange</th><th>Watch</th><th></th></tr></thead><tbody>{featured.map((stock) => <MarketRow key={stock.symbol} stock={stock} watched={watchlist.some((item) => item.symbol === stock.symbol)} onWatch={onWatch} onTrade={onTrade} />)}</tbody></table></div>
    </section>
    <section className="panel activity-panel">
      <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest paper trades</p></div><button className="text-button" onClick={() => onNavigate("Activity")}>View activity <ArrowRight size={14} /></button></div>
      {trades.length ? <div className="activity-list">{trades.slice(0, 4).map((trade) => <TradeRow trade={trade} key={trade._id} />)}</div> : <EmptyState title="No trades yet" text="Your paper trade history will show up here." action="Explore markets" onClick={() => onNavigate("Markets")} />}
    </section>
  </>;
}

function StatCard({ label, value, change, detail, currency = "INR", icon: Icon, accent }) {
  return <div className={`stat-card ${accent ? "stat-accent" : ""}`}><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17} /></div></div><strong>{value || money(0, currency)}</strong><div className="stat-foot">{change !== undefined ? <span className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{money(Math.abs(change), currency)} overall</span> : <span>{detail}</span>}</div></div>;
}

function PortfolioChart({ history, hasCompleteOrderHistory }) {
  const demoPoints = "0,112 35,104 70,109 105,82 140,93 175,69 210,76 245,60 280,69 315,42 350,55 385,36 420,47 455,18 490,29 520,10";
  const points = history.length
    ? getPortfolioChartPoints(history)
    : demoPoints;
  const pointPairs = points.split(" ").map((point) => point.split(",").map(Number));
  const fillPoints = `0,135 ${points} 520,135`;
  const description = history.length
    ? `Paper portfolio order-time snapshots across ${history.length - 1} recorded orders.`
    : "Illustrative simulated portfolio trend, not account history.";
  return (
    <div className="performance-chart">
      <div className="chart-grid"><i /><i /><i /><i /></div>
      <svg viewBox="0 0 520 135" preserveAspectRatio="none" role="img" aria-label={description}>
        <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#21b872" stopOpacity=".16" /><stop offset="100%" stopColor="#21b872" stopOpacity="0" /></linearGradient></defs>
        <polygon points={fillPoints} fill="url(#chartFill)" />
        <polyline points={points} fill="none" stroke="#23af70" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {history.length > 0 && <circle cx={pointPairs.at(-1)[0]} cy={pointPairs.at(-1)[1]} r="4" fill="#fff" stroke="#23af70" strokeWidth="2.5" />}
      </svg>
      {!history.length && <span className="chart-demo-label">{hasCompleteOrderHistory ? "Demo trend" : "Visible order window may be incomplete"}</span>}
    </div>
  );
}

function Markets({ stocks, marketStatus, search, onSearch, searching, watchlist, onWatch, onTrade, watchOnly }) {
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const visibleStocks = stocks.filter((stock) =>
    exchangeFilter === "all" || Object.hasOwn(stock.exchangeIdentifiers || {}, exchangeFilter)
  );
  return <>
    <div className="page-heading"><div><div className="eyebrow light-eyebrow"><span className="live-dot" /> SIMULATED MARKET</div><h1>{watchOnly ? "Your watchlist" : "Explore markets"}</h1><p>{watchOnly ? "A focused view of the symbols you follow." : "Browse sample quotes and practice your next move."}</p></div><span className="sim-tag"><ShieldCheck size={14} /> PAPER MODE</span></div>
    {marketStatus && <div className="market-session" role="status">
      <strong>Mock NSE/BSE status: {marketStatus.status}</strong>
      <span>{formatIndianDate(new Date(`${marketStatus.localDate}T00:00:00+05:30`))} · {marketStatus.localTime} IST · Regular session {marketStatus.session.open}–{marketStatus.session.close}</span>
      <span>{marketStatus.reason} {marketStatus.holidayCalendarLabel}; exchange status is not verified.</span>
    </div>}
    <div className="market-toolbar"><label className="search-field"><Search size={17} /><input id="market-search" aria-label="Search markets by company or ticker" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by company or ticker…" /><kbd>Ctrl/⌘ K</kbd></label><label className="filter-button exchange-filter"><SlidersHorizontal size={16} /><span className="sr-only">Filter by exchange</span><select aria-label="Filter by exchange" value={exchangeFilter} onChange={(event) => setExchangeFilter(event.target.value)}><option value="all">All exchanges</option><option value="NSE">NSE</option><option value="BSE">BSE</option></select></label></div>
    <div className="panel full-market-panel">
      <div className="table-caption"><span>{watchOnly ? `${visibleStocks.length} symbols` : "Indian equities & market indices"}</span><span>{searching ? "Searching…" : "Illustrative mock quotes · not live market data"}</span></div>
      {visibleStocks.length ? <div className="market-table-wrap"><table className="market-table"><thead><tr><th>Asset</th><th>Last price</th><th>Change</th><th>Previous close</th><th>Exchange</th><th></th><th></th></tr></thead><tbody>{visibleStocks.map((stock) => <MarketRow key={stock.symbol} stock={stock} watched={watchlist.some((item) => item.symbol === stock.symbol)} onWatch={onWatch} onTrade={onTrade} />)}</tbody></table></div> : <EmptyState title={watchOnly && !stocks.length ? "Nothing on your watchlist yet" : "No matches found"} text={watchOnly && !stocks.length ? "Star a symbol in Markets to save it here." : "Try another company name or ticker, or select another exchange."} />}
    </div>
    <p className="disclaimer"><CircleHelp size={15} /> Sample data only. Values are fixed examples and do not represent current exchange prices.</p>
  </>;
}

function MarketRow({ stock, watched, onWatch, onTrade }) {
  const positive = stock.change >= 0;
  const identifiers = Object.entries(stock.exchangeIdentifiers || {});
  return <tr><td><div className="asset-cell"><div className={`asset-logo logo-${stock.symbol.slice(0, 1).toLowerCase()}`}>{stock.symbol.slice(0, 1)}</div><div><strong>{stock.symbol}</strong><span>{stock.name}</span>{identifiers.length > 1 && <small className="exchange-identifiers">{identifiers.map(([exchange, symbol]) => `${exchange}:${symbol}`).join(" · ")}</small>}</div></div></td><td className="price-cell">{money(stock.price, stock.currency)}</td><td><span className={`change-pill ${positive ? "gain" : "loss"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{percent(stock.changePercent)}</span></td><td className="muted-cell">{money(stock.previousClose, stock.currency)}</td><td className="muted-cell">{identifiers.map(([exchange]) => exchange).join(" · ")}</td><td><button className={`star-button ${watched ? "starred" : ""}`} onClick={() => onWatch(stock)} aria-label={watched ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}><Star size={17} fill={watched ? "currentColor" : "none"} /></button></td><td>{stock.tradable ? <button className="button button-small button-outline" onClick={() => onTrade(stock, "buy")}>Trade</button> : <span className="index-label">Index</span>}</td></tr>;
}

function StockRow({ stock, onTrade, onWatch, watched }) {
  return <div className="watch-row"><div className={`asset-logo logo-${stock.symbol.slice(0, 1).toLowerCase()}`}>{stock.symbol.slice(0, 1)}</div><div className="watch-name"><strong>{stock.symbol}</strong><span>{stock.name}</span></div><div className="watch-price"><strong>{money(stock.price, stock.currency)}</strong><span className={stock.change >= 0 ? "positive" : "negative"}>{percent(stock.changePercent)}</span></div><button className={`star-button ${watched ? "starred" : ""}`} onClick={() => onWatch(stock)} aria-label="Remove from watchlist"><Star size={16} fill="currentColor" /></button>{stock.tradable ? <button className="icon-trade" onClick={() => onTrade(stock, "buy")} aria-label={`Trade ${stock.symbol}`}><ArrowRight size={16} /></button> : <span className="index-label">Index</span>}</div>;
}

function Portfolio({ portfolio, onTrade, onNavigate }) {
  const currency = portfolio?.currency || "INR";
  return <>
    <div className="page-heading"><div><div className="eyebrow light-eyebrow">PAPER ACCOUNT</div><h1>Your portfolio</h1><p>Practice investing with a simulated balance. No real orders are sent.</p></div><span className="sim-tag"><ShieldCheck size={14} /> PAPER MODE</span></div>
    <div className="stats-grid portfolio-stats"><StatCard label="Total account value" value={money(portfolio?.totalValue, currency)} change={portfolio?.totalProfitLoss} currency={currency} icon={Wallet} accent /><StatCard label="Cash available" value={money(portfolio?.cashBalance, currency)} detail="Ready for paper orders" currency={currency} icon={Command} /><StatCard label="Invested value" value={money(portfolio?.investedValue, currency)} detail={`${portfolio?.positions?.length || 0} positions`} currency={currency} icon={TrendingUp} /></div>
    <section className="panel">
      <div className="panel-heading"><div><h2>Positions</h2><p>Your current simulated holdings</p></div></div>
      {portfolio?.positions?.length ? <div className="market-table-wrap"><table className="market-table"><thead><tr><th>Asset</th><th>Shares</th><th>Avg. cost</th><th>Current price</th><th>Market value</th><th>Unrealized P/L</th><th></th></tr></thead><tbody>{portfolio.positions.map((position) => <tr key={position.symbol}><td><div className="asset-cell"><div className="asset-logo">{position.symbol.slice(0, 1)}</div><div><strong>{position.symbol}</strong><span>Paper holding</span></div></div></td><td className="price-cell">{position.quantity}</td><td className="muted-cell">{money(position.averageCost, currency)}</td><td className="price-cell">{money(position.currentPrice, currency)}</td><td className="price-cell">{money(position.marketValue, currency)}</td><td className={position.unrealizedProfitLoss >= 0 ? "positive" : "negative"}>{money(position.unrealizedProfitLoss, currency)}</td><td><button className="button button-small button-outline" onClick={() => onTrade({ symbol: position.symbol, price: position.currentPrice, currency, tradable: true }, "sell")}>Sell</button></td></tr>)}</tbody></table></div> : <EmptyState title="Your portfolio starts here" text="Place a paper trade to add your first position." action="Browse markets" onClick={() => onNavigate("Markets")} />}
    </section>
    <p className="disclaimer"><CircleHelp size={15} /> Paper trading is simulated. Values and performance are not financial advice.</p>
  </>;
}

function ActivityView({ trades }) {
  return <>
    <div className="page-heading"><div><div className="eyebrow light-eyebrow">PAPER TRADE LOG</div><h1>Activity</h1><p>A record of your simulated orders.</p></div><span className="sim-tag"><Clock3 size={14} /> {trades.length} ORDERS</span></div>
    <section className="panel">
      <div className="panel-heading"><div><h2>Order history</h2><p>Most recent first</p></div></div>
      {trades.length ? <div className="activity-list full-activity">{trades.map((trade) => <TradeRow trade={trade} key={trade._id} />)}</div> : <EmptyState title="No activity yet" text="Your completed paper orders will appear here." />}
    </section>
  </>;
}

function TradeRow({ trade }) {
  const isBuy = trade.side === "buy";
  return <div className="activity-row"><div className={`activity-type ${isBuy ? "buy-type" : "sell-type"}`}>{isBuy ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}</div><div className="activity-info"><strong>{isBuy ? "Bought" : "Sold"} {trade.quantity} {trade.symbol}</strong><span>{formatIndianDateTime(trade.createdAt)} IST · Paper order</span></div><div className="activity-total"><strong>{money(trade.total, trade.currency)}</strong><span>{money(trade.executionPrice, trade.currency)} / share</span></div><span className={`side-badge ${isBuy ? "buy-badge" : "sell-badge"}`}>{trade.side}</span></div>;
}

function AccountView({ user, onLogout, onUpdateProfile, onChangePassword, busy }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setFullName(user?.fullName || "");
  }, [user?.fullName]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setFormError("");
    await onUpdateProfile({ fullName });
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setFormError("");
    if (newPassword !== confirmPassword) {
      setFormError("The new passwords do not match.");
      return;
    }
    const changed = await onChangePassword({ currentPassword, newPassword });
    if (changed) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return <>
    <div className="page-heading"><div><div className="eyebrow light-eyebrow">ACCOUNT</div><h1>Profile & security</h1><p>Manage your StockPilot account details.</p></div></div>
    <section className="panel account-panel"><div className="profile-large">{(user?.fullName || "S").slice(0, 1).toUpperCase()}</div><div className="profile-details"><h2>{user?.fullName}</h2><p>{user?.email}</p><span className="verified-label"><ShieldCheck size={14} />{user?.isEmailVerified ? "Email verified" : "Email not verified"}</span></div><button className="button button-outline" onClick={onLogout}><LogOut size={16} /> Sign out</button></section>
    <div className="account-settings-grid">
      <section className="panel account-settings-card">
        <div className="panel-heading"><div><h2>Personal details</h2><p>Update the name shown on your dashboard.</p></div></div>
        <form className="account-settings-form" onSubmit={saveProfile}>
          <label htmlFor="account-full-name">Display name</label>
          <input
            id="account-full-name"
            name="fullName"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <label htmlFor="account-email">Email address</label>
          <input id="account-email" value={user?.email || ""} readOnly aria-readonly="true" />
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>
      <section className="panel account-settings-card">
        <div className="panel-heading"><div><h2>Change password</h2><p>Use your current password to set a new one.</p></div></div>
        {formError && <div className="error-banner" role="alert">{formError}</div>}
        <form className="account-settings-form" onSubmit={savePassword}>
          <label htmlFor="account-current-password">Current password</label>
          <input
            id="account-current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <label htmlFor="account-new-password">New password</label>
          <input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <span className="account-form-hint">At least 8 characters, with uppercase, lowercase, number, and symbol.</span>
          <label htmlFor="account-confirm-password">Confirm new password</label>
          <input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Updating…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
    <div className="notice-banner account-note"><ShieldCheck size={16} /> Your session uses a short-lived access token and an httpOnly refresh cookie.</div>
  </>;
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><div className="empty-icon"><Sparkles size={19} /></div><strong>{title}</strong><p>{text}</p>{action && <button className="text-button" onClick={onClick}>{action}<ArrowRight size={14} /></button>}</div>;
}

function TradeModal({ stock, side, onClose, onSubmit, busy }) {
  const [orderSide, setOrderSide] = useState(side);
  const [quantity, setQuantity] = useState("1");
  const parsedQuantity = Number(quantity);
  const total = stock.price * (Number.isFinite(parsedQuantity) ? parsedQuantity : 0);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="trade-modal" role="dialog" aria-modal="true" aria-labelledby="trade-title"><div className="modal-heading"><div><span className="eyebrow">PAPER ORDER</span><h2 id="trade-title">{orderSide === "buy" ? "Buy" : "Sell"} {stock.symbol}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close order"><X size={18} /></button></div><div className="order-quote"><div><strong>{stock.symbol}</strong><span>{stock.name || "Sample market quote"}</span></div><strong>{money(stock.price, stock.currency)}<small> / share</small></strong></div><div className="trade-toggle"><button className={orderSide === "buy" ? "selected buy-selected" : ""} onClick={() => setOrderSide("buy")}>Buy</button><button className={orderSide === "sell" ? "selected sell-selected" : ""} onClick={() => setOrderSide("sell")}>Sell</button></div><label className="quantity-label">Number of shares<input type="number" min="0.000001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><div className="order-total"><span>Estimated total</span><strong>{money(total, stock.currency)}</strong></div><div className="paper-warning"><ShieldCheck size={16} /> This is a simulated paper trade. No real order will be placed.</div><button className={`button ${orderSide === "buy" ? "button-primary" : "button-danger"} modal-submit`} disabled={busy || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0} onClick={() => onSubmit(orderSide, parsedQuantity)}>{busy ? "Submitting…" : `Confirm ${orderSide}`}<ArrowRight size={16} /></button></section></div>;
}

export default App;
