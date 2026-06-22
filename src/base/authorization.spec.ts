import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Authorization } from './authorization';
import { IncomingRequest } from './request';
import { OutgoingResponse } from './response';
import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

function req(headers: any) {
    return new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
}

describe('Authorization', () => {
    test('parses scheme and token', () => {
        const a = new Authorization(req({ authorization: 'Bearer abc.def' }));
        assert.equal(a.scheme, 'bearer');
        assert.equal(a.token, 'abc.def');
        assert.equal(a.valid, true);
    });

    test('is not valid when no Authorization header is present', () => {
        const a = new Authorization(req({}));
        assert.equal(a.valid, false);
    });

    // regression: a header with no space produced an empty scheme yet valid=true
    test('is not valid for a header without a space', () => {
        const a = new Authorization(req({ authorization: 'Bearertoken' }));
        assert.equal(a.valid, false);
    });

    describe('decodeBasicCredentials', () => {
        test('decodes username and password', () => {
            const token = Buffer.from('alice:secret').toString('base64');
            const a = new Authorization(req({ authorization: 'Basic ' + token }));
            const creds = a.decodeBasicCredentials();
            assert.equal(creds!.username, 'alice');
            assert.equal(creds!.password, 'secret');
        });

        // regression: a password containing ':' was truncated (split on first only)
        test('preserves colons in the password', () => {
            const token = Buffer.from('alice:pa:ss:word').toString('base64');
            const a = new Authorization(req({ authorization: 'Basic ' + token }));
            const creds = a.decodeBasicCredentials();
            assert.equal(creds!.username, 'alice');
            assert.equal(creds!.password, 'pa:ss:word');
        });

        test('returns an empty password when there is no colon', () => {
            const token = Buffer.from('alice').toString('base64');
            const a = new Authorization(req({ authorization: 'Basic ' + token }));
            const creds = a.decodeBasicCredentials();
            assert.equal(creds!.username, 'alice');
            assert.equal(creds!.password, '');
        });

        test('returns null when the scheme is not Basic', () => {
            const a = new Authorization(req({ authorization: 'Bearer x' }));
            assert.equal(a.decodeBasicCredentials(), null);
        });
    });

    // regression: an explicitly undefined charset threw on .toUpperCase()
    test('modifyResponse does not throw when charset is undefined', async () => {
        const res = new OutgoingResponse(new MockOutgoingResponse() as any);
        const a = new Authorization(req({}));
        a.configure({ scheme: 'Basic', realm: 'Test', charset: undefined } as any);
        await assert.doesNotReject(a.modifyResponse(res));
        const header = String(res.getHeader('WWW-Authenticate'));
        assert.ok(header.includes('realm="Test"'));
        assert.ok(!header.includes('charset='));
    });
});
