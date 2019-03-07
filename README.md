# UON HTTP

An http server module for use in a @uon/core application.

## Installation

```shell
    npm i @uon/http
```

## Usage
To start using @uon/http, include it in your app module's imports.

```typescript
import { HttpModule } from '@uon/http';

@Module({
    imports: [
        HttpModule.WithConfig({
            plainPort: 8080
        })
    ]
})
export class MyAppModule {}
```

### Routing requests
Http routing is done with @uon/router and the http module provides 2 routers: HTTP_ROUTER and HTTP_REDIRECT_ROUTER.


To declare routes you can do the following:

First declare a RouterOutlet with HttpRoute decorators on methods:

```typescript

import { RouterOutlet } from '@uon/router';
import { HttpRoute, HttpResponse } from '@uon/http';

@RouterOutlet()
export class MyAppOutlet {

    // ctor with dependency injection 
    constructor(private response: HttpResponse) {}

    @HttpRoute({
        method: 'GET',
        path: '/say-hello'
    })
    myStaticPathRoute() {
        this.response.send('Hello World!');
    }

}
```
 Second, declare a list of routes that will be used by the HttpServer:

```typescript
const routes: Routes = [
    {
        path:'/my-base-path',
        outlet: MyAppController
    }
];
```
Finally, import RouterModule like so, to bind routes to the correct router: 
```typescript
@Module({
    imports: [
        RouterModule.For(HTTP_ROUTER, routes)
    ]
})
export class MyAppModule {}


```

Read more on routing [here](https://github.com/uon-team/router#uon-router).
