import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { resolveBusinessId } from "../utils/resolveBusinessId.js";
import * as notificationService from "../services/notification.service.js";

export const createNotification = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const notification = await notificationService.createNotificationForUser(businessId, req.body);
  res.status(201).json(new ApiResponse("Notification created.", { notification }));
});

export const getNotifications = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const { isRead, type, limit, page } = req.query;
  const notifications = await notificationService.getNotifications(businessId, req.user._id, {
    isRead,
    type,
    limit,
    page,
  });
  res.status(200).json(new ApiResponse("Notifications fetched.", { notifications }));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const result = await notificationService.getUnreadCount(businessId, req.user._id);
  res.status(200).json(new ApiResponse("Unread notification count fetched.", result));
});

export const markAsRead = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const notification = await notificationService.markAsRead(businessId, req.user._id, req.params.id);
  res.status(200).json(new ApiResponse("Notification marked as read.", { notification }));
});

export const markAsUnread = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const notification = await notificationService.markAsUnread(businessId, req.user._id, req.params.id);
  res.status(200).json(new ApiResponse("Notification marked as unread.", { notification }));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  await notificationService.deleteNotification(businessId, req.user._id, req.params.id);
  res.status(200).json(new ApiResponse("Notification deleted.", {}));
});
