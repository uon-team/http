
import { Inject, Injectable, InjectionToken, ObjectUtils } from '@uon/core';
import { HttpError } from './HttpError';
import { IncomingRequest } from './IncomingRequest';
import { OutgoingResponse, IOutgoingReponseModifier } from './OutgoingResponse';


export interface RangeConfigureOptions {

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
     * @param context 
     * @param config 
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

    configure(options: RangeConfigureOptions) {
        this._options = options;
        return this;
    }


    async modifyResponse(response: OutgoingResponse) {

        // if user set accept to true, set header
        if (this._acceptRangeRequest) {
            response.headers["Accept-Ranges"] = "bytes";
        }


        // must be configured to continue
        if (!this._options) {
            return;
        }

        const start_byte = this._start;
        /*const src_adapter = this._options.srcAdapter;
        const src_path = this._options.srcPath;

        if (start_byte !== undefined) {

            return src_adapter.stat(src_path).then((stats) => {

                const total_size = stats.size;
    
                this._end = Math.min(start_byte + this.config.maxChunkSize, this._end || total_size - 1);

                if (this._end >= total_size) {
                    throw new HttpError(416);
                }
    
                // compute the chunk size
                let chunk_size = (this._end - start_byte) + 1;
    
                // if the chunk is actually the full file size, status is 200, else 206
                response.statusCode = chunk_size === total_size ? 200 : 206;
    
                // we are sending a a byte range, set the headers
                response.assignHeaders({
                    "Content-Length": chunk_size,
                    "Content-Range": `bytes ${start_byte}-${this._end}/${total_size}`,
                    "Accept-Ranges": "bytes"
                });

                // set input stream with range
                response.stream(src_adapter.createReadStream(src_path, this.range));
    
            });


        }*/


    }


}
