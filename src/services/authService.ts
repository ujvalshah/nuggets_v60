
import { User as LegacyUser } from '../types';
import { User as ModularUser } from '../types/user';
import { LoginPayload, SignupPayload, AuthProvider } from '../types/auth';
import { storageService } from './storageService';
import { createDefaultUser } from '../models/userDefaults';
import { adminConfigService } from '../admin/services/adminConfigService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Map Legacy Storage Data -> New Modular Schema
const mapLegacyToModular = (legacy: LegacyUser): ModularUser => {
  return createDefaultUser(legacy.id, legacy.email, {
    role: legacy.role,
    auth: {
      createdAt: legacy.joinedAt,
      emailVerified: legacy.emailVerified,
      provider: legacy.authProvider || 'email',
    },
    profile: {
      displayName: legacy.name,
      username: legacy.username || legacy.email.split('@')[0],
      phoneNumber: legacy.phoneNumber,
      avatarUrl: legacy.avatarUrl,
    },
    preferences: {
      interestedCategories: legacy.preferences?.interestedCategories || [],
    },
    appState: {
      lastLoginAt: legacy.lastFeedVisit
    }
  });
};

class AuthService {
  // Simulate backend latency
  private LATENCY = 800;

  async loginWithEmail(payload: LoginPayload): Promise<{ user: ModularUser; token: string }> {
    await delay(this.LATENCY);

    // Stub: Check against storageService users for MVP simulation
    const users = await storageService.getUsers();
    const legacyUser = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

    if (!legacyUser) {
      throw new Error("Invalid email or password");
    }

    const modularUser = mapLegacyToModular(legacyUser);

    return {
      user: modularUser,
      token: `fake-jwt-token-${legacyUser.id}-${Date.now()}`
    };
  }

  async signupWithEmail(payload: SignupPayload): Promise<{ user: ModularUser; token: string }> {
    await delay(this.LATENCY);

    const users = await storageService.getUsers();
    if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error("Email already registered");
    }

    if (users.some(u => u.username?.toLowerCase() === payload.username.toLowerCase())) {
        throw new Error("Username already taken");
    }

    // Check Feature Flag for Verification
    const flags = await adminConfigService.getFeatureFlags();
    const isVerificationEnabled = flags.enableEmailVerification;

    // Create new user in storage stub
    const newLegacyUser: LegacyUser = {
      id: `u-${Date.now()}`,
      name: payload.fullName, // Mapped from fullName
      username: payload.username,
      email: payload.email,
      role: 'user',
      status: 'active',
      joinedAt: new Date().toISOString(),
      authProvider: 'email',
      emailVerified: !isVerificationEnabled, // Auto-verify if disabled
      phoneNumber: payload.phoneNumber,
      preferences: { interestedCategories: [] },
      // Note: Legacy User type doesn't have city/country/gender yet, 
      // but in a real app, these would be stored in the extended profile table.
      // For this mock adapter, we'll lose them on page refresh unless added to User type,
      // but the AuthContext will have them temporarily in modularUser below.
    };

    // Create Modular User (richer model)
    const modularUser = createDefaultUser(newLegacyUser.id, newLegacyUser.email, {
        profile: {
            displayName: payload.fullName,
            username: payload.username,
            pincode: payload.pincode,
            city: payload.city,
            country: payload.country,
            gender: payload.gender,
            phoneNumber: payload.phoneNumber
            // Note: dateOfBirth would be stored in a private profile table in a real backend
        },
        auth: {
            emailVerified: !isVerificationEnabled
        }
    });
    
    return {
        user: modularUser,
        token: `fake-jwt-token-${newLegacyUser.id}-${Date.now()}`
    };
  }

  async loginWithProvider(provider: AuthProvider): Promise<{ user: ModularUser; token: string }> {
    await delay(this.LATENCY);
    
    // Simulate social login success
    const mockLegacyUser: LegacyUser = {
        id: `social-${Date.now()}`,
        name: 'Social User',
        username: 'social_user',
        email: `user@${provider}.com`,
        role: 'user',
        status: 'active',
        joinedAt: new Date().toISOString(),
        authProvider: provider,
        emailVerified: true,
        avatarUrl: 'https://i.pravatar.cc/150?u=social'
    };

    const modularUser = mapLegacyToModular(mockLegacyUser);

    return {
        user: modularUser,
        token: `fake-social-token-${Date.now()}`
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    await delay(this.LATENCY);
    console.log(`Password reset requested for ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await delay(this.LATENCY);
    if (token === 'invalid') throw new Error("Invalid or expired token");
    console.log("Password reset successful");
  }

  async changePassword(current: string, next: string): Promise<void> {
      await delay(this.LATENCY);
      console.log("Password changed");
  }

  async verifyEmail(token: string): Promise<void> {
      await delay(this.LATENCY);
      if (token === 'invalid') throw new Error("Invalid verification link");
  }

  async logoutApi(): Promise<void> {
      await delay(300);
  }
}

export const authService = new AuthService();
