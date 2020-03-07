import { Injectable,  } from '@uon/core';
import { Unquote } from '@uon/string-utils';
import { IncomingRequest } from './request';
import { OutgoingResponse, IOutgoingReponseModifier } from './response';


export interface WWWAuthenticateConfig {
    scheme: string;
    realm: string;
    charset?: string;
}


export interface BasicCredentials {
    username: string;
    password: string;
}


const WWW_AUTH_CONFIG_DEFAULT: WWWAuthenticateConfig = {
    scheme: "Basic",
    realm: "Default",
    charset: "utf-8"
}


/**
 * Parsed authorization header
 */
@Injectable()
export class Authorization {

    private _scheme: string;
    private _token: string;

    private _config: WWWAuthenticateConfig;

    constructor(private request: IncomingRequest) {

        let auth_header = request.headers['authorization'];
        if (typeof auth_header === 'string') {

            let str = auth_header as string;
            let start = str.indexOf(' ');
            let scheme = str.substr(0, start).toLowerCase();

            // assign scheme
            this._scheme = scheme;

            // parse the token
            let token_str = Unquote(str.substr(start).trim());

            // assign raw token
            this._token = token_str;

        }

    }

    /**
     * The type of authorization defined in the header (ie. Basic, Bearer, Digest, etc)
     */
    get scheme(): string {
        return this._scheme;
    }

    /**
     * The value after the scheme provided in the Authorization request header
     */
    get token(): string {
        return this._token;
    }

    /**
     * Wheter the  Authorization request header was present and successfully parsed
     */
    get valid(): boolean {
        return this._scheme !== undefined;
    }


    /**
     * Decode basic credentials from the provided token
     * Will return null if the scheme was not set to Basic in 
     * the authorization request header
     */
    decodeBasicCredentials(): BasicCredentials {

        if (this._scheme !== 'basic') {
            return null;
        }

        let decoded = Buffer.from(this._token, 'base64').toString('utf8');
        let parts = decoded.split(':');

        return {
            username: parts[0],
            password: parts[1]
        };

    }

    /**
    * Configure response
    * @param response 
    */
    configure(opts: WWWAuthenticateConfig) {

        this._config = Object.assign({}, WWW_AUTH_CONFIG_DEFAULT, opts);
        return this;
    }

    /**
     * IOutgoingReponseModifier implementation
     * @param response 
     */
    async modifyResponse(response: OutgoingResponse) {

        if (this._config) {

            response.statusCode = 401;
            response.setHeader('WWW-Authenticate',
                `${this._config.scheme} realm="${this._config.realm}", charset=${this._config.charset.toUpperCase()}`)

        }

    }


}