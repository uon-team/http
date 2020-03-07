import { Transform, TransformCallback } from 'stream';
import { IncomingHttpHeaders, STATUS_CODES, OutgoingHttpHeaders } from 'http';
import { Socket } from 'net';



export class MockOutgoingResponse extends Transform {

    public statusCode: number = 200;
    public statusMessage: string = STATUS_CODES[200];
    public finished: boolean = false;

    upgrading: boolean;
    chunkedEncoding: boolean;
    shouldKeepAlive: boolean;
    useChunkedEncodingByDefault: boolean;
    sendDate: boolean;;
    headersSent: boolean;
    connection: Socket;

    private _responseData: any[] = [];
    private _headers: OutgoingHttpHeaders = {};

    constructor() {
        super();
    }

    get headers() {
        return this._headers;
    }

    get responseData() {
        return Buffer.concat(this._responseData);
    }

    _transform(chunk: any, encoding: string, callback: TransformCallback) {

        this.push(chunk, encoding);
        this._responseData.push(chunk);
        callback();
    }

    end() {
        super.end(...arguments);
        this.finished = true;
    }

    setHeader(name: string, value: string | string[]) {
        this._headers[name.toLowerCase()] = value;
    }

    getHeader(name: string) {
        return this._headers[name.toLowerCase()];
    }

    getHeaders() {
        return this._headers;
    }

    getHeaderNames(): string[] {
        return Object.keys(this._headers);
    }

    hasHeader(name: string): boolean {
        return this._headers[name] !== undefined;
    }

    removeHeader(name: string) {
        delete this._headers[name.toLowerCase()];
    }

    writeHead(statusCode: number, headers?: any): void;
    writeHead(statusCode: number, reasonPhrase?: string, headers?: OutgoingHttpHeaders) {
        if (arguments.length == 2 && typeof arguments[1] !== 'string') {
            headers = reasonPhrase as any;
            reasonPhrase = undefined;
        }
        this.statusCode = statusCode;
        this.statusMessage = reasonPhrase || STATUS_CODES[statusCode] || 'unknown';
        if (headers) {
            for (var name in headers) {
                this.setHeader(name, headers[name] as any);
            }
        }
        //this.headersSent = true;
    }


    assignSocket(socket: Socket): void { }
    detachSocket(socket: Socket): void { }

    writeContinue(callback?: () => void): void { }

    setTimeout(msecs: number, callback?: () => void): this {
        return this;
    }

    addTrailers(headers: OutgoingHttpHeaders | Array<[string, string]>): void { }
    flushHeaders(): void { }

}