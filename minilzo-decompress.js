/*
 * A JavaScript LZO decompressor using Uint8Array as input/output.
 *  By Feng Dihai <fengdh@gmail.com>, 2015/06/22
 */

/*
 * Based on minilzo-js (https://github.com/abraidwood/minilzo-js).
 *  JavaScript port of minilzo by Alistair Braidwood
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

  // Auto expandable read/write buffer of TypedArray
  function FlexBuffer(bufType, blockSize) {
    var buf, l, c = 0;
    blockSize = blockSize || 4096;

    return {
      alloc: function(initSize) {
        return buf = new bufType(l = initSize || 8192);
      },
      require: function(n) {
        if (n !== 0) {
          if (l - c < (n = n || 1)) {
            var buf2 = new bufType(l += blockSize);
            buf2.set(buf);
            buf = buf2;
          }
          c += n;
        }
        return buf;
      },
      pack: function() { console.log('lzo output: ' + c); return buf.subarray(0, c); }
    };
  }

    function decompress(pInBuf, bufSize) { // @param Unit8Array
                     // @return Unit8Array
      var t,
        buf = new FlexBuffer(Uint8Array),
        out = buf.alloc(bufSize),
        ip = 0,
        op = 0,
        ip_end = pInBuf.length,
        m_pos = 0,
        outerLoopPos = 0,
        innerLoopPos = 0,
        doOuterLoop = true;

      if (pInBuf[ip] > 17) {
        t = pInBuf[ip++] - 17;
        if (t < 4) {
          // goto match_next
          outerLoopPos = 2;
          innerLoopPos = 3;
        } else {
          out = buf.require(t);
          do {
            out[op++] = pInBuf[ip++];
          } while (--t > 0);
          // goto first_literal_run
          outerLoopPos = 1;
        }
      }
      do {
        if(outerLoopPos === 0) {
          t = pInBuf[ip++];
          if (t >= 16) {
            // goto match
            outerLoopPos = 2;
            continue;
          }
          if (t === 0) {
            while (pInBuf[ip] === 0) {
              t += 255;
              ip++;
            }
            t += 15 + pInBuf[ip++];
          }

          t += 3;
          out = buf.require(t);
          do {
            out[op++] = pInBuf[ip++];
          } while (--t > 0);

          outerLoopPos = 1; // fallthru
        }

        // first literal run
        if(outerLoopPos === 1) {
          t = pInBuf[ip++];
          if (t < 16) {
            m_pos = op - 0x0801;
            m_pos -= t >> 2;
            m_pos -= pInBuf[ip++] << 2;

            out = buf.require(3);
            out[op++] = out[m_pos++];
            out[op++] = out[m_pos++];
            out[op++] = out[m_pos];

            // goto match_done
            innerLoopPos = 2;
          }
          // else fallthru to match
          outerLoopPos = 2;
        }

        if(outerLoopPos === 2) {
          outerLoopPos = 0;
          innerLoopPos = 0; // this is a bug

          do {
            // match
            if(innerLoopPos === 0) {
              if (t >= 64) {

                m_pos = op - 1;
                m_pos -= (t >> 2) & 7;
                m_pos -= pInBuf[ip++] << 3;
                t = (t >> 5) - 1;

                // goto copy_match
                innerLoopPos = 1;
                continue;

              } else if (t >= 32) {
                t &= 31;
                if (t === 0) {
                  while (pInBuf[ip] === 0) {
                    t += 255;
                    ip++;
                  }
                  t += 31 + pInBuf[ip++];
                }
                m_pos = op - 1;
                m_pos -= (pInBuf[ip] >> 2) + (pInBuf[ip + 1] << 6);
                ip += 2;

              } else if (t >= 16) {
                m_pos = op;
                m_pos -= (t & 8) << 11;
                t &= 7;
                if (t === 0) {
                  while (pInBuf[ip] === 0) {
                    t += 255;
                    ip++;
                  }
                  t += 7 + pInBuf[ip++];
                }

                m_pos -= (pInBuf[ip] >> 2) + (pInBuf[ip + 1] << 6);
                ip += 2;
                if (m_pos === op) {
                  // eof
                  doOuterLoop = false;
                  break;
                }
                m_pos -= 0x4000;

              } else {
                m_pos = op - 1;
                m_pos -= t >> 2;
                m_pos -= pInBuf[ip++] << 2;

                out = buf.require(2);
                out[op++] = out[m_pos++];
                out[op++] = out[m_pos];

                // goto match_done
                innerLoopPos = 2;
                continue;
              }
              innerLoopPos = 1;
            }

            if(innerLoopPos === 1) {
              t += 2;
              out = buf.require(t);
              do {
                out[op++] = out[m_pos++];
              } while (--t > 0);
              innerLoopPos = 2; // fallthru
            }

            if(innerLoopPos === 2) {
              t = pInBuf[ip - 2] & 3;
              if (t === 0) {
                break;
              }
              innerLoopPos = 3; // fallthru
            }

            if(innerLoopPos === 3) {
              out = buf.require();
              out[op++] = pInBuf[ip++];
              if (t > 1) {
                out = buf.require();
                out[op++] = pInBuf[ip++];

                if (t > 2) {
                  out = buf.require();
                  out[op++] = pInBuf[ip++];
                }
              }
              t = pInBuf[ip++];
              innerLoopPos = 0; // fallthru to loop start
            }
          } while (true);
        }
      } while (doOuterLoop);

      return buf.pack();
  }

  return {
    decompress: function(s, bufSize) {
      return decompress(new Uint8Array(s), bufSize);
    }
  };
})();
