
import { InjectionToken, Injectable } from '@uon/core';
import { Router, MakeRouteHandlerDecorator, RouteHandlerData } from '@uon/router';


/**
 * The main Http router
 */
export const HTTP_ROUTER = new InjectionToken<Router<HttpRoute>>("HTTP_ROUTER");

/**
 * Redirect router
 */
export const HTTP_REDIRECT_ROUTER = new InjectionToken<Router<HttpRoute>>("HTTP_REDIRECT_ROUTER")



/**
 * The http route decorator parameters
 */
export interface HttpRoute extends RouteHandlerData {

    /**
     * an HTTP method, can be an array
     */
    method: string | string[];

    /**
     * The path to test
     */
    path: string;

    /**
     * A map of query fields to pre-validate and 
     * coerse to types before calling the decorated method
     */
    query?: any;


}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const HttpRoute = MakeRouteHandlerDecorator<HttpRoute>("HttpRoute")



/**
 * the match function for http routes
 * @param rh 
 * @param d 
 */
export function MatchMethodFunc(rh: HttpRoute, d: any) {

    if (!rh.method)
        return true;

    return rh.method.indexOf(d.method) > -1;
}
