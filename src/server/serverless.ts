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

        // format body into buffer
        let req_body: Buffer | null = null;
        if (event.body) {
            req_body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        }

        // combine headers into one object
        let req_headers = Object.assign({}, event.headers, event.multiValueHeaders);

        // we expect input from API Gateway
        let res = await http.mockRequest({
            method: event.httpMethod,
            url: event.path,
            headers: req_headers,
            body: req_body
        });

        let single_headers: { [k: string]: string } = {};
        let multi_headers: { [k: string]: string[] } = {};
        for (let i in res.headers) {
            if (Array.isArray(res.headers[i])) {
                multi_headers[i] = res.headers[i] as string[];
            }
            else {
                single_headers[i] = res.headers[i] as string;
            }
        }

        let result = {
            statusCode: res.statusCode,
            headers: single_headers,
            multiValueHeaders: multi_headers,
            isBase64Encoded: false,
            body: res.body.toString('utf8')
        };

        return result;


    };
}