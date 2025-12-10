/**
 * Utility Functions for Roomify
 */

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Capitalize first letter of a string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (str: string, maxLength: number): string => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

/**
 * Get initials from name (e.g., "John Doe" -> "JD")
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(dateString);
};

/**
 * Format time for chat messages
 */
export const formatMessageTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// ============================================
// NUMBER / CURRENCY UTILITIES
// ============================================

/**
 * Format price with currency symbol
 */
export const formatPrice = (price: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Format price for rent (e.g., "$1,200/mo")
 */
export const formatRent = (price: number, currency = 'USD'): string => {
  return `${formatPrice(price, currency)}/mo`;
};

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if string is empty or whitespace only
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

// ============================================
// ROLE UTILITIES
// ============================================

export type RoleName = 'user' | 'normal' | 'landlord' | 'admin';

/**
 * Normalize role name (backend uses USER, frontend uses normal/user)
 */
export const normalizeRole = (role: string): RoleName => {
  const lower = role.toLowerCase();
  if (lower === 'user' || lower === 'normal') return 'normal';
  if (lower === 'landlord') return 'landlord';
  if (lower === 'admin') return 'admin';
  return 'normal';
};

/**
 * Get route path for role
 */
export const getRouteForRole = (role: string): string => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'admin':
      return '/(admin)';
    case 'landlord':
      return '/(landlord)';
    default:
      return '/(normal)';
  }
};

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Remove duplicates from array by key
 */
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * Group array by key
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};
