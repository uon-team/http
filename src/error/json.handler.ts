



import { Injectable, InjectionToken } from "@uon/core";

import { IncomingRequest } from "../base/request";
import { OutgoingResponse } from "../base/response";
import { HttpError, HttpErrorHandler } from "./error";
import { IsValidationResult, FlattenValidationResult } from '../model/validation';


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

        // set status code
        this.res.statusCode = err.code;
        let data: any = err.toJSON();

        if (IsValidationResult(err.data)) {

            let results: any = {
                type: err.data.key,
                errors: FlattenValidationResult(err.data)
            };

            data = results;

        }
        else if (err.data) {
            data = { message: err.message, context: err.data };
        }

        this.res.json(data);

        return this.res.finish();
    }


}