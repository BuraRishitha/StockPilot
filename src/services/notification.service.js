import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Reusable creator — intended to be called from other services (e.g.
 * Branch Inventory, Purchase Orders, Sales, Offers) once they're wired
 * to trigger notifications. Not yet invoked anywhere outside this module.
 */
export const createNotification = async (businessId, { recipient, type, title, message, referenceType = null, referenceId = null }) => {
  const notification = await Notification.create({
    business: businessId,
    recipient,
    type,
    title,
    message,
    referenceType,
    referenceId,
  });
  return notification;
};

export const createNotificationForUser = async (businessId, data) => {
  const user = await User.findOne({ _id: data.recipient, business: businessId });
  if (!user) {
    throw new ApiError(400, "Recipient does not exist for this business.");
  }
  return createNotification(businessId, data);
};

export const getNotifications = async (businessId, userId, { isRead, type, limit = 50, page = 1 } = {}) => {
  const filter = { business: businessId, recipient: userId };
  if (isRead === "true" || isRead === true) filter.isRead = true;
  if (isRead === "false" || isRead === false) filter.isRead = false;
  if (type) filter.type = type;

  const numericLimit = Math.min(Number(limit) || 50, 100);
  const numericPage = Math.max(Number(page) || 1, 1);

  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);
};

export const getUnreadCount = async (businessId, userId) => {
  const count = await Notification.countDocuments({
    business: businessId,
    recipient: userId,
    isRead: false,
  });
  return { unreadCount: count };
};

export const markAsRead = async (businessId, userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    business: businessId,
    recipient: userId,
  });
  if (!notification) throw new ApiError(404, "Notification not found.");

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

export const markAsUnread = async (businessId, userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    business: businessId,
    recipient: userId,
  });
  if (!notification) throw new ApiError(404, "Notification not found.");

  notification.isRead = false;
  notification.readAt = null;
  await notification.save();

  return notification;
};

export const deleteNotification = async (businessId, userId, notificationId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    business: businessId,
    recipient: userId,
  });
  if (!notification) throw new ApiError(404, "Notification not found.");

  return notification;
};
