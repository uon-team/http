import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Cookies } from './cookies';
import { IncomingRequest } from './request';
import { OutgoingResponse } from './response';
import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

function req(headers: any) {
    return new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
}

describe('Cookies', () => {
    test('parses request cookies', () => {
        const c = new Cookies(req({ cookie: 'a=1; b=2' }));
        assert.equal(c.getCookie('a'), '1');
        assert.equal(c.getCookie('b'), '2');
    });

    test('url-decodes cookie values', () => {
        const c = new Cookies(req({ cookie: 'x=a%20b' }));
        assert.equal(c.getCookie('x'), 'a b');
    });

    // regression: a malformed percent-encoding used to throw and crash the request
    test('falls back to the raw value on a malformed encoding', () => {
        let c: Cookies;
        assert.doesNotThrow(() => { c = new Cookies(req({ cookie: 'bad=%E0%A4%A; ok=1' })); });
        assert.equal(c!.getCookie('bad'), '%E0%A4%A');
        assert.equal(c!.getCookie('ok'), '1');
    });

    test('setCookie + modifyResponse writes a Set-Cookie header', async () => {
        const c = new Cookies(req({}));
        c.setCookie('session', 'xyz', { path: '/' });
        const res = new OutgoingResponse(new MockOutgoingResponse() as any);
        await c.modifyResponse(res);
        const sc = res.getHeader('Set-Cookie') as string[];
        assert.ok(Array.isArray(sc));
        assert.ok(sc[0].startsWith('session=xyz'));
        assert.ok(sc[0].includes('Path=/'));
    });

    // regression: an empty cookie jar used to emit an empty Set-Cookie header
    test('does not set Set-Cookie when no cookies were set', async () => {
        const c = new Cookies(req({}));
        const res = new OutgoingResponse(new MockOutgoingResponse() as any);
        await c.modifyResponse(res);
        assert.equal(res.getHeader('Set-Cookie'), undefined);
    });
});
