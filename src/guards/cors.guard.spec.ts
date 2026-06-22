import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CorsGuardService } from './cors.guard';
import { IncomingRequest } from '../base/request';
import { OutgoingResponse } from '../base/response';
import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

function svc(headers: any) {
    const req = new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
    const res = new OutgoingResponse(new MockOutgoingResponse() as any);
    return new CorsGuardService(req, res);
}

describe('CorsGuardService.checkOrigin', () => {
    test("'*' without credentials returns '*'", () => {
        assert.equal(svc({ origin: 'http://a.com' }).checkOrigin('*', false), '*');
    });

    test("'*' with credentials reflects the request origin", () => {
        assert.equal(svc({ origin: 'http://a.com' }).checkOrigin('*', true), 'http://a.com');
    });

    test('string origin matches exactly', () => {
        assert.equal(svc({ origin: 'http://a.com' }).checkOrigin('http://a.com', false), 'http://a.com');
        assert.equal(svc({ origin: 'http://a.com' }).checkOrigin('http://b.com', false), null);
    });

    test('array origin matches membership', () => {
        assert.equal(svc({ origin: 'http://a.com' }).checkOrigin(['http://a.com', 'http://b.com'], false), 'http://a.com');
        assert.equal(svc({ origin: 'http://x.com' }).checkOrigin(['http://a.com'], false), null);
    });

    // regression: with no Origin header it used to fall back to Host and reflect it
    test('returns null when there is no Origin header (no Host fallback)', () => {
        assert.equal(svc({ host: 'evil.example.com' }).checkOrigin('*', true), null);
        assert.equal(svc({ host: 'evil.example.com' }).checkOrigin(['http://a.com'], false), null);
    });
});
