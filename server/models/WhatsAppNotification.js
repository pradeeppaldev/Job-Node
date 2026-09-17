import mongoose from "mongoose";

const whatsAppNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    matchScore: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    messageId: {
      type: String,
      default: '',
    },
    metaMessageId: {
      type: String,
      default: '',
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    statusUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    errorCode: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate notifications for the same user and job
whatsAppNotificationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const WhatsAppNotification = mongoose.model(
  'WhatsAppNotification',
  whatsAppNotificationSchema
);

export default WhatsAppNotification;
