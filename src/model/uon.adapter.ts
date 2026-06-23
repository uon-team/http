import { Type, Injector } from '@uon/core';
import {
    FindModelAnnotation, GetModelMembers, JsonSerializer, Validate, ApplyFormatting
} from '@uon/model';

import { HttpModelAdapter } from './model.adapter';
import { HttpValidatorMap, HttpModelValidationResult } from './validation';
import { TryCoerceToModel } from '../base/utils';


/**
 * Default HttpModelAdapter implementation, backed by @uon/model. This is the
 * only non-test file in the package that imports @uon/model directly.
 */
export class UonModelAdapter implements HttpModelAdapter {

    // serializers are stateless per type — cache them so we don't rebuild one
    // on every request (guard factories used to build them once at declaration
    // time; the adapter is resolved per-request, so we cache here instead).
    private _serializers = new WeakMap<Type<any>, JsonSerializer<any>>();

    isModel(type: Type<any>): boolean {
        return !!FindModelAnnotation(type);
    }

    deserialize<T>(type: Type<T>, data: any): T {
        return this.serializer(type).deserialize(data, false);
    }

    deserializeFromString<T>(type: Type<T>, raw: { [k: string]: any }): T {
        const meta = this.requireModel(type);
        const coerced = TryCoerceToModel(GetModelMembers(meta), raw);
        return this.serializer(type).deserialize(coerced);
    }

    serialize(value: any): any {

        // primitives and null/undefined pass through (incl. Date, which
        // JSON.stringify handles via toISOString)
        if (value == null || typeof value !== 'object') {
            return value;
        }

        // serialize arrays element-wise
        if (Array.isArray(value)) {
            return value.map(v => this.serialize(v));
        }

        // a model instance carries its type via its constructor
        const type = value.constructor as Type<any>;
        if (type && this.isModel(type)) {
            return this.serializer(type).serialize(value);
        }

        // plain object — pass through unchanged
        return value;
    }

    validate(subject: any,
        validators: HttpValidatorMap | undefined,
        injector: Injector,
        key: string): Promise<HttpModelValidationResult> {

        // @uon/model's ModelValidationResult is structurally an
        // HttpModelValidationResult (key/failures/children/valid).
        return Validate(subject, validators as any, injector, key) as any;
    }

    applyFormatting(subject: any): void {
        ApplyFormatting(subject);
    }

    private serializer<T>(type: Type<T>): JsonSerializer<T> {
        let s = this._serializers.get(type);
        if (!s) {
            this.requireModel(type);
            s = new JsonSerializer(type);
            this._serializers.set(type, s);
        }
        return s;
    }

    private requireModel<T>(type: Type<T>) {
        const meta = FindModelAnnotation(type);
        if (!meta) {
            throw new Error(`You must provide a @Model decorated type, ${type.name} was not.`);
        }
        return meta;
    }
}


/**
 * The default adapter instance provided when no `modelAdapter` is configured.
 */
export const DEFAULT_MODEL_ADAPTER = new UonModelAdapter();
