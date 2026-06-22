import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MatchMethodFunc } from './http.router';

describe('MatchMethodFunc', () => {
    test('matches when methods are equal', () => {
        assert.equal(MatchMethodFunc({ method: 'GET' } as any, { method: 'GET' }), true);
    });

    // regression: a string method used to do a substring match
    test('does not substring-match a single string method', () => {
        assert.equal(MatchMethodFunc({ method: 'GET' } as any, { method: 'E' }), false);
        assert.equal(MatchMethodFunc({ method: 'GET' } as any, { method: 'G' }), false);
    });

    test('matches against an array of methods', () => {
        assert.equal(MatchMethodFunc({ method: ['GET', 'POST'] } as any, { method: 'POST' }), true);
        assert.equal(MatchMethodFunc({ method: ['GET', 'POST'] } as any, { method: 'DELETE' }), false);
    });

    test('matches everything when no method is set', () => {
        assert.equal(MatchMethodFunc({} as any, { method: 'GET' }), true);
    });
});
