import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as activityLogService from "../services/activityLog.service.js";

export const getActivityLogs = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { user, module, startDate, endDate, page, limit } = req.query;

  const result = await activityLogService.getActivityLogs(businessId, {
    user,
    module,
    startDate,
    endDate,
    page,
    limit,
  });

  res.status(200).json(new ApiResponse("Activity logs fetched.", result));
});
