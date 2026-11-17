import { ComponentType } from '@angular/cdk/overlay';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';

/** How an entry page without codes in its URL asks for them, and where it then leads. */
export interface ConnectionPageConfig<TResult> {
  /** Lazy, so that the popup lands in the page's chunk rather than in the main bundle. */
  popup: () => Promise<ComponentType<unknown>>;
  /** The page the codes lead to. */
  target: (result: TResult) => unknown[];
  /** What the popup receives, read from the route (a code passed in the URL…). */
  popupData?: (route: ActivatedRouteSnapshot) => unknown;
  /** Access already known (an admin connected before): the popup is skipped. */
  knownAccess?: (store: Store) => Observable<Nullable<TResult>>;
}

/** Key of the configuration in the route data. */
export const CONNECTION_ROUTE_DATA_KEY = 'connection';
