import { Injectable, } from '@uon/core';
import { Unquote } from '@uon/string-utils';
import { IncomingRequest } from './request';
import { OutgoingResponse, IOutgoingReponseModifier } from './response';
import { ParseWeightedValuesString } from './utils';



@Injectable()
export class AcceptLanguage {

    private _accepted: [string, number][];

    constructor(private request: IncomingRequest) {
        let parsed: [string, number][] = [['en', 1.0]];

        let header_val = request.headers['accept-language'];
        if (header_val) {
            if (header_val != '*') {
                parsed = ParseWeightedValuesString(header_val as string);
            }
        }

        this._accepted = parsed;

    }

    getBestMatch(availableLangs: string[]) {

        let selected = availableLangs[0];
        let hi_q = -1.0;
        for (let i = 0; i < availableLangs.length; i++) {
            for (let j = 0; j < this._accepted.length; j++) {
                if (availableLangs[i] == this._accepted[j][0]
                    && this._accepted[j][1] > hi_q) {
                    hi_q = this._accepted[j][1];
                    selected = availableLangs[i];
                }
            }
        }

        return selected;

    }

}


@Injectable()
export class AcceptEncoding {

    private _accepted: [string, number][];

    constructor(private request: IncomingRequest) {
        let parsed: [string, number][] = [['identity', 1.0]];

        let header_val = request.headers['accept-encoding'];
        if (header_val) {
            if (header_val != '*') {
                parsed = ParseWeightedValuesString(header_val as string);
            }
        }

        this._accepted = parsed;

    }

    getBestMatch(availableEncodings: string[]) {

        let selected = availableEncodings[0];
        let hi_q = -1.0;
        for (let i = 0; i < availableEncodings.length; i++) {
            for (let j = 0; j < this._accepted.length; j++) {
                if (availableEncodings[i] == this._accepted[j][0]
                    && this._accepted[j][1] > hi_q) {
                    hi_q = this._accepted[j][1];
                    selected = availableEncodings[i];
                }
            }
        }

        return selected;

    }

}