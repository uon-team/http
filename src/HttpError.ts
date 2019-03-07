
import { STATUS_CODES } from 'http'


/**
 * Represents an http error
 */
export class HttpError extends Error {

    /**
     * The Http status code
     */
    readonly code: number;

    /**
     * The originating error
     */
    readonly error: Error;

    /**
     * 
     * @param code 
     * @param message 
     * @param body 
     */
    constructor(code: number, originalError?: Error) {

        let msg = STATUS_CODES[code];
        super(originalError ? originalError.message : msg);

        this.code = code;
        this.error = originalError;
    }

    toJSON() {

        return {
            code: this.code,
            message: this.message
        }
    }
}


/**
 * Interface for Controllers for handling errors
 */
export interface OnHttpError {
    onHttpError(err: HttpError): any;
}



