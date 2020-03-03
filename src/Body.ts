
import { Type, Injectable, IsType, PropertyNamesNotOfType, Injector, Unpack } from '@uon/core';
import { IRouteGuardService, ActivatedRoute } from '@uon/router';
import { FindModelAnnotation, JsonSerializer, Model, Validate, ValidationResult, Validator, ValidationFailure } from '@uon/model';

import { IncomingRequest } from './IncomingRequest';
import { HttpError } from './HttpError';

import { parse as ParseFormData } from 'querystring'



/**
 * Configuration options for the request body
 */
export interface BodyGuardConfig {

    /**
     *  the maximum acceptable body size, in bytes
     */
    maxLength?: number;

    /**
     * Which content type (mime) is accepted 
     */
    accept?: string[];

}



/**
 * Validate headers for requests with body
 */
export function BodyGuard(config: BodyGuardConfig) {

    return class _BodyGuard extends BodyGuardService {

        checkGuard(ar: ActivatedRoute<any>): boolean | Promise<boolean> {

            this.checkHeaders(config);

            return true;
        }


    };

}



/**
 * Access to the parsed JSON request body
 * Must use in conjunction with JsonBodyGuard or FormDataBodyGuard
 */
export class JsonBody<T = any> {

    private _data: T;
    private _raw: Buffer;
    private _validation: ValidationResult<T>;

    /**
     * The unparsed body buffer
     */
    get raw() {
        return this._raw;
    }

    /**
     * The parsed json value
     */
    get value(): T {
        return this._data;
    }

    /**
     * The result of the validation 
     */
    get validation(): ValidationResult<T> {
        return this._validation;
    }
}


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

            const json_body: any = this.jsonBody;
            // wait for body
            const buffer = await this.request.body;
            json_body._raw = buffer;

            // try parsing json
            try {

                const obj = JSON.parse(buffer.toString('utf8'));
                const result = type
                    ? (Array.isArray(obj) ? (obj as any[]).map(o => serializer.deserialize(o, false))
                        : serializer.deserialize(obj, false)) : obj;

                // assign data to the JsonBody provider
                json_body._data = result;

            }
            catch (ex) {
                return false;
            }

            // validate is array
            const is_array = Array.isArray(this.jsonBody.value);
            if (options.validateArray === true && !is_array) {
                throw new HttpError(400, new Error('expected array'));
            }

            const subject = is_array ? this.jsonBody.value : [this.jsonBody.value];
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
export function FormDataBodyGuard(options: FormDataBodyGuardOptions) {

    return class _FormDataBodyGuard extends BodyGuardService {

        async checkGuard(ar: ActivatedRoute<any>): Promise<boolean> {

            this.checkHeaders({
                accept: ['application/x-www-form-urlencoded'/*, 'multipart/form-data'*/],
                maxLength: options
                    ? options.maxLength
                    : undefined
            });

            const json_body: any = this.jsonBody;

            // wait for body buffer
            const buffer = await this.request.body;
            json_body._raw = buffer;

            // parse form data
            const result = Object.assign({}, ParseFormData(buffer.toString('utf8'), '&', '='));
            json_body._data = result;

            // run validation
            const validation_result = await Validate(json_body.value, options.validate, this.injector);

            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(400,
                    new Error(validation_result.failures.map(f => f.reason).join('\r\n')),
                    validation_result);
            }

            json_body._validation = validation_result;

            return true;

        }
    }
}


/**
 * Base service for body guards
 */
@Injectable()
export class BodyGuardService {

    constructor(public request: IncomingRequest,
        public jsonBody: JsonBody,
        public injector: Injector) { }

    checkHeaders(config: BodyGuardConfig) {

        // we need a content-type from the headers
        if (config.accept) {

            const type = (this.request.headers['content-type'] || '').split(';')[0];


            // literal check
            // TODO check for wildcards also
            if (config.accept.indexOf(type.trim()) === -1) {
                throw new HttpError(400, new Error(`Content-Type must be set to (one of) ${config.accept.join(', ')}.`));
            }
        }

        // check if content-length is bigger than the max allowed body size
        if (config.maxLength) {

            let header_length_str = this.request.headers['content-length'];
            if (!header_length_str) {
                throw new HttpError(411, new Error(`Content-Length header field must be set.`));
            }

            let header_length = parseInt(header_length_str);
            if (header_length > config.maxLength) {
                throw new HttpError(413, new Error(`Content-Length of ${header_length} exceeds the limit of ${config.maxLength}.`));
            }
        }

    }
}






