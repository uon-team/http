
import { Injectable } from "@uon/core";
import { ActivatedRoute } from "@uon/router";
import { HttpError } from "./HttpError";
import { IncomingRequest } from "./IncomingRequest";


/**
 * Object containing the parsed query string as key/value map
 * If QueryGuard is used, coersed values are assigned to this object
 */
export interface RequestQuery {
    [k: string]: any;
}

export class RequestQuery { }


export interface QueryArgumentDefinition {
    /**
     * Coerse value to type
     */
    coerse?: (val: any) => any;

    /**
     * Whether this field is required
     */
    required?: boolean;

    /**
     * Match the field value with a regex.
     * This happens before type-coersion
     */
    match?: RegExp;

    /**
     * The default value as if it was set by the request (before coersion)
     */
    defaultValue?: any;


}

export interface QueryDefinition {
    [k: string]: QueryArgumentDefinition;
}

/**
 * Validate query string
 */
export function QueryGuard(queryDef: QueryDefinition) {

    return class _QueryGuard extends QueryGuardService {

        checkGuard(ar: ActivatedRoute<any>): boolean | Promise<boolean> {

            const original_query = this.request.uri.query as any;

            const validate_keys = Object.keys(queryDef);
            const errors: string[] = [];
            const error_data: any = {};

            for (let i = 0; i < validate_keys.length; ++i) {
                let k = validate_keys[i];

                // set default value, if any
                this.query[k] = original_query[k] || queryDef[k].defaultValue;

                // check the required fields
                if (queryDef[k].required && !original_query[k]) {
                    error_data[k] = 'required';
                    errors.push(`Query field "${k}" is required.`);
                    continue;
                }

                // check for regex match
                if (queryDef[k].match && original_query[k]) {
                    if (!queryDef[k].match.test(original_query[k])) {
                        error_data[k] = 'patternMismatch';
                        errors.push(`Query field "${k}" doesn't match ${queryDef[k].match.toString()}.`);
                        continue;
                    }
                }

                // do type coersion if defined
                if (queryDef[k].coerse && original_query[k] !== undefined) {

                    if (Array.isArray(original_query[k])) {
                        this.query[k] = original_query[k].map((u: string) => queryDef[k].coerse(u));
                    }
                    else {
                        this.query[k] = queryDef[k].coerse(original_query[k]);
                    }

                }

            }

            if (errors.length) {
                throw new HttpError(400, new Error(errors.join('\r\n')), { queryError: error_data });
            }

            return true;
        }
    };

}


@Injectable()
export class QueryGuardService {
    constructor(public request: IncomingRequest, public query: RequestQuery) { }
}
