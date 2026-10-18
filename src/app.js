import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import businessSettingsRoutes from "./routes/businessSettings.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import branchInventoryRoutes from "./routes/branchInventory.routes.js";
import purchaseOrderRoutes from "./routes/purchaseOrder.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import offerRoutes from "./routes/offer.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { investingRouter, marketRouter } from "./routes/investing.routes.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

app.disable("x-powered-by");
const clientOrigin = new URL(env.clientUrl);
const allowedClientOrigins = new Set([clientOrigin.origin]);
if (env.nodeEnv !== "production" && ["localhost", "127.0.0.1"].includes(clientOrigin.hostname)) {
  clientOrigin.hostname = clientOrigin.hostname === "localhost" ? "127.0.0.1" : "localhost";
  allowedClientOrigins.add(clientOrigin.origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, env.clientUrl);
      return callback(null, allowedClientOrigins.has(origin) ? origin : false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- Module Routes ----
// All 15 modules from the master prompt are mounted below.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/business-settings", businessSettingsRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/branch-inventory", branchInventoryRoutes);
app.use("/api/v1/purchase-orders", purchaseOrderRoutes);
app.use("/api/v1/sales", saleRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/offers", offerRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/activity-logs", activityLogRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/market", marketRouter);
app.use("/api/v1", investingRouter);

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, message: "StockPilot API is running." });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
