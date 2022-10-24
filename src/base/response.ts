import { OutgoingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import { Writable, Stream, Readable } from "stream";


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


    get isNull() {
        return this._response === null;
    }
    /**
     * Whether the headers were sent
     */
    get sent() {
        return this._response
            ? this._response.headersSent || this._response.finished
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


        if (data) {
            // create readable stream from data
            let readable = new Readable();
            readable.push(data, encoding);
            data && readable.push(null);

            // stream response
            this.stream(readable);
        }


        return this.finish();
    }

    /**
     * Sends a redirect header
     * @param location The url to redirect to
     * @param permanent Whether this is meant to be a permanent redirection (301 vs 302)
     */
    async redirect(location: string, permanent?: boolean) {

        
        this.setHeader('Location', location);
        this.statusCode = permanent === true ? 301 : 302;

        /*
        this._response.writeHead(permanent === true ? 301 : 302, {
            'Location': location
        });

        this._response.end();*/

        return this.finish();

    }


    /**
     * Respond with JSON
     * @param obj 
     */
    json(payload: any, options: JsonResponseConfig = {}) {


        const func = async (res: OutgoingResponse) => {

            let result: string = typeof payload === 'string'
                ? payload
                : JSON.stringify(options.keep ? Filter(payload, options.keep) : payload, null, options.pretty ? '\t' : null);

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
        };

        this.use(
            new ClosureResponseModifer(func)
        );

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

        transforms.forEach((t) => {
            if(this._modifiers.indexOf(t) === -1) {
                this._modifiers.push(t);
            }
        });

    }

    /**
     * Executes the pipeline until a response is sent
     */
    async finish() {

        // prevent this from being executed twice
        // this can happen when a modifier uses send() 
        // inside it's modifyResponse method
        if (this._finishing) {
            return;
        }
        this._finishing = true;


        // execute all modifiers up until a response is sent
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
            await AwaitStream(this._inputStream);
        }
        else {
            // no content
            // if status code was unmodified, set to 204, else just use it as is
            this.statusCode = this._statusCode === 200 ? 204 : this._statusCode;
            this._response.writeHead(this.statusCode, this._headers);
            this._response.end();

        }


    }

}


class ClosureResponseModifer implements IOutgoingReponseModifier {

    constructor(private func: (res: OutgoingResponse) => Promise<any>) { }

    modifyResponse(res: OutgoingResponse): Promise<any> {
        return this.func(res);
    }

}

function AwaitStream(stream: Stream) {

    return new Promise((resolve) => {
        stream.on('end', resolve);
    });
}


function _Filter(target: any, fields: string[]) {
    let result: any = {};
    for (let i = 0; i < fields.length; ++i) {
        let field = fields[i];
        result[field] = target[field];
    }

    return result;
}

function Filter(target: any, fields: string[]) {
    if(Array.isArray(target)) {
        return target.map((el) => {
            return _Filter(el, fields);
        });
    }
    return _Filter(target, fields);
}