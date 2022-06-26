import { Application } from "@uon/core";
import { HttpServer } from "./http.server";



/**
 * Creates the handler fn for AWS lambda that calls the mock http server
 * @note The application must no be started as the handler will take care of it.
 * @param app 
 * @returns 
 */
export function CreateHttpAwsLambdaHandler(app: Application) {

    return async (event: any, context: any) => {

        let main_module = await app.start();
        let http = await main_module.injector.getAsync(HttpServer);

        let req_body: Buffer | null = null;
        if(event.body) {
            req_body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

        }

        // we expect input from API Gateway
        let res = await http.mockRequest({
            method: event.httpMethod,
            url: event.path,
            headers: event.headers,
            body: req_body
        });


        return {
            statusCode: res.statusCode,
            headers: res.headers,
            isBase64Encoded: false,
            body: res.body.toString('utf8')
        };
        

    };
}