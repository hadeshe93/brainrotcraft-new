/**
 * Authentication Helper Functions
 * Provides utilities for authentication and authorization checks
 */

import { auth } from '@/auth';
import { getCloudflareEnv } from '@/services/base';

/**
 * Check if user is authenticated
 * @returns true if user is logged in
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Get current user UUID
 * @returns user UUID or null if not authenticated
 */
export async function getCurrentUserUuid(): Promise<string | null> {
  const session = await auth();
  return session?.user?.uuid ?? null;
}

/**
 * Get current user email
 * @returns user email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

/**
 * Check if current user is admin
 * Admin is determined by matching email against ADMIN_EMAIL env variable
 * @returns true if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) {
    return false;
  }

  try {
    const env = await getCloudflareEnv();
    const adminEmail = (env as any).ADMIN_EMAIL || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured in environment variables');
      return false;
    }

    return session.user.email === adminEmail;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require authentication - throws if not authenticated
 * @throws Error if user is not authenticated
 */
export async function requireAuth(): Promise<{ userUuid: string; userEmail: string }> {
  const session = await auth();

  if (!session?.user?.uuid || !session?.user?.email) {
    throw new Error('Authentication required');
  }

  return {
    userUuid: session.user.uuid,
    userEmail: session.user.email,
  };
}

/**
 * Require admin access - throws if not admin
 * @throws Error if user is not admin
 */
export async function requireAdmin(request?: Request): Promise<{ userUuid: string; userEmail: string }> {
  const token = request?.headers.get('Authorization')?.split(' ')[1];
  console.log('token', token);
  if (token) {
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (token === adminToken) {
      return { userUuid: 'admin', userEmail: 'admin@gamesramp.com' };
    }
  }
  const { userUuid, userEmail } = await requireAuth();

  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Admin access required');
  }

  return { userUuid, userEmail };
}
