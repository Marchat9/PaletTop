import { Nullable } from './nullable.model';

export interface ApiCall<T> {
  data: T;
  isLoading: boolean;
  error: Nullable<string>;
  hasAlreadyBeenCalled?: boolean;
}

export interface ApiCallStatus {
  isLoading: boolean;
  error: Nullable<string>;
}
