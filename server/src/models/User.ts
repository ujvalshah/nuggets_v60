import mongoose, { Schema, Document } from 'mongoose';

// Nested schemas matching the modular User interface from src/types/user.ts

export interface IUserAuth {
  email: string;
  emailVerified: boolean;
  provider: 'email' | 'google' | 'linkedin';
  createdAt: string; // ISO Date
  updatedAt?: string; // ISO Date
}

export interface IUserProfile {
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  avatarColor?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'teal' | 'indigo' | 'slate';
  phoneNumber?: string;
  location?: string;
  pincode?: string;
  city?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
  website?: string;
  title?: string;
  company?: string;
  twitter?: string;
  linkedin?: string;
}

export interface IUserSecurity {
  lastPasswordChangeAt?: string; // ISO Date
  mfaEnabled: boolean;
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultVisibility: 'public' | 'private';
  interestedCategories: string[];
  compactMode: boolean;
  richMediaPreviews: boolean;
  autoFollowCollections: boolean;
  notifications: {
    emailDigest: boolean;
    productUpdates: boolean;
    newFollowers: boolean;
  };
}

export interface IUserAppState {
  lastLoginAt?: string;
  onboardingCompleted: boolean;
  featureFlags?: Record<string, boolean>;
}

export interface IUser extends Document {
  role: 'admin' | 'user';
  password?: string; // Hashed password (not selected by default)
  auth: IUserAuth;
  profile: IUserProfile;
  security: IUserSecurity;
  preferences: IUserPreferences;
  appState: IUserAppState;
}

// Sub-schemas
const UserAuthSchema = new Schema<IUserAuth>({
  email: { type: String, required: true, unique: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  provider: { type: String, enum: ['email', 'google', 'linkedin'], default: 'email' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String }
}, { _id: false });

const UserProfileSchema = new Schema<IUserProfile>({
  displayName: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  bio: { type: String },
  avatarUrl: { type: String },
  avatarColor: { 
    type: String, 
    enum: ['blue', 'green', 'purple', 'amber', 'rose', 'teal', 'indigo', 'slate'],
    default: 'blue'
  },
  phoneNumber: { type: String },
  location: { type: String },
  pincode: { type: String },
  city: { type: String },
  country: { type: String },
  gender: { type: String },
  dateOfBirth: { type: String },
  website: { type: String },
  title: { type: String },
  company: { type: String },
  twitter: { type: String },
  linkedin: { type: String }
}, { _id: false });

const UserSecuritySchema = new Schema<IUserSecurity>({
  lastPasswordChangeAt: { type: String },
  mfaEnabled: { type: Boolean, default: false }
}, { _id: false });

const UserPreferencesSchema = new Schema<IUserPreferences>({
  theme: { 
    type: String, 
    enum: ['light', 'dark', 'system'], 
    default: 'system' 
  },
  defaultVisibility: { 
    type: String, 
    enum: ['public', 'private'], 
    default: 'public' 
  },
  interestedCategories: { type: [String], default: [] },
  compactMode: { type: Boolean, default: false },
  richMediaPreviews: { type: Boolean, default: true },
  autoFollowCollections: { type: Boolean, default: true },
  notifications: {
    emailDigest: { type: Boolean, default: true },
    productUpdates: { type: Boolean, default: false },
    newFollowers: { type: Boolean, default: true }
  }
}, { _id: false });

const UserAppStateSchema = new Schema<IUserAppState>({
  lastLoginAt: { type: String },
  onboardingCompleted: { type: Boolean, default: false },
  featureFlags: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

// Main User schema
const UserSchema = new Schema<IUser>({
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  password: { 
    type: String, 
    select: false // Don't include password in queries by default
  },
  auth: { type: UserAuthSchema, required: true },
  profile: { type: UserProfileSchema, required: true },
  security: { type: UserSecuritySchema, required: true },
  preferences: { type: UserPreferencesSchema, required: true },
  appState: { type: UserAppStateSchema, required: true }
}, {
  timestamps: true // Auto-manage createdAt / updatedAt
});

// Note: Indexes are automatically created by the 'unique: true' constraints
// on auth.email and profile.username fields above, so no explicit indexes needed here

export const User = mongoose.model<IUser>('User', UserSchema);




