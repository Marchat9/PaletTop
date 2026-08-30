import { environment as environmentBase } from './environment.base';

export const environment = {
  ...environmentBase,
  production: false,
  backBaseApiUrl: 'http://192.168.1.9:3000',
};
