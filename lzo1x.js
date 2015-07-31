/*
 * minilzo-js
 * JavaScript port of minilzo by Alistair Braidwood
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

var lzo1x = (function () {
	var version = '2.0';

	var _lzo1x = {
		blockSize: 4096,

		OK: 0,
		INPUT_OVERRUN: -4,
		OUTPUT_OVERRUN: -5,
		LOOKBEHIND_OVERRUN: -6,
		EOF_FOUND: -999,
		REPEAT: -800,

		buf: null,
		buf32: null,

		out: null,
		out32: null,
		cbl: 0,
		ip_end: 0,
		op_end: 0,
		t: 0,

		ip: 0,
		op: 0,
		m_pos: 0,
		m_len: 0,

		skipToFirstLiteralFun: false,
		_bytesToCopy: 0,

		ctzl: function(v) {
			// this might be needed for _compressCore (it isn't in my current test files)
	        /*
	         * https://graphics.stanford.edu/~seander/bithacks.html#ZerosOnRightBinSearch
	         * Matt Whitlock suggested this on January 25, 2006. Andrew Shapira shaved a couple operations off on Sept. 5, 2007 (by setting c=1 and unconditionally subtracting at the end).
	         */

	        var c;     // c will be the number of zero bits on the right,
	        // so if v is 1101000 (base 2), then c will be 3
	        // NOTE: if 0 == v, then c = 31.
	        if (v & 0x1) {
	            // special case for odd v (assumed to happen half of the time)
	            c = 0;
	        } else {
	            c = 1;
	            if ((v & 0xffff) === 0) {
	                v >>= 16;
	                c += 16;
	            }
	            if ((v & 0xff) === 0) {
	                v >>= 8;
	                c += 8;
	            }
	            if ((v & 0xf) === 0) {
	                v >>= 4;
	                c += 4;
	            }
	            if ((v & 0x3) === 0) {
	                v >>= 2;
	                c += 2;
	            }
	            c -= v & 0x1;
	        }
	        return c;
	    },

	    _get4ByteAlignedBuf: function(buf) {
	    	if(buf.length % 4 === 0) {
	    		return new Uint32Array(buf.buffer);

			} else {
				var buf_4b = new Uint8Array(buf.length + (4 - buf.length % 4));
				buf_4b.set(buf);
				return new Uint32Array(buf_4b.buffer);
			}
	    },

	    extendBuffer: function() {
	        var newBuffer = new Uint8Array(this.cbl + this.blockSize);
	        newBuffer.set(this.out);
	        this.out = newBuffer;
	        this.out32 = new Uint32Array(this.out.buffer);
	        this.state.outputBuffer = this.out;
	        this.cbl = this.out.length;
	    },


	    eof_found: function() {
	        // *out_len = ((lzo_uint) ((op)-(out)));
	        return (this.ip === this.ip_end ? 0 : (this.ip < this.ip_end ? -8 : -4));
	    },

	    match_next: function() {
	        // if (op_end - op < t) return OUTPUT_OVERRUN;
	        // if (ip_end - ip < t+3) return INPUT_OVERRUN;

	        while(this.op + 3 > this.cbl) {this.extendBuffer();}

	        this.out[this.op++] = this.buf[this.ip++];
	        if (this.t > 1) {
	            this.out[this.op++] = this.buf[this.ip++];
	            if (this.t > 2) {
	                this.out[this.op++] = this.buf[this.ip++];
	            }
	        }

	        this.t = this.buf[this.ip++];
	    },

	    match_done: function() {
	        this.t = this.buf[this.ip-2] & 3;
	        return this.t;
	    },

	    copy_match: function() {
	        this.t += 2;
	        while(this.op + this.t > this.cbl) {this.extendBuffer();}

	        if(this.t > 4 && this.op % 4 === this.m_pos % 4) {
	            while (this.op % 4 > 0) {
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.t--;
	            }

	            while(this.t > 4) {
	                this.out32[0|(this.op/4)] = this.out32[0|(this.m_pos/4)];
	                this.op += 4; this.m_pos += 4;
	                this.t -= 4;
	            }
	        }

	        do {
	            this.out[this.op++] = this.out[this.m_pos++];
	        } while(--this.t > 0);
	    },

	    decomp_copy_from_buf: function() {
	        while(this.op + this.t > this.cbl) {this.extendBuffer();}

	        if(this.t > 4 && this.op % 4 === this.ip % 4) {
	            while (this.op % 4 > 0) {
	                this.out[this.op++] = this.buf[this.ip++];
	                this.t--;
	            }

	            while(this.t > 4) {
	                this.out32[0|(this.op/4)] = this.buf32[0|(this.ip/4)];
	                this.op += 4; this.ip += 4;
	                this.t -= 4;
	            }
	        }

	        do {
	            this.out[this.op++] = this.buf[this.ip++];
	        } while (--this.t > 0);
	    },

	    comp_copy_from_buf: function() {
	        if(this._bytesToCopy > 4 && this.op % 4 === this.ii % 4) {
	            while (this.op % 4 > 0) {
	                this.out[this.op++] = this.buf[this.ii++];
	                this._bytesToCopy--;
	            }

	            while(this._bytesToCopy > 4) {
	                this.out32[0|(this.op/4)] = this.buf32[0|(this.ii/4)];
	                this.op += 4; this.ii += 4;
	                this._bytesToCopy -= 4;
	            }
	        }

	        do {
	            this.out[this.op++] = this.buf[this.ii++];
	        } while (--this._bytesToCopy > 0);
	    },

	    match: function() {
	        for (;;) {
	            if (this.t >= 64) {

	                this.m_pos = this.op - 1;
	                this.m_pos -= (this.t >> 2) & 7;
	                this.m_pos -= this.buf[this.ip++] << 3;
	                this.t = (this.t >> 5) - 1;

	                // if ( m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
	                // if (op_end - op < t+3-1) return OUTPUT_OVERRUN;

	                this.copy_match();

	                if(this.match_done() === 0) {
	                    break;
	                } else {
	                    this.match_next();
	                    continue;
	                }

	            } else if (this.t >= 32) {
	                this.t &= 31;
	                if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                        // if (t > -511) return OUTPUT_OVERRUN;
	                        // if (ip_end - ip < 1) return INPUT_OVERRUN;
	                    }
	                    this.t += 31 + this.buf[this.ip++];
	                    // if (ip_end - ip < 2) return INPUT_OVERRUN;
	                }

	                this.m_pos = this.op - 1;
	                this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6);

	                this.ip += 2;

	            } else if (this.t >= 16) {
	                this.m_pos = this.op;
	                this.m_pos -= (this.t & 8) << 11;

	                this.t &= 7;
	                if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                        // if (t > -511) return OUTPUT_OVERRUN;
	                        // if (ip_end - ip < 1) return INPUT_OVERRUN;
	                    }
	                    this.t += 7 + this.buf[this.ip++];
	                    // if (ip_end - ip < 2) return INPUT_OVERRUN;
	                }

	                this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6);

	                this.ip += 2;
	                if (this.m_pos === this.op) {
	                    this.state.outputBuffer = this.state.outputBuffer.subarray(0, this.op);
	                    return this.EOF_FOUND;
	                }
	                this.m_pos -= 0x4000;

	            } else {
	                this.m_pos = this.op - 1;
	                this.m_pos -= this.t >> 2;
	                this.m_pos -= this.buf[this.ip++] << 2;

	                // if (m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
	                // if (op_end - op < 2) return OUTPUT_OVERRUN;
	                while(this.op + 2 > this.cbl) {this.extendBuffer();}
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos];

	                if(this.match_done() === 0) {
	                    break;
	                } else {
	                    this.match_next();
	                    continue;
	                }
	            }

	            // if (m_pos < out || m_pos >= op) return LOOKBEHIND_OVERRUN;
	            // if (op_end - op < t+3-1) return OUTPUT_OVERRUN;

	            this.copy_match();

	            if(this.match_done() === 0) {
	                break;
	            }

	            this.match_next();
	        }

	        return this.OK;
	    },

	    decompress: function(state) {
	        this.state = state;

	        this.buf = this.state.inputBuffer;
			this.buf32 = this._get4ByteAlignedBuf(this.buf);

	        this.out = new Uint8Array(this.buf.length + (this.blockSize - this.buf.length % this.blockSize));
	        this.out32 = new Uint32Array(this.out.buffer);
	        this.cbl = this.out.length;
	        this.state.outputBuffer = this.out;
	        this.ip_end = this.buf.length;
	        this.op_end = this.out.length;
	        this.t = 0;

	        this.ip = 0;
	        this.op = 0;
	        this.m_pos = 0;

	        this.skipToFirstLiteralFun = false;

	        // if (ip_end - ip < 1) return INPUT_OVERRUN;
	        if (this.buf[this.ip] > 17) {
	            this.t = this.buf[this.ip++] - 17;
	            if (this.t < 4) {
	                this.match_next();
	                ret = this.match();
	                if(ret !== this.OK) {
	                    return ret === this.EOF_FOUND ? this.OK : ret;
	                }

	            } else {
	                // if (op_end - op < t) return OUTPUT_OVERRUN;
	                // if (ip_end - ip < t+3) return INPUT_OVERRUN;
	                this.decomp_copy_from_buf();
	                this.skipToFirstLiteralFun = true;
	            }
	        }

	        for (;;) {
	            if(!this.skipToFirstLiteralFun) {
	                // if (ip_end - ip < 3) return INPUT_OVERRUN;
	                this.t = this.buf[this.ip++];

	                if (this.t >= 16) {
	                    ret = this.match();
	                    if(ret !== this.OK) {
	                        return ret === this.EOF_FOUND ? this.OK : ret;
	                    }
	                    continue;
	                }

	                if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                        // if (t > 511) return INPUT_OVERRUN;
	                        // if (ip_end - ip < 1) return INPUT_OVERRUN;
	                    }
	                    this.t += 15 + this.buf[this.ip++];
	                }
	                // if (op_end - op < t+3) return OUTPUT_OVERRUN;
	                // if (ip_end - ip < t+6) return INPUT_OVERRUN;

	                this.t += 3;
	                this.decomp_copy_from_buf();
	                this.skipToFirstLiteralFun = false;
	            }

	            this.t = this.buf[this.ip++];
	            if (this.t < 16) {
	                this.m_pos = this.op - (1 + 0x0800);
	                this.m_pos -= this.t >> 2;
	                this.m_pos -= this.buf[this.ip++] << 2;

	                // if ( m_pos <  out || m_pos >= op) return LOOKBEHIND_OVERRUN;
	                // if (op_end - op < 3) return OUTPUT_OVERRUN;
	                while(this.op + 3 > this.cbl) {this.extendBuffer();}
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos];

	                if(this.match_done() === 0) {
	                    break;
	                } else {
	                    this.match_next();
	                    continue;
	                }
	            }

	            ret = this.match();
	            if(ret !== this.OK) {
	                return ret === this.EOF_FOUND ? this.OK : ret;
	            }
	        }

	        return this.OK;
	    },

	    _doDictionaryCalcs: function() {
	    	// dv = this.buf[this.ip] | (this.buf[this.ip + 1] << 8) | (this.buf[this.ip + 2] << 16) | (this.buf[this.ip + 3] << 24);
            // dindex = ((0x1824429d * dv) >> 18) & 16383;
            // The above code doesn't work in JavaScript due to a lack of 64 bit bitwise operations
            // Instead, use (optimised two's complement integer arithmetic)
            // Optimization is based on us only needing the high 16 bits of the lower 32 bit integer.
            var dv_lo = this.buf[this.ip] | (this.buf[this.ip + 1] << 8);
            var dv_hi = this.buf[this.ip + 2] | (this.buf[this.ip + 3] << 8);
            var dindex = (((dv_lo * 0x429d) >>> 16) + (dv_hi * 0x429d) + (dv_lo  * 0x1824) & 0xFFFF) >>> 2;

            this.m_pos = ip_start + this.dict[dindex];

            this.dict[dindex] = this.ip - ip_start;
            if ((dv_hi<<16) + dv_lo != (this.buf[this.m_pos] | (this.buf[this.m_pos + 1] << 8) | (this.buf[this.m_pos + 2] << 16) | (this.buf[this.m_pos + 3] << 24))) {
                this.ip += 1 + ((this.ip - this.ii) >> 5);
                return this.REPEAT;
            }

            return this.OK;
	    },

	    _pushLeftOvers: function() {
	    	var t = 0|this.ip - 0|this.ii;

            if (t <= 3) {
                this.out[this.op - 2] |= t;
                this._bytesToCopy = t;
                this.comp_copy_from_buf();

            } else {
                if (t <= 18) {
                    this.out[this.op++] = t - 3;

                } else {
                    var tt = t - 18;
                    this.out[this.op++] = 0;
                    while (tt > 255) {
                        tt -= 255;
                        this.out[this.op++] = 0;
                    }
                    this.out[this.op++] = tt;
                }

                this._bytesToCopy = t;
                this.comp_copy_from_buf();
            }
	    },

	    _recalc_m_len: function() {
	    	this.m_len = 4;

            // var skipTo_m_len_done = false;
            if (this.buf[this.ip + this.m_len] === this.buf[this.m_pos + this.m_len]) {
                do {
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    this.m_len++; if(this.buf[this.ip + this.m_len] !==  this.buf[this.m_pos + this.m_len]) {break;}
                    if(this.ip + this.m_len >= ip_end) {
                        // skipTo_m_len_done = true;
                        break;
                    }
                } while (this.buf[this.ip + this.m_len] ===  this.buf[this.m_pos + this.m_len]);
            }

            // if (!skipTo_m_len_done) {
            //     var inc = this.ctzl(this.buf[this.ip + this.m_len] ^ this.buf[this.m_pos + this.m_len]) >> 3;
            //     this.m_len += inc;
            // }
	    },

	    _zeroFill: function(n) {
			while (n > 255) {
                n -= 255;
                this.out[this.op++] = 0;
            }
            this.out[this.op++] = n;
	    },

	    _finishCompressCore: function() {
			var m_off = this.ip - this.m_pos;
            this.ip += this.m_len;
            this.ii = this.ip;
            if (this.m_len <= 8 && m_off <= 0x0800) {
                m_off -= 1;
                this.out[this.op++] = ((this.m_len - 1) << 5) | ((m_off & 7) << 2);
                this.out[this.op++] = m_off >> 3;

            } else if (m_off <= 0x4000) {
                m_off -= 1;
                if (this.m_len <= 33) {
                    this.out[this.op++] = 32 | (this.m_len - 2);

                } else {
                    this.m_len -= 33;
                    this.out[this.op++] = 32;
                    this._zeroFill(this.m_len);
                }
                this.out[this.op++] = m_off << 2;
                this.out[this.op++] = m_off >> 6;

            } else {
                m_off -= 0x4000;
                if (this.m_len <= 9) {
                    this.out[this.op++] = 16 | ((m_off >> 11) & 8) | (this.m_len - 2);

                } else {
                    this.m_len -= 9;
                    this.out[this.op++] = 16 | ((m_off >> 11) & 8);
                    this._zeroFill(this.m_len);
                }
                this.out[this.op++] = m_off << 2;
                this.out[this.op++] = m_off >> 6;
            }
	    },

	    _compressCore: function(in_len, ti) {
	        var ip_start = this.ip;
	        var ip_end = this.ip + in_len - 20;
	        this.ii = this.ip;

	        this.ip += 1;

	        for (;;) {
	            if(this.ip >= ip_end) {break;}

	            if(this._doDictionaryCalcs() !== this.OK) {continue;}

	            this.ii -= ti;

		    	if (this.ip - this.ii !== 0) {
		            this._pushLeftOvers();
		        }

	            this._recalc_m_len();
	            this._finishCompressCore();
	        }

	        return in_len - (this.ii - ip_start);
	    },

	    _compressRemainder: function(t) {
            this.ii = in_len - t;

            if (this.op === 0 && t <= 238) {
                this.out[this.op++] = 17 + t;

            } else if (t <= 3) {
                this.out[this.op-2] |= t;

            } else if (t <= 18) {
                this.out[this.op++] = t - 3;

            } else {
                tt = t - 18;
                this.out[this.op++] = 0;
                this._zeroFill(tt);
            }

            this._bytesToCopy = t;
            this.comp_copy_from_buf();
	    },

	    compress: function (state) {
	        this.state = state;
	        this.state.outputBuffer = new Uint8Array(this.buf.length + Math.ceil(this.buf.length / 16) + 64 + 3);

	        this.buf = this.state.inputBuffer;
			this.buf32 = this._get4ByteAlignedBuf(this.buf);

	        this.out = this.state.outputBuffer;
			this.out32 = this._get4ByteAlignedBuf(this.out);

	        this.ip = 0;
	        this.op = 0;

	        var l = this.buf.length;
	        var t = 0;

	        while (l > 20) {
	            var ll = (l <= 49152) ? l : 49152;
	            if ((t + ll) >> 5 <= 0) {
	                break;
	            }
	            this.dict = new Uint32Array(16384);

	            var prev_ip = this.ip;
	            t = this._compressCore(ll,t);
	            this.ip = prev_ip + ll;
	            l -= ll;
	        }
	        t += l;

	        if (t > 0) {
	        	this._compressRemainder(t);
	        }

	        this.out[this.op++] = 17;
	        this.out[this.op++] = 0;
	        this.out[this.op++] = 0;

	        this.state.outputBuffer = this.out.subarray(0, this.op);
	        return 0;
	    }
	};

	return {
		version: version,
		compress: _lzo1x.compress.bind(_lzo1x),
		decompress: _lzo1x.decompress.bind(_lzo1x),
		codes: {
			OK: _lzo1x.OK,
			INPUT_OVERRUN: _lzo1x.INPUT_OVERRUN,
			OUTPUT_OVERRUN: _lzo1x.OUTPUT_OVERRUN,
			LOOKBEHIND_OVERRUN: _lzo1x.LOOKBEHIND_OVERRUN,
			EOF_FOUND: _lzo1x.EOF_FOUND
		}
	};
})();
