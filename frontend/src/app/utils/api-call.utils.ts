import { HttpErrorResponse } from '@angular/common/http';
import { Nullable } from '../models/nullable.model';

export const GENERIC_ERROR_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';

const NETWORK_ERROR_MESSAGE = 'Connexion au serveur impossible.';
const SERVER_UNAVAILABLE_MESSAGE =
  'Le serveur met trop de temps à répondre. Réessayez dans un instant.';

/** Body sent by the API (NestJS exception filter) when it rejects a request. */
interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
}

/**
 * Turns any error into a message fit for the user. Only messages written by the API itself
 * (4xx JSON bodies) are shown; anything else (proxy pages, 5xx internals, JS errors) becomes a
 * generic text so that no raw technical content ever reaches the screen.
 */
export function convertErrorToString(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    return convertHttpErrorToString(error);
  }

  return GENERIC_ERROR_MESSAGE;
}

function convertHttpErrorToString(error: HttpErrorResponse): string {
  const humanTextError = computeHumanTextError(error.status);
  if (humanTextError) {
    return humanTextError;
  }

  // Server errors may leak internals: never show their content.
  if (error.status >= 500) {
    return GENERIC_ERROR_MESSAGE;
  }

  const body = error.error;
  if (!isApiErrorBody(body)) {
    return GENERIC_ERROR_MESSAGE;
  }

  if (Array.isArray(body.message)) {
    const messages = body.message.map(
      (message: string) => message.charAt(0).toUpperCase() + message.slice(1),
    );
    return `• ${messages.join('\n• ')}`;
  }

  return body.message || GENERIC_ERROR_MESSAGE;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const message = (body as ApiErrorBody).message;
  return (
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((item) => typeof item === 'string'))
  );
}

function computeHumanTextError(statusCode: number): Nullable<string> {
  switch (statusCode) {
    case 0:
      return NETWORK_ERROR_MESSAGE;
    case 502:
    case 503:
    case 504:
      return SERVER_UNAVAILABLE_MESSAGE;
    default:
      return null;
  }
}
