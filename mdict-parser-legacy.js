/*
 * A pure Javascript implementation of MDict Parser which supports dictionary file in mdx/mdd format.
 * By Feng Dihai <fengdh@gmail.com>, 2015/07/01
 * 
 * For my wife, my kids and family to whom I'm in love with life.
 *
 * Based on:
 *  - An Analysis of MDX/MDD File Format by Xiaoqiang Wang (xwang)
 *    https://bitbucket.org/xwang/mdict-analysis/ 
 *  - GitHub: zhansliu/writemdict
 *    https://github.com/zhansliu/writemdict/blob/master/fileformat.md
 *  - Source code of mdictparser.cc, part of goldendict
 *    https://github.com/goldendict/goldendict/blob/master/mdictparser.cc
 * 
 * This is free software released under terms of the MIT License.
 * You can get a copy on http://opensource.org/licenses/MIT.
 *
 * NOTE - Unsupported features:
 *
 *    i. 64-bit number used in data offset or length.
 *       Only lower 32-bit is recognized that validate number must be lower than 2^32 or 4G, 
 *       due to supported number format in current Javascript (ECMAScript5) standard.
 *       Huge dictionary file larger than 4G is considered out of scope for a web app IMHO.
 *
 *   ii. Encrypted keyword header which requires external or embedded regkey.
 *       Most of shared MDict dictionary files are not encrypted,
 *       and I have no intention to break protected ones.
 *       However keyword index encryption is common and supported well.
 *
 *  iii. Stylesheet substitution.
 *       Encounter no example, I suppose it is not a popular feature.
 *       Contact me if you have one in need of support.
 *
 *   iv. Audio resource support.
 *       It is a todo-task.
 *
 * MDict software and its file format is developed by Rayman Zhang(张文伟),
 * read more on http://www.mdict.cn/ or http://www.octopus-studio.com/.
 */

/**
 * Usage:
 *   mdict-parser.js is defined as an AMD/Node module.
 *   To initialize it, you have to provide/define a module named with "mdict-parseXml",
 *   which will be used to covert a string to XML dom object when parsing dictionary head.
 *
 *   For use inside modern browser, DOMParser is available:
 *   
 *     define('mdict-parseXml', function() {
 *         return function (str) { return (new DOMParser()).parseFromString(str, 'text/xml'); };
 *     }); 
 *   
 *   For node server, there are many xml-to-dom module available.
 */
(function (root, factory) {
  "use strict";
  
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['pako', 'lzo', 'ripemd128', 'murmurhash3', 'bluebird', 'mdict-parseXml'], factory);
  } else {
    // Browser globals
    factory(pako, lzo, ripemd128, MurmurHash3, Promise, parseXml);
  }

}(this, function(pako, lzo, ripemd128, MurmurHash3, Promise, parseXml) {
  // Value of undefined.
  var UNDEFINED = void 0;
  
  // Seed value used to create MurmurHash3 function.
  var _HASH_SEED = 0xFE176;
  
  // A shared UTF-16LE text decorder used to read dictionary header string.
  var UTF_16LE = new TextDecoder('utf-16le');
  
  /**
   * Return the first argument as result.
   * This function is used to simulate consequence, i.e. return readed data and then forward to a new position.
   * @param any data or function call
   * @return the first arugment
   */
  function conseq(/* args... */) { return arguments[0]; }

  /**
   * Create a MurmurHash3 function with specified seed value.
   * @param seed a 32-bit arbitary int value
   * @return a MurmurHash3 function using a specified seed value. 
   */
  var hash = (function(seed) {
    /**
     * Function to calculate 32-bit hash code for a string.
     * @param string
     * @return 32-bit hash code calculated with MurmurHash3 algorithm with a specific seed value. 
     */
    return function hash(str) { return MurmurHash3.hashString(str.toLowerCase(), 32, seed); }
  })(_HASH_SEED);

  /*
   * Decrypt encrypted data block of keyword index (attrs.Encrypted = "2").
   * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index-encryption
   * @param buf an ArrayBuffer of source data
   * @param key an ArrayBuffer of decryption key, need to apply with ripemd128() before decryption
   * @return an ArrayBuffer now carrying decrypted data, occupying the same memory space of source buffer
   */
  function decrypt(buf, key) {
    key = ripemd128(key);
    var byte, keylen = key.length, prev = 0x36, i = 0, len = buf.length;
    for (; i < len; i++) {
      byte = buf[i];
      byte = ((byte >> 4) | (byte << 4) );                  // & 0xFF;  <-- it's already a byte
      byte = byte  ^ prev ^ (i & 0xFF) ^ key[i % keylen];
      prev = buf[i];
      buf[i] = byte;
    }
    return buf;
  }
  
  /**
   * For sliceThen(..).exec(proc, ..), mark what proc function returns is multiple values 
   * to be used by further Promise#spread(..) call. 
   */
  function spreadus() {
    var args = Array.prototype.slice.apply(arguments);
    args._spreadus_ = true;
    return args;
  }
  
  /**
   * Slice part of a file/blob object, return a promise object which will resolve to an ArrayBuffer to feed subsequent process.
   * The returned promise object is extened with exec(proc, args...) method which can be chained with further process.
   * @param file file or blob object
   * @param offset start position to slice
   * @param len length to slice
   * @return a promise object which will resolve to an ArrayBuffer containing data been read
   */
  function sliceThen(file, offset, len) {
    var p = new Promise(function(_resolve) {
      var reader = new FileReader();
      reader.onload = function() { _resolve(reader.result); }
//      console.log('slice: ', offset, ' + ', len);
      reader.readAsArrayBuffer(file.slice(offset, offset + len)); // It's an asynchronous call!
    });

    /**
     * Call proc with specified arguments prepending with sliced file/blob data (ArrayBuffer) been read.
     * @param first argument is a function to be executed
     * @param other optional arguments to be passed to function following auto supplied input ArrayBuffer
     * @return a promise object which can be chained with further process through spread() method
     */
    p.exec = function(proc /*, args... */) {
      var args = Array.prototype.slice.call(arguments, 1);
      return p.then(function(data) {
          args.unshift(data);
          var ret = proc.apply(null, args);
          return resolve(ret !== UNDEFINED && ret._spreadus_ ? ret : [ret]);
      });
    };
        
    return p;
  }
  
  /**
   * Wrap value as a resolved promise.
   */
  function resolve(value) { return Promise.resolve(value); }
  
  /**
   * Wrap value as a rejected promise.
   */
  function reject(reason) { return Promise.reject(reason); }
  
  /**
   * Harvest resolved promises, if all failed return their failed reasons. 
   */
  function harvest(outcomes) {
    return Promise.settle(outcomes).then(function(results) {
      if (results.length === 0) {
        return reject("** NOT FOUND **");
      }
      
      var solved = [], failed = [];
      for (var i = 0; i < results.length; i++) {
        if (results[i].isResolved()) {
          solved.push(results[i].value());
        } else {
          failed.push(results[i].reason());
        }
      }
      return solved.length ? solved : failed;
    });
  }
    
  /**
   * Get file extension.
   */
  function getExtension(filename, defaultExt) {
    return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
  }
  
  /*
   * Create a Key Table object to load keyword blocks from keyword section in mdx/mdd file.
   * Retrived data is stored in a compact format.
   * Here key is also called keyword or head word for dictionary entry.
   * 
   * Compact key table format uses Uint32Array to store key's hash code and corresponding record's offset.
   * For a key table containing N entries, an Uint32Array is used to store N pairs of (key_hashcode, original_key_order) value, 
   * while another Uint32Array to store N offset values of corresponding record in their original(alphabetic) order.
   *
   * After reading key table from mdx/mdd file, sort the first Uint32Array by key_hashcode value (using Array.prototype.sort).
   * Given a key, applying its hash code to run binary-search for its original key order on the first Uint32Array, 
   * then retrieve offset value of the corresponding record, also with computed record size from the second Uint32Array.
   *
   * To accept arbitary user entry, key is converted to lower case to compute its hash code.
   * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-section
   */
  function createKeyTable() {
    var ready,      // key table ready-to-use flag
        pos = 0,    // mark current position
        order = 0,  // key order in keyword section (alphabetically)
        arr, view,  // backed Float64Array, which can be viewed as an Uint32Array storing (key_hashcode, original_key_index) pair values
        data,       // backed Uint32Array to store record's offset in alphabetic order (same as keyword section storing order)
        F64 = new Float64Array(2), U32 = new Uint32Array(F64.buffer); // shared typed array to convert float64 to 2-uint32 value
    
    return {
      // Allocate required ArrayBuffer for storing key table, where len is number of key entries.
      alloc:  function(len) { 
                arr = new Float64Array(len);
                view = new Uint32Array(arr.buffer); 
                data = new Uint32Array(len);
              },
      // Store retrived key info, where offset is the corresponding record's offset
      put:    function(offset, key) {
                data[order] = offset;             // offset of the corresponding record
                view[pos++] = hash(key);          // hash code of key
                view[pos++] = order++;            // original key order
        if (key.match('\\.ttf')
            || key.match('\\.(jpg)|(png)')
            || key.match('^&')
            || key.match('\\.css') ) console.log(key);
              },
      // Pack ArrayBuffer if not used up
      pack:   function() {
                if (order < data.length) {
                  arr = new Float64Array(arr.buffer.slice(0, pos << 2));
                  view = new Uint32Array(arr.buffer);;
                  data = new Uint32Array(data.buffer.slice(0, order * Uint32Array.BYTES_PER_ELEMENT));
                }
                return view;
              },
      // Sort the Uint32Array storing (key_hashcode, original_key_order) pair values, 
      // treat each pair of value as a Float64 and compared with value of key_hashcode only. 
      sort:   function() {
                this.pack();
                Array.prototype.sort.call(arr, function(f1, f2) { return F64[0] = f1, F64[1] = f2, U32[0] - U32[2]; });
                ready = true;
              },
      // Given a key, appling its hash code to run binary search in key table.
      // Return array of {offset: , size: } for all possible matched key with the same hash code, else return undefined.
      // Key is converted to lower case to compute its hash code.
      find:   function(key) {
                U32[0] = hash(key); // covert negative value to two's complement if necessary
        
                var hashcode = U32[0], hi = arr.length - 1, lo = 0, i = (lo + hi) >> 1, val = view[i << 1];

                while (true) {
                  if (hashcode === val) {
                    // return all possible keys with the same hash code
                    while (true) {
                      if (view[--i << 1] !== hashcode) {
                        i++;
                        break;
                      }
                    }
                    var result = [];
                    while (true) {
                      var at = view[(i << 1) + 1];
                      // NOTE: size of the last record is not required so leaving it with value of undefined.
                      result.push({offset: data[at], size: at < data.length - 2 ? data[at + 1] - data[at] : UNDEFINED});
                      if (view[++i << 1] !== hashcode) {
                        break;
                      }
                    }
                    return result;
                  } else if (hi === lo || i === hi || i === lo) {
                    return;
                  }

                  (hashcode < val) ? hi = i : lo = i;
                  i = (lo + hi) >> 1;
                  val = view[i << 1];
                }
              },
      isReady:function() { return ready; },
      debug:  function() { console.log(this.pack()); console.log(data); }
    }
  };
  
  /*
   * Create a Record Block Table object to load record block info from index part of record section in mdx/mdd file.
   * Retrived data is stored in an Uint32Array which contains N+1 pairs of (offset_comp, offset_decomp) value,
   * where N is number of record blocks. The tail of the table shows offset of the last record block's end.
   *
   * When looking up a given key for its definition:
   *   1. Find offset (offset_decomp) of the record in key table or scanning the keyword block containing the given key directly.
   *   2. Execute binary search on RECORD_BLOCK_TABLE to get record block containing the record.
   *   3. Load found record block, using offset to retrieve content of the record.
   *
   * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
   */
  function createRecordBlockTable() {
    var pos = 0, // current position
        arr;     // backed Uint32Array
    return {
      // Allocate required ArrayBuffer for storing record block table, where len is number of record blocks.
      alloc:  function(len) { 
                arr = new Uint32Array(len * 2);
              },
      // Store offset pair value (compressed & decompressed) of a record block
      // NOTE: offset_comp is absolute offset counted from start of mdx/mdd file.
      put:    function(offset_comp, offset_decomp) { 
                arr[pos++] = offset_comp; arr[pos++] = offset_decomp;
              },
      // Given offset of a key after decompression, return record block info containing it, else undefined if out of range.
      find:   function(keyAt) {
                var hi = (arr.length >> 1) - 1, lo = 0, i = (lo + hi) >> 1, val = arr[(i << 1) + 1];

                if (keyAt > arr[(hi << 1) + 1] || keyAt < 0) {
                  return;
                }

                while (true) {                    
                  if (hi - lo <= 1) {
                    if (i < hi) {
                      return {
                        block_no:     i,
                        comp_offset:  arr[i <<= 1],
                        comp_size:    arr[i + 2] - arr[i],
                        decomp_offset:arr[i + 1],
                        decomp_size:  arr[i + 3] - arr[i + 1]
                      };
                    } else {
                      return;
                    }
                  }

                  (keyAt < val)  ? hi = i : lo = i;
                  i = (lo + hi) >> 1;
                  val = arr[(i << 1) + 1];
                }
              },
      debug:  function() { console.log(arr); },
    };
  }
  
  /**
   * Test if a value of dictionary attribute is true or not.
   */
  function isTrue(v) {
    v = ((v || false) + '').toLowerCase();
    return v === 'yes' || v === 'true';
  }
  
  /**
   * Regular expression to strip key if dictionary's "StripKey" attribute is true. 
   */
  var REGEXP_STRIPKEY = {
    'mdx' : /[., '/\\@_-]()/g,
    'mdd' : /([.][^.]*$)|[., '/\\@_-]/g        // strip '.' before file extension that is keeping the last period
  };
  
  /**
   * Parse MDict dictionary/resource file (mdx/mdd).
   * @param file a File object
   * @param ext file extension, mdx/mdd
   * @return a Promise object which will resolve to a lookup function.
   */
  function parse_mdict(file, ext) {

    var KEY_TABLE, // = createKeyTable(),                    // key table
        KEY_INDEX,
        RECORD_BLOCK_TABLE = createRecordBlockTable();   // record block table

    var attrs = {},     // storing dictionary attributes
        _v2,            // true if enginge version > 2
        _bpu,           // bytes per unit when converting size to byte length for text data
        _tail,          // need to skip extra tail bytes after decoding text
        _decoder,       // decorder for text data

        _decryptors  = [false, false],
                        // [keyword_header_decryptor, keyword_index_decryptor], only keyword_index_decryptor is supported
        
        _searchTextLen, // search NUL to get text length
        
        _readShort   = function(scanner) { return scanner.readUint8(); },
                        // read a "short" number representing kewword text size, 8-bit for version < 2, 16-bit for version >= 2

        _readNum     = function(scanner) { return scanner.readInt(); },
                        // Read a number representing offset or data block size, 16-bit for version < 2, 32-bit for version >= 2
        
        _checksum_v2 = function() {},
                        // Version >= 2.0 only checksum
        
        _adaptKey    = function(key) { return key; },
                        // adapt key by converting to lower case or stripping punctuations according to dictionary attributes (KeyCaseSensitive, StripKey)
        
        _slice       = sliceThen.bind(null, file);
                        // bind sliceThen() with file argument          
        
    /**
     * Config scanner according to dictionary attributes.
     */
    function config() {
      attrs.Encoding = attrs.Encoding || 'UTF-16';
      
      _searchTextLen = (attrs.Encoding === 'UTF-16') 
                          ?   function(dv, offset) {
                                var mark = offset;
                                while (dv.getUint16(offset++)) { /* scan for NUL */ };
                                return offset - mark;
                          } : function(dv, offset) {
                                var mark = offset;
                                while (dv.getUint8(offset++)) { /* scan for NUL */ }
                                return offset - mark - 1;
                          };
      
      _decoder = new TextDecoder(attrs.Encoding || 'UTF-16LE');

      _bpu = (attrs.Encoding === 'UTF-16') ? 2 : 1;
      
      if (parseInt(attrs.GeneratedByEngineVersion, 10) >= 2.0) {
        _v2 = true;
        _tail = _bpu;

          // HUGE dictionary file (>4G) is not supported, take only lower 32-bit
        _readNum     = function(scanner) { return scanner.forward(4), scanner.readInt(); };
        _readShort   = function(scanner) { return scanner.readUint16(); };
        _checksum_v2 = function(scanner) { return scanner.checksum(); };
      } else {
        _tail = 0;
      }
      
      // keyword index decrypted?
      if (attrs.Encrypted & 0x02) {
        _decryptors[1] = decrypt; 
      }
      
      var regexp = REGEXP_STRIPKEY[ext];
      if (isTrue(attrs.KeyCaseSensitive)) {
        _adaptKey = isTrue(attrs.StripKey) 
                      ? function(key) { return key.replace(regexp, '$1'); }
                      : function(key) { return key; };
      } else {
        _adaptKey = isTrue(attrs.StripKey || (_v2 ? '' : 'yes')) 
                      ? function(key) { return key.toLowerCase().replace(regexp, '$1'); }
                      : function(key) { return key.toLowerCase(); };
      }
    }

    // Read data in current offset from target data ArrayBuffer
    function Scanner(buf, len) {
      var offset = 0;
      var dv = new DataView(buf);

      var methods = {
        buffer: function() { return buf; },
        // target data size in bytes
        size: function() {
          return len || buf.byteLength;
        },
        // update offset to new position
        forward: function(len) {
          return offset += len;
        },
        // return current offset
        offset: function() {
          return offset;
        },
        
        // MDict file format uses big endian to store number
        
        // 32-bit unsigned int
        readInt: function() {
          return conseq(dv.getUint32(offset, false), this.forward(4));
        },
        readUint16: function() {
          return conseq(dv.getUint16(offset, false), this.forward(2));
        },
        readUint8: function() {
          return conseq(dv.getUint8(offset, false), this.forward(1));
        },
        // Read a "short" number representing keyword text size, 8-bit for version < 2, 16-bit for version >= 2
        readShort: function() {
          return _readShort(this);
        },
        // Read a number representing offset or data block size, 16-bit for version < 2, 32-bit for version >= 2
        readNum: function() {
          return _readNum(this);
        },

        readUTF16: function(len) {
          return conseq(UTF_16LE.decode(new Uint8Array(buf, offset, len)), this.forward(len));
        },
        // Read data to an Uint8Array and decode it to text with specified encoding.
        // Text length in bytes is determined by searching terminated NUL.
        // NOTE: After decoding the text, forward extra "tail" bytes (= bytes per unit) according to encoding specified in dictionary attributes. 
        readText: function() {
          var len = _searchTextLen(dv, offset);
          return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + _bpu));
        },
        // Read data to an Uint8Array and decode it to text with specified encoding.
        // @param len length in basic unit, need to multiply byte per unit to get length in bytes
        // NOTE: After decoding, it is required to forward extra "tail" bytes according to encoding specified in dictionary attributes. 
        readTextSized: function(len) {
          len *= _bpu;
          return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + _tail));
        },
        
        // Skip checksum
        checksum: function() {
          this.forward(4);     // just ignore it
        },
        // Version >= 2.0 only
        checksum_v2: function() {
          return _checksum_v2(this);
        },

        // Read data block for keyword index, key block and record definition
        // Those data block maybe compressed (gzip or lzo), while keyword index maybe be encrypted.
        // @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#compression (with typo mistake)
        readBlock: function(len, expectedBufSize, decryptor) {
          var comp_type = dv.getUint8(offset, false);  // compression type, 0 = non, 1 = lzo, 2 = gzip
          if (comp_type === 0) {
            if (_v2) {
              this.forward(8);  // for version >= 2, skip comp_type (4 bytes with tailing \x00) and checksum (4 bytes)
            }
            return this;
          } else {
            // skip comp_type (4 bytes with tailing \x00) and checksum (4 bytes)
            offset += 8; len -= 8;
            var tmp = new Uint8Array(buf, offset, len);
            if (decryptor) {
              var passkey = new Uint8Array(8);
              passkey.set(new Uint8Array(buf, offset - 4, 4));
              passkey.set([0x95, 0x36, 0x00, 0x00], 4);
              tmp = decryptor(tmp, passkey);
            }
            
            tmp = comp_type === 2 ? pako.inflate(tmp) : lzo.decompress(tmp, expectedBufSize, 4096);
            this.forward(len);
            return Scanner(tmp.buffer, tmp.byteLength);
          }
        },
        
        // Read raw data as Uint8Array from current offset with specified length in bytes
        readRaw: function(len) {
          return conseq(new Uint8Array(buf, offset, len), this.forward(len === UNDEFINED ? buf.byteLength - offset : len));
        },
      };

      return Object.create(methods);
    }
    
    /**
     * Read the first 4 bytes of mdx/mdd file to get length of header_str.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#file-structure
     * @param input sliced file (start = 0, length = 4)
     * @return length of header_str
     */
    function read_file_head(input) {
      return Scanner(input).readInt();
    }

    /**
     * Read header section, parse dictionary attributes and config scanner according to engine version attribute.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#header-section
     * @param input sliced file (start = 4, length = len + 48), header string + header section (max length 48)
     * @param len lenghth of header_str
     * @return remained length of header section (header_str + checksum), equals to len + 4
     */
    function read_header_sect(input, len) {
      var scanner = Scanner(input),
          header_str = scanner.readUTF16(len).replace(/\0$/, ''); // need to remove tailing NUL

      // parse dictionary attributes
      var xml = parseXml(header_str).querySelector('Dictionary, Library_Data').attributes;

      for (var i = 0, item; i < xml.length; i++) {
        item = xml.item(i);
        attrs[item.nodeName] = item.nodeValue;
      }

      attrs.Encrypted = parseInt(attrs.Encrypted, 10) || 0;

      console.log('dictionary attributes: ', attrs);
      config();
      return spreadus(len + 4, input);
    }

    /**
     * Read keyword summary at the begining of keyword section.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-section
     * @param input sliced file, same as input passed to read_header_sect()
     * @param offset start position of keyword section in sliced file, equals to length of header string plus checksum.\
     * @return keyword_sect object
     */
    function read_keyword_summary(input, offset) {
      var scanner = Scanner(input);
      scanner.forward(offset);
      return {
        num_blocks:           scanner.readNum(),
        num_entries:          scanner.readNum(),
        key_index_decomp_len: _v2 && scanner.readNum(),  // Ver >= 2.0 only
        key_index_comp_len:   scanner.readNum(),
        key_blocks_len:       scanner.readNum(),
        chksum:               scanner.checksum_v2(),
        // extra field
        len:                  scanner.offset() - offset,  // actual length of keyword section, varying with engine version attribute
      };
    }

    /**
     * Read keyword index part of keyword section. 
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-header-encryption
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index
     * @param input sliced file, remained part of keyword section after keyword summary which can also be used to read following key blocks.
     * @param keyword_summary 
     * @param offset start position of keyword index
     * @return array of keyword index where each one points to a key block.
     */
    function read_keyword_index(input, keyword_summary, offset) {
      var scanner = Scanner(input).readBlock(keyword_summary.key_index_comp_len, keyword_summary.key_index_decomp_len, _decryptors[1]),
          keyword_index = Array(keyword_summary.num_blocks);
      // start position of key block
//      offset += keyword_summary.key_index_comp_len;
      offset = 0;
      for (var i = 0, size; i < keyword_summary.num_blocks; i++) {
        keyword_index[i] = {
          num_entries: conseq(scanner.readNum(), size = scanner.readShort()),
// UNUSED          
//          first_size:  size = scanner.readShort(),
          first_word:  conseq(scanner.readTextSized(size), size = scanner.readShort()),
// UNUSED          
//          last_size:   size = scanner.readShort(),
          last_word:   scanner.readTextSized(size),
          comp_size:   size = scanner.readNum(),
          decomp_size: scanner.readNum(),
          // extra fields
          offset: offset,     // offset of the first byte for the target key block in mdx/mdd file
          index: i            // index of this key index, used to search previous/next block
        };
        offset += size;
      }
      return spreadus(keyword_summary, keyword_index);
    }

    /**
     * Read keyword entries inside a key block and fill KEY_TABLE.
     * @param scanner scanner object to read key entries, which starts at begining of target key block
     * @param kdx corresponding keyword index object
     */
    function read_key_block(scanner, kdx) {
      var scanner = scanner.readBlock(kdx.comp_size, kdx.decomp_size);
      for (var i = 0; i < kdx.num_entries; i++) {
        KEY_TABLE.put(scanner.readNum(), scanner.readText());
      }
    }

    /**
     * Read record summary at the begining of record section.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
     * @param input sliced file, start = begining of record section, length = 32 (max length of record summary)
     * @param pos begining of record section
     */
    function read_record_summary(input, pos) {
      var scanner = Scanner(input),
          record_summary = {
            num_blocks:   scanner.readNum(),
            num_entries:  scanner.readNum(),
            index_len:    scanner.readNum(),
            blocks_len:   scanner.readNum(),
            // extra field
            len:          scanner.offset(),   // actual length of record section (excluding record block index), varying with engine version attribute
          };
      
      // start position of record block from head of mdx/mdd file
      record_summary.block_pos = pos + record_summary.index_len + record_summary.len;

      return record_summary;
    }

    /**
     * Read record block index part in record section, and fill RECORD_BLOCK_TABLE
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
     * @param input sliced file, start = begining of record block index, length = record_summary.index_len
     * @param record_summary record summary object
     */
    function read_record_block(input, record_summary) {
      var scanner = Scanner(input),
          size = record_summary.num_blocks,
          record_index = Array(size),
          p0 = record_summary.block_pos, 
          p1 = 0;

      RECORD_BLOCK_TABLE.alloc(size + 1);
      for (var i = 0, rdx; i < size; i++) {
        record_index[i] = rdx = {
          comp_size:   scanner.readNum(),
          decomp_size: scanner.readNum()
        };
        RECORD_BLOCK_TABLE.put(p0, p1);
        p0 += rdx.comp_size;
        p1 += rdx.decomp_size;
      }
      RECORD_BLOCK_TABLE.put(p0, p1);
    }
    
    /**
     * Read definition at specified offset for a given keyword in the record block, which is sliced from the file determined by a record block index.
     * @param input record block sliced from the file
     * @param block record block index which determines a record block contains at target offset 
     * @param keyinfo a object contains record offset and optional size for the given keyword
     * @return definition for keyword
     */
    function read_definition(input, block, keyinfo) {
      var scanner = Scanner(input).readBlock(block.comp_size);
      scanner.forward(keyinfo.offset - block.decomp_offset);
      return scanner.readText();
    }
    
    /**
     * Following link to find actual definition of keyword.
     * @param definition maybe starts with "@@@LINK=" which links to another keyword 
     * @param lookup search function
     * @return resolved actual definition
     */
    function followLink(definition, lookup) {
      return (definition.substring(0, 8) !== '@@@LINK=') 
                ? definition
                : lookup(definition.substring(8));
    }

    /**
     * Read definition as raw ArrayBuffer at specified offset for a given keyword in the record block, which is sliced from the file determined by a record block index.
     * @param input record block sliced from the file
     * @param block record block index which determines a record block contains at target offset 
     * @param keyinfo a object contains record offset and optional size for the given keyword
     * @return an ArrayBuffer containing resource for keyword
     */
    function read_object(input, block, keyinfo) {
      if (input.byteLength > 0) {
        var scanner = Scanner(input).readBlock(block.comp_size);
        scanner.forward(keyinfo.offset - block.decomp_offset);
        return scanner.readRaw(keyinfo.size);
      } else {
        throw '* OUT OF FILE RANGE * ' + keyinfo + ' @offset=' + block.comp_offset;
      }
    }
    
    /**
     * Find word definition for a key info object which contains record offset and optional size for the given keyword.
     * @param keyinfo a object contains offset and optional size for the given keyword
     * @return a promise object which will resolve to definition for keyword. Link to other keyword is followed to get actual definition.
     */
    function findWord(keyinfo) {
      var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
      return _slice(block.comp_offset, block.comp_size)
                .exec(read_definition, block, keyinfo)
                  .spread(function (definition) { return resolve(followLink(definition, LOOKUP.mdx)); });
    }
    
    /**
     * Find resource (image, sound etc.) for a key info object which contains record offset and optional size for the given keyword.
     * @param keyinfo a object contains offset and optional size for the given keyword
     * @return a promise object which will resolve to an ArrayBuffer containing resource for keyword 
     * TODO: Follow link, maybe it's too expensive and a rarely used feature?
     */
    function findResource(keyinfo) {
      var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
      return _slice(block.comp_offset, block.comp_size)
                .exec(read_object, block, keyinfo)
                  .spread(function (blob) { return resolve(blob); });
    }
    
    /**
     *
     */
    function matchOffset(list, offset) {
      return list.some(function(el) { return el.offset === offset ? list = [el] : false; }) ? list : [];
    }
    
    
    // Lookup functions
    var LOOKUP = {
      /**
       *
       */
      mdx: function(query) {
        var offset = query.offset,
            phrase = (typeof query === 'string' || query instanceof String) ? query : query.phrase;
        
        if (query.forKeys) {
          return matchKeys(phrase, query.maxCount);
        }
        
        var word = phrase.trim().toLowerCase();
        if (KEY_TABLE && KEY_TABLE.isReady()) {
          // express mode
          // TODO: match keyword in case of collision of hashcode
          var infos = KEY_TABLE.find(word);
          if (infos) {
            if (offset !== UNDEFINED) {
              infos = matchOffset(infos, offset);
            } else {
              infos.sort(function(a, b) { return a.offset - b.offset; });
            }
            return harvest(infos.map(findWord));
          } else {
            return reject('*WORD NOT FOUND* ' + phrase);
          }
        } else {
          // scan mode
          return seekVanguard(word).spread(function(kdx, idx, list) {
            list = list.slice(idx);
            if (offset !== UNDEFINED) {
              list = matchOffset(list, offset);
            } else {
              list = list.filter(function(el) { return el.toLowerCase() === word; });
            }
            return harvest(list.map(findWord));
          });
        }
      },
      
      // TODO: chain multiple mdd file
      // TODO: cache key table and content of samll mdd file
      mdd: function(phrase) {
        var word = phrase.trim().toLowerCase();
        word = '\\' + word.replace(/(^[/\\])|([/]$)/, '');
        word = word.replace(/\//g, '\\');
        if (KEY_TABLE && KEY_TABLE.isReady()) {
          // express mode
          var keyinfo = KEY_TABLE.find(word)[0];
          if (keyinfo) {
            return findResource(keyinfo);
          } else {
            return reject('*RESOURCE NOT FOUND* ' + phrase);
          }
        } else {
          // scan mode
          return seekVanguard(word).spread(function(kdx, idx, list) {
            return list.slice(idx).filter(function(one) {
              return one.toLowerCase() === word;
            });
          }).then(function(candidates) {
            if (candidates.length === 0) {
              throw '*RESOURCE NOT FOUND* ' + phrase;
            } else {
              return findResource(candidates[0]);
            }
          });
        }
      }
    };
    
    var MAX_CANDIDATES = 256, _cached_keys, mutual_ticket = 0;
    
    function matchKeys(phrase, expectedSize) {
      expectedSize = expectedSize || MAX_CANDIDATES;
      var str = phrase.trim().toLowerCase(),
          m = /([^*]+)[*]/.exec(str), 
          word;
      if (m) {
        word = m[1];
        var wildcard = new RegExp('^' + str.replace(/\*+/g, '.*').replace(/\?/g, '.') + '$');
        var filter = phrase[phrase.length - 1] === ' ' 
                        ? function (s) { return wildcard.test(s); }
                        : function (s) { return wildcard.test(s) && !/ /.test(s); };
      } else {
        word = phrase.trim();
      }
      
      return seekVanguard(word).spread(function(kdx, idx, list){
        list = list.slice(idx);
        if (filter) {
          list = list.filter(filter);
        }
        return appendMore(word, list, KEY_INDEX[kdx.index + 1], expectedSize, filter, ++mutual_ticket);
      });
    };
    
    // TODO: have to restrict max count to improve response
    /**
     * Append more to word list according to a filter or expected size.
     */
    function appendMore(word, list, nextKdx, expectedSize, filter, ticket) {
      if (ticket !== mutual_ticket) {
        throw 'force terminated';
      }
      if (nextKdx) {
          if (filter) {
            if (nextKdx.first_word.substr(0, word.length) === word) {
              return loadKeys(nextKdx).delay(30).then(function(more) {
                console.log(nextKdx);
                Array.prototype.push.apply(list, more.filter(filter));
                return appendMore(word, list, KEY_INDEX[nextKdx.index + 1], expectedSize, filter, ticket);
              });
            }
          } else {
            var shortage = expectedSize - list.length;
            if (shortage > 0) {
              return loadKeys(nextKdx).delay(30).then(function(more) {
                Array.prototype.push.apply(list, more.slice(0, shortage));
                return appendMore(word, list, KEY_INDEX[nextKdx.index + 1], expectedSize, filter, ticket);
              });
            } else {
              return list.slice(0, expectedSize);
            }
          }
      }
      return list;
    }
    
    
    /**
     * Search for the first keyword match given phrase.
     */
    function seekVanguard(phrase) {
      phrase = _adaptKey(phrase);
      var kdx = reduce(KEY_INDEX, phrase);

      // look back for the first record block containing keyword for the specified phrase
      if (phrase <= _adaptKey(kdx.last_word)) {
        var index = kdx.index - 1, prev;
        while (prev = KEY_INDEX[index]) {
          if (_adaptKey(prev.last_word) !== _adaptKey(kdx.last_word)) {
            break;
          }
          kdx = prev;
          index--;
        }
      }

      return loadKeys(kdx).then(function (list) {
          var idx = shrink(list, phrase);
          // look back for the first matched keyword position
          while (idx > 0) {
            if (_adaptKey(list[--idx]) !== _adaptKey(phrase)) {
              idx++;
              break;
            }
          }        
          return [kdx, idx, list]; 
        });
    }
    
    /**
     * Load keys for a keyword index object from mdx/mdd file.
     */
    function loadKeys(kdx) {
      if (_cached_keys && _cached_keys.pilot === kdx.first_word) {
        return resolve(_cached_keys.list);
      } else {
        return slicedKeyBlock.then(function(input) {
          var scanner = Scanner(input), list = Array(kdx.num_entries);
          scanner.forward(kdx.offset);
          scanner = scanner.readBlock(kdx.comp_size, kdx.decomp_size);
              
          for (var i = 0; i < kdx.num_entries; i++) {
            var offset = scanner.readNum();
            list[i] = new Object(scanner.readText());
            list[i].offset = offset;
            if (i > 0) {
              list[i - 1].size = offset - list[i - 1].offset;
            }
          }
          _cached_keys = {list: list, pilot: kdx.first_word};
          return list;
        });
      }
    }
    
    
    // Reduce the key index array to an element which contains or is nearest one matching a given phrase.
    function reduce(arr, phrase) {
      var len = arr.length;
      if (len > 1) {
        len = len >> 1;
        return (phrase < _adaptKey(arr[len].first_word)) 
                  ? reduce(arr.slice(0, len), phrase)
                  : reduce(arr.slice(len), phrase);
      } else {
        return arr[0];
      }
    }
    
    // Reduce the array to index of an element which contains or is nearest one matching a given phrase.
    function shrink(arr, phrase) {
      var len = arr.length, sub;
      if (len > 1) {
        len = len >> 1;
        var key = _adaptKey(arr[len]);
        if (phrase < key) {
          sub = arr.slice(0, len);
          sub.pos = arr.pos;
        } else {
          sub = arr.slice(len);
          sub.pos = (arr.pos || 0) + len;
        }
        return shrink(sub, phrase);
      } else {
        return (arr.pos || 0) + (phrase === _adaptKey(arr[0]) ? 0 : 1);
      }
    }
    
    /**
     * Delay to load key table.
     * @param slicedKeyBlock a promise object which will resolve to an ArrayBuffer containing keyword blocks 
     *                       sliced from mdx/mdd file.
     * @param num_entries number of keyword entries
     * @param keyword_index array of keyword index
     * @param delay time to delay loading key table
     */
    function willLoadKeyTable(slicedKeyBlock, num_entries, keyword_index, delay) {
      slicedKeyBlock.delay(delay).then(function (input) {
        KEY_TABLE = createKeyTable();
        KEY_TABLE.alloc(num_entries);

        var scanner = Scanner(input);
        for (var i = 0, size = keyword_index.length; i < size; i++) {
          read_key_block(scanner, keyword_index[i]);
        }

        KEY_TABLE.sort();
        console.log('KEY_TABLE loaded.');
      });
    }
    
    // ------------------------------------------
    // start to load mdx/mdd file
    // ------------------------------------------
    console.log('start to load ' + file.name);
    
    var pos = 0;
    var slicedKeyBlock;

    // read first 4 bytes to get header length
    return _slice(pos, 4).exec(read_file_head).spread(function(len) {
      pos += 4;                                   // start of header string in header section
      return _slice(pos, len + 48)
                .exec(read_header_sect, len);

    }).spread(function(header_remain_len, input) {
      pos += header_remain_len;                   // start of keyword section
      return read_keyword_summary(input, header_remain_len);

    }).then(function(keyword_summary) {           console.log(keyword_summary);
      pos += keyword_summary.len;                 // start of key index in keyword section
      return _slice(pos, keyword_summary.key_index_comp_len)
                .exec(read_keyword_index, keyword_summary, pos);

    }).spread(function (keyword_summary, keyword_index) {
      pos += keyword_summary.key_index_comp_len;  // start of keyword block in keyword section
      slicedKeyBlock = _slice(pos, keyword_summary.key_blocks_len);

      //*
      // it is quite responsive to look up word without key table, which scans keyword in key blocks in an effcient way
      willLoadKeyTable(slicedKeyBlock, keyword_summary.num_entries, keyword_index, 00);
      // */
      
      pos += keyword_summary.key_blocks_len;    // start of record section
      
      KEY_INDEX = keyword_index;
      
    }).then(function () { 
      return _slice(pos, 32)
                .exec(read_record_summary, pos);
      
    }).spread(function (record_summary) {       console.log(record_summary);
      pos += record_summary.len;                // start of record blocks in record section
      return _slice(pos, record_summary.index_len)
                .exec(read_record_block, record_summary);

    }).spread(function() {                      console.log('-- parse done --', file.name);
      // resolve and return lookup() function according to file extension (mdx/mdd)
      LOOKUP[ext].description = attrs.Description;
      return resolve(LOOKUP[ext]);
    });
  };
  
  // -------------------------
  // END OF parse_mdict()
  // -------------------------
  
  /**
   * Load a set of files which will be parsed as MDict dictionary & resource (mdx/mdd).
   */
  return function load(files) {
      var resources = [];
      Array.prototype.forEach.call(files, function(f) {
        var ext =  getExtension(f.name, 'mdx')
        resources.push(resources[ext] = parse_mdict(f, ext));
      });
        
      return Promise.all(resources)
                    .then(function() { return resolve(resources); });
    };
  
}));
