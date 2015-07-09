/*
 * lzo1x_decompress_safe
 * JavaScript port of minilzo decompression by Alistair Braidwood
 * using Uint8Array buffers
 *
 *
 * This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License as
 *  published by the Free Software Foundation; either version 2 of
 *  the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 *  along with the minilzo-js library; see the file COPYING.
 *  If not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */

/*
 * original minilzo.c by:
 *
 * Markus F.X.J. Oberhumer
 * <markus@oberhumer.com>
 * http://www.oberhumer.com/opensource/lzo/
 */

/*
 * NOTE:
 *   the full LZO package can be found at
 *   http://www.oberhumer.com/opensource/lzo/
 */

 /* Usage:

    lzo1x_decompress_safe({
        inputBuffer: <Uint8Array>
        outputBuffer: null
    });

    The output buffer will be filled with decompressed data.

    exit statuses are not currently implemented

*/
function lzo1x_decompress_safe ( state ) {
    var buf = state.inputBuffer;
    var blockSize = 4096;
    var out = new Uint8Array(Math.ceil(buf.length / blockSize) * blockSize);
    var cbl = out.length;
    state.outputBuffer = out;
    var ip_end = buf.length;
    var op_end = out.length;
    var t = 0;

    var ip = 0;
    var op = 0;
    var m_pos = 0;

    var OK = 0;
    var INPUT_OVERRUN = -4;
    var OUTPUT_OVERRUN = -5;
    var LOOKBEHIND_OVERRUN = -6;
    var EOF_FOUND = -999;

    function extendBuffer() {
        var newBuffer = new Uint8Array(cbl + blockSize);
        newBuffer.set(out);
        out = newBuffer;
        state.outputBuffer = out;
        cbl = out.length;
    }


    function eof_found() {
        // *out_len = ((lzo_uint) ((op)-(out)));
        return (ip === ip_end ? 0 : (ip < ip_end ? -8 : -4));
    }

    function match_next() {
        // if (op_end - op < t) return OUTPUT_OVERRUN;
        // if (ip_end - ip < t+3) return INPUT_OVERRUN;

        while(op + 3 > cbl) {extendBuffer();}

        out[op++] = buf[ip++];
        if (t > 1) {
            out[op++] = buf[ip++];
            if (t > 2) {
                out[op++] = buf[ip++];
            }
        }

        t = buf[ip++];
    }

    function match_done() {
        t = buf[ip-2] & 3;
        return t;
    }

    function copy_match() {
        t += 2;
        while(op + t > cbl) {extendBuffer();}
        do {
            out[op++] = out[m_pos++];
        } while(--t > 0);
    }

    function match() {
        for (;;) {
            if (t >= 64) {

                m_pos = op - 1;
                m_pos -= (t >> 2) & 7;
                m_pos -= buf[ip++] << 3;
                t = (t >> 5) - 1;

                // if ( m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
                // if (op_end - op < t+3-1) return OUTPUT_OVERRUN;

                copy_match();

                if(match_done() === 0) {
                    break;
                } else {
                    match_next();
                    continue;
                }


            } else if (t >= 32) {
                t &= 31;
                if (t === 0) {
                    while (buf[ip] === 0) {
                        t += 255;
                        ip++;
                        // if (t > -511) return OUTPUT_OVERRUN;
                        // if (ip_end - ip < 1) return INPUT_OVERRUN;
                    }
                    t += 31 + buf[ip++];
                    // if (ip_end - ip < 2) return INPUT_OVERRUN;
                }

                m_pos = op - 1;
                m_pos -= (buf[ip] >> 2) + (buf[ip + 1] << 6);

                ip += 2;

            } else if (t >= 16) {
                m_pos = op;
                m_pos -= (t & 8) << 11;

                t &= 7;
                if (t === 0) {
                    while (buf[ip] === 0) {
                        t += 255;
                        ip++;
                        // if (t > -511) return OUTPUT_OVERRUN;
                        // if (ip_end - ip < 1) return INPUT_OVERRUN;
                    }
                    t += 7 + buf[ip++];
                    // if (ip_end - ip < 2) return INPUT_OVERRUN;
                }

                m_pos -= (buf[ip] >> 2) + (buf[ip + 1] << 6);

                ip += 2;
                if (m_pos === op) {
                    state.outputBuffer = state.outputBuffer.subarray(0, op);
                    return EOF_FOUND;
                }
                m_pos -= 0x4000;

            } else {
                m_pos = op - 1;
                m_pos -= t >> 2;
                m_pos -= buf[ip++] << 2;

                // if (m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
                // if (op_end - op < 2) return OUTPUT_OVERRUN;
                while(op + 2 > cbl) {extendBuffer();}
                out[op++] = out[m_pos++];
                out[op++] = out[m_pos];

                if(match_done() === 0) {
                    break;
                } else {
                    match_next();
                    continue;
                }
            }

            // if (m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
            // if (op_end - op < t+3-1) return OUTPUT_OVERRUN;

            copy_match();

            if(match_done() === 0) {
                break;
            }

            match_next();
        }

        return OK;
    }

    var skipToFirstLiteralFun = false;
    // if (ip_end - ip < 1) return INPUT_OVERRUN;
    if (buf[ip] > 17)
    {
        t = buf[ip++] - 17;
        if (t < 4) {
            match_next();
            ret = match();
            if(ret !== OK) {
                return ret === EOF_FOUND ? OK : ret;
            }

        } else {
            // if (op_end - op < t) return OUTPUT_OVERRUN;
            // if (ip_end - ip < t+3) return INPUT_OVERRUN;
            while(op + t > cbl) {extendBuffer();}
            do {
                out[op++] = buf[ip++];
            } while (--t > 0);
            skipToFirstLiteralFun = true;
        }
    }

    for (;;) {
        if(!skipToFirstLiteralFun) {
            // if (ip_end - ip < 3) return INPUT_OVERRUN;
            t = buf[ip++];

            if (t >= 16) {
                ret = match();
                if(ret !== OK) {
                    return ret === EOF_FOUND ? OK : ret;
                }
                continue;
            }

            if (t === 0) {
                while (buf[ip] === 0) {
                    t += 255;
                    ip++;
                    // if (t > 511) return INPUT_OVERRUN;
                    // if (ip_end - ip < 1) return INPUT_OVERRUN;
                }
                t += 15 + buf[ip++];
            }
            // if (op_end - op < t+3) return OUTPUT_OVERRUN;
            // if (ip_end - ip < t+6) return INPUT_OVERRUN;

            t += 3;

            while(op + t > cbl) {extendBuffer();}
            do {
                out[op++] = buf[ip++];
            } while (--t > 0);
            skipToFirstLiteralFun = false;
        }

        t = buf[ip++];
        if (t < 16) {
            m_pos = op - (1 + 0x0800);
            m_pos -= t >> 2;
            m_pos -= buf[ip++] << 2;

            // if ( m_pos <  out || m_pos >= op) return LOOKBEHIND_OVERRUN;
            // if (op_end - op < 3) return OUTPUT_OVERRUN;
            while(op + 3 > cbl) {extendBuffer();}
            out[op++] = out[m_pos++];
            out[op++] = out[m_pos++];
            out[op++] = out[m_pos];

            if(match_done() === 0) {
                break;
            } else {
                match_next();
                continue;
            }
        }

        ret = match();
        if(ret !== OK) {
            return ret === EOF_FOUND ? OK : ret;
        }
    }

    return OK;
}