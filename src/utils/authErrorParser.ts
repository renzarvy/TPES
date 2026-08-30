export interface ParsedAuthError {
  title: string;
  description: string;
  isHttp401: boolean;
  isTimeout: boolean;
  suggestion?: string;
}

/**
 * Parses authentication and database exceptions into user-friendly titles and explanations.
 */
export function parseAuthError(error: any): ParsedAuthError {
  const message = (error?.message || error?.toString() || '').trim();
  const code = (error?.code || '').trim();

  // 1. Check for 401 Unauthorized / Turso Auth Token missing or rejected
  if (
    message.includes('401') ||
    message.includes('HTTP status 401') ||
    code === '401' ||
    message.includes('UNAUTHORIZED') ||
    message.includes('auth token')
  ) {
    return {
      title: 'Database Access Notice (401)',
      description: 'Remote database token is missing or unauthorized. The app has switched to resilient local data mode.',
      isHttp401: true,
      isTimeout: false,
      suggestion: 'You can continue using the application normally with local persistence.',
    };
  }

  // 2. Check for Network Timeout or Connection Failures
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('network-request-failed') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    code === 'auth/network-request-failed'
  ) {
    return {
      title: 'Connection Timeout',
      description: 'Unable to reach the authentication servers within the time limit. Please check your internet connection.',
      isHttp401: false,
      isTimeout: true,
      suggestion: 'Verify your network connection or try refreshing the page.',
    };
  }

  // 3. Password Mismatch
  if (
    message.includes('Incorrect password') ||
    message.includes('wrong-password') ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential'
  ) {
    return {
      title: 'Incorrect Password',
      description: 'The password you entered is incorrect. Please verify your credentials and try again.',
      isHttp401: false,
      isTimeout: false,
      suggestion: 'Use the "Forgot Password?" link if you need to reset your account credentials.',
    };
  }

  // 4. Account Not Found
  if (
    message.includes('Account not found') ||
    message.includes('user-not-found') ||
    code === 'auth/user-not-found'
  ) {
    return {
      title: 'Account Not Found',
      description: 'No registered user exists with this email address.',
      isHttp401: false,
      isTimeout: false,
      suggestion: 'Please verify the spelling or click "Register" to create a new student or faculty account.',
    };
  }

  // 5. Email Already in Use
  if (
    message.includes('email-already-in-use') ||
    message.includes('already exists') ||
    code === 'auth/email-already-in-use'
  ) {
    return {
      title: 'Email Already Registered',
      description: 'An account is already registered with this institutional email address.',
      isHttp401: false,
      isTimeout: false,
      suggestion: 'Switch to the "Sign In" tab to log into your existing account.',
    };
  }

  // 6. Invalid Email Format
  if (
    message.includes('invalid-email') ||
    code === 'auth/invalid-email' ||
    message.includes('valid email')
  ) {
    return {
      title: 'Invalid Email Format',
      description: 'Please enter a valid institutional or personal email address (e.g., student@stalexius.edu.ph).',
      isHttp401: false,
      isTimeout: false,
    };
  }

  // 7. Rate Limiting / Too Many Requests
  if (
    message.includes('too-many-requests') ||
    code === 'auth/too-many-requests'
  ) {
    return {
      title: 'Too Many Attempts',
      description: 'Access to this account has been temporarily disabled due to multiple failed login attempts.',
      isHttp401: false,
      isTimeout: false,
      suggestion: 'Please wait a couple of minutes before attempting to sign in again.',
    };
  }

  // Default Fallback
  return {
    title: 'Authentication Notice',
    description: message || 'An unexpected error occurred during authentication. Please try again.',
    isHttp401: false,
    isTimeout: false,
  };
}
