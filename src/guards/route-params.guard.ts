import { Validator, ValidationFailure } from '@uon/model';
import { ActivatedRoute } from '@uon/router';
import { HttpError } from 'src/error/error';




/**
 * Validate route params
 */
export function RouteParamsGuard(validators: { [k: string]: Validator[] }) {

    return function _RouteParamsGuard(ar: ActivatedRoute<any>) {

        const validate_keys = Object.keys(ar.params);
        const errors: string[] = [];
        const error_data: any = {};

        for (let i = 0; i < validate_keys.length; ++i) {
            const k = validate_keys[i];

            // check the required fields
            if (validators[k]) {

                validators[k].forEach((v) => {

                    try {
                        v(ar.params, k, ar.params[k])
                    }
                    catch (err) {
                        if (err instanceof ValidationFailure) {
                            errors.push(err.reason);
                            error_data[k] = err.reason;
                        }
                    }
                });
            }

        }

        if (errors.length) {
            throw new HttpError(400, new Error(errors.join('\r\n')), { paramsError: error_data });
        }

        return true;
    }
}