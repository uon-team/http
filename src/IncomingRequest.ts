
import { InjectionToken } from "@uon/core";
import { IncomingMessage, IncomingHttpHeaders } from "http";
import { Url, parse as UrlParse } from "url";
import { TLSSocket } from "tls";
import { Socket } from "net";
import { HttpError } from "./HttpError";

// Injection token for the requst body configuration
export const HTTP_REQUEST_BODY_CONFIG = new InjectionToken<IncomingRequestBodyConfig>("HTTP_REQUEST_BODY_CONFIG");


/**
 * Configuration options for the request body
 */
export interface IncomingRequestBodyConfig {

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
 * The incoming request object
 * 
 */
export class IncomingRequest {

    private _uri: Url;
    private _clientIp: string;
    private _secure: boolean;

   // private _query: any;
    private _body: Promise<Buffer>;

    constructor(private _request: IncomingMessage) {

        this._uri = ParseUrl(_request);
        this._clientIp = _request.socket.remoteAddress;
        this._secure = _request.connection instanceof TLSSocket;

        this.parseForwardedHeaders();
    }

    /**
     * Whether the connection is secure or not (over https)
     */
    get secure(): boolean {
        return this._secure;
    }

    /**
     * Get the socket
     */
    get socket(): Socket {
        return this._request.socket;
    }

    /**
     * The http method used for the request
     */
    get method() {
        return this._request.method;
    }

    /**
     * The decomposed request url
     */
    get uri() {
        return this._uri;
    }

    /**
     * The requester's ip address
     */
    get clientIp() {
        return this._clientIp;
    }

    /**
     * The http version
     */
    get httpVersion() {
        return this._request.httpVersion;
    }

    /**
     * The request header map
     */
    get headers() {
        return this._request.headers;
    }

    /**
     * Get the request body
     */
    get body(): Promise<Buffer> {

        if (!this._body) {
            this._body = this.prepareBodyPromise();
        }

        return this._body;
    }

    /**
     * Validate the incoming request in respect to the request body and headers
     */
    validate(config: IncomingRequestBodyConfig) {
        // we need a length from the headers

        if (config.accept) {
            if (config.accept.indexOf(this.headers['content-type']) === -1) {
                throw new HttpError(400, new Error(`Content-Type must be set to (one of) ${config.accept.join(', ')}.`));
            }
        }

        // check if content-length is bigger than the max allowed body size
        if (config.maxLength) {

            let header_length_str = this.headers['content-length'];
            if (!header_length_str) {
                throw new HttpError(411, new Error(`Content-Length header field must be set.`));
            }

            let header_length = parseInt(header_length_str);
            if (header_length > config.maxLength) {
                throw new HttpError(413, new Error(`Content-Length of ${header_length} exceeds the limit of ${config.maxLength}.`));
            }
        }

    }

    /**
     * Prepares the request body stream into a promise
     */
    private prepareBodyPromise() {

        return new Promise<Buffer>((resolve, reject) => {

            // start with an empty body
            let body: any[] = [];

            // append chunks to the body as they come in
            this._request
                .on('data', (chunk) => {

                    body.push(chunk);

                }).on('end', () => {

                    resolve(Buffer.concat(body));

                }).on('error', (err) => {

                    reject(err);

                });

        });

    }

    /**
     * Parses the following headers :
     *  - X-Real-IP
     *  - X-Forwarded-Proto
     */
    private parseForwardedHeaders() {

        let real_ip = this._request.headers['x-real-ip'] as string;
        let real_proto = this._request.headers['x-forwarded-proto'] as string;

        // check if x-real-ip is set
        if (real_ip) {
            this._clientIp = real_ip;
        }

        // check the original protocol for https
        if (real_proto) {
            this._uri.protocol = real_proto;
            this._secure = real_proto.indexOf('https') === 0;
        }
    }


}


/**
 * @private
 * @param req 
 */
function ParseUrl(req: IncomingMessage) {

    let uri = UrlParse(req.url, true);

    let host_parts = req.headers.host ? req.headers.host.split(':') : [null, null];
    let host = host_parts[0];
    let port = host_parts[1];

    uri.protocol = (req.connection instanceof TLSSocket) ? 'https:' : 'http:';
    uri.host = req.headers.host;
    uri.hostname = host;
    uri.port = port;

    return uri;
}
