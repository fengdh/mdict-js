/*
 * A pure JavaScript implementation of LZO decompress() function, 
 * using ArrayBuffer as input/output.
 *    By Feng Dihai <fengdh@gmail.com>, 2015/06/22
 *
 * Based on java-compress (https://code.google.com/p/java-compress/).
 * A pure Java implementation of LZO by sgorti@gmail.com
 */

/* LZOConstants.java -- various constants (Original file)

   This file is part of the LZO real-time data compression library.

   Copyright (C) 1999 Markus Franz Xaver Johannes Oberhumer
   Copyright (C) 1998 Markus Franz Xaver Johannes Oberhumer
   Copyright (C) 1997 Markus Franz Xaver Johannes Oberhumer
   Copyright (C) 1996 Markus Franz Xaver Johannes Oberhumer

   The LZO library is free software; you can redistribute it and/or
   modify it under the terms of the GNU General Public License as
   published by the Free Software Foundation; either version 2 of
   the License, or (at your option) any later version.

   The LZO library is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with the LZO library; see the file COPYING.
   If not, write to the Free Software Foundation, Inc.,
   59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

   Markus F.X.J. Oberhumer
   <markus.oberhumer@jk.uni-linz.ac.at>
   http://wildsau.idv.uni-linz.ac.at/mfx/lzo.html
   

   Java Porting of minilzo.c (2.03) by
   Copyright (C) 2010 Mahadevan Gorti Surya Srinivasa <sgorti@gmail.com>
 */

/**  Java ported code of minilzo.c(2.03).
 *
 * All compress/decompress/decompress_safe were ported. Original java version of MiniLZO supported 
 * only decompression via Lzo1xDecompressor.java and Lzo1xDecompressor ported way back in 1999.
 *
 * This new MiniLZO.java based was taken from minilzo.c version 2.03. 
 * 
 *  @author mahadevan.gss
 */

(function(global, define) {

  // define module and also export to global
  define(function (require, exports, module) {
      return lzo1x;
  });  
  
var lzo1x = (function () {

  // Auto expandable read/write buffer of TypedArray
  function FlexBuffer(bufType, blockSize) {
    var buf, l, c = 0;
    blockSize = blockSize || 4096;

    return {
      alloc: function(initSize) {
        return buf = new bufType(l = initSize || 8192);
      },
      require: function(n) {
        var r = c - l - n;
        if (r > 0) {
          var buf2 = new bufType(l += blockSize * ( ~~(r / blockSize ) + 1));
//          console.log(n, buf2.length - buf.length, buf2.length);
          buf2.set(buf);
          buf = buf2;
        }
        c += n;
        return buf;
      },
      pack: function(size) { return buf.subarray(0, size || c); },
    };
  }

  var c_top_loop=1;
  var c_first_literal_run=2;
  var c_match=3;
  var c_copy_match=4;
  var c_match_done=5;
  var c_match_next=6;
  
  function decompress(inBuf, bufInitSize, bufBlockSize) {
    var buf = new FlexBuffer(Uint8Array, bufBlockSize),
        out = buf.alloc(Math.max(bufInitSize, inBuf.length));
    
    var op=0,
        ip=0,
        t = inBuf[ip],
        state = c_top_loop, 
        m_pos=0,
        ip_end = inBuf.length;

    if (t > 17) {
      ip++;
      t -= 17;
      if (t < 4) {
        state=c_match_next; //goto match_next;
      }else{
        out = buf.require(t);
        do {
          out[op++] = inBuf[ip++]; 
        } while (--t > 0);
        state=c_first_literal_run;//goto first_literal_run;
      }
    }
    
top_loop_ori: do{
    var if_block=false;
    switch(state) { //while (true)  top_loop_ori
        case c_top_loop:  
            t = inBuf[ip++];
            if (t >= 16){
              state=c_match; continue top_loop_ori; //goto match;
            }
            if (t === 0) {
              while (inBuf[ip] === 0) {
                t += 255;
                ip++;
              }
              t += 15 + inBuf[ip++];
            }

            //s=3; do out[op++] = inBuf[ip++]; while(--s > 0);//* (lzo_uint32 *)(op) = * (const lzo_uint32 *)(ip);op += 4; ip += 4;
            out = buf.require(4 + t);
            out[op++] = inBuf[ip++];
            out[op++] = inBuf[ip++];
            out[op++] = inBuf[ip++];
            out[op++] = inBuf[ip++];
            
            if (--t > 0) {
              do out[op++] = inBuf[ip++]; while (--t > 0);
            }
       case c_first_literal_run: /*first_literal_run: */
            t = inBuf[ip++];
            if (t >= 16) {
              state=c_match; continue top_loop_ori;  //goto match;
            }
            m_pos = op - 0x801 - (t >> 2) - (inBuf[ip++] << 2);
            out = buf.require(3);
            out[op++] = out[m_pos++]; out[op++] = out[m_pos++]; out[op++] = out[m_pos];

            state = c_match_done; continue top_loop_ori;//goto match_done;
       case c_match:
            //do {
            //match:
            if (t >= 64) {
              m_pos = op - 1;
              m_pos -= (t >> 2) & 7;
              m_pos -= inBuf[ip++] << 3;
              t = (t >> 5) - 1;
              state = c_copy_match; continue top_loop_ori;//goto copy_match;

            } else if (t >= 32) {
              t &= 31;
              if (t === 0) {
                while (inBuf[ip] === 0) {
                  t += 255;
                  ip++;
                }
                t += 31 + inBuf[ip++];
              }
              m_pos = op - 1;
              m_pos -= (( inBuf[ip] + ( inBuf[ip+1] << 8) ) >> 2);//m_pos -= (* (const unsigned short *) ip) >> 2;
              
              ip += 2;
            } else if (t >= 16) {
              m_pos = op;
              m_pos -= (t & 8) << 11;
              
              t &= 7;
              if (t === 0) {
                while (inBuf[ip] === 0) {
                  t += 255;
                  ip++;
                }
                t += 7 + inBuf[ip++];
              }
              m_pos -= (( inBuf[ip] + ( inBuf[ip+1] << 8) ) >> 2);//m_pos -= (* (const unsigned short *) ip) >> 2;
              ip += 2;
              if (m_pos === op){
                break top_loop_ori;//goto eof_found;
              }
              m_pos -= 0x4000;
            } else {
              m_pos = op - 1;
              m_pos -= t >> 2;
              m_pos -= inBuf[ip++] << 2;
              
              out = buf.require(2);
              out[op++] = out[m_pos++]; out[op++] = out[m_pos];
              state=c_match_done;continue top_loop_ori;//goto match_done;
            }
            if (t >= 6 && (op - m_pos) >= 4) {
              t += 2;
              out = buf.require(t);
              if_block=true;
              do out[op++] = out[m_pos++]; while (--t > 0);
            }
       case c_copy_match: if(!if_block){
                     t += 2;
                     out = buf.require(t);
                     do out[op++] = out[m_pos++]; while( --t > 0) ;
                   }
       case c_match_done:
                   t = inBuf[ip-2] & 3;
                   if (t === 0){
                     state=c_top_loop; continue top_loop_ori; //break;
                   }
       case c_match_next: 
                   out = buf.require(1);
                   out[op++] = inBuf[ip++];
                   if (t > 1) { 
                     out = buf.require(1);
                     out[op++] = inBuf[ip++]; 
                     if (t > 2) { 
                       out = buf.require(1);
                       out[op++] = inBuf[ip++]; 
                     } 
                   }
                   t = inBuf[ip++];
                   state=c_match; continue top_loop_ori;
        }
    }while(true);

    return buf.pack(op);
  }
  

  return {
    /**
     * Decompress LZO compressed data.
     * @param buf ArrayBuffer or Uint8Array object containing LZO compressed data.
     * @param initBufSize initial size for output ArrayBuffer, optional with default value of 8192 (8K) bytes
     * @param blockSize block size used to extend output ArrayBuffer, optional with default value of 4096 (4K) bytes
     * @return Uint8Array containing decompressed data. For performance reason, its underground ArrayBuffer 
     *         is not truncated to the same size of output data, which can be accessed through TypedArray.prototype.buffer.
     */
    decompress: function(buf, initBufSize, blockSize) {
      return decompress(new Uint8Array(buf), initBufSize, blockSize);
    }
  };
})();

}( this, // refers to global
   // Help Node out by setting up define.
   typeof module === 'object' && typeof define !== 'function'
     ? function (factory) { module.exports = factory(require, exports, module); } 
     : define
));