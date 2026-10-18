import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as offerService from "../services/offer.service.js";

export const createOffer = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const offer = await offerService.createOffer(businessId, req.body, req.user._id);
  res.status(201).json(new ApiResponse("Offer created.", { offer }));
});

export const getOffers = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { status, offerType, activeOnly, product, branch } = req.query;
  const offers = await offerService.getOffers(businessId, { status, offerType, activeOnly, product, branch });
  res.status(200).json(new ApiResponse("Offers fetched.", { offers }));
});

export const getOfferById = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const offer = await offerService.getOfferById(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Offer fetched.", { offer }));
});

export const updateOffer = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const offer = await offerService.updateOffer(businessId, req.params.id, req.body);
  res.status(200).json(new ApiResponse("Offer updated.", { offer }));
});

export const deleteOffer = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await offerService.deleteOffer(businessId, req.params.id);
  res.status(200).json(new ApiResponse("Offer deleted.", {}));
});
