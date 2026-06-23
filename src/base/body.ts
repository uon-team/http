import { HttpModelValidationResult } from '../model/validation';

/**
 * Access to the request body
 * To use the .value accessor, you must use JsonBodyGuard or FormDataBodyGuard
 * otherwise, only the .raw value will be available
 */
export class RequestBody<T = any> {

    private _data!: T;
    private _raw!: Buffer;
    private _validation!: HttpModelValidationResult<T>;

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
    get validation(): HttpModelValidationResult<T> {
        return this._validation;
    }
}
