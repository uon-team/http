import { Model, Member, ArrayMember } from "@uon/model";
import { Type } from '@uon/core';



export function ParseWeightedValuesString(str: string): [string, number][] {

    let values = str.split(',').map(s => s.trim());

    let val_q_tuples: [string, number][] = values.map(s => {
        let q = 1.0;
        let parts = s.split(';');

        // find the q= parameter among any other parameters; default to 1.0
        for (let i = 1; i < parts.length; ++i) {
            let p = parts[i].trim();
            if (p.indexOf('q=') === 0) {
                let parsed = parseFloat(p.substring(2));
                if (!isNaN(parsed)) {
                    q = parsed;
                }
            }
        }

        return [parts[0].trim(), q];
    });

    return val_q_tuples;
}


export function TryCoerceToModel(members: Member[], values: any) {

    const result: any = {};

    members.forEach((m) => {

        const k = m.key;

        let raw_value = values[k];

        // can't coerce undefined as it will lead to validation problems
        if(raw_value === undefined) {
            return;
        }

        let coerced_value = undefined;

        if(m.coerce) {
            raw_value = m.coerce(raw_value);
        }
        
        if (m instanceof ArrayMember) {
            let arr = Array.isArray(raw_value) ? raw_value : [raw_value];
            coerced_value = arr.map(v => CoerceToType(m.type, v));
        }
        else {
            coerced_value = CoerceToType(m.type, raw_value);
        }

        result[k] = coerced_value;

    });



    return result;

}


function CoerceToType(type: any, raw_value: any) {

    // a declared String keeps the literal text (so 'true'/'false'/'null' are not
    // turned into a boolean/null for string-typed members)
    if (type === String) {
        return raw_value;
    }

    if (raw_value === 'null') {
        return null;
    }
    if (raw_value === 'true') {
        return true;
    }
    if (raw_value === 'false') {
        return false;
    }
    if (type === Boolean) {
        return raw_value === 'true';
    }
    if (type === Date) {
        return new Date(raw_value);
    }
    if (type === Number) {
        return Number(raw_value);
    }

    // unknown type: return the raw value rather than dropping it
    return raw_value;
}