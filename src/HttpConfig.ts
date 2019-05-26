import { InjectionToken, Provider, ProvideInjectable } from '@uon/core';

import { Expires } from './Expires';
import { Cookies } from './Cookies';
import { Authorization } from './Authorization';
import { Encoding } from './Encoding';
import { Range } from './Range';

import { IncomingRequest } from './IncomingRequest';
import { HTTP_ERROR_HANDLER, DefaultHttpErrorHandler } from './ErrorHandler';
import { RequestQuery } from './Query';
import { JsonBody } from './Body';

// the unique http config token
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP_CONFIG');


// Extra providers for an HttpContext
export const HTTP_PROVIDERS = new InjectionToken<Provider[]>('HTTP_PROVIDERS');


/**
 * The http config options
 */
export interface HttpConfig {

    /**
     * the port to listen to on the https server, defaults to 4433
     */
    port?: number;

    /**
     * the port to listen to for non-secure http, defaults to 8080
     */
    plainPort?: number;

    /**
     * an ip/range to listen to on the host, defaults to 0.0.0.0 (everywhere)
     */
    host?: string;

    /**
     * a list of extra providers for the request-scoped injector
     */
    providers?: Provider[];

}


export const HTTP_CONFIG_DEFAULTS: HttpConfig = {
    port: 4433,
    plainPort: 8080,
    host: '0.0.0.0',
    providers: []
}


/**
 * The default provider list for the HttpContext injector
 */
export const DEFAULT_CONTEXT_PROVIDERS = Object.freeze(<Provider[]>[

    // shortcut to parsed query string, if QueryGuard is used, field types are coersed
    {
        token: RequestQuery,
        factory: (request: IncomingRequest) => {
            return Object.assign(new RequestQuery(), request.uri.query);
        }, 
        deps: [IncomingRequest]
    },

    // cookies support
    Cookies,

    // http cache service
    Expires,

    // auth support
    Authorization,

    // encoding support
    Encoding,

    // range support
    Range,

    // json body
    JsonBody,

    // default error handler
    ProvideInjectable(HTTP_ERROR_HANDLER, DefaultHttpErrorHandler)

]);


