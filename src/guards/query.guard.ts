import { Type, PropertyNamesNotOfType, Injectable, Inject, Injector } from '@uon/core';
import { ActivatedRoute } from '@uon/router';

import { HttpError } from '../error/error';
import { RequestQuery } from '../base/query';
import { HttpValidator } from '../model/validation';
import { HTTP_MODEL_ADAPTER, HttpModelAdapter } from '../model/model.adapter';


export type QueryGuardValidate<T, M = Pick<T, PropertyNamesNotOfType<T, Function>>> = {
    [K in keyof M]?: HttpValidator[]
} & { [k: string]: HttpValidator[] }


export interface QueryGuardOptions<T> {

    /**
     * Extra validation on top of model validation.
     * Can be used if no model is provided.
     */
    validate?: QueryGuardValidate<T>;


    /**
     * Throws a 400 http error on validation failure if set to true.
     * Otherwise you have to handle the validation failure yourself.
     * Validation results are stored in RequestQuery.
     * Defaults to true. 
     */
    throwOnValidation?: boolean;

}



/**
 * Validate query string
 */
export function QueryGuard<T>(type?: Type<T>, options: QueryGuardOptions<T> = {}) {

    return class _QueryGuard extends QueryGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            const rq = this.query as any;

            const result = type
                ? this.adapter.deserializeFromString(type, this.query.raw)
                : this.query.raw;

            rq._data = result;

            // run validation
            const validation_result = await this.adapter.validate(rq.value, options.validate, this.injector, 'query');

            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(422,
                    new Error("query validation failure"),
                    validation_result);
            }

            rq._validation = validation_result;

            // run formatting
            if(type) {
                this.adapter.applyFormatting(result);
            }

            return true;
        }
    };

}


@Injectable()
export class QueryGuardService {
    constructor(public query: RequestQuery,
        public injector: Injector,
        @Inject(HTTP_MODEL_ADAPTER) public adapter: HttpModelAdapter) { }
}
