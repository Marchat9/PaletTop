import { HttpErrorResponse } from '@angular/common/http';
import { Nullable } from '../models/nullable.model';

export function convertErrorToString(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    if (Array.isArray(error.error.message)) {
      const listeWithFirstLetterUppercase = error.error.message.map(
        (message: string) => message.charAt(0).toUpperCase() + message.slice(1),
      );
      return `Erreur: \n• ${listeWithFirstLetterUppercase.join('\n• ')}`;
    } else if (!!error.error) {
      const statusCode = Number.isInteger(error.error.statusCode)
        ? error.error.statusCode
        : (error.status ?? 0);
      const message =
        computeHumanTextError(statusCode) ??
        error.error.message ??
        error.message ??
        'Une erreur inconnue est survenue.';
      return `Erreur: ${message}`;
    } else {
      return `Une erreur inconnue est survenue.`;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function computeHumanTextError(statusCode: number): Nullable<string> {
  // Add more if possible
  switch (statusCode) {
    case 0:
      return 'Connexion au server impossible.';
    default:
      return null;
  }
}
