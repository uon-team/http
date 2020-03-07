import { Type, Injector, Provider, InjectionToken, GetTypeMetadata } from '@uon/core';
import { RouteMatch, ActivatedRoute, RouterOutlet, RouteParams, RouteData } from '@uon/router';
import { IncomingMessage, ServerResponse, OutgoingHttpHeaders, STATUS_CODES } from 'http';
import { Url } from 'url';

import { HttpError } from '../error/error';
import { OutgoingResponse } from './response';
import { IncomingRequest } from './request';
import { HttpErrorHandler, HTTP_ERROR_HANDLER } from '../error/error';

/**
 * Multi provider token for upgrade handlers
 */
export const HTTP_UPGRADE_HANDLER = new InjectionToken<HttpUpgradeHandler<any>[]>("HTTP_UPGRADE_HANDLER");

/**
 * Declares a handler for http upgrades
 */
export interface HttpUpgradeHandler<T> {
    protocol: string;
    type: Type<T>;
    accept(uc: HttpContext, headers: OutgoingHttpHeaders): Promise<T>;
}


/**
 * Parameters for HttpContext constructor
 */
export interface HttpContextOptions {

    // the root injector
    injector: Injector;

    // the request coming from node http server
    req: IncomingMessage;

    // the response object from node's http server
    res: ServerResponse;

    // a list of providers for the request-scoped injector
    providers: Provider[];

    // optional head buffer used in upgrade
    head?: Buffer;

    /**
     * Whether to console.trace error generated from outlets
     */
    traceErrors?: boolean;

}

/**
 * An object containing the state of a request and response and acts as an
 * as the root injector for the routing and instanciating of the controllers 
 *
 */
export class HttpContext {

    readonly request: IncomingRequest;
    readonly response: OutgoingResponse;
    readonly uri: Url;
    readonly head: Buffer;

    private _root: Injector;
    private _injector: Injector;
    private _providers: Provider[];
    private _processing: boolean = false;


    private _traceErrors: boolean = false;

    /**
     * Creates a new context for the isolated request specific app
     * @param req 
     * @param res 
     */
    constructor(options: HttpContextOptions) {

        this._root = options.injector;
        this._providers = options.providers;

        this.request = new IncomingRequest(options.req);
        this.response = new OutgoingResponse(options.res);

        this.head = options.head;
        this._traceErrors = !!options.traceErrors;
    }

    /**
     * Process the matching routes
     */
    async process(match: RouteMatch) {

        // fool guard
        if (this._processing) {
            throw new Error(`You cannot call process() twice on the same HttpContext.`);
        }
        this._processing = true;
        
        // create the injector
        this._injector = Injector.Create(this.getProviderList(match), this._root);

        // 404 on no match
        if (!match) {
            throw new HttpError(404);
        }

        // process route guards
        const guard_pass = await match.checkGuards(this._injector);

        // Guards can send a response too you know
        if (this.response.sent && !this.response.isNull) {
            // we all done here
            return;
        }
        // all guards must pass to continue,
        else if (!guard_pass) {
            // precondition failed
            throw new HttpError(412);

        }

        // resolve route data
        await match.resolveData(this._injector);

        // finally call handler
        return await match.callHandler(this._injector);

    }

    /**
     * Process an HttpError
     * @param error 
     */
    async processError(match: RouteMatch, error: HttpError) {

        // if the controller has a onHttpError method, we use that
        if (match && match.outlet.prototype.onHttpError) {

            const ctrl = await this._injector.instanciateAsync(match.outlet);

            return await ctrl.onHttpError(error);
        }

        // else use the defined HttpErrorHandler
        const handler: HttpErrorHandler = this._injector.get<HttpErrorHandler>(HTTP_ERROR_HANDLER);

        if (this._traceErrors && error.error) {
            console.error(error.error);
        }

        await handler.send(error);

    }


    /**
     * Attempt a connection upgrade to a type declared in an HttpUpgradeHandler
     * @param type 
     */
    async upgrade<T>(type: Type<T>, headers: OutgoingHttpHeaders = {}) {

        if (!this.request.headers.upgrade) {
            throw new Error('Cannot upgrade connection, no Upgrade header in request.');
        }

        // grab all defined upgrade handlers
        const handlers: HttpUpgradeHandler<any>[] = this._root.get(HTTP_UPGRADE_HANDLER, []);

        // get type upgrade type in the request header
        const protocol = this.request.headers.upgrade.toLowerCase();

        // select the corresponding upgrade handler
        let handler: HttpUpgradeHandler<T>;
        for (let i = 0; i < handlers.length; ++i) {
            if (handlers[i].protocol === protocol) {
                handler = handlers[i];
                break;
            }
        }

        if (!handler) {
            throw new Error(`No handler for upgrade protocol ${protocol}`);
        }

        if (type !== handler.type) {
            throw new Error(`Wrong type provided. Expected ${handler.type.name}, got ${type.name}`);
        }

        return handler.accept(this, headers);

    }

    /**
     * Aborts the connection
     * @param code 
     * @param message 
     */
    async abort(code: number, message: string, headers: OutgoingHttpHeaders = {}) {

        const socket = this.request.socket;

        if (socket.writable) {

            message = message || STATUS_CODES[code] || '';
            headers = Object.assign({
                'Connection': 'close',
                'Content-type': 'text/plain',
                'Content-Length': Buffer.byteLength(message)
            }, headers);

            let res = socket.write(
                `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n` +
                Object.keys(headers).map(h => `${h}: ${headers[h]}`).join('\r\n') +
                '\r\n\r\n' +
                message
            );

        }

        socket.destroy();
    }


    /**
     * Get the provider list for this context's injector
     * @param match 
     */
    private getProviderList(match: RouteMatch) {

        // we need a list of providers before we create an injector
        // start with this for a start
        let providers: Provider[] = [
            {
                token: HttpContext,
                value: this
            },
            {
                token: OutgoingResponse,
                value: this.response
            },
            {
                token: IncomingRequest,
                value: this.request
            }
        ];


        // append all extra providers
        providers = providers.concat(this._providers);


        // append match providers
        if (match) {

            const activated = match.toActivatedRoute();
            providers.push(
                {
                    token: ActivatedRoute,
                    value: activated
                },
                {
                    token: RouteParams,
                    value: activated.params
                },
                {
                    token: RouteData,
                    value: activated.data
                }
            );

            // get controller specific providers
            let controller_meta: RouterOutlet = GetTypeMetadata(match.outlet).filter(t => t instanceof RouterOutlet)[0];
            if (controller_meta && controller_meta.providers) {
                providers = providers.concat(controller_meta.providers);
            }
        }

        return providers;

    }


}





