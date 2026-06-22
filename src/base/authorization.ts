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

    private _scheme!: string;
    private _token!: string;

    private _config!: WWWAuthenticateConfig;

    constructor(private request: IncomingRequest) {

        let auth_header = request.headers['authorization'];
        // require a "<scheme> <token>" shape; a header with no space is malformed
        if (typeof auth_header === 'string' && auth_header.indexOf(' ') > -1) {

            let str = auth_header as string;
            let start = str.indexOf(' ');

            // assign scheme
            this._scheme = str.substr(0, start).toLowerCase();

            // parse + assign the token
            this._token = Unquote(str.substr(start).trim());

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
    decodeBasicCredentials(): BasicCredentials | null {

        if (this._scheme !== 'basic') {
            return null;
        }

        let decoded = Buffer.from(this._token, 'base64').toString('utf8');

        // split on the FIRST colon only — a password may itself contain colons
        let sep = decoded.indexOf(':');
        if (sep === -1) {
            return { username: decoded, password: '' };
        }

        return {
            username: decoded.slice(0, sep),
            password: decoded.slice(sep + 1)
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

            // charset is optional; only append it when configured
            const charset = this._config.charset
                ? `, charset=${this._config.charset.toUpperCase()}`
                : '';

            response.setHeader('WWW-Authenticate',
                `${this._config.scheme} realm="${this._config.realm}"${charset}`)

        }

    }


}