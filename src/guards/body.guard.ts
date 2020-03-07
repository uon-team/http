import { Injectable, Injector } from '@uon/core';
import { IncomingRequest } from 'src/base/request';

import { ActivatedRoute } from '@uon/router';

import { HttpError } from '../error/error';
import { RequestBody } from '../base/body';

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

    return class _BodyGuard extends BodyGuardService {

        checkGuard(ar: ActivatedRoute<any>): boolean | Promise<boolean> {

            this.checkHeaders(config);

            return true;
        }


    };

}


/**
 * Base service for body guards
 */
@Injectable()
export class BodyGuardService {

    constructor(public request: IncomingRequest,
        public body: RequestBody,
        public injector: Injector) { }

    checkHeaders(config: BodyGuardConfig) {

        // we need a content-type from the headers
        if (config.accept) {

            const type = (this.request.headers['content-type'] || '').split(';')[0];

            // literal check
            // TODO check for wildcards also
            if (config.accept.indexOf(type.trim()) === -1) {
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

    }
}