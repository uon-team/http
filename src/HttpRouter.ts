
import { InjectionToken, Injectable, MakeUnique } from '@uon/core';
import { Router, MakeRouteHandlerDecorator, RouteHandlerData, RouteGuard, ActivatedRoute } from '@uon/router';
import { IncomingRequest } from './IncomingRequest';
import { RequestQuery } from './Query';
import { HttpError } from './HttpError';
import { Validator, ValidationFailure } from '@uon/model';


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



/**
 * Validate route params
 */
export function RouteParamsGuard(validators: { [k: string]: Validator[] }) {

    return function _RouteParamsGuard(ar: ActivatedRoute<any>) {

        const validate_keys = Object.keys(ar.params);
        const errors: string[] = [];
        const error_data: any = {};

        for (let i = 0; i < validate_keys.length; ++i) {
            const k = validate_keys[i];

            // check the required fields
            if (validators[k]) {

                validators[k].forEach((v) => {

                    try {
                        v(ar.params, k, ar.params[k])
                    }
                    catch (err) {
                        if (err instanceof ValidationFailure) {
                            errors.push(err.reason);
                            error_data[k] = err.reason;
                        }
                    }
                });
            }

        }

        if (errors.length) {
            throw new HttpError(400, new Error(errors.join('\r\n')), { paramsError: error_data });
        }

        return true;
    }
}




