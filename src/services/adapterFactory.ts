import { IAdapter } from './adapters/IAdapter';
import { LocalAdapter } from './adapters/LocalAdapter';
import { RestAdapter } from './adapters/RestAdapter';

// Cast import.meta to any to avoid TS errors if vite types are missing
const adapterType = (import.meta as any).env?.VITE_ADAPTER_TYPE || 'local';

let adapter: IAdapter;

if (adapterType === 'rest') {
  adapter = new RestAdapter();
} else {
  adapter = new LocalAdapter();
}

export const getAdapter = (): IAdapter => adapter;


