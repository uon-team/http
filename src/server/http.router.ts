
import { InjectionToken, Injectable, MakeUnique } from '@uon/core';
import { Router, MakeRouteHandlerDecorator, RouteHandlerData, RouteGuard, ActivatedRoute } from '@uon/router';
import { Validator, ValidationFailure } from '@uon/model';

import { IncomingRequest } from '../base/request';
import { RequestQuery } from '../base/query';
import { HttpError } from '../error/error';


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

}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const HttpRoute = MakeUnique("@uon/http/HttpRoute", MakeRouteHandlerDecorator<HttpRoute>("HttpRoute"))


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






