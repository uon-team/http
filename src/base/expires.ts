
import { Injectable } from '@uon/core';
import { IncomingRequest } from './request';
import { OutgoingResponse, IOutgoingReponseModifier } from './response';


export interface ExpiresOptions {

    /**
     * The number of seconds from now that the client should cache
     * the resource, without making a new request
     */
    expiresIn?: number;

    /**
     * Sets the Last-Modified header to the date specified
     */
    lastModified?: Date;
}


/**
 * Parses cache related header and generates cache headers for response
 */
@Injectable()
export class Expires implements IOutgoingReponseModifier {


    readonly ifModifiedSince: Date;
    private _options: ExpiresOptions;


    constructor(private request: IncomingRequest) {

        // check for if modified since header
        let req_date = request.headers["if-modified-since"];
        if (req_date) {
            this.ifModifiedSince = new Date(req_date as string);
        }

    }

    /**
     * Configure
     * @param options 
     */
    configure(options: ExpiresOptions) {
        this._options = options;

        return this;
    }

    /**
     * HttpTransform transform implementation
     * @param response 
     */
    async modifyResponse(response: OutgoingResponse) {

        // must be configured
        if (!this._options) {
            return;
        }

        const last_modified = this._options.lastModified;

        // check if not modified, in that case we reply right away with a 304 Not Modified
        if (this.ifModifiedSince && last_modified &&
            Math.floor(last_modified.getTime() / 1000) === Math.floor(this.ifModifiedSince.getTime() / 1000)
        ) {
            response.statusCode = 304;
            return response.send(null);
        }

        // set expires header
        if (this._options.expiresIn) {
            const expires = new Date(Date.now() + (this._options.expiresIn * 1000));
            response.setHeader('Expires', expires.toUTCString());
        }

        // set last-modified header
        if (last_modified) {
            response.setHeader('Last-Modified', last_modified.toUTCString());
        }

    }

}




