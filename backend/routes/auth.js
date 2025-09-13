import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../db/schema.js';
import { verifyEmailDeliverability } from '../services/emailValidator.js';

const router = express.Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    const existing = await UserModel.findOne({ email }).lean();
    if (existing) return res.status(400).json({ message: 'User already exists' });

    // Deliverability check for email
    const check = await verifyEmailDeliverability(email);
    if (!check.valid) {
      return res.status(400).json({ message: `Email not deliverable: ${check.reason || 'unknown'}` });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ email, password: hashed, name });

    req.session.user = { id: user._id.toString(), email: user.email, name: user.name, theme: user.theme };
    res.status(201).json({
      message: 'User created successfully',
      user: req.session.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    req.session.user = { id: user._id.toString(), email: user.email, name: user.name, theme: user.theme };
    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ message: 'Logged out' });
  });
});

export default router;













