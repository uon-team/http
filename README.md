# @uon/http

An HTTP server module for `@uon/core` applications: decorator-based routing,
request-scoped dependency injection, body/query validation guards, CORS,
cookies, caching, byte-range streaming, TLS, connection upgrades and a
serverless adapter.

## Installation

```shell
npm i @uon/http
```

Peer dependencies: `@uon/core`, `@uon/model`, `@uon/router`. Decorator metadata
must be enabled in your `tsconfig.json` (`experimentalDecorators` +
`emitDecoratorMetadata`), and `reflect-metadata` imported once at your entry
point (it is imported by `@uon/core`).

## Quick start

```typescript
import { Module, Application } from '@uon/core';
import { HttpModule } from '@uon/http';

@Module({
    imports: [
        HttpModule.WithConfig({ plainPort: 8080 }),
    ],
})
export class MyAppModule {}

Application.Bootstrap(MyAppModule).start();
```

## Configuration

`HttpModule.WithConfig(config)` accepts an `HttpConfig`:

| Option | Description |
|--------|-------------|
| `plainPort` | Port for the plain HTTP server. |
| `port` | Port for the HTTPS server (requires a `TLSProvider`). |
| `host` | Interface to bind. |
| `providers` | Extra providers added to every request-scoped injector. |
| `traceContextErrors` | `console.error` errors thrown from outlets. |
| `routerToken` | Which router token requests are matched against (defaults to `HTTP_ROUTER`). |
| `serverless` | Run without listening on a socket (for `mockRequest` / lambda). |
| `modelAdapter` | Model layer used by the guards (validation / formatting / (de)serialization). Defaults to the `@uon/model` implementation — see [Pluggable model layer](#pluggable-model-layer). |

## Routing

Routing is built on `@uon/router`. The module provides two router tokens:
`HTTP_ROUTER` and `HTTP_REDIRECT_ROUTER` (the latter for the automatic
http → https redirect).

Declare a `@RouterOutlet` whose methods are decorated with `@HttpRoute`:

```typescript
import { RouterOutlet, RouteParams } from '@uon/router';
import { HttpRoute, OutgoingResponse } from '@uon/http';

@RouterOutlet()
export class MyAppOutlet {

    constructor(private response: OutgoingResponse) {}

    @HttpRoute({ method: 'GET', path: '/say-hello/:name' })
    sayHello(params: RouteParams) {
        this.response.send(`Hello World! ${params.name}`);
    }
}
```

Then bind a route tree to a router token via `RouterModule.For`:

```typescript
import { RouterModule } from '@uon/router';
import { HTTP_ROUTER } from '@uon/http';

const routes = [{ path: '/my-base-path', outlet: MyAppOutlet }];

@Module({ imports: [RouterModule.For(HTTP_ROUTER, routes)] })
export class MyAppModule {}
```

`@HttpRoute.method` may be a string or an array of methods; the router only
matches an exact method.

## The request

Inject `IncomingRequest` into a constructor or handler:

```typescript
constructor(private request: IncomingRequest) {}
// request.method, request.uri, request.headers, request.secure,
// request.clientIp, request.userAgent
// await request.body  -> Buffer (see the body-size note below)
```

> **Security — X-Forwarded-* headers.** `request.clientIp` and `request.secure`
> are derived from `X-Forwarded-For` / `X-Forwarded-Proto` **unconditionally**.
> Only rely on them when the server sits behind a trusted proxy that sets these
> headers; a direct client can spoof them.

> **Body size.** `request.body` buffers the whole body with a hard safety ceiling
> (100 MB) to avoid memory exhaustion. For tighter, per-route limits use a body
> guard's `maxLength`.

## The response

Inject `OutgoingResponse`:

```typescript
response.send(data);                 // Buffer | string | null
response.json(obj, { pretty, prefixOutput, keep });
response.redirect('/somewhere', /* permanent */ false);
response.setHeader(name, value);
response.assignHeaders({ ... });
response.stream(readableStream);
response.use(modifier);              // IOutgoingReponseModifier in the pipeline
```

`json()` options: `pretty` (tab-indent), `prefixOutput` (prepend the `)]}',\n`
XSSI guard), `keep` (whitelist of keys to emit).

## Validating input

- `JsonBodyGuard(type?, options?)` + `RequestBody` — parse/validate a JSON body
  against a `@Model` type. Options: `validate`, `validateArray`,
  `throwOnValidation`, `maxLength`. A malformed JSON body responds `400`.
- `FormDataBodyGuard` — multipart/form-data bodies.
- `QueryGuard` + `RequestQuery` — coerce/validate the query string.
- `RouteParamsGuard` — validate path params.

`RequestBody` / `RequestQuery` expose `.raw`, `.value` (coerced) and
`.validation`.

### Pluggable model layer

The guards don't talk to `@uon/model` directly — they go through an
`HttpModelAdapter` resolved from the `HTTP_MODEL_ADAPTER` token. The default
adapter (`UonModelAdapter`) wraps `@uon/model`, so out of the box everything
behaves as before. To use a different model/validation library, implement the
interface and pass it as `modelAdapter`:

```typescript
import { HttpModelAdapter, HttpModelValidationResult, HttpModule } from '@uon/http';

class MyModelAdapter implements HttpModelAdapter {
    isModel(type)                    { /* is `type` a model you handle? */ }
    deserialize(type, data)          { /* already-parsed JSON object -> instance */ }
    deserializeFromString(type, raw) { /* coerce a string-keyed map (query/form) -> instance */ }
    serialize(value)                 { /* instance -> JSON-ready value, before JSON.stringify() */ }
    async validate(subject, validators, injector, key) {
        // ...run validation, return an HttpModelValidationResult-shaped result
        return new HttpModelValidationResult(key);
    }
    applyFormatting(subject)         { /* mutate `subject` in place, or no-op */ }
}

@Module({
    imports: [HttpModule.WithConfig({ modelAdapter: new MyModelAdapter() })],
})
export class MyAppModule {}
```

The adapter only covers the operations that depend on the model library. The
result/failure/validator shapes are owned by `@uon/http` and are
library-agnostic — exported alongside the helpers that operate on them:

- `HttpValidationResult` / `HttpModelValidationResult` — the result types
  (`key`, `failures`, `children`, and a computed `valid`). Your adapter's
  `validate` must return something satisfying `HttpModelValidationResult`, and
  your validators must throw `HttpValidationFailure`-shaped objects.
- `HttpValidator` / `HttpValidatorMap` — the validator function shape used in
  guard `validate` options.
- `RunValidators(params, validators, result)` — runs validators and collects
  failures (used by `RouteParamsGuard`; needs no adapter).
- `FlattenValidationResult(result)` — flattens a result tree to `{ path, errors }`
  entries for an error body (used by `HttpErrorJsonHandler`).
- `IsValidationResult(x)` — structural guard for validation results.

## CORS

```typescript
import { CorsGuard } from '@uon/http';

@HttpRoute({ method: 'GET', path: '/api', guards: [CorsGuard({ origin: '*' })] })
```

`CorsGuardOptions`: `origin` (`'*'` | string | string[]), `methods`, `headers`,
`exposeHeaders`, `credentials`, `maxAge`.

> **Security — CORS.** The allowed origin is decided **only** from the request's
> `Origin` header (never the `Host` header), and a `Vary: Origin` response header
> is set so caches don't share one origin's response with another.

## Cookies, caching and ranges

- `Cookies` — `getCookie`/`getCookies`/`setCookie(name, value, CookieSetOptions)`.
  Malformed incoming cookie values fall back to their raw value instead of
  throwing.
- `Expires` — conditional caching (`If-Modified-Since` → `304`), `Expires` and
  `Last-Modified` headers via `configure({ expiresIn, lastModified })`.
- `Range` — byte-range file streaming via `configure({ path, maxChunkSize })`.
  Supports `bytes=N-`, `bytes=N-M` and suffix `bytes=-N` ranges, responds `206`
  (or `200` for the full file) and `416` for unsatisfiable ranges.
- `AcceptLanguage` / `AcceptEncoding` — `getBestMatch(available)` content
  negotiation.

## Error handling

```typescript
import { HttpError } from '@uon/http';
throw new HttpError(404);
```

Provide a custom handler via the `HTTP_ERROR_HANDLER` token (swap the default
`HttpErrorPlainTextHandler` for `HttpErrorJsonHandler`), or implement
`onHttpError(err)` on a `@RouterOutlet` controller (`OnHttpError`).

## HTTPS / TLS

Provide an `HTTP_TLS_PROVIDER` (`TLSProvider`) and set `port`. With both `port`
and `plainPort`, requests to the plain port are redirected to https via
`HTTP_REDIRECT_ROUTER`.

## Connection upgrades / WebSockets

Register an `HttpUpgradeHandler` under `HTTP_UPGRADE_HANDLER` and call
`HttpContext.upgrade(type, headers?)` from a handler.

## Serverless

Set `serverless: true` and either drive `HttpServer.mockRequest(options)`
directly or use `CreateHttpAwsLambdaHandler(app)` for AWS API Gateway. Binary
responses are base64-encoded automatically (`isBase64Encoded`).

## Advanced: HttpContext & request-scoped DI

Each request gets an `HttpContext` and a child injector seeded with
`HttpContext`, `IncomingRequest`, `OutgoingResponse`, `ActivatedRoute`,
`RouteParams`, `RouteData`, the `config.providers`, and the outlet's own
providers. `HttpServer` emits `request` / `response` / `error` events.

## License

MIT
