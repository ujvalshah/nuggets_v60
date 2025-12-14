import { IAdapter } from './adapters/IAdapter';
import { LocalAdapter } from './adapters/LocalAdapter';
import { RestAdapter } from './adapters/RestAdapter';

// Access Vite environment variable (VITE_ prefix required)
// Cast import.meta to any to avoid TS errors (Vite provides import.meta.env at runtime)
const adapterType = ((import.meta as any).env?.VITE_ADAPTER_TYPE || 'local') as string;

// Log environment variable status
const envValue = (import.meta as any).env?.VITE_ADAPTER_TYPE;
console.log('[AdapterFactory] Environment check:');
console.log('[AdapterFactory]   VITE_ADAPTER_TYPE =', envValue || '(not set, defaulting to "local")');
console.log('[AdapterFactory]   Resolved adapter type =', adapterType);

let adapter: IAdapter;

if (adapterType === 'rest') {
  adapter = new RestAdapter();
  console.log('[AdapterFactory] ✅ Using RestAdapter - connecting to backend API');
  console.log('[AdapterFactory] Backend URL: http://127.0.0.1:5000 (via Vite proxy /api)');
  console.log('[AdapterFactory] Health check will be performed lazily on first API call');
  // NOTE: Health check removed from module load time to prevent ECONNREFUSED errors
  // Health checks should be done lazily when actually needed, not at startup
} else {
  adapter = new LocalAdapter();
  console.log('[AdapterFactory] 📦 Using LocalAdapter - mock/in-memory data');
  console.log('[AdapterFactory] To switch to real backend, set VITE_ADAPTER_TYPE=rest in .env');
}

export const getAdapter = (): IAdapter => adapter;


