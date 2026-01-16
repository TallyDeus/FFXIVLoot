/**
 * Centralized error handling for API requests
 * Provides consistent error messages and retry logic
 */

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
  isRetryable?: boolean;
}

/**
 * Determines if an error is retryable (transient failure)
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // 5xx errors are retryable (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // 429 (Too Many Requests) is retryable
  if (error.status === 429) {
    return true;
  }
  
  return false;
}

/**
 * Extracts error message from response
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    // Try common error response formats
    if (errorData.detail) {
      return errorData.detail;
    }
    if (errorData.message) {
      return errorData.message;
    }
    if (errorData.title && errorData.detail) {
      return `${errorData.title}: ${errorData.detail}`;
    }
    if (typeof errorData === 'string') {
      return errorData;
    }
  } catch {
    // If JSON parsing fails, use status text
  }
  
  return response.statusText || `HTTP error! status: ${response.status}`;
}

/**
 * Creates a standardized API error
 */
export function createApiError(message: string, status?: number, detail?: string): ApiError {
  return {
    message,
    status,
    detail,
    isRetryable: status ? isRetryableError({ status }) : false,
  };
}

/**
 * Handles API response errors with consistent formatting
 */
export async function handleApiError(response: Response): Promise<ApiError> {
  const message = await extractErrorMessage(response);
  return createApiError(message, response.status, message);
}

/**
 * Handles network/fetch errors
 */
export function handleNetworkError(error: any): ApiError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createApiError(
      'Network error: Unable to connect to the server. Please check your connection.',
      undefined,
      error.message
    );
  }
  
  if (error instanceof Error) {
    return createApiError(error.message, undefined, error.message);
  }
  
  return createApiError('An unexpected error occurred', undefined, String(error));
}

