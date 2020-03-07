
import { Module, ModuleWithProviders, APP_INITIALIZER } from '@uon/core';
import { Router } from '@uon/router';

import { HttpServer } from './server/http.server';
import { HttpConfig, HTTP_CONFIG, HTTP_CONFIG_DEFAULTS } from './server/http.config';
import { HTTP_PROVIDERS, DEFAULT_CONTEXT_PROVIDERS } from './server/http.providers';

import { HTTP_ROUTER, HTTP_REDIRECT_ROUTER, HttpRoute } from './server/http.router';


@Module({
    providers: [
        HttpServer,
        {
            token: HTTP_CONFIG,
            value: HTTP_CONFIG_DEFAULTS
        },
        {
            token: HTTP_ROUTER,
            value: new Router(HttpRoute)
        },
        {
            token: HTTP_REDIRECT_ROUTER,
            value: new Router(HttpRoute)
        },
        {
            token: APP_INITIALIZER,
            factory: (server: HttpServer) => {
                return server.start();
            },
            deps: [HttpServer],
            multi: true
        }
    ],
    declarations: []
})
export class HttpModule {


    /**
     * The only way to import the HttpModule is with a config, this is a helper for that.
     * @param config 
     */
    static WithConfig(config: HttpConfig): ModuleWithProviders {

        // merge provided config with the default
        const merged_config = Object.assign({}, HTTP_CONFIG_DEFAULTS, config);

        // return a module with providers object
        return {
            module: HttpModule,
            providers: [
                {
                    token: HTTP_CONFIG,
                    value: merged_config
                },
                {
                    token: HTTP_PROVIDERS,
                    value: DEFAULT_CONTEXT_PROVIDERS,
                    multi: true
                },

            ]
        }
    }


}