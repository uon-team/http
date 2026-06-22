
import { InjectionToken } from "@uon/core";
import { IncomingMessage, IncomingHttpHeaders } from "http";
import { Url, parse as UrlParse,  } from "url";
import { TLSSocket } from "tls";
import { Socket } from "net";
import { HttpError } from "../error/error";


/**
 * Hard upper bound on how many bytes the request body promise will buffer.
 * This is a safety net against memory-exhaustion when a route reads
 * `request.body` without a BodyGuard maxLength; it is deliberately generous.
 */
const MAX_BUFFERED_BODY_SIZE = 100 * 1024 * 1024; // 100 MB



/**
 * The incoming request object
 * 
 */
export class IncomingRequest {

    private _uri: Url;
    private _clientIp: string | null;
    private _secure: boolean;

   // private _query: any;
    private _body!: Promise<Buffer>;

    constructor(private _request: IncomingMessage) {

        this._uri = ParseUrl(_request);
        this._clientIp = _request.socket?.remoteAddress ?? null;
        this._secure = _request.connection instanceof TLSSocket;

        this.parseForwardedHeaders();
    }

    /**
     * Whether the connection is secure or not (over https).
     *
     * NOTE: this is derived from the `X-Forwarded-Proto` header when present,
     * which a direct client can spoof. Only trust it behind a trusted proxy.
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
     * The requester's ip address.
     *
     * NOTE: this is taken from the first `X-Forwarded-For` entry when present,
     * which a direct client can spoof. Only trust it behind a trusted proxy.
     */
    get clientIp() {
        return this._clientIp;
    }

    /**
     * The user agent as it appears in the request headers
     */
    get userAgent() {
        return this._request.headers['user-agent'];
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
     * Get the request body buffer as a promise
     */
    get body(): Promise<Buffer> {

        if (!this._body) {
            this._body = this.prepareBodyPromise();
        }

        return this._body;
    }

    /**
     * Prepares the request body stream into a promise
     */
    private prepareBodyPromise() {

        return new Promise<Buffer>((resolve, reject) => {

            // start with an empty body
            let body: any[] = [];
            let size = 0;

            // append chunks to the body as they come in
            this._request
                .on('data', (chunk) => {

                    size += chunk.length;

                    // enforce a hard ceiling so an oversized/streamed body can't
                    // exhaust memory when no maxLength guard is in place
                    if (size > MAX_BUFFERED_BODY_SIZE) {
                        reject(new HttpError(413, new Error(`Request body exceeds the ${MAX_BUFFERED_BODY_SIZE} byte limit.`)));
                        this._request.destroy();
                        return;
                    }

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
     *  - X-Forwarded-For
     *  - X-Forwarded-Proto
     */
    private parseForwardedHeaders() {

        let real_ip = this._request.headers['x-forwarded-for'];
        let real_proto = this._request.headers['x-forwarded-proto'] as string;

        // parse x-forwarded-for to get the client ip
        if (real_ip) {
            let ff = Array.isArray(real_ip) ? real_ip[0] : real_ip as string;
            this._clientIp = ff.split(',').map(f => f.trim())[0];
        }

        // check the original protocol for https. NOTE: X-Forwarded-* headers are
        // trusted as-is; only enable behind a trusted proxy (see README).
        if (real_proto) {
            const proto = real_proto.split(',')[0].trim();
            this._secure = proto.indexOf('https') === 0;
            // keep the trailing colon consistent with ParseUrl ('https:'/'http:')
            this._uri.protocol = this._secure ? 'https:' : 'http:';
        }
    }


}


/**
 * @private
 * @param req 
 */
function ParseUrl(req: IncomingMessage) {

    let uri = UrlParse(req.url || '', true);

    let host_parts = req.headers.host ? req.headers.host.split(':') : [null, null];
    let host = host_parts[0];
    let port = host_parts[1];

    uri.protocol = (req.connection instanceof TLSSocket) ? 'https:' : 'http:';
    uri.host = req.headers.host || `${host}:${port}`;
    uri.hostname = host;
    uri.port = port;

    return uri;
}
