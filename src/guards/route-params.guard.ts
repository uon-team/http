import { ActivatedRoute } from '@uon/router';
import { HttpError } from '../error/error';
import { HttpValidatorMap, HttpModelValidationResult, RunValidators } from '../model/validation';




/**
 * Validate route params
 */
export function RouteParamsGuard(validators: HttpValidatorMap) {

    return function _RouteParamsGuard(ar: ActivatedRoute<any>) {

        const validation_results = new HttpModelValidationResult<any>('route_params');

        RunValidators(ar.params, validators, validation_results);

        if (!validation_results.valid) {
            throw new HttpError(422, new Error('route parameters validation failure'), validation_results);
        }

        return true;
    }
}