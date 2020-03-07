import { InjectionToken, Provider } from '@uon/core';
import { RequestQuery } from '../base/query';
import { RequestBody } from '../base/body';
import { HttpErrorPlainTextHandler } from '../error/text.handler';
import { HTTP_ERROR_HANDLER } from '../error/error';
import { Cookies } from 'src/base/cookies';
import { Expires } from 'src/base/expires';
import { Authorization } from 'src/base/authorization';
import { Range } from 'src/base/range';

// Extra providers for an HttpContext
export const HTTP_PROVIDERS = new InjectionToken<Provider[]>('HTTP_PROVIDERS');


/**
 * The default provider list for the HttpContext injector
 */
export const DEFAULT_CONTEXT_PROVIDERS = Object.freeze(<Provider[]>[

    RequestQuery,
    RequestBody,

    Cookies,
    Expires,
    Authorization,
    Range,
    
    // default error handler
    {
        token: HTTP_ERROR_HANDLER,
        type: HttpErrorPlainTextHandler
    }

]);