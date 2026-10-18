const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.errors?.map((error) => error.message).filter(Boolean).join(" ");
    throw new Error(detail || result.message || `Request failed (${response.status}).`);
  }
  return result.data || {};
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (input) => request("/auth/register", { method: "POST", body: input }),
  resendVerification: (email) =>
    request("/auth/resend-verification", { method: "POST", body: { email } }),
  refresh: () => request("/auth/refresh-token", { method: "POST", body: {} }),
  logout: (token) => request("/auth/logout", { method: "POST", token, body: {} }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, newPassword) =>
    request("/auth/reset-password", { method: "POST", body: { token, newPassword } }),
  verifyEmail: (token) => request("/auth/verify-email", { method: "POST", body: { token } }),
  profile: (token) => request("/profile/me", { token }),
  updateProfile: (token, profile) =>
    request("/profile/me", { method: "PUT", token, body: profile }),
  changePassword: (token, passwords) =>
    request("/profile/me/password", { method: "PUT", token, body: passwords }),
  stocks: (search = "", currency = "INR") => {
    const params = new URLSearchParams({ currency });
    if (search) params.set("search", search);
    return request(`/market/stocks?${params.toString()}`);
  },
  marketStatus: () => request("/market/status"),
  watchlist: (token) => request("/watchlist", { token }),
  addToWatchlist: (token, symbol) =>
    request("/watchlist", { method: "POST", token, body: { symbol } }),
  removeFromWatchlist: (token, symbol) =>
    request(`/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE", token }),
  portfolio: (token) => request("/portfolio", { token }),
  trades: (token) => request("/portfolio/trades?limit=50", { token }),
  placeOrder: (token, order) => request("/portfolio/orders", { method: "POST", token, body: order }),
};

export { API_BASE };
