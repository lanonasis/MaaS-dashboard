/**
 * MSW server factory for central-auth wiring tests.
 * Uses setupServer (msw/node) which works in Vitest jsdom
 * by intercepting the undici layer that jsdom's fetch uses.
 */

import { setupServer, SetupServerApi } from 'msw/node';
import { http, HttpResponse, HttpHandler } from 'msw';

type ServerFactory = (handlers: HttpHandler[]) => SetupServerApi;

export function createCentralAuthServer(handlers: HttpHandler[]): SetupServerApi {
  return setupServer(...handlers);
}
