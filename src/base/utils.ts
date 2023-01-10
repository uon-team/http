import { Model, Member, ArrayMember } from "@uon/model";
import { Type } from '@uon/core';



export function ParseWeightedValuesString(str: string): [string, number][] {

    let values = str.split(',').map(s => s.trim());

    let val_q_tuples: [string, number][] = values.map(s => {
        let q = 1.0;
        let lq = s.split(';');
        if (lq.length > 1) {
            q = parseFloat(lq[1].replace('q=', ''));
        }
        return [lq[0], q];
    });

    return val_q_tuples;
}


export function TryCoerceToModel(members: Member[], values: any) {

    const result: any = {};

    members.forEach((m) => {

        const k = m.key;

        let raw_value = values[k];

        // can't coerse undefined as it will lead to validation problems
        if(raw_value === undefined) {
            return;
        }

        let coerced_value = undefined;

        if(m.coerse) {
            raw_value = m.coerse(raw_value);
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

    let coerced_value = undefined;

    if (raw_value === 'null') {
        coerced_value = null;
    }
    else if (raw_value === 'true') {
        coerced_value = true;
    }
    else if (raw_value === 'false') {
        coerced_value = false;
    }
    else if (type === Boolean) {
        coerced_value = raw_value === 'true';
    }
    else if (type === Date) {
        coerced_value = new Date(raw_value);
    }
    else if (type === Number) {
        coerced_value = Number(raw_value);
    }
    else if (type === String) {
        coerced_value = raw_value;
    }

    return coerced_value;
}