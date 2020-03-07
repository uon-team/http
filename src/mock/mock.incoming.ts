
import { Transform, TransformCallback } from 'stream';
import { IncomingHttpHeaders, STATUS_CODES, OutgoingHttpHeaders } from 'http';
import { Socket } from 'net';


export class MockIncomingMessage extends Transform {

    private _failError: Error;
    private _headers: IncomingHttpHeaders = {};
    private _rawHeaders: string[] = [];

    httpVersion: string;
    httpVersionMajor: number;
    httpVersionMinor: number;
    connection: Socket;
    socket: Socket;
    trailers: { [key: string]: string | undefined };
    rawTrailers: string[];

    constructor(readonly url: string,
        readonly method: string,
        headers: IncomingHttpHeaders = {},
        buffer?: Buffer) {

        super({ writableObjectMode: true, readableObjectMode: false });


        Object.keys(headers)
            .forEach((key) => {
                let val: any = headers[key];

                if (val !== undefined) {
                    this._headers[key.toLowerCase()] = val;
                    this._rawHeaders.push(key);
                    this._rawHeaders.push(val);
                }
            });

        if (buffer) {
            this.push(buffer);
        }


    }

    get headers() {
        return this._headers;
    }

    get rawHeaders() {
        return this._rawHeaders;
    }

    _transform(chunk: any, encoding: string, callback: TransformCallback) {

        if (this._failError)
            return this.emit('error', this._failError);

        if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk))
            chunk = JSON.stringify(chunk);

        this.push(chunk);

        callback();
    }

    _fail(error: Error) {
        this._failError = error;
    }

    setTimeout(msecs: number, callback: () => void): this {
        return this;
    }


}