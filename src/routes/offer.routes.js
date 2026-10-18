import { Router } from "express";
import * as offerController from "../controllers/offer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateOffer,
  validateUpdateOffer,
} from "../validators/offer.validator.js";

const router = Router();
const MANAGE_ROLES = [ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN, ROLES.BRANCH_MANAGER];

router.use(protect);

router.get("/", offerController.getOffers);
router.get("/:id", offerController.getOfferById);

router.post(
  "/",
  authorize(...MANAGE_ROLES),
  validateRequest(validateCreateOffer),
  offerController.createOffer
);

router.put(
  "/:id",
  authorize(...MANAGE_ROLES),
  validateRequest(validateUpdateOffer),
  offerController.updateOffer
);

router.delete("/:id", authorize(...MANAGE_ROLES), offerController.deleteOffer);

export default router;
