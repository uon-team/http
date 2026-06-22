
import { Injectable } from '@uon/core';
import { HttpError } from '../error/error';
import { IncomingRequest } from './request';
import { OutgoingResponse, IOutgoingReponseModifier } from './response';

import { promises as FSPromise, createReadStream } from 'fs';

export interface RangeConfigureOptions {

    /**
     * The file path to stream as the response
     */
    path: string;

    /**
     * The maximum chunk size the server can send
     */
    maxChunkSize?: number;
}


/**
 * Parses Range request headers and let's you set the Accept-Range header
 */
@Injectable()
export class Range implements IOutgoingReponseModifier {

    private _start: number;
    private _end: number;

    private _acceptRangeRequest: boolean = false;
    private _chunkSize: number;
    private _totalSize: number;

    private _options: RangeConfigureOptions;


    /**
     * Create an interface to manipulate range and parse the range headers
     */
    constructor(private request: IncomingRequest) {

        let range_str = request.headers.range as string;

        if (range_str) {
            let positions = range_str.replace(/bytes=/, "").split("-");
            this._start = parseInt(positions[0], 10);
            this._end = positions[1] ? parseInt(positions[1], 10) : undefined;
        }


    }

    /**
     * The requested range
     */
    get range() {
        return { start: this._start, end: this._end };
    }

    /**
     * Set whether or not to accept range request
     */
    set accept(val: boolean) {
        this._acceptRangeRequest = val;
    }

    /**
     * Accepts further range requests
     */
    get accept(): boolean {
        return this._acceptRangeRequest;
    }

    /**
     * 
     * @param options 
     */
    configure(options: RangeConfigureOptions) {
        this._options = options;
        return this;
    }

    /**
     * IOutgoingReponseModifier implementation
     * @param response 
     */
    async modifyResponse(response: OutgoingResponse) {

        // if user set accept to true, set header
        if (this._acceptRangeRequest) {
            response.headers["Accept-Ranges"] = "bytes";
        }

        // must be configured to continue
        if (!this._options) {
            return;
        }

        const src_path = this._options.path;

        // nothing requested -> let the caller stream the full file
        if ((this._start === undefined || isNaN(this._start)) &&
            (this._end === undefined || isNaN(this._end))) {
            return;
        }

        const stats = await FSPromise.stat(src_path);
        const total_size = stats.size;
        const max_chunk = this._options.maxChunkSize;

        let start = this._start;
        let end = this._end;

        if ((start === undefined || isNaN(start)) && typeof end === 'number' && !isNaN(end)) {
            // suffix range "bytes=-N": the last N bytes
            start = Math.max(0, total_size - end);
            end = total_size - 1;
        }
        else {
            // "bytes=N-" or "bytes=N-M"
            if (start === undefined || isNaN(start)) {
                throw new HttpError(416);
            }
            if (end === undefined || isNaN(end)) {
                end = total_size - 1;
            }
            // cap the chunk to maxChunkSize when configured
            if (typeof max_chunk === 'number' && max_chunk > 0) {
                end = Math.min(end, start + max_chunk - 1);
            }
            // never read past the end of the file
            end = Math.min(end, total_size - 1);
        }

        // unsatisfiable range (start past EOF, negative, or inverted)
        if (start < 0 || start >= total_size || end < start) {
            throw new HttpError(416);
        }

        // store the resolved range so this.range reflects it
        this._start = start;
        this._end = end;

        const chunk_size = (end - start) + 1;

        // if the chunk is actually the full file size, status is 200, else 206
        response.statusCode = chunk_size === total_size ? 200 : 206;

        // we are sending a byte range, set the headers
        response.assignHeaders({
            "Content-Length": chunk_size,
            "Content-Range": `bytes ${start}-${end}/${total_size}`,
            "Accept-Ranges": "bytes"
        });

        // set input stream with the resolved range (end is inclusive)
        response.stream(createReadStream(src_path, { start, end }));

    }


}
