
// In development, Vite proxies /api to localhost:5000.
const BASE_URL = '/api';

const AUTH_STORAGE_KEY = 'nuggets_auth_data_v2';

// Helper to extract error message from response
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.message || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

class ApiClient {
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

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(), // Auto-attach token
        ...options?.headers,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        
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
        
        // For other errors, use the message from the backend (will be mapped by authService)
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error: any) {
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
    }
  }

  get<T>(url: string, headers?: HeadersInit) {
    return this.request<T>(url, { method: 'GET', headers });
  }

  post<T>(url: string, body: any, headers?: HeadersInit) {
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body), headers });
  }

  put<T>(url: string, body: any, headers?: HeadersInit) {
    return this.request<T>(url, { method: 'PUT', body: JSON.stringify(body), headers });
  }

  delete<T>(url: string, headers?: HeadersInit) {
    return this.request<T>(url, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
