import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Expires } from './expires';
import { IncomingRequest } from './request';
import { OutgoingResponse } from './response';
import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

function req(headers: any) {
    return new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
}

describe('Expires', () => {
    test('parses a valid If-Modified-Since header', () => {
        const date = new Date('2020-01-01T00:00:00.000Z');
        const e = new Expires(req({ 'if-modified-since': date.toUTCString() }));
        assert.ok(e.ifModifiedSince instanceof Date);
        assert.equal(e.ifModifiedSince.getTime(), date.getTime());
    });

    // regression: an unparseable date used to become an Invalid Date
    test('ignores an unparseable If-Modified-Since header', () => {
        const e = new Expires(req({ 'if-modified-since': 'not-a-date' }));
        assert.equal(e.ifModifiedSince, undefined);
    });

    test('responds 304 when lastModified matches If-Modified-Since', async () => {
        const date = new Date('2021-06-15T12:00:00.000Z');
        const e = new Expires(req({ 'if-modified-since': date.toUTCString() }));
        e.configure({ lastModified: date });
        const res = new OutgoingResponse(new MockOutgoingResponse() as any);
        await e.modifyResponse(res);
        assert.equal(res.statusCode, 304);
    });

    test('sets an Expires header for expiresIn', async () => {
        const e = new Expires(req({}));
        e.configure({ expiresIn: 3600 });
        const res = new OutgoingResponse(new MockOutgoingResponse() as any);
        await e.modifyResponse(res);
        assert.ok(res.getHeader('Expires'));
    });
});
