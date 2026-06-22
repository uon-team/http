import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Range } from './range';
import { IncomingRequest } from './request';
import { OutgoingResponse } from './response';
import { HttpError } from '../error/error';
import { MockIncomingMessage } from '../mock/mock.incoming';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

const CONTENT = Buffer.alloc(100, 0x61); // 100 bytes
let FILE: string;

function rangeFor(rangeHeader?: string, opts?: any) {
    const headers: any = rangeHeader ? { range: rangeHeader } : {};
    const req = new IncomingRequest(new MockIncomingMessage('/', 'GET', headers) as any);
    const r = new Range(req);
    if (opts) r.configure(opts);
    return r;
}

function resp() {
    return new OutgoingResponse(new MockOutgoingResponse() as any);
}

describe('Range', () => {
    before(() => {
        FILE = path.join(os.tmpdir(), 'uon-range-test-' + process.pid);
        fs.writeFileSync(FILE, CONTENT);
    });
    after(() => { try { fs.unlinkSync(FILE); } catch { /* noop */ } });

    test('parses a bytes range header', () => {
        assert.deepEqual(rangeFor('bytes=0-49').range, { start: 0, end: 49 });
    });

    test('serves a 206 partial response with correct headers', async () => {
        const r = rangeFor('bytes=0-49', { path: FILE, maxChunkSize: 1000 });
        const res = resp();
        await r.modifyResponse(res);
        assert.equal(res.statusCode, 206);
        assert.equal(res.getHeader('Content-Length'), 50);
        assert.equal(res.getHeader('Content-Range'), 'bytes 0-49/100');
    });

    // regression: a missing maxChunkSize used to yield NaN Content-Length
    test('handles an open-ended range without maxChunkSize (no NaN)', async () => {
        const r = rangeFor('bytes=0-', { path: FILE });
        const res = resp();
        await r.modifyResponse(res);
        assert.equal(res.getHeader('Content-Length'), 100);
        assert.equal(res.getHeader('Content-Range'), 'bytes 0-99/100');
        assert.equal(res.statusCode, 200); // full file
    });

    // regression: suffix ranges (bytes=-N) used to parse start as NaN
    test('handles a suffix range (last N bytes)', async () => {
        const r = rangeFor('bytes=-10', { path: FILE });
        const res = resp();
        await r.modifyResponse(res);
        assert.equal(res.getHeader('Content-Range'), 'bytes 90-99/100');
        assert.equal(res.getHeader('Content-Length'), 10);
    });

    test('caps the chunk to maxChunkSize', async () => {
        const r = rangeFor('bytes=0-', { path: FILE, maxChunkSize: 10 });
        const res = resp();
        await r.modifyResponse(res);
        assert.equal(res.getHeader('Content-Length'), 10);
        assert.equal(res.getHeader('Content-Range'), 'bytes 0-9/100');
        assert.equal(res.statusCode, 206);
    });

    test('throws 416 for a range starting past EOF', async () => {
        const r = rangeFor('bytes=999-', { path: FILE });
        const res = resp();
        await assert.rejects(r.modifyResponse(res), (e: any) => e instanceof HttpError && e.code === 416);
    });
});
