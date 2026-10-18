import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/sales", analyticsController.getSalesAnalytics);
router.get("/revenue", analyticsController.getRevenueAnalytics);
router.get("/purchases", analyticsController.getPurchaseAnalytics);
router.get("/inventory-value", analyticsController.getInventoryValueAnalytics);
router.get("/low-stock", analyticsController.getLowStockAnalytics);
router.get("/top-selling-products", analyticsController.getTopSellingProducts);
router.get("/top-performing-categories", analyticsController.getTopPerformingCategories);
router.get("/branch-sales-summary", analyticsController.getBranchSalesSummary);
router.get("/supplier-purchase-summary", analyticsController.getSupplierPurchaseSummary);

export default router;
