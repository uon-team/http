



import { Injectable, InjectionToken} from "@uon/core";

import { IncomingRequest } from "../base/request";
import { OutgoingResponse } from "../base/response";
import { HttpError, HttpErrorHandler } from "./error";


/**
 * The default error handler controller
 * Send error message as plain text
 */
@Injectable()
export class HttpErrorJsonHandler implements HttpErrorHandler {

    constructor(private req: IncomingRequest,
        private res: OutgoingResponse) {
    }


    send(err: HttpError) {
        this.res.setHeader('Content-Type', 'application/json');
        this.res.statusCode = err.code;
        return this.res.send(err.message);
    }


}