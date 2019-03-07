import { InjectionToken, Provider, ProvideInjectable } from '@uon/core';

import { Expires } from './Expires';
import { Cookies } from './Cookies';
import { Authorization } from './Authorization';
import { Encoding } from './Encoding';
import { Range } from './Range';

import { HTTP_REQUEST_BODY_CONFIG, IncomingRequestBodyConfig } from './IncomingRequest';
import { HTTP_ERROR_HANDLER, DefaultHttpErrorHandler } from './ErrorHandler';

// the unique http config token
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP_CONFIG');

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

    // request body config
    {
        token: HTTP_REQUEST_BODY_CONFIG,
        value: <IncomingRequestBodyConfig>{
            maxLength: 1 * 1024 * 1024, // 1MB
            accept: ['*/*']
        }
    },

    // cookies support
    Cookies,

    // http cache service
    Expires,

    // auth support
    Authorization,

    // encoding support
    Encoding,
    /*{
        token: HTTP_ENCODING_CONFIG,
        value: <HttpEncodingConfig>{
            extensions: ['js', 'css'],
            storageAdapter: null
        }
    },
*/
    // range support
    Range,
    /*{
        token: HTTP_RANGE_CONFIG,
        value: <HttpRangeConfig>{
            maxChunkSize: 10 * 1024 * 1024, // 10MB
        }
    },
*/
    // default error handler
    ProvideInjectable(HTTP_ERROR_HANDLER, DefaultHttpErrorHandler)

]);


