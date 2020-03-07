import { Model, Member, ArrayMember } from "@uon/model";
import { Type } from '@uon/core';





export function TryCoerceToModel(members: Member[], values: any) {

    const result: any = {};

    members.forEach((m) => {

        const k = m.key;

        let raw_value = values[k];
        let coerced_value = undefined;

        if(m instanceof ArrayMember) {
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
    else if(type === Boolean) {
        coerced_value = raw_value === 'true';
    }
    else if (type === Date) {
        coerced_value = new Date(raw_value);
    }
    else if (type === Number) {
        coerced_value = Number(raw_value)
    }

    return coerced_value;
}