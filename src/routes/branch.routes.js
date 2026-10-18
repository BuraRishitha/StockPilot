import { Router } from "express";
import * as branchController from "../controllers/branch.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ROLES } from "../models/User.js";
import {
  validateCreateBranch,
  validateUpdateBranch,
} from "../validators/branch.validator.js";

const router = Router();

router.use(protect);

router.get("/", branchController.getBranches);
router.get("/:id", branchController.getBranchById);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  validateRequest(validateCreateBranch),
  branchController.createBranch
);

router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  validateRequest(validateUpdateBranch),
  branchController.updateBranch
);

router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.BUSINESS_ADMIN),
  branchController.deleteBranch
);

export default router;
