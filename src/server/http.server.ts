

import { Injectable, Inject, Optional, EventSource, Injector, Provider, Application } from '@uon/core';
import { Router, RouteMatch } from '@uon/router';

import { Server, IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';
import * as https from 'https';
import { Socket } from 'net';
import { parse as ParseUrl } from 'url';

import { HttpContext } from '../base/context';
import { HttpConfig, HTTP_CONFIG } from './http.config';
import { HTTP_PROVIDERS } from './http.providers';

import { HTTP_REDIRECT_ROUTER, MatchMethodFunc, HttpRoute } from './http.router';

import { HTTP_TLS_PROVIDER, TLSProvider } from './tls.provider';

import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

import { HttpError } from '../error/error';


const ROUTER_MATCH_FUNCS = [MatchMethodFunc];


export interface MockRequestOptions {
    url: string;
    method: string;
    headers: IncomingHttpHeaders;
    body?: Buffer;
}

/**
 * 
 */
@Injectable()
export class HttpServer extends EventSource {

    private _started: boolean;

    private _http: Server;
    private _https: https.Server;

    private _contextProviders: Provider[];

    constructor(private injector: Injector,
        private _app: Application,
        @Inject(HTTP_CONFIG) private config: HttpConfig,
        @Inject(HTTP_PROVIDERS) extraProviders: Provider[][],
        @Optional() @Inject(HTTP_TLS_PROVIDER) private tlsProvider: TLSProvider,
    ) {

        super();

        // flatten providers
        const providers: Provider[] = [];

        for (let i = 0; i < extraProviders.length; ++i) {
            let provider_list = extraProviders[i];
            for (let j = 0; j < provider_list.length; ++j) {
                providers.push(provider_list[j]);
            }
        }

        this._contextProviders = providers.concat(config.providers);

    }

    /**
     * Whether the server is listening or not
     */
    get listening(): boolean {
        return this._started;
    }

    /**
     * Access to the plain http server 
     */
    get http() {
        return this._http;
    }

    /**
     * Access to the secure http server, if available
     */
    get https() {
        return this._https;
    }

    /**
     * Start listening to incoming messages
     */
    async start() {

        // maybe we already started this thing, we should let the user know
        if (this._started) {
            throw new Error('HttpServer already started');
        }

        // set the started flag to true right away
        this._started = true;


        // create plain http server
        this.spawnHttpServer();


        // if a tls provider is defined, create an https server
        if (this.tlsProvider) {

            await this.spawnHttpsServer();
            return this;

        }

        return this;
    }


    /**
     * Add an event listener that will be called on every request
     */
    on(type: 'request', callback: (context: HttpContext) => any, priority?: number): void;

    /**
     * Add an event listener that will be called when an HttpError occurs
     */
    on(type: 'error', callback: (context: HttpContext, error: HttpError) => any, priority?: number): void;



    /**
     * Adds an event listener
     * @param type 
     * @param callback 
     */
    on(type: string, callback: (...args: any[]) => any, priority: number = 100) {
        return super.on(type, callback, priority);
    }


    /**
     * Make a mock request to the application
     * @param options 
     */
    async mockRequest(options: MockRequestOptions) {

        // fetch the root http router
        const router: Router<HttpRoute> = this.injector.get(this.config.routerToken);

        // create mock request object
        const mock_req = new MockIncomingMessage(options.url, options.method, options.headers || {}, options.body);
        mock_req.end();

        // create mock response object
        const mock_res = new MockOutgoingResponse();

        const pathname = ParseUrl(options.url, false).pathname;
        const method = options.method.toUpperCase();

        // get match
        const match = router.match(pathname, { method }, ROUTER_MATCH_FUNCS);

        // select the proper injector
        let root_injector = this.selectInjector(match);

        // create a new context
        const http_context = new HttpContext({
            injector: root_injector,
            providers: this._contextProviders,
            req: mock_req,
            res: mock_res,
            traceErrors: this.config.traceContextErrors
        });


        // try processing it
        try {

            // execute the http context
            await http_context.process(match);

            // make sure a response was sent
            if (!http_context.response.sent) {
                console.error(`RouterOutlet ${match.outlet.name}.${match.handler.methodKey} did not provide a response.`);
                throw new HttpError(501);
            }
        }
        catch (ex) {

            // must be HttpError from this point
            let error = ex instanceof HttpError
                ? ex
                : new HttpError(500, ex);

            // process the error on the context 
            await http_context.processError(match, error);

        }

        // return a resolved response object
        const result = {
            statusCode: mock_res.statusCode,
            statusMessage: mock_res.statusMessage,
            headers: mock_res.headers,
            body: mock_res.responseData
        };

        return result;
    }

    /**
     * Spawns a plain http server
     */
    private spawnHttpServer() {

        // create a plain http server
        this._http = new Server(this.tlsProvider ?
            this.handleHttpsRedirect.bind(this) :
            this.handleRequest.bind(this));

        // start listening right away
        this._http.listen(this.config.plainPort, this.config.host, (err: Error) => {
            if (err) {
                throw err;
            }
            console.log(`HTTP server listening on ${this.config.host}:${this.config.plainPort}`);
        });

        // bind upgrade only if tlsProvider is not defined
        if (!this.tlsProvider) {
            this._http.on('upgrade', this.handleConnectionUpgrade.bind(this));
        }
    }

    /**
     * (Re)spawns an https server
     */
    private async spawnHttpsServer() {

        // shutdown the current server if it exists
        if (this._https) {
            await new Promise<void>((resolve) => {
                this._https.close(() => {
                    this._https = null;
                    resolve();
                });
            });
        }

        let default_cert = await this.tlsProvider.getDefault();

        const ssl_options: https.ServerOptions = {
            SNICallback: (domain, cb) => {
                this.tlsProvider.getSecureContext(domain)
                    .then((context) => {
                        cb(!context ? new Error(`No certificate for ${domain}`) : null, context);
                    });

            },
            key: default_cert.key,
            cert: default_cert.cert
        };

        // create https server
        this._https = https.createServer(ssl_options, this.handleRequest.bind(this));

        // listen to upgrade event
        this._https.on('upgrade', this.handleConnectionUpgrade.bind(this));

        // listen to incoming connections
        this._https.listen(this.config.port, this.config.host, (err: Error) => {
            if (err) {
                throw err;
            }

            console.log(`HTTPS server listening on ${this.config.host}:${this.config.port}`);
        });

    }

    /**
     * Handle a request
     * @param req 
     * @param res 
     */
    private async handleRequest(req: IncomingMessage, res: ServerResponse) {

        // the time the handling of the request started
        const current_time = Date.now();

        // fetch the root http router
        const router: Router<HttpRoute> = this.injector.get(this.config.routerToken);


        const pathname = ParseUrl(req.url, false).pathname;
        const method = req.method;

        // get match
        const match = router.match(pathname, { method }, ROUTER_MATCH_FUNCS);

        // select the proper injector
        let root_injector = this.selectInjector(match);

        // create a new context
        const http_context = new HttpContext({
            injector: root_injector,
            providers: this._contextProviders,
            req: req,
            res: res,
            traceErrors: this.config.traceContextErrors
        });


        // try processing it
        try {

            // emit the request event first
            await this.emit('request', http_context);

            // execute the http context
            await http_context.process(match);

            // make sure a response was sent
            if (!http_context.response.sent) {
                console.error(`RouterOutlet ${match.outlet.name}.${match.handler.methodKey} did not provide a response.`);
                throw new HttpError(501);
            }
        }
        catch (ex) {

            // must be HttpError from this point
            let error = ex instanceof HttpError
                ? ex
                : new HttpError(500, ex);

            // fire up the error event
            await this.emit('error', http_context, error);

            // process the error on the context 
            await http_context.processError(match, error);


            // last chance was given to respond
            if (!http_context.response.sent) {

                // respond with a plain text error
                http_context.response.statusCode = error.code;
                http_context.response.send(error.message);

            }

        }

    }

    /**
     * Handle the http to https redirect
     */
    private handleHttpsRedirect(req: IncomingMessage, res: ServerResponse) {

        // fetch the redirect http router
        const router: Router<HttpRoute> = this.injector.get(HTTP_REDIRECT_ROUTER);

        // get matches
        const matches = router.match(ParseUrl(req.url, false).pathname, { method: req.method }, ROUTER_MATCH_FUNCS);

        // create a new context
        const http_context = new HttpContext({
            injector: this.injector,
            providers: this.config.providers,
            req: req,
            res: res
        });

        http_context.process(matches)
            .catch((ex: HttpError) => {

                // always redirect on error
                const new_url = 'https://' + req.headers.host + req.url;
                res.writeHead(301, { Location: new_url });
                res.end();

            });

    }

    /**
     * Handles http upgrade request
     * @param req 
     * @param socket 
     * @param head 
     */
    private async handleConnectionUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {

        // fetch the root http router
        const router: Router<HttpRoute> = this.injector.get(this.config.routerToken);


        const pathname = ParseUrl(req.url, false).pathname;
        const method = "UPGRADE";

        // get match
        const match = router.match(pathname, { method }, ROUTER_MATCH_FUNCS);

        // select the proper injector
        let root_injector = this.selectInjector(match);

        // create context
        const context = new HttpContext({
            injector: root_injector,
            providers: this._contextProviders,
            req,
            res: null,
            head
        });


        try {
            // process the match
            await context.process(match);

        }
        catch (ex) {

            let error = ex instanceof HttpError
                ? ex
                : new HttpError(500, ex);

            context.abort(error.code, error.message);
        }

    }

    private selectInjector(match: RouteMatch) {

        let root_injector = this.injector;

        if (match && match.outlet) {
            // need to get module injector
            let ref = this._app.declarations.get(match.outlet);
            if (!ref) {
                throw new Error(`${match.outlet.name} is not declared in any loaded modules`);
            }

            root_injector = ref.injector;
        }

        return root_injector;
    }

}