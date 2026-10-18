import { NOTIFICATION_TYPES } from "../models/Notification.js";

export const validateCreateNotification = (body) => {
  const errors = [];
  const { recipient, type, title, message } = body;

  if (!recipient) {
    errors.push({ field: "recipient", message: "Recipient is required." });
  }
  if (!type || !NOTIFICATION_TYPES.includes(type)) {
    errors.push({ field: "type", message: `Type must be one of: ${NOTIFICATION_TYPES.join(", ")}.` });
  }
  if (!title || title.trim().length < 2) {
    errors.push({ field: "title", message: "Title must be at least 2 characters." });
  }
  if (!message || message.trim().length < 2) {
    errors.push({ field: "message", message: "Message must be at least 2 characters." });
  }

  return errors;
};
