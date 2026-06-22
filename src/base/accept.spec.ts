import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AcceptLanguage, AcceptEncoding } from './accept';
import { IncomingRequest } from './request';
import { MockIncomingMessage } from '../mock/mock.incoming';

function req(headers: any) {
    return new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
}

describe('AcceptLanguage', () => {
    test('picks the highest-q available language', () => {
        const al = new AcceptLanguage(req({ 'accept-language': 'en;q=0.8, fr;q=0.9' }));
        assert.equal(al.getBestMatch(['en', 'fr']), 'fr');
    });

    test('defaults to en when no header is present', () => {
        const al = new AcceptLanguage(req({}));
        assert.equal(al.getBestMatch(['en', 'fr']), 'en');
    });

    test('returns the first available when nothing matches', () => {
        const al = new AcceptLanguage(req({ 'accept-language': 'de' }));
        assert.equal(al.getBestMatch(['en', 'fr']), 'en');
    });
});

describe('AcceptEncoding', () => {
    test('picks the highest-q available encoding', () => {
        const ae = new AcceptEncoding(req({ 'accept-encoding': 'gzip;q=0.5, br;q=1.0' }));
        assert.equal(ae.getBestMatch(['gzip', 'br']), 'br');
    });

    test('defaults to identity when no header is present', () => {
        const ae = new AcceptEncoding(req({}));
        assert.equal(ae.getBestMatch(['identity', 'gzip']), 'identity');
    });
});
