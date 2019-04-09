
import { IRouteGuardService, ActivatedRoute } from '@uon/router';
import { IncomingRequest } from './IncomingRequest';
import { Type, Injectable } from '@uon/core';
import { HttpError } from './HttpError';
import { Query } from './Query';


export interface QueryArgumentDefinition {
    /**
     * Coerse value to type
     */
    coerse?: Type<Number | Date | Boolean>;

    /**
     * Whether this field is required
     */
    required?: boolean;

    /**
     * Match the field value with a regex.
     * This happens before type-coersion
     */
    match?: RegExp;

    /**
     * The default value
     */
    defaultValue?: any;


}

export interface QueryDefinition {
    [k: string]: QueryArgumentDefinition;
}

/**
 * Validate query string
 */
export function QueryGuard<T extends QueryDefinition>(queryDef: T) {

    return class extends QueryGuardService {

        checkGuard(ar: ActivatedRoute<any>): boolean | Promise<boolean> {

            const original_query = this.request.uri.query as any;

            const validate_keys = Object.keys(queryDef);
            const errors: string[] = [];

            for (let i = 0; i < validate_keys.length; ++i) {
                let k = validate_keys[i];

                // set default value, if any
                this.query[k] = original_query[k] || queryDef[k].defaultValue;

                // check the required fields
                if (queryDef[k].required && !original_query[k]) {
                    errors.push(`Query field "${k}" is required.`);
                    continue;
                }

                // check for regex match
                if (queryDef[k].match && original_query[k]) {
                    if (!queryDef[k].match.test(original_query[k])) {
                        errors.push(`Query field "${k}" doesn't match ${queryDef[k].match.toString()}.`);
                        continue;
                    }
                }

                // do type coersion if defined
                if (queryDef[k].coerse && original_query[k]) {

                    if (Array.isArray(original_query[k])) {
                        this.query[k] = original_query[k].map((u: string) => new queryDef[k].coerse(u));
                    }
                    else {
                        this.query[k] = new queryDef[k].coerse(original_query[k]);
                    }

                }

            }

            if (errors.length) {
                throw new HttpError(400, new Error(errors.join('\r\n')));
            }

            return true;
        }
    };

}


@Injectable()
export class QueryGuardService {
    constructor(public request: IncomingRequest, public query: Query) { }
}


/**
 * Configuration options for the request body
 */
export interface BodyGuardConfig {

    /**
     *  the maximum acceptable body size, in bytes
     */
    maxLength?: number;

    /**
     * Which content type (mime) is accepted 
     */
    accept?: string[];

}



/**
 * Validate headers for requests with body
 */
export function BodyGuard(config: BodyGuardConfig) {

    return class extends BodyGuardService {

        checkGuard(ar: ActivatedRoute<any>): boolean | Promise<boolean> {

            // we need a content-type from the headers
            if (config.accept) {
                if (config.accept.indexOf(this.request.headers['content-type']) === -1) {
                    throw new HttpError(400, new Error(`Content-Type must be set to (one of) ${config.accept.join(', ')}.`));
                }
            }

            // check if content-length is bigger than the max allowed body size
            if (config.maxLength) {

                let header_length_str = this.request.headers['content-length'];
                if (!header_length_str) {
                    throw new HttpError(411, new Error(`Content-Length header field must be set.`));
                }

                let header_length = parseInt(header_length_str);
                if (header_length > config.maxLength) {
                    throw new HttpError(413, new Error(`Content-Length of ${header_length} exceeds the limit of ${config.maxLength}.`));
                }
            }

            return true;
        }
    };

}


@Injectable()
export class BodyGuardService {
    constructor(public request: IncomingRequest) { }
}






