import { ActivityLog } from "../models/ActivityLog.js";

// ActivityLog.action is currently populated only by the Authentication
// module. This map lets ?module= filtering work today and simply grows
// as other modules start writing their own actions into the same
// collection, without requiring a schema change.
const MODULE_ACTION_MAP = {
  authentication: [
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "LOGOUT",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET_SUCCESS",
    "EMAIL_VERIFIED",
    "ACCOUNT_LOCKED",
    "TOKEN_REFRESHED",
  ],
};

export const getActivityLogs = async (
  businessId,
  { user, module, startDate, endDate, page = 1, limit = 25 } = {}
) => {
  const filter = { business: businessId };

  if (user) filter.user = user;

  if (module) {
    const key = String(module).toLowerCase();
    filter.action = { $in: MODULE_ACTION_MAP[key] || [] };
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const numericLimit = Math.min(Number(limit) || 25, 100);
  const numericPage = Math.max(Number(page) || 1, 1);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("user", "fullName email role")
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit),
    ActivityLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
};
