import { environment as environmentBase } from './environment.base';

declare global {
  interface Window {
    __env?: { apiBaseUrl?: string };
  }
}

// Read at runtime (see src/assets/env.js), so the same Docker image can be
// pointed at any backend via the API_BASE_URL env var, no rebuild required.
function resolveBackBaseApiUrl(): string {
  const runtimeUrl = window.__env?.apiBaseUrl;
  return runtimeUrl && !runtimeUrl.startsWith('${') ? runtimeUrl : environmentBase.backBaseApiUrl;
}

export const environment = {
  ...environmentBase,
  production: true,
  get backBaseApiUrl(): string {
    return resolveBackBaseApiUrl();
  },
};
