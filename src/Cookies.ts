import { Injectable, ObjectUtils } from '@uon/core';
import { IncomingRequest } from './IncomingRequest';
import { OutgoingResponse, IOutgoingReponseModifier } from './OutgoingResponse';


const SPLIT_ENTRIES = /; */;
const INVALID_CHAR_TEST = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

const DEFAULT_SET_COOKIE_OPTIONS = {
    httpOnly: true,
    session: false,
    path: '/'
};

export interface CookieSetOptions {

    /**
     * The date when the cookie is meant to expire
     */
    expires?: Date;

    /**
     * The maximum lifetime of the cookie
     */
    maxAge?: number;

    /**
     * The domain where this cookie is valid 
     */
    domain?: string;

    /**
     * The path where this cookie is valid
     */
    path?: string;

    /**
     * Whether this cookie is HTTP only. 
     * An HttpOnly cookie cannot be retrived with Javascript on the client side
     */
    httpOnly?: boolean;

    /**
     * This is set to true automatically if the request originated from HTTPS
     */
    secure?: boolean;

    /**
     * Whether this is a session cookie (ie. is deleted when the browser closes)
     */
    session?: boolean;

}

/**
 * Cookie manipulation interface, it parses cookies from the request header
 * and allows you to set cookies
 */
@Injectable()
export class Cookies implements IOutgoingReponseModifier {

    // request cookie storage
    private _get: { [k: string]: string } = {};

    // response cookie storage
    private _set: { [k: string]: string } = {};

    /**
     * ctor
     */
    constructor(private request: IncomingRequest) {

        // parse incoming cookies
        this.parse();


    }

    /**
     * Set a cookie to be written in the response
     * @param name 
     * @param value 
     * @param options 
     */
    setCookie(name: string, value: string, options?: CookieSetOptions) {

        const opts: CookieSetOptions = ObjectUtils.extend({}, DEFAULT_SET_COOKIE_OPTIONS, options);
        opts.secure = this.request.secure;

        try {
            let result = this.serialize(name, value, opts);
            this._set[name] = result;
        }
        catch (ex) {
            console.warn(`Invalid set cookie ${name} = ${value}`);
        }

    }

    /**
     * Retrieve a request cookie by name
     * @param name 
     */
    getCookie(name: string): string {
        return this._get[name];
    }

    /**
     * Get all request cookies as key/value map
     */
    getCookies() {
        return this._get;
    }


    /**
     * HttpTransform implementation
     * Sets the Set-Cookie header
     * @param response 
     */
    async modifyResponse(response: OutgoingResponse) {

        let cs: string[] = [];
        for (let key in this._set) {
            cs.push(this._set[key]);
        }

        // set the header's Set-Cookie field with the array
        response.setHeader('Set-Cookie', cs);

    }



    /**
     * Parse the cookies from the request
     */
    private parse() {

        let str = this.request.headers['cookie'] as string;
        if (!str) return;

        let pairs = str.split(SPLIT_ENTRIES);

        for (let i = 0; i < pairs.length; i++) {

            let pair = pairs[i];
            let eq_idx = pair.indexOf('=');

            // skip things that don't look like key=value
            if (eq_idx < 0) {
                continue;
            }

            let key = pair.substr(0, eq_idx).trim()
            let val = pair.substr(++eq_idx, pair.length).trim();

            // quoted values
            if ('"' == val[0]) {
                val = val.slice(1, -1);
            }

            // only assign once
            if (this._get[key] == undefined) {
                this._get[key] = decodeURIComponent(val);
            }

        }

    }

    /**
     * Serializes key, value and options
     * @param name 
     * @param val 
     * @param options 
     */
    private serialize(name: string, val: string, options: CookieSetOptions) {

        // check for invalid char in key
        if (!INVALID_CHAR_TEST.test(name)) {
            throw new Error(`Cookie name "${name}" is invalid.`);
        }

        // url encode the value
        let value = encodeURIComponent(val);

        // check for invalid chars in value
        if (!INVALID_CHAR_TEST.test(value)) {
            throw new Error(`Cannot set cookie ${name}, the value contains invalid characters.`);
        }

        let result = name + '=' + value;


        if (options.maxAge) {
            result += '; Max-Age=' + Math.floor(options.maxAge);
        }

        if (options.expires) {
            result += `; Expires=${options.expires.toUTCString()}`;
        }

        if (options.httpOnly) {
            result += '; HttpOnly';
        }

        if (options.secure) {
            result += '; Secure';
        }

        if (options.path) {
            result += `; Path=${options.path}`;
        }

        if (options.domain) {
            result += `; Domain=${options.domain}`;
        }


        return result;
    }

}