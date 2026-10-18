import { Branch } from "../models/Branch.js";
import { User, ROLES } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { generateBranchCode } from "../utils/branchCodeGenerator.js";

const MAX_CODE_RETRIES = 5;

const resolveUniqueBranchCode = async (businessId) => {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt += 1) {
    const candidate = generateBranchCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Branch.findOne({ business: businessId, branchCode: candidate });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "Failed to generate a unique branch code. Please try again.");
};

const assertManagerIsValid = async (businessId, managerId) => {
  if (!managerId) return;
  const manager = await User.findOne({ _id: managerId, business: businessId });
  if (!manager) {
    throw new ApiError(400, "Manager does not exist for this business.");
  }
  if (![ROLES.BRANCH_MANAGER, ROLES.BUSINESS_ADMIN, ROLES.SUPER_ADMIN].includes(manager.role)) {
    throw new ApiError(400, "Assigned manager must have the Branch Manager (or Admin) role.");
  }
};

export const createBranch = async (businessId, data) => {
  await assertManagerIsValid(businessId, data.manager);
  const branchCode = await resolveUniqueBranchCode(businessId);

  try {
    const branch = await Branch.create({
      ...data,
      branchCode,
      business: businessId,
    });
    return branch;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A branch with this name already exists for this business.");
    }
    throw err;
  }
};

export const getBranches = async (businessId, { status, branchType, search } = {}) => {
  const filter = { business: businessId };
  if (status) filter.status = status;
  if (branchType) filter.branchType = branchType;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { branchCode: { $regex: search, $options: "i" } },
    ];
  }

  return Branch.find(filter).populate("manager", "fullName email").sort({ name: 1 });
};

export const getBranchById = async (businessId, branchId) => {
  const branch = await Branch.findOne({ _id: branchId, business: businessId }).populate(
    "manager",
    "fullName email"
  );
  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }
  return branch;
};

export const updateBranch = async (businessId, branchId, data) => {
  const branch = await Branch.findOne({ _id: branchId, business: businessId });
  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }

  if (data.manager !== undefined) {
    await assertManagerIsValid(businessId, data.manager);
  }

  const fields = [
    "name",
    "branchType",
    "manager",
    "address",
    "phone",
    "email",
    "businessHours",
    "status",
  ];
  for (const field of fields) {
    if (data[field] !== undefined) branch[field] = data[field];
  }

  try {
    await branch.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A branch with this name already exists for this business.");
    }
    throw err;
  }

  return branch;
};

export const deleteBranch = async (businessId, branchId) => {
  const branch = await Branch.findOneAndDelete({ _id: branchId, business: businessId });
  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }
  return branch;
};
