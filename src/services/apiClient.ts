
// In development, Vite proxies /api to localhost:5000.
import { recordApiTiming } from '../observability/telemetry.js';
const BASE_URL = '/api';

const AUTH_STORAGE_KEY = 'nuggets_auth_data_v2';

// Helper to extract error message and details from response
async function extractError(response: Response): Promise<{ message: string; errors?: any[] }> {
  try {
    const errorData = await response.json();
    return {
      message: errorData.message || `Request failed with status ${response.status}`,
      errors: errorData.errors
    };
  } catch {
    return {
      message: `Request failed with status ${response.status}`
    };
  }
}

class ApiClient {
  // Track active AbortControllers by request key to cancel previous requests
  private activeControllers = new Map<string, AbortController>();

  private getAuthHeader(): Record<string, string> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const { token } = JSON.parse(stored);
          if (token) {
            return { 'Authorization': `Bearer ${token}` };
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors or storage access errors
    }
    return {};
  }

  /**
   * Cancel previous request for the same key and create a new AbortController
   */
  private getAbortController(requestKey: string): AbortController {
    // Cancel previous request if exists
    const previousController = this.activeControllers.get(requestKey);
    if (previousController) {
      previousController.abort();
    }

    // Create new controller
    const controller = new AbortController();
    this.activeControllers.set(requestKey, controller);
    return controller;
  }

  /**
   * Generate a unique key for request cancellation tracking
   * Uses endpoint + method to identify requests that should cancel each other
   */
  private getRequestKey(endpoint: string, method: string = 'GET'): string {
    return `${method}:${endpoint}`;
  }

  private async request<T>(endpoint: string, options?: RequestInit & { cancelKey?: string }): Promise<T> {
    const method = options?.method || 'GET';
    const cancelKey = options?.cancelKey || this.getRequestKey(endpoint, method);
    const abortController = this.getAbortController(cancelKey);
    const { cancelKey: _, ...requestOptions } = options || {};
    const startedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let statusCode: number | undefined;
    let success = false;
    let aborted = false;
    const config = {
      ...requestOptions,
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(), // Auto-attach token
        ...requestOptions?.headers,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      statusCode = response.status;

      if (!response.ok) {
        const errorInfo = await extractError(response);
        const error: any = new Error(errorInfo.message);
        
        // Attach errors array if present (for validation errors)
        if (errorInfo.errors) {
          error.errors = errorInfo.errors;
        }
        
        if (response.status === 404) {
          throw new Error('The requested resource was not found.');
        }
        if (response.status === 401) {
          // Redirect to login on unauthorized
          if (typeof window !== 'undefined') {
            // Clear auth data
            try {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch (e) {
              // Ignore storage errors
            }
            // Redirect to login
            window.location.href = '/login';
          }
          throw new Error('Your session has expired. Please sign in again.');
        }
        if (response.status === 429) {
          throw new Error('Too many attempts. Please wait a moment and try again.');
        }
        if (response.status === 500) {
          throw new Error('Something went wrong on our end. Please try again in a moment.');
        }
        
        // For other errors (like 400 validation errors), throw with errors array attached
        throw error;
      }

      if (response.status === 204) {
        return {} as T;
      }

      success = true;
      return response.json();
    } catch (error: any) {
      // Handle AbortError (request was cancelled) - don't treat as error
      if (error.name === 'AbortError') {
        // Only clean up if this controller is still the active one (not replaced by newer request)
        const currentController = this.activeControllers.get(cancelKey);
        if (currentController === abortController) {
          this.activeControllers.delete(cancelKey);
        }
        // Return a rejected promise that won't trigger error handlers
        aborted = true;
        return Promise.reject(new Error('Request cancelled'));
      }
      
      // Handle network errors (connection refused, timeout, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // In development, show helpful message; in production, show generic message
        const isDevelopment = import.meta.env.DEV;
        if (isDevelopment) {
          throw new Error(
            "We couldn't connect to the server. Please ensure the backend server is running on port 5000."
          );
        }
        throw new Error("We couldn't connect to the server. Please check your internet connection and try again.");
      }
      // Re-throw other errors as-is (they'll be mapped by authService)
      throw error;
    } finally {
      const endedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const durationMs = endedAt - startedAt;
      if (!aborted) {
        recordApiTiming({
          endpoint,
          method,
          status: statusCode,
          durationMs,
          ok: success
        });
      }
      // Clean up controller after request completes (success or error)
      // Only delete if this is still the active controller (not replaced by newer request)
      const currentController = this.activeControllers.get(cancelKey);
      if (currentController === abortController) {
        this.activeControllers.delete(cancelKey);
      }
    }
  }

  get<T>(url: string, headers?: HeadersInit, cancelKey?: string) {
    return this.request<T>(url, { method: 'GET', headers, cancelKey });
  }

  post<T>(url: string, body: any, headers?: HeadersInit, cancelKey?: string) {
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body), headers, cancelKey });
  }

  put<T>(url: string, body: any, headers?: HeadersInit, cancelKey?: string) {
    return this.request<T>(url, { method: 'PUT', body: JSON.stringify(body), headers, cancelKey });
  }

  patch<T>(url: string, body: any, headers?: HeadersInit, cancelKey?: string) {
    return this.request<T>(url, { method: 'PATCH', body: JSON.stringify(body), headers, cancelKey });
  }

  delete<T>(url: string, headers?: HeadersInit, cancelKey?: string) {
    return this.request<T>(url, { method: 'DELETE', headers, cancelKey });
  }
}

export const apiClient = new ApiClient();
