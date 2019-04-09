import { OutgoingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import { Writable, Stream, Readable } from "stream";
import { ObjectUtils } from "@uon/core";


export interface IOutgoingReponseModifier {
    modifyResponse(res: OutgoingResponse): Promise<any>;
}

export interface JsonResponseConfig {

    /**
     * Whether to print json with tab spaces
     */
    pretty?: boolean;


    /**
     * Prefix the output with the well-known string ")]}',\n"
     * to prevent XSSI attacks
     */
    prefixOutput?: boolean;

    /**
     * Eliminate all keys not in the array
     */
    keep?: string[];

}


/**
 * Interface responsible for building and sending the server response
 */
export class OutgoingResponse {

    private _modifiers: IOutgoingReponseModifier[] = [];
    private _inputStream: Stream;

    private _statusCode: number = 200;
    private _headers: OutgoingHttpHeaders = {};

    private _finishing: boolean = false;

    /**
     * Creates a new server response wrapper
     * @param _response 
     */
    constructor(private _response: ServerResponse) { }

    /**
     * Whether the headers were sent
     */
    get sent() {
        return this._response
            ? this._response.headersSent || this._response.finished || this._finishing
            : true;
    }

    /**
     * The status code that will be sent with headers
     */
    get statusCode() {
        return this._statusCode;
    }

    /**
     * Sets the status code for the response
     */
    set statusCode(val: number) {
        this._statusCode = val;
    }

    /**
     * Get the header map that will be sent
     */
    get headers() {
        return this._headers;
    }

    /**
     * Sets a header by name
     * @param name 
     * @param value 
     */
    setHeader(name: string, value: string | string[] | number) {

        this._headers[name] = value;
        return this;
    }

    /**
     * Get a previously set header by name
     * @param name 
     */
    getHeader(name: string) {
        return this._headers[name];
    }

    /**
     * Set multiple headers, replacing the ones set previously
     * @param headers 
     */
    assignHeaders(headers: OutgoingHttpHeaders) {
        Object.assign(this._headers, headers);
    }


    /**
     * Sends some data and finalize the server response 
     */
    async send(data: Buffer | string | null, encoding?: string) {

        // create readable stream from data
        let readable = new Readable();
        readable.push(data, encoding);
        data && readable.push(null);

        // stream response
        this.stream(readable);

        return this.finish();
    }

    /**
     * Sends a redirect header
     * @param location The url to redirect to
     * @param permanent Whether this is meant to be a permanent redirection (301 vs 302)
     */
    redirect(location: string, permanent?: boolean) {

        this._response.writeHead(permanent === true ? 301 : 302, {
            'Location': location
        });

        this._response.end();

    }


    /**
     * Respond with JSON
     * @param obj 
     */
    json(payload: any, options: JsonResponseConfig = {}) {

        let result: string = typeof payload === 'string'
            ? payload
            : JSON.stringify(options.keep ? ObjectUtils.filter(payload, options.keep) : payload, null, options.pretty ? '\t' : null);

            

        // prefix output if specified in options
        if (options.prefixOutput) {
            result = ")]}',\n" + result;
        }

        // set content type to json
        this.setHeader('Content-Type', 'application/json');

        // specify length also
        this.setHeader('Content-Length', Buffer.byteLength(result));

        // create readable stream from json string
        let readable = new Readable();
        readable.push(result);
        readable.push(null);

        // stream response
        this.stream(readable);

    }

    /**
     * Sets the data input stream
     * @param readable 
     */
    stream(readable: Stream) {
        this._inputStream = readable;
    }

    /**
     * Use a modifier in the pipeline
     * @param transform 
     */
    use(...transforms: IOutgoingReponseModifier[]) {
        this._modifiers.push(...transforms);
    }

    /**
     * Executes the pipeline until a response is sent
     */
    async finish() {

        if (this._finishing) {
            return;
        }

        this._finishing = true;

        for (let i = 0; i < this._modifiers.length; ++i) {

            if (this.sent) {
                return;
            }

            await this._modifiers[i].modifyResponse(this);

        }

        // finally send the response if an input stream is set
        if (this._inputStream) {

            this._response.writeHead(this._statusCode, this._headers);
            this._inputStream.pipe(this._response);
        }
        else {

            // no content
            this._response.writeHead(204, this._headers);
            this._response.end();

        }


    }

}