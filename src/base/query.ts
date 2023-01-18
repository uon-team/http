import { ValidationResult } from '@uon/model';
import { Injectable } from '@uon/core';
import { IncomingRequest } from './request';
import { ParsedUrlQuery } from 'querystring';

/**
 * Object containing the parsed query string as key/value map.
 * If QueryGuard is used, coerced values are assigned to this object
 */
@Injectable()
export class RequestQuery<T = any> {

    private _data: T;
    private _raw: ParsedUrlQuery;
    private _validation: ValidationResult<T>;


    constructor(private _request: IncomingRequest) {
        this._raw = _request.uri.query as ParsedUrlQuery
    }

    /**
    * The unparsed query object
    */
    get raw() {
        return this._raw;
    }

    /**
     * The type coerced object
     * null if QueryGuard was not used
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