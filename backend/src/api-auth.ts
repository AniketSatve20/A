import express, { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory storage (replace with database in production)
const otpStorage = new Map<string, { code: string; expiresAt: number }>();
const users = new Map<string, any>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// Generate OTP - returns 6 digits
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get message to sign for wallet auth
router.get('/message', (req, res) => {
  const message = `Sign this message to authenticate with HumanWork:\n\nNonce: ${uuidv4()}\nTimestamp: ${Date.now()}`;
  res.json({ message });
});

// Send email OTP (new endpoint path)
router.post('/email/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const otp = generateOTP();
  otpStorage.set(email, {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // In production, send actual email
  console.log(`📧 OTP for ${email}: ${otp}`);

  res.json({ 
    success: true,
    message: 'OTP sent to your email',
    email,
    // For testing/development: include OTP
    _devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
  });
});

// Verify email OTP (new endpoint path)
router.post('/email/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }

  const storedOTP = otpStorage.get(email);

  if (!storedOTP) {
    return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
  }

  if (storedOTP.code !== otp.toString()) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  if (storedOTP.expiresAt < Date.now()) {
    otpStorage.delete(email);
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }

  otpStorage.delete(email);

  // Create user for email auth
  const user = {
    address: '', // Email-only login
    email,
    name: email.split('@')[0],
    verified: true,
    reputation: 0,
    totalProjects: 0,
    completedProjects: 0,
    skills: [],
    role: 'client' as const,
  };

  const token = jwt.sign(
    {
      email,
      iat: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({
    success: true,
    message: 'Email verified successfully',
    token,
    user,
  });
});

// Keep old endpoints for backward compatibility
// Send verification email (legacy)
router.post('/send-email', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const otp = generateOTP();
  otpStorage.set(email, {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });

  // In production, send actual email
  console.log(`📧 OTP for ${email}: ${otp}`);

  res.json({ message: 'OTP sent to email' });
});

// Verify email OTP (legacy)
router.post('/verify-email', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required' });
  }

  const storedOTP = otpStorage.get(email);

  if (!storedOTP) {
    return res.status(400).json({ error: 'No OTP found' });
  }

  if (storedOTP.code !== code) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  if (storedOTP.expiresAt < Date.now()) {
    otpStorage.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }

  otpStorage.delete(email);
  res.json({ message: 'Email verified' });
});

// Login with wallet signature
router.post('/login', (req, res) => {
  const { address, signature, message } = req.body;

  if (!address || !signature || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // In production, verify signature with ethers.js
  // For now, accept any signature

  let user = users.get(address);

  if (!user) {
    user = {
      address,
      email: null,
      name: `User ${address.slice(0, 6)}`,
      verified: false,
      reputation: 0,
      totalProjects: 0,
      completedProjects: 0,
      skills: [],
      role: 'freelancer',
      createdAt: new Date().toISOString(),
    };
    users.set(address, user);
  }

  const token = jwt.sign(
    {
      address,
      email: user.email,
      iat: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({
    token,
    user,
  });
});

// Refresh token
router.post('/refresh', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const newToken = jwt.sign(
      {
        address: decoded.address,
        email: decoded.email,
        iat: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as authApi };
