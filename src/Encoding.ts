
import { Inject, Injectable, InjectionToken } from '@uon/core';
import { gzip, createGzip } from 'zlib';
import { IncomingRequest } from './IncomingRequest';
import { OutgoingResponse, IOutgoingReponseModifier } from './OutgoingResponse';
import { Readable } from 'stream';
import { extname } from 'path';

// Injection token for encoding config
export const HTTP_ENCODING_CONFIG = new InjectionToken<HttpEncodingConfig>("HTTP_ENCODING_CONFIG");


/**
 * Configuration for content encoding
 */
export interface HttpEncodingConfig {

    /**
     * A list of extentions to handle, defaults to ['js', 'css']
     */
    extensions: string[];


}


/**
 * The encoding transform configuration for the request
 */
export interface EncodingConfigureOptions {

}


/**
 * Handles gzip compression for supported files (ie. text files)
 * 
 * The resulting compressed files are stored in the folder defined by the destination
 * storage adapter with the name ${orginalFileName.ext}.gz.${originalModifiedAt}
 * 
 * If the original file changes a new .gz file will be created.
 * Only gzip compression is implemented at this time
 * 
 * TODO: Implement stale .gz files cleanup 
 */
@Injectable()
export class Encoding implements IOutgoingReponseModifier {

    // the accepted encoding methods sent in the request
    readonly accept: ReadonlyArray<string>;

    private _options: EncodingConfigureOptions;


    constructor(private request: IncomingRequest, 
        private response: OutgoingResponse) {

        if (request.headers['accept-encoding']) {
            // populate the accept array
            this.accept = (request.headers['accept-encoding'] as string)
                .split(',')
                .map(s => s.trim());
        }

    }

    /**
     * HttpTransform configure implementation
     * @param options 
     */
    configure(options: EncodingConfigureOptions) {
        this._options = options;
        return this;
    }


    /**
     * HttpTransform transform implementation
     * @param response 
     */
    async modifyResponse(response: OutgoingResponse) {

        // must be configured
        if (!this._options) {
            return;
        }

       /* const src_adapter = this._options.srcAdapter;
        const src_path = this._options.srcPath;

        if (src_adapter && src_path) {

            if (this.accept.indexOf('gzip') === -1 ||
                this.config.extensions.indexOf(extname(src_path).substr(1)) === -1) {
                return;
            }

            // get the stats for the original file
            return src_adapter.stat(src_path)
                .then((srcStats) => {

                    // shortcut to the destination adapter
                    const dest_adapter = this.config.storageAdapter;

                    // compute file name for the gz file
                    const dest_path = `${this._options.srcPath}.gz.${Math.floor(srcStats.modified.getTime() / 1000)}`;

                    // the gzip file stats
                    let final_stats: FileStat;

                    // get stats for the gz file
                    return dest_adapter.stat(dest_path)
                        .then((destStats) => {

                            // got stats
                            final_stats = destStats;

                            // return a read stream to it
                            return dest_adapter.createReadStream(dest_path);

                        })
                        .catch((err) => {

                            // file doesn't exist, we need to gzip the orginal
                            return new Promise<Readable>((resolve, reject) => {

                                // read, compress and save result
                                src_adapter.createReadStream(src_path)
                                    .pipe(createGzip())
                                    .pipe(dest_adapter.createWriteStream(dest_path))
                                    .on('finish', () => {

                                        // we need the stats for the new file
                                        // so we can set the headers
                                        dest_adapter.stat(dest_path)
                                            .then((destStats) => {
                                                final_stats = destStats;
                                                resolve(dest_adapter.createReadStream(dest_path))
                                            });

                                    })
                                    .on('error', (err) => {
                                        reject(err);
                                    });
                            });

                        })
                        .then((stream) => {

                            // all done, set headers
                            response.assignHeaders({
                                'Content-Encoding': 'gzip',
                                'Content-Length': final_stats.size
                            });
    
                            // finally set input stream
                            response.stream(stream);

                        });

                });

        }*/

    }



}




