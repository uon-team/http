import { Type, Injector, InjectionToken } from '@uon/core';
import { HttpValidatorMap, HttpModelValidationResult } from './validation';


/**
 * Abstraction over a model library (validation, formatting, (de)serialization)
 * used by the http guards. The default implementation (UonModelAdapter) wraps
 * @uon/model. Provide your own via HttpModule.WithConfig({ modelAdapter }).
 *
 * Only the operations that genuinely depend on the model library live here.
 * Everything that operates on the concrete result/validator shapes (running
 * validators, validity, flattening, ...) lives in ./validation as free helpers.
 */
export interface HttpModelAdapter {

    /**
     * Return true if `type` is a model this adapter can handle.
     */
    isModel(type: Type<any>): boolean;

    /**
     * Deserialize an already-parsed value (e.g. a JSON object or array element)
     * into a typed instance. Used by JsonBodyGuard.
     */
    deserialize<T>(type: Type<T>, data: any): T;

    /**
     * Coerce and deserialize a raw string-keyed map (query string / urlencoded
     * form data) into a typed instance. Used by QueryGuard and FormDataBodyGuard.
     */
    deserializeFromString<T>(type: Type<T>, raw: { [k: string]: any }): T;

    /**
     * Serialize a typed instance into a plain, JSON-ready value — e.g. to map
     * model values to JSON values before `JSON.stringify()`. The inverse of
     * `deserialize`. Implementations should return arrays element-wise and pass
     * non-model values (primitives, plain objects) through unchanged.
     */
    serialize(value: any): any;

    /**
     * Validate a subject with optional extra per-field validators. The returned
     * value must satisfy the HttpModelValidationResult shape.
     */
    validate(subject: any,
        validators: HttpValidatorMap | undefined,
        injector: Injector,
        key: string): Promise<HttpModelValidationResult>;

    /**
     * Apply model formatting to a (typed) subject, in place.
     */
    applyFormatting(subject: any): void;
}


/**
 * The injection token used by guards to resolve the configured model adapter.
 */
export const HTTP_MODEL_ADAPTER =
    new InjectionToken<HttpModelAdapter>('HTTP_MODEL_ADAPTER');
