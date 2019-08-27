import { Injectable } from "@uon/core";
import { ActivatedRoute } from "@uon/router";
import { IncomingRequest } from "./IncomingRequest";
import { OutgoingResponse } from "./OutgoingResponse";
import { HttpError } from "./HttpError";


const DEFAULT_METHODS = ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].join(', ');
const DEFAULT_HEADERS = ['Content-Type'];
const DEFAULT_MAX_AGE = -1;

export interface CorsGuardOptions {

    /**
     * Access-Control-Allow-Origin
     * If * is used, response will match request host if 'credentials' is set to true, will be set as * otherwise
     * If a string is used, origin is used as a constant with no checks
     * If an array of strings is used, it will be treated as a list of allowed origins
     */
    origin: '*' | string | string[];

    /**
     * Access-Control-Allow-Methods
     * Defaults to ['HEAD', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
     */
    methods?: string[];

    /**
     * Sets Access-Control-Allow-Headers
     * Defaults to ['Content-Type']
     */
    headers?: string[];

    /**
     * Sets Access-Control-Allow-Credentials
     * Defaults to false
     */
    credentials?: boolean;

    /**
     * Access-Control-Max-Age
     * Defaults to -1
     */
    maxAge?: number;


}

export function CorsGuard(options: CorsGuardOptions) {

    return class _CorsGuard extends CorsGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            const origin = this.checkOrigin(options.origin, !!options.credentials);

            // check origin
            if (!origin) {
                throw new HttpError(400, new Error('Origin does not match CORS'));
            }

            // origin
            this.response.setHeader('Access-Control-Allow-Origin',
                origin
            );

            // methods
            this.response.setHeader('Access-Control-Allow-Methods',
                options.methods
                    ? options.methods.map(m => m.toUpperCase()).join(', ')
                    : DEFAULT_METHODS
            );

            // headers
            this.response.setHeader('Access-Control-Allow-Headers',
                options.headers || DEFAULT_HEADERS);

            // creds
            this.response.setHeader('Access-Control-Allow-Credentials',
                String(!!options.credentials)
            );

            // max-age
            const max_age = options.maxAge !== undefined ? options.maxAge : DEFAULT_MAX_AGE;
            this.response.setHeader('Access-Control-Max-Age',
                options.maxAge !== undefined
                    ? options.maxAge
                    : DEFAULT_MAX_AGE
            );

            return true;
        }
    }


}

@Injectable()
export class CorsGuardService {

    constructor(public request: IncomingRequest,
        public response: OutgoingResponse) { }


    checkOrigin(origins: '*' | string | string[], creds: boolean) {

        const req_origin = this.request.headers.origin as string
            || this.request.headers.host as string;

        if (req_origin) {
            if (origins === '*') {
                return creds === true
                    ? req_origin
                    : '*'
            }
            else if (typeof origins === 'string') {
                return origins === req_origin
                    ? origins
                    : null;
            }
            else if (Array.isArray(origins)) {
                return origins.indexOf(req_origin) > -1
                    ? req_origin
                    : null;
            }
        }

        return null;

    }
}