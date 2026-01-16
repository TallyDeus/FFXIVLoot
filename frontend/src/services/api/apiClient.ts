import { handleApiError, handleNetworkError } from './errorHandler';

/**
 * Base API client configuration
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Maximum number of retry attempts for retryable errors
 */
const MAX_RETRIES = 2;

/**
 * Delay between retries (in milliseconds)
 */
const RETRY_DELAY = 1000;

/**
 * Gets the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Sleeps for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Makes an API request with error handling and retry logic
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const url = getApiUrl(endpoint);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available (skip for login/validate endpoints)
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/validate');
  const token = localStorage.getItem('authToken');
  if (token && !isAuthEndpoint) {
    const existingHeaders = options.headers as Record<string, string> | undefined;
    if (!existingHeaders || !existingHeaders['Authorization']) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - clear token and redirect to login
      // But don't redirect if we're already on the login page, making a login request, or validating a session
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/validate');
      if (response.status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('authToken');
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          // Use a small delay to avoid immediate redirect loops
          setTimeout(() => {
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
      
      const apiError = await handleApiError(response);
      
      // Retry on retryable errors
      if (apiError.isRetryable && retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return apiRequest<T>(endpoint, options, retryCount + 1);
      }
      
      throw new Error(apiError.message);
    }

    // Handle NoContent responses
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = handleNetworkError(error);
      
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY * (retryCount + 1));
        return apiRequest<T>(endpoint, options, retryCount + 1);
      }
      
      throw new Error(networkError.message);
    }
    
    // Re-throw if it's already an Error
    if (error instanceof Error) {
      throw error;
    }
    
    // Handle unknown errors
    throw new Error('An unexpected error occurred');
  }
}

