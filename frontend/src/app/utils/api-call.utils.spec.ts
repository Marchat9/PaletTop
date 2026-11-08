import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { convertErrorToString, GENERIC_ERROR_MESSAGE, isNetworkError } from './api-call.utils';

describe('convertErrorToString', () => {
  it('returns a string error as is', () => {
    expect(convertErrorToString('Oops')).toBe('Oops');
  });

  it('joins validation messages sent by the API', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: ['name is required', 'code is too long'] },
    });
    expect(convertErrorToString(error)).toBe('• Name is required\n• Code is too long');
  });

  it('returns the business message sent by the API', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { statusCode: 404, message: 'Session introuvable' },
    });
    expect(convertErrorToString(error)).toBe('Session introuvable');
  });

  it('returns a connection message when the server cannot be reached', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(convertErrorToString(error)).toBe('Connexion au serveur impossible.');
  });

  it.each([502, 503, 504])('hides the raw gateway response for a %s', (status) => {
    const error = new HttpErrorResponse({
      status,
      statusText: 'Gateway Timeout',
      url: 'https://api.example.com/training/sessions/ABC/leaderboard',
      error: '<html><body><h1>504 Gateway Time-out</h1></body></html>',
    });
    const message = convertErrorToString(error);
    expect(message).toBe('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    expect(message).not.toContain('http');
  });

  it('never exposes the internals of a server error', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { statusCode: 500, message: 'QueryFailedError: relation "x" does not exist' },
    });
    expect(convertErrorToString(error)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('returns the generic message for an HTTP error without a usable body', () => {
    const error = new HttpErrorResponse({ status: 418, error: 'I am a teapot' });
    expect(convertErrorToString(error)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('returns the generic message for an unknown error', () => {
    expect(convertErrorToString(new Error('boom'))).toBe(GENERIC_ERROR_MESSAGE);
    expect(convertErrorToString({ some: 'object' })).toBe(GENERIC_ERROR_MESSAGE);
    expect(convertErrorToString(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('isNetworkError', () => {
  it('is true only for a status 0 HTTP error', () => {
    expect(isNetworkError(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isNetworkError(new HttpErrorResponse({ status: 504 }))).toBe(false);
    expect(isNetworkError('error')).toBe(false);
  });
});
