/**
 * Authentication API Calls
 * Login, register, user profile, logout
 */

import { fetchAPIFull } from './api';
import type { RetailCommissionSummary, UserSession, UserProfile } from '@/components/user/types';

// ============================================
// USER PROFILE
// ============================================

/**
 * Get current user profile
 * Cache: tidak ada (user-specific, sensitive)
 */
export async function getUserProfile(token: string): Promise<UserProfile | null> {
  const response = await fetchAPIFull<UserProfile>('/v1/me/profile', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok && response.profile) {
    return response.profile as UserProfile;
  }

  return null;
}

/**
 * Update user profile
 * Cache: tidak ada
 */
export async function updateUserProfile(
  token: string,
  data: Partial<UserSession>
) {
  const response = await fetchAPIFull<UserProfile>('/v1/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response;
}

// ============================================
// SECURITY
// ============================================

/**
 * Get user IP whitelist
 * Cache: 1 hari (jarang berubah)
 */
export async function getUserIPWhitelist(token: string) {
  return fetchAPIFull('/v1/user/security/ip-whitelist', {
    revalidate: 86400, // 1 hari
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getRetailCommissionSummary(token: string): Promise<RetailCommissionSummary | null> {
  const response = await fetchAPIFull<RetailCommissionSummary>('/v1/me/retail/commissions/summary', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok && response.item) {
    return response.item as RetailCommissionSummary;
  }

  return null;
}
