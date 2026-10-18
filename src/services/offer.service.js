import { Offer } from "../models/Offer.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Branch } from "../models/Branch.js";
import { ApiError } from "../utils/ApiError.js";

const assertRefsBelongToBusiness = async (Model, ids, businessId, label) => {
  if (!ids || ids.length === 0) return;
  const count = await Model.countDocuments({ _id: { $in: ids }, business: businessId });
  if (count !== ids.length) {
    throw new ApiError(400, `One or more ${label} do not exist for this business.`);
  }
};

const assertOfferScopeIsValid = async (businessId, data) => {
  await assertRefsBelongToBusiness(Product, data.applicableProducts, businessId, "products");
  await assertRefsBelongToBusiness(Category, data.applicableCategories, businessId, "categories");
  await assertRefsBelongToBusiness(Branch, data.applicableBranches, businessId, "branches");
};

const OFFER_FIELDS = [
  "name",
  "description",
  "offerType",
  "value",
  "maxDiscountAmount",
  "buyQuantity",
  "getQuantity",
  "applicableProducts",
  "applicableCategories",
  "applicableBranches",
  "startDate",
  "endDate",
  "status",
];

export const createOffer = async (businessId, data, userId) => {
  await assertOfferScopeIsValid(businessId, data);

  const payload = { business: businessId, createdBy: userId };
  for (const field of OFFER_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }

  const offer = await Offer.create(payload);
  return offer;
};

export const getOffers = async (businessId, { status, offerType, activeOnly, product, branch } = {}) => {
  const filter = { business: businessId };
  if (status) filter.status = status;
  if (offerType) filter.offerType = offerType;
  if (product) filter.$or = [{ applicableProducts: product }, { applicableProducts: { $size: 0 } }];
  if (branch) {
    filter.$or = [...(filter.$or || []), { applicableBranches: branch }, { applicableBranches: { $size: 0 } }];
  }

  let offers = await Offer.find(filter)
    .populate("applicableProducts", "name sku")
    .populate("applicableCategories", "name")
    .populate("applicableBranches", "name branchCode")
    .sort({ startDate: -1 });

  if (activeOnly === "true" || activeOnly === true) {
    offers = offers.filter((offer) => offer.isCurrentlyValid);
  }

  return offers;
};

export const getOfferById = async (businessId, offerId) => {
  const offer = await Offer.findOne({ _id: offerId, business: businessId })
    .populate("applicableProducts", "name sku")
    .populate("applicableCategories", "name")
    .populate("applicableBranches", "name branchCode");

  if (!offer) {
    throw new ApiError(404, "Offer not found.");
  }
  return offer;
};

export const updateOffer = async (businessId, offerId, data) => {
  const offer = await Offer.findOne({ _id: offerId, business: businessId });
  if (!offer) {
    throw new ApiError(404, "Offer not found.");
  }

  await assertOfferScopeIsValid(businessId, {
    applicableProducts: data.applicableProducts,
    applicableCategories: data.applicableCategories,
    applicableBranches: data.applicableBranches,
  });

  for (const field of OFFER_FIELDS) {
    if (data[field] !== undefined) offer[field] = data[field];
  }

  await offer.save();
  return offer;
};

export const deleteOffer = async (businessId, offerId) => {
  const offer = await Offer.findOneAndDelete({ _id: offerId, business: businessId });
  if (!offer) {
    throw new ApiError(404, "Offer not found.");
  }
  return offer;
};
