
import { Type, Injectable, IsType, PropertyNamesNotOfType } from '@uon/core';
import { IRouteGuardService, ActivatedRoute } from '@uon/router';
import { FindModelAnnotation, JsonSerializer, Model, Validate, ValidationResult, Validator } from '@uon/model';

import { IncomingRequest } from './IncomingRequest';
import { HttpError } from './HttpError';




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
 * Use in conjunction with JsonBodyGuard
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
     * Throws a 400 http error on validation failure if set to true.
     * Otherwise you have to handle the validation failure yourself.
     * Validation results are store in JsonBody.
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
                const result = type ? serializer.deserialize(obj) : obj;

                // assign data to the JsonBody provider
                json_body._data = result;

            }
            catch (ex) {
                return false;
            }

            // run validation
            const validation_result = await Validate(this.jsonBody.value, options.validate);
            json_body._validation = validation_result;


            if (options.throwOnValidation !== false && !validation_result.valid) {
                throw new HttpError(400,
                    new Error(validation_result.failures.map(f => f.reason).join('\r\n')),
                    validation_result);
            }

            return true;
        }
    }

}


@Injectable()
export class BodyGuardService {

    constructor(public request: IncomingRequest, public jsonBody: JsonBody) { }

    checkHeaders(config: BodyGuardConfig) {

        // we need a content-type from the headers
        if (config.accept) {

            // literal check
            // TODO check for wildcards also
            if (config.accept.indexOf(this.request.headers['content-type']) === -1) {
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






