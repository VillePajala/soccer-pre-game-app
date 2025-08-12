// Admin authentication using Supabase users
import type { User } from '@/types/supabase-types';

// Admin role configuration
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
} as const;

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES];

// Check if user has admin role
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  
  // Check user metadata for admin role
  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  return Object.values(ADMIN_ROLES).includes(userRole);
}

// Check if user has specific admin level
export function hasAdminRole(user: User | null, requiredRole: AdminRole): boolean {
  if (!user) return false;
  
  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  
  // Role hierarchy: super_admin > admin > moderator
  const roleHierarchy = {
    [ADMIN_ROLES.SUPER_ADMIN]: 3,
    [ADMIN_ROLES.ADMIN]: 2,
    [ADMIN_ROLES.MODERATOR]: 1
  };
  
  const userLevel = roleHierarchy[userRole as AdminRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}


// Secure admin check - role-based only
export function isUserAdmin(user: User | null): boolean {
  if (!user) return false;
  
  // Only role-based admin authentication
  return isAdmin(user);
}