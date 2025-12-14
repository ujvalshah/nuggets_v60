
// In development, Vite proxies /api to localhost:5000.
const BASE_URL = '/api';

const AUTH_STORAGE_KEY = 'nuggets_auth_data_v2';

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

  private async request<T>(endpoint: string, options?: RequestInit, retries = 0): Promise<T> {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(), // Auto-attach token
        ...options?.headers,
      },
    };

    const maxRetries = 2;
    const retryDelay = 1000; // 1 second

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...config,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        if (response.status === 401) {
          // Optional: Trigger global logout here if needed
          console.warn("[ApiClient] Unauthorized request");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors (connection refused, timeout, etc.)
      const isNetworkError = 
        error instanceof TypeError || 
        error.name === 'AbortError' ||
        error.message?.includes('fetch') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('ECONNREFUSED');

      if (isNetworkError && retries < maxRetries) {
        console.warn(`[ApiClient] Network error (attempt ${retries + 1}/${maxRetries + 1}), retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retries + 1)));
        return this.request<T>(endpoint, options, retries + 1);
      }

      if (isNetworkError) {
        throw new Error(
          `Server connection failed after ${maxRetries + 1} attempts. ` +
          `Please ensure the backend server is running on port 5000. ` +
          `Run 'npm run dev:server' in a separate terminal.`
        );
      }
      
      // Re-throw other errors as-is
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
