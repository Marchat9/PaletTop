import { environment as environmentBase } from './environment.base';

export const environment = {
  ...environmentBase,
  production: true,
  // Override this value for production deployments when needed.
  // Example: 'https://api.my-domain.com/api'
  backBaseApiUrl: environmentBase.backBaseApiUrl,
};
