import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyEmailDeliverability } from '../services/emailValidator.js';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.session.user.id).select('email name theme createdAt emailVerified');
    res.json({ id: user._id.toString(), email: user.email, name: user.name, theme: user.theme, createdAt: user.createdAt, emailVerified: user.emailVerified });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('theme').optional().isIn(['light', 'dark'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, theme } = req.body;

    // Check if email is already taken by another user and deliverable
    if (email) {
      const existing = await UserModel.findOne({ email }).lean();
      if (existing && existing._id.toString() !== req.session.user.id) return res.status(400).json({ message: 'Email already in use' });

      const check = await verifyEmailDeliverability(email);
      if (!check.valid) {
        return res.status(400).json({ message: `Email not deliverable: ${check.reason || 'unknown'}` });
      }
    }

    const updateSet = { ...(name !== undefined && { name }), ...(email !== undefined && { email }), ...(theme !== undefined && { theme }) };
    if (email !== undefined) {
      Object.assign(updateSet, { emailVerified: false, emailVerificationToken: undefined, emailVerificationExpires: undefined });
    }

    const updated = await UserModel.findByIdAndUpdate(
      req.session.user.id,
      { $set: updateSet },
      { new: true }
    ).select('email name theme emailVerified');

    req.session.user = { ...req.session.user, name: updated.name, email: updated.email, theme: updated.theme };
    res.json({ id: updated._id.toString(), email: updated.email, name: updated.name, theme: updated.theme, emailVerified: updated.emailVerified });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', requireAuth, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await UserModel.findById(req.session.user.id).select('password');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.findByIdAndUpdate(req.session.user.id, { $set: { password: hashedPassword } });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

// Send verification email
router.post('/verify-email', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.session.user.id).select('email name emailVerified');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await UserModel.findByIdAndUpdate(user._id, { $set: { emailVerificationToken: token, emailVerificationExpires: expires } });

    const baseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verifyUrl = `${baseUrl}/api/users/verify-email/confirm?token=${token}`;

    const sent = await sendVerificationEmail(user.email, user.name, verifyUrl);
    if (!sent.success) return res.status(500).json({ message: 'Failed to send verification email' });

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verify email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm verification
router.get('/verify-email/confirm', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const user = await UserModel.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gte: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const frontendBase = process.env.FRONTEND_BASE_URL;
    if (frontendBase) {
      const redirectTo = `${frontendBase.replace(/\/$/, '')}/settings?verified=1`;
      return res.redirect(302, redirectTo);
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Confirm verify email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
