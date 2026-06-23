import { PropertyNamesNotOfType, Type } from '@uon/core';
import { ActivatedRoute } from '@uon/router';

import { BodyGuardService } from './body.guard';
import { HttpError } from '../error/error';
import { HttpValidator, HttpModelValidationResult } from '../model/validation';



export type JsonBodyGuardValidate<T, M = Pick<T, PropertyNamesNotOfType<T, Function>>> = {
    [K in keyof M]?: HttpValidator[]
} & { [k: string]: HttpValidator[] }

export interface JsonBodyGuardOptions<T> {

    /**
     * Extra validation on top of model validation.
     * Can be used if no model is provided.
     */
    validate?: JsonBodyGuardValidate<T>;


    /**
     * If set, validate the body is an array, and validates each element 
     * with the provided validators in 'validate'
     */
    validateArray?: boolean;


    /**
     * Throws a 400 http error on validation failure if set to true.
     * Otherwise you have to handle the validation failure yourself.
     * Validation results are stored in JsonBody.
     * Defaults to true. 
     */
    throwOnValidation?: boolean;


    /**
     * Maximum body size in bytes
     */
    maxLength?: number;
}



/**
 * A guard for validating a JSON request body
 * Results are stored in JsonBody
 * @param options 
 */
export function JsonBodyGuard<T>(type?: Type<T>, options: JsonBodyGuardOptions<T> = {}) {

    return class _JsonBodyGuard extends BodyGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            this.checkHeaders({
                accept: ['application/json'],
                maxLength: options ? options.maxLength : undefined
            });

            const json_body: any = this.body;
            // wait for body buffer
            const buffer = await this.request.body;

            // assign buffer as .raw
            json_body._raw = buffer;


            // parse json — a malformed body is a 400, not a silent guard failure
            let obj: any;
            try {
                obj = JSON.parse(buffer.toString('utf8'));
            }
            catch (ex) {
                throw new HttpError(400, new Error('Request body is not valid JSON.'));
            }

            const result = type
                ? (Array.isArray(obj)
                    ? (obj as any[]).map(o => this.adapter.deserialize(type, o))
                    : this.adapter.deserialize(type, obj))
                : obj;

            // assign data to the JsonBody provider
            json_body._data = result;

            // validate is array
            const is_array = Array.isArray(this.body.value);
            if (options.validateArray === true && !is_array) {
                throw new HttpError(422, new Error('expected json array'));
            }


            let validation_result: HttpModelValidationResult<any>;

            if (is_array) {
                const subject = this.body.value as any[];
                validation_result = new HttpModelValidationResult<any>('body');

                for (let i = 0; i < subject.length; ++i) {
                    const item_result = await this.adapter.validate(subject[i], options.validate, this.injector, String(i));
                    validation_result.children[i] = item_result;
                }
            }
            else {
                validation_result = await this.adapter.validate(this.body.value, options.validate, this.injector, 'body');
            }

            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(422,
                    new Error("body validation failure"),
                    validation_result);
            }

            json_body._validation = validation_result;


            // format
            if (type) {
                if (is_array) {
                    const subject = this.body.value as any[];
                    for (let i = 0; i < subject.length; ++i) {
                        this.adapter.applyFormatting(subject[i]);
                    }
                }
                else {
                    this.adapter.applyFormatting(this.body.value);
                }
            }


            return true;
        }
    }

}