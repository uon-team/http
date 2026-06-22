import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OutgoingResponse } from './response';
import { MockOutgoingResponse } from '../mock/mock.outgoing';

function resp() {
    const mock = new MockOutgoingResponse();
    return { res: new OutgoingResponse(mock as any), mock };
}

describe('OutgoingResponse', () => {
    test('setHeader / getHeader / assignHeaders', () => {
        const { res } = resp();
        res.setHeader('X-A', '1');
        res.assignHeaders({ 'X-B': '2' });
        assert.equal(res.getHeader('X-A'), '1');
        assert.equal(res.getHeader('X-B'), '2');
    });

    test('json sets content-type and streams the payload', async () => {
        const { res, mock } = resp();
        res.json({ a: 1 });
        await res.finish();
        assert.equal(res.getHeader('Content-Type'), 'application/json');
        assert.deepEqual(JSON.parse(mock.responseData.toString('utf8')), { a: 1 });
    });

    test('json keep filters to the listed keys', async () => {
        const { res, mock } = resp();
        res.json({ a: 1, b: 2 }, { keep: ['a'] });
        await res.finish();
        assert.deepEqual(JSON.parse(mock.responseData.toString('utf8')), { a: 1 });
    });

    test('json prefixOutput adds the XSSI guard prefix', async () => {
        const { res, mock } = resp();
        res.json({ a: 1 }, { prefixOutput: true });
        await res.finish();
        assert.ok(mock.responseData.toString('utf8').startsWith(")]}',\n"));
    });

    test('finish with no body sends 204', async () => {
        const { res, mock } = resp();
        await res.finish();
        assert.equal(mock.statusCode, 204);
    });

    test('send(data) streams the data', async () => {
        const { res, mock } = resp();
        await res.send('hello');
        assert.equal(mock.responseData.toString('utf8'), 'hello');
    });

    // regression: send('') used to fall through to the 204 path
    test("send('') responds 200, not 204", async () => {
        const { res, mock } = resp();
        await res.send('');
        assert.equal(mock.statusCode, 200);
    });

    test('redirect sets Location and a 302 status', async () => {
        const { res, mock } = resp();
        await res.redirect('/elsewhere');
        assert.equal(res.getHeader('Location'), '/elsewhere');
        assert.equal(mock.statusCode, 302);
    });
});
