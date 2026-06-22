import 'reflect-metadata';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Model, Member, FindModelAnnotation, GetModelMembers } from '@uon/model';
import { ParseWeightedValuesString, TryCoerceToModel } from './utils';

describe('ParseWeightedValuesString', () => {
    test('parses values with explicit q-values', () => {
        const r = ParseWeightedValuesString('en;q=0.8, fr;q=0.9');
        assert.deepEqual(r, [['en', 0.8], ['fr', 0.9]]);
    });

    test('defaults missing q to 1.0', () => {
        const r = ParseWeightedValuesString('en, fr;q=0.5');
        assert.deepEqual(r, [['en', 1.0], ['fr', 0.5]]);
    });

    // regression: a non-q parameter used to produce NaN
    test('ignores non-q parameters and finds q among them', () => {
        const r = ParseWeightedValuesString('text/html;level=1;q=0.7');
        assert.equal(r[0][0], 'text/html');
        assert.equal(r[0][1], 0.7);
    });

    test('falls back to 1.0 for a malformed q-value', () => {
        const r = ParseWeightedValuesString('en;q=abc');
        assert.equal(r[0][1], 1.0);
    });
});

@Model()
class Query {
    @Member() s: string;
    @Member() n: number;
    @Member() b: boolean;
}

describe('TryCoerceToModel / CoerceToType', () => {
    const members = GetModelMembers(FindModelAnnotation(Query));

    test('coerces numbers and booleans from strings', () => {
        const r = TryCoerceToModel(members, { n: '42', b: 'true' });
        assert.equal(r.n, 42);
        assert.equal(r.b, true);
    });

    // regression: a declared String must keep literal 'true'/'false'/'null'
    test('keeps literal text for a String member', () => {
        const r = TryCoerceToModel(members, { s: 'true' });
        assert.equal(r.s, 'true');
        assert.equal(typeof r.s, 'string');
    });

    test('omits undefined values', () => {
        const r = TryCoerceToModel(members, { n: '1' });
        assert.ok(!('s' in r));
    });
});
