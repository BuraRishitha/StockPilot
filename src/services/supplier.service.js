import { Supplier } from "../models/Supplier.js";
import { ApiError } from "../utils/ApiError.js";
import { generateSupplierCode } from "../utils/supplierCodeGenerator.js";

const MAX_CODE_RETRIES = 5;

const resolveUniqueSupplierCode = async (businessId) => {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt += 1) {
    const candidate = generateSupplierCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Supplier.findOne({ business: businessId, supplierCode: candidate });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "Failed to generate a unique supplier code. Please try again.");
};

const assertUniqueContact = async (businessId, { email, phone }, excludeId = null) => {
  if (email) {
    const existingEmail = await Supplier.findOne({
      business: businessId,
      email: email.toLowerCase(),
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (existingEmail) {
      throw new ApiError(409, "A supplier with this email already exists for this business.");
    }
  }
  if (phone) {
    const existingPhone = await Supplier.findOne({
      business: businessId,
      phone,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (existingPhone) {
      throw new ApiError(409, "A supplier with this phone number already exists for this business.");
    }
  }
};

export const createSupplier = async (businessId, data) => {
  await assertUniqueContact(businessId, data);
  const supplierCode = await resolveUniqueSupplierCode(businessId);

  try {
    const supplier = await Supplier.create({
      ...data,
      supplierCode,
      business: businessId,
    });
    return supplier;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A supplier with these details already exists for this business.");
    }
    throw err;
  }
};

export const getSuppliers = async (businessId, { status, search } = {}) => {
  const filter = { business: businessId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { supplierCode: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  return Supplier.find(filter).sort({ companyName: 1 });
};

export const getSupplierById = async (businessId, supplierId) => {
  const supplier = await Supplier.findOne({ _id: supplierId, business: businessId });
  if (!supplier) {
    throw new ApiError(404, "Supplier not found.");
  }
  return supplier;
};

export const updateSupplier = async (businessId, supplierId, data) => {
  const supplier = await getSupplierById(businessId, supplierId);

  await assertUniqueContact(
    businessId,
    {
      email: data.email !== undefined ? data.email : null,
      phone: data.phone !== undefined ? data.phone : null,
    },
    supplierId
  );

  const fields = [
    "companyName",
    "contactPerson",
    "email",
    "phone",
    "taxId",
    "address",
    "paymentTerms",
    "creditLimit",
    "status",
  ];
  for (const field of fields) {
    if (data[field] !== undefined) supplier[field] = data[field];
  }

  try {
    await supplier.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A supplier with these details already exists for this business.");
    }
    throw err;
  }

  return supplier;
};

export const deleteSupplier = async (businessId, supplierId) => {
  const supplier = await Supplier.findOneAndDelete({ _id: supplierId, business: businessId });
  if (!supplier) {
    throw new ApiError(404, "Supplier not found.");
  }
  return supplier;
};
