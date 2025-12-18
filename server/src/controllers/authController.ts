import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { normalizeDoc } from '../utils/db.js';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Helper function to format validation errors into user-friendly messages
function formatValidationErrors(errors: z.ZodError['errors']): string {
  const errorMessages: string[] = [];
  
  errors.forEach((error) => {
    const field = error.path.join('.');
    let message = error.message;
    
    // Customize messages for password field
    if (field === 'password') {
      if (error.code === 'too_small') {
        message = 'Password must be at least 8 characters long';
      } else if (error.message.includes('uppercase')) {
        message = 'Password must contain at least one uppercase letter (A-Z)';
      } else if (error.message.includes('lowercase')) {
        message = 'Password must contain at least one lowercase letter (a-z)';
      } else if (error.message.includes('number')) {
        message = 'Password must contain at least one number (0-9)';
      } else if (error.message.includes('special')) {
        message = 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)';
      }
    }
    
    // Format field names to be more readable
    const fieldName = field === 'fullName' ? 'Full name' :
                     field === 'phoneNumber' ? 'Phone number' :
                     field.charAt(0).toUpperCase() + field.slice(1);
    
    errorMessages.push(`${fieldName}: ${message}`);
  });
  
  return errorMessages.join('. ');
}

const signupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').transform(val => val.toLowerCase().trim()),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  pincode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  gender: z.string().optional(),
  phoneNumber: z.string().optional()
});

/**
 * Generate JWT token for user
 */
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedMessage = formatValidationErrors(validationResult.error.errors);
      return res.status(400).json({ 
        message: formattedMessage || 'Validation failed. Please check your input and try again.',
        errors: validationResult.error.errors 
      });
    }

    const { email, password } = validationResult.data;

    // Find user by email (password field is excluded by default, so we need to select it)
    const user = await User.findOne({ 'auth.email': email.toLowerCase() })
      .select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password (if user has one - social auth users may not)
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    } else {
      // User exists but has no password (social auth only)
      return res.status(401).json({ 
        message: 'This account was created with social login. Please use social login to continue.' 
      });
    }

    // Update last login time
    user.appState.lastLoginAt = new Date().toISOString();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user data (without password) and token
    const userData = normalizeDoc(user);
    res.json({ user: userData, token });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/signup
 * Create new user account
 */
export const signup = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedMessage = formatValidationErrors(validationResult.error.errors);
      return res.status(400).json({ 
        message: formattedMessage || 'Validation failed. Please check your input and try again.',
        errors: validationResult.error.errors 
      });
    }

    const data = validationResult.data;
    const now = new Date().toISOString();

    // Check if email already exists (exclude soft-deleted users if any)
    const existingUser = await User.findOne({ 
      'auth.email': data.email.toLowerCase() 
    });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Email already registered',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Check if username already exists (case-insensitive)
    // Username is normalized by schema transform, but we normalize here for consistency
    const normalizedUsername = data.username.toLowerCase().trim();
    const existingUsername = await User.findOne({ 
      'profile.username': normalizedUsername
    });
    if (existingUsername) {
      return res.status(409).json({ 
        message: 'Username already taken',
        code: 'USERNAME_ALREADY_EXISTS'
      });
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Create new user with nested modular structure
    const newUser = new User({
      role: 'user',
      password: hashedPassword,
      auth: {
        email: data.email.toLowerCase(),
        emailVerified: false,
        provider: 'email',
        createdAt: now,
        updatedAt: now
      },
      profile: {
        displayName: data.fullName,
        username: normalizedUsername, // Already normalized above
        avatarColor: 'blue',
        phoneNumber: data.phoneNumber,
        pincode: data.pincode,
        city: data.city,
        country: data.country,
        gender: data.gender
      },
      security: {
        mfaEnabled: false
      },
      preferences: {
        theme: 'system',
        defaultVisibility: 'public',
        interestedCategories: [],
        compactMode: false,
        richMediaPreviews: true,
        autoFollowCollections: true,
        notifications: {
          emailDigest: true,
          productUpdates: false,
          newFollowers: true
        }
      },
      appState: {
        onboardingCompleted: false
      }
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id.toString());

    // Return user data (without password) and token
    const userData = normalizeDoc(newUser);
    res.status(201).json({ user: userData, token });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error);
    
    // Handle duplicate key error (MongoDB unique constraint)
    // This catches race conditions where another request created the user between our checks
    if (error.code === 11000) {
      const keyPattern = error.keyPattern || {};
      let field: 'email' | 'username' = 'email';
      let code = 'EMAIL_ALREADY_EXISTS';
      let message = 'Email already registered';
      
      // Check for email duplicate
      if (keyPattern['auth.email']) {
        field = 'email';
        code = 'EMAIL_ALREADY_EXISTS';
        message = 'Email already registered';
      } 
      // Check for username duplicate (correct key pattern)
      else if (keyPattern['profile.username']) {
        field = 'username';
        code = 'USERNAME_ALREADY_EXISTS';
        message = 'Username already taken';
      }
      
      return res.status(409).json({ 
        message,
        code
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/auth/me
 * Get current user from token (requires authentication middleware)
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    // This assumes req.user is set by authentication middleware
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = normalizeDoc(user);
    res.json(userData);
  } catch (error: any) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
