import { Injector } from '@uon/core';


/**
 * A validator function. Concrete, library-agnostic shape: it inspects a value
 * and throws an HttpValidationFailure (or anything HttpValidationFailure-shaped)
 * when the value is invalid. Structurally compatible with @uon/model's Validator.
 */
export type HttpValidator =
    (model: any, key: string, value: any, injector?: Injector) => any;

/**
 * Map of field name -> validators, as accepted by guard options.
 */
export type HttpValidatorMap = { [k: string]: HttpValidator[] };


/**
 * A single validation failure. The default (@uon/model) ValidationFailure
 * satisfies this shape, so failures from either world flatten identically.
 */
export interface HttpValidationFailure {
    readonly validator: Function;
    readonly key: string;
    readonly value: any;
    readonly context?: any;
}


/**
 * Result of validating a single value: a list of failures plus the key it
 * applies to. `valid` is a getter so it stays correct as failures are pushed.
 *
 * Library-agnostic and owned by @uon/http. There is intentionally no flatten()
 * method here — flattening is derivable from failures + children and is provided
 * as the free FlattenValidationResult() helper below.
 */
export class HttpValidationResult<T = any> {

    readonly failures: HttpValidationFailure[] = [];

    constructor(readonly key: string) { }

    get valid(): boolean {
        return this.failures.length === 0;
    }
}


/**
 * A validation result with per-member children (model/array/route-param
 * validation). `valid` recurses into children.
 */
export class HttpModelValidationResult<T = any> extends HttpValidationResult<T> {

    readonly children: { [k: string]: HttpValidationResult } = {};

    get valid(): boolean {

        for (const k in this.children) {
            if (!this.children[k].valid) {
                return false;
            }
        }

        return this.failures.length === 0;
    }
}


/**
 * A flattened validation result, suitable for an error response body.
 */
export interface FlatValidationResult {

    /** the path to the value in the model */
    path: string[];

    /** map of validator name -> associated message/context */
    errors: { [k: string]: string };
}


/**
 * Returns true if the thrown value is a validation failure (as opposed to an
 * unexpected error that must not be swallowed). Detected structurally so this
 * works for @uon/model's ValidationFailure without importing it.
 */
function IsValidationFailure(err: any): err is HttpValidationFailure {
    return err != null
        && typeof err.validator === 'function'
        && typeof err.key === 'string';
}


/**
 * Run a set of validators against a params object, collecting failures into the
 * provided result. Library-agnostic: validators are concrete HttpValidator
 * functions and a thrown validation failure is detected structurally; anything
 * else is rethrown so real errors are not swallowed.
 */
export function RunValidators(params: any,
    validators: HttpValidatorMap,
    result: HttpModelValidationResult): void {

    const keys = Object.keys(params);

    for (let i = 0; i < keys.length; ++i) {
        const k = keys[i];

        if (!validators[k]) {
            continue;
        }

        validators[k].forEach((v) => {

            try {
                v(params, k, params[k]);
            }
            catch (err) {

                // don't swallow unexpected (non-validation) errors
                if (!IsValidationFailure(err)) {
                    throw err;
                }

                if (!result.children[k]) {
                    result.children[k] = new HttpValidationResult(k);
                }

                (result.children[k].failures as HttpValidationFailure[]).push(err);
            }
        });
    }
}


/**
 * Flatten a validation result tree into a list of { path, errors } entries for
 * an error response. Walks failures + children structurally, so it works on both
 * @uon/http result types and @uon/model's results. Reproduces the output of
 * @uon/model's ModelValidationResult.flatten().
 */
export function FlattenValidationResult(result: HttpValidationResult,
    out: FlatValidationResult[] = [],
    path: string[] = []): FlatValidationResult[] {

    if (result.failures.length > 0) {

        const errors_by_key: { [k: string]: HttpValidationFailure[] } = {};

        for (const f of result.failures) {

            if (f.key != result.key && typeof f.key === 'number') {
                const hash = [...path, String(f.key)].join('.');
                errors_by_key[hash] = errors_by_key[hash] || [];
                errors_by_key[hash].push(f);
            }
            else {
                errors_by_key[result.key] = errors_by_key[result.key] || [];
                errors_by_key[result.key].push(f);
            }
        }

        for (const k in errors_by_key) {
            const errors: { [k: string]: any } = {};
            for (const f of errors_by_key[k]) {
                errors[f.validator.name] = f.context;
            }
            out.push({ path: [k], errors });
        }
    }

    const children = (result as HttpModelValidationResult).children;
    if (children) {
        for (const k in children) {
            FlattenValidationResult(children[k], out, [...path, k]);
        }
    }

    return out;
}


/**
 * Structural type guard used by the error handler to detect a model validation
 * result (one with children) regardless of which library produced it.
 */
export function IsValidationResult(x: any): x is HttpModelValidationResult {
    return x != null
        && typeof x.key === 'string'
        && Array.isArray(x.failures)
        && x.children != null
        && typeof x.children === 'object';
}
