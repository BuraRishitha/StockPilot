import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/overview", dashboardController.getOverview);
router.get("/low-stock-products", dashboardController.getLowStockProducts);
router.get("/recent-sales", dashboardController.getRecentSales);
router.get("/recent-purchase-orders", dashboardController.getRecentPurchaseOrders);
router.get("/top-selling-products", dashboardController.getTopSellingProducts);
router.get("/sales-summary", dashboardController.getSalesSummary);
router.get("/purchase-summary", dashboardController.getPurchaseSummary);
router.get("/inventory-summary", dashboardController.getInventorySummary);

export default router;
