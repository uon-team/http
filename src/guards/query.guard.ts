import { Type, PropertyNamesNotOfType, Injectable, Injector } from '@uon/core';
import { ActivatedRoute } from '@uon/router';
import { Validator, Model, JsonSerializer, FindModelAnnotation, Validate, GetModelMembers } from '@uon/model';

import { HttpError } from '../error/error';
import { RequestQuery } from '../base/query';
import { TryCoerceToModel } from '../base/utils';


export type QueryGuardValidate<T, M = Pick<T, PropertyNamesNotOfType<T, Function>>> = {
    [K in keyof M]?: Validator[]
} & { [k: string]: Validator[] }


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

    let model_meta: Model;
    let serializer: JsonSerializer<T>;
    if (type) {
        model_meta = FindModelAnnotation(type);
        if (!model_meta) {
            throw new Error(`You must provide a @Model decorated type, ${type.name} was not.`);
        }

        serializer = new JsonSerializer(type);
    }


    return class _QueryGuard extends QueryGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            const rq = this.query as any;

            const result = type
                ? serializer.deserialize(TryCoerceToModel(GetModelMembers(model_meta), this.query.raw))
                : this.query.raw;

            rq._data = result;

            // run validation
            const validation_result = await Validate(rq.value, options.validate, this.injector, 'query');

            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(422,
                    new Error("query validation failure"),
                    validation_result);
            }

            rq._validation = validation_result;

            return true;
        }
    };

}


@Injectable()
export class QueryGuardService {
    constructor(public query: RequestQuery, public injector: Injector) { }
}
