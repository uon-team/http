import { Type } from '@uon/core';
import { Validator, Validate, Model, JsonSerializer, FindModelAnnotation, GetModelMembers } from '@uon/model';
import { ActivatedRoute } from '@uon/router';
import { parse as ParseFormData } from 'querystring'


import { HttpError } from '../error/error';
import { BodyGuardService } from './body.guard';
import { TryCoerceToModel } from '../base/utils';



export interface FormDataBodyGuardOptions {

    /**
     * Extra validation on top of model validation.
     * Can be used if no model is provided.
     */
    validate?: { [k: string]: Validator[] };


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
 * A guard for validating a x-www-form-urlencoded request body
 * Results are stored in JsonBody
 * @param options 
 */
export function FormDataBodyGuard<T>(type?: Type<T>, options: FormDataBodyGuardOptions = {}) {


    let model_meta: Model;
    let serializer: JsonSerializer<T>;
    if (type) {
        model_meta = FindModelAnnotation(type);
        if (!model_meta) {
            throw new Error(`You must provide a @Model decorated type, ${type.name} was not.`);
        }

        serializer = new JsonSerializer(type);
    }


    return class _FormDataBodyGuard extends BodyGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            this.checkHeaders({
                accept: ['application/x-www-form-urlencoded'/*, 'multipart/form-data'*/],
                maxLength: options
                    ? options.maxLength
                    : undefined
            });

            const json_body: any = this.body;

            // wait for body buffer
            const buffer = await this.request.body;
            json_body._raw = buffer;

            // parse form data
            const parsed = ParseFormData(buffer.toString('utf8'), '&', '=')
            const result = type
                ? serializer.deserialize(TryCoerceToModel(GetModelMembers(model_meta), parsed))
                : parsed;

            json_body._data = result;

            //console.log(buffer.toString('utf8'), result);

            // run validation
            const validation_result = await Validate(json_body.value, options.validate, this.injector, 'body');

            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(422,
                    new Error("body validation failure"),
                    validation_result);
            }

            json_body._validation = validation_result;

            return true;

        }
    }
}


