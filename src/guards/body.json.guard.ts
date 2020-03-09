import { PropertyNamesNotOfType, Type } from '@uon/core';
import { Validator, Model, JsonSerializer, FindModelAnnotation, Validate } from '@uon/model';
import { ActivatedRoute } from '@uon/router';

import { BodyGuardService } from './body.guard';
import { HttpError } from '../error/error';



export type JsonBodyGuardValidate<T, M = Pick<T, PropertyNamesNotOfType<T, Function>>> = {
    [K in keyof M]?: Validator[]
} & { [k: string]: Validator[] }

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


    let model_meta: Model;
    let serializer: JsonSerializer<T>;
    if (type) {
        model_meta = FindModelAnnotation(type);
        if (!model_meta) {
            throw new Error(`You must provide a @Model decorated type, ${type.name} was not.`);
        }

        serializer = new JsonSerializer(type);
    }


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


            // try parsing json
            try {

                const obj = JSON.parse(buffer.toString('utf8'));
                const result = type
                    ? (Array.isArray(obj)
                        ? (obj as any[]).map(o => serializer.deserialize(o, false))
                        : serializer.deserialize(obj, false))
                    : obj;

                // assign data to the JsonBody provider
                json_body._data = result;

            }
            catch (ex) {
                return false;
            }

            // validate is array
            const is_array = Array.isArray(this.body.value);
            if (options.validateArray === true && !is_array) {
                throw new HttpError(400, new Error('expected array'));
            }

            const subject = is_array ? this.body.value : [this.body.value];
            const validation_results: any[] = [];

            for (let i = 0; i < subject.length; ++i) {

                // run validation
                const validation_result = await Validate(subject[i], options.validate, this.injector, i);
                validation_results.push(validation_result);

                if (options.throwOnValidation !== false && !validation_result.valid) {
                    throw new HttpError(400,
                        new Error(validation_result.failures.map(f => `${f.key}: ${f.reason}`).join('\r\n')),
                        validation_result);
                }
            }

            json_body._validation = validation_results;

            return true;
        }
    }

}