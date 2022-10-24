import { InjectionToken, Provider } from '@uon/core';
import { RequestQuery } from '../base/query';
import { RequestBody } from '../base/body';
import { Cookies } from '../base/cookies';
import { Expires } from '../base/expires';
import { Authorization } from '../base/authorization';
import { Range } from '../base/range';
import { AcceptEncoding, AcceptLanguage } from '../base/accept';

import { HttpErrorPlainTextHandler } from '../error/text.handler';
import { HTTP_ERROR_HANDLER } from '../error/error';


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
    AcceptLanguage,
    AcceptEncoding,
    
    // default error handler
    {
        token: HTTP_ERROR_HANDLER,
        type: HttpErrorPlainTextHandler
    }

]);