
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
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        if (response.status === 401) {
          // Optional: Trigger global logout here if needed
          console.warn("Unauthorized request");
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
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Server connection failed. Please ensure the backend server is running on port 5000. ` +
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
