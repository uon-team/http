import { Validator, ValidationFailure, ModelValidationResult, ValidationResult } from '@uon/model';
import { ActivatedRoute } from '@uon/router';
import { HttpError } from '../error/error';




/**
 * Validate route params
 */
export function RouteParamsGuard(validators: { [k: string]: Validator[] }) {

    return function _RouteParamsGuard(ar: ActivatedRoute<any>) {

        const validate_keys = Object.keys(ar.params);
        const errors: string[] = [];
        const error_data: any = {};

        const validation_results = new ModelValidationResult<any>('route_params');

        for (let i = 0; i < validate_keys.length; ++i) {
            const k = validate_keys[i];

            // check the required fields
            if (validators[k]) {

                validators[k].forEach((v) => {

                    try {
                        v(ar.params, k, ar.params[k])
                    }
                    catch (err) {

                        if (!validation_results.children[k]) {
                            validation_results.children[k] = new ValidationResult<any>(k);
                        }

                        if (err instanceof ValidationFailure) {
                            validation_results.children[k].failures.push(err);
                        }
                    }
                });
            }

        }

        if (!validation_results.valid) {
            throw new HttpError(422, new Error('route parameters validation failure'), validation_results);
        }

        return true;
    }
}