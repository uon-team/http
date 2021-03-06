import { Provider, InjectionToken } from '@uon/core';
import { Router } from '@uon/router';
import { HTTP_ROUTER } from './http.router';



// the unique http config token
export const HTTP_CONFIG = new InjectionToken<HttpConfig>('HTTP_CONFIG');

/**
 * The http config options
 */
export interface HttpConfig {

    /**
     * the port to listen to on the https server, defaults to 4433
     */
    port?: number;

    /**
     * the port to listen to for non-secure http, defaults to 8080
     */
    plainPort?: number;

    /**
     * an ip/range to listen to on the host, defaults to 127.0.0.1 (local only)
     */
    host?: string;

    /**
     * a list of extra providers for the request-scoped injector
     */
    providers?: Provider[];

    /**
     * Whether to console.log errors generated by HttpContext procesing 
     */
    traceContextErrors?: boolean;

    /**
     * A token to fetch the router
     * Defaults to HTTP_ROUTER
     */
    routerToken?: InjectionToken<Router<any>>;


    /**
     * Starts the module without starting an http server
     */
    serverless?: boolean;

}


export const HTTP_CONFIG_DEFAULTS: HttpConfig = {
    port: 4433,
    plainPort: 8080,
    host: '127.0.0.1',
    traceContextErrors: true,
    routerToken: HTTP_ROUTER
};