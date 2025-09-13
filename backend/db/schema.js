import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const TaskSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'none'], default: 'medium' },
  isCompleted: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const TaskModel = mongoose.models.Task || mongoose.model('Task', TaskSchema);
