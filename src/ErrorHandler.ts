import { Injectable, InjectionToken, Type, Provider, Injector } from "@uon/core";

import { IncomingRequest } from "./IncomingRequest";
import { OutgoingResponse } from "./OutgoingResponse";
import { HttpError } from "./HttpError";


/**
 * Injection token for the http error handler
 */
export const HTTP_ERROR_HANDLER = new InjectionToken<HttpErrorHandler>("HTTP_ERROR_HANDLER");


/**
 * Interface for error handlers
 */
export interface HttpErrorHandler {

    send(error: HttpError): void;
}

/**
 * The default error handler controller
 */
@Injectable()
export class DefaultHttpErrorHandler implements HttpErrorHandler {

    constructor(private req: IncomingRequest,
        private res: OutgoingResponse) {
    }


    send(err: HttpError) {

        this.res.setHeader('Content-Type', 'text/plain');
        this.res.statusCode = err.code;
        this.res.send(err.message);
    }


}