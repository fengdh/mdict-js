/*
 * A pure JavaScript implemented parser for MDict dictionary file (mdx/mdd).
 * By Feng Dihai <fengdh@gmail.com>, 2015/07/01
 * 
 * To my wife, my kids and my family.
 *
 * Based on:
 *  - An Analysis of MDX/MDD File Format by Xiaoqiang Wang (xwang)
 *    https://bitbucket.org/xwang/mdict-analysis/ 
 *  - GitHub: zhansliu/writemdict
 *    https://github.com/zhansliu/writemdict/blob/master/fileformat.md
 * 
 * This is free software released under terms of the MIT License.
 * You can get a copy on http://opensource.org/licenses/MIT.
 *
 * NOTE - Unsupported features:
 *
 *    i. 64-bit number (offset/length).
 *       Only lower 32-bit used when reading number (<4G), 
 *       otherwise it's too hard task for JavaScript 5 or web app or for real world.
 *
 *   ii. Encrypted keyword header which needs external regkey.
 *       Most of shared MDict dictionary files are not encrypted,
 *       and having no intention to break protected ones.
 *       But keyword index encryption is common, so it is supported.
 *
 *  iii. Link to another record, which is a TODO task.
 *
 *   iv. Stylesheet substitution (is it really necessary?).
 *
 * MDict software and its file format is developed by Rayman Zhang(张文伟),
 * read more on http://www.mdict.cn/ or http://www.octopus-studio.com/.
 */

/**
 * Usage:
 *   mdict-core.js is defined as an AMD/Node module.
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
    define(['pako_inflate', 'lzo', 'ripemd128', 'murmurhash3', 'bluebird', 'mdict-parseXml'], factory);
  } else {
    // Browser globals
    factory(pako, lzo, ripemd128, MurmurHash3, Promise, parseXml);
  }

}(this, function(pako, lzo, ripemd128, MurmurHash3, Promise, parseXml) {
  
  // Seed value used with MurmurHash3 function.
  var _HASH_SEED = 0xFE176;
  
  // A shared UTF-16LE text decorder.
  var UTF_16LE = new TextDecoder('utf-16le');
  
  /**
   * Return the first argument as result.
   * This function is used to simulate consequence, i.e. return readed data and then forward to a new position.
   * @param any data or function call
   * @return the first arugment
   */
  function conseq(/* args... */) { return arguments[0]; }

  /**
   * Function to calculate 32-bit hash code for a string.
   * @param string
   * @return 32-bit hash code calculated with MurmurHash3 algorithm with a specific seed value. 
   */
  var hash = (function(seed) {
    return function hash(str) { return MurmurHash3.hashString(str.toLowerCase(), 32, seed); }
  })(_HASH_SEED);

  /*
   * Decrypt encrypted data block of keyword index (attrs.Encrypted = "2").
   * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index-encryption
   * @param
   * @param
   */
  function decrypt(buf, key) {
    key = ripemd128(key);
    var byte, keylen = key.length, prev = 0x36, i = 0, len = buf.length;
    for (; i < len; i++) {
      byte = buf[i];
      byte = ((byte >> 4) | (byte << 4) ); // & 0xFF;  <-- it's already a byte
      byte = byte  ^ prev ^ (i & 0xFF) ^ key[i % keylen];
      prev = buf[i];
      buf[i] = byte;
    }
    return buf;
  }
  
  /**
   * Slice part of a file/blob object, return a promise object which will resolve an ArrayBuffer to feed subsequent process.
   * The returned promise object is extened with exec(proc, args...) method which can be chained with further process.
   * @param file file or blob object
   * @param offset start position to slice
   * @param len length to slice
   */
  function sliceThen(file, offset, len) {
    var p = new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); }
      console.log('slice: ', offset, ' + ', len);
      reader.readAsArrayBuffer(file.slice(offset, offset + len)); // It's an asynchronous call!
    });

    /**
     * Call proc with specified arguments prepending with sliced file/blob data (ArrayBuffer) been read.
     * To chain further process, return a promise object which will resovle [returned_result_from_proc, sliced_data].
     * Use Promise#spread(..) to retrieve corresponding value.
     */
    p.exec = function(proc /*, args... */) {
      var args = Array.prototype.slice.call(arguments, 1);
      return p.then(function(data) {
        return new Promise(function(resolve) {
          args.unshift(data);
          resolve([proc.apply(null, args), data]);
        });
      });
    };

    return p;
  }
  
  /*
   * Create a compact key table retrived from mdx/mdd file.
   * Here key is also called keyword or head word for dictionary entry.
   * 
   * Compact key table use Uint32Array to store key's hash code and corresponding record's offset.
   * For a key table contains N entries, using an Uint32Array storing N pairs of (key_hashcode, original_key_order) value, 
   * while another Uint32Array storing corresponding N record's offset value in alphabetic order.
   *
   * After reading key table from mdx/mdd file, the first Uint32Array need to be sorted by key_hashcode value(using Array.prototype.sort).
   * Given a key, applying its hash code to run binary-search for its original key order on the first Uint32Array, 
   * then retrieve the corresponding record's offset and size from the second Uint32Array.
   *
   * To accept arbitary user entry, key is converted to lower case when computing its hash code.
   */
  function createKeyTable() {
    var pos = 0,    // mark current position
        order = 0,  // key order
        arr, view,  // backed Float64Array, view as Uint32Array to store (key_hashcode, original_key_index)
        data,       // backed Uint32Array to store record's offset in alphabetic order
        F64 = new Float64Array(2), U32 = new Uint32Array(F64.buffer); // shared typed array to convert float64 to 2-uint32 value
    
    return {
      // Allocate required array buffer for storing key table, where len is number of key entries.
      alloc:  function(len) { 
                arr = new Float64Array(len);
                view = new Uint32Array(arr.buffer); 
                data = new Uint32Array(len);
              },
      // Store retrived key info, where offset is corresponding record's offset
      put:    function(offset, key) {
                data[order] = offset;             // offset of corresponding record
                view[pos++] = hash(key);          // hash code of key
                view[pos++] = order++;            // original key order
              },
      // Pack array buffer if not used up
      pack:   function() {
                if (order < data.length) {
                  arr = new Float64Array(arr.buffer.slice(0, pos << 2));
                  view = new Uint32Array(arr.buffer);;
                  data = new Uint32Array(data.buffer.slice(0, order * Uint32Array.BYTES_PER_ELEMENT));
                }
                return view;
              },
      // Sort Uint32Array storing (key_hashcode, original_key_order) values, 
      // treat each pair of value as a Float64 and compared with value of key_hashcode. 
      sort:   function() {
                this.pack();
                Array.prototype.sort.call(arr, function(f1, f2) { return F64[0] = f1, F64[1] = f2, U32[0] - U32[2]; });
              },
      // Given a key, appling its hash code to run binary search in key table.
      // If matched then return [record_offset, record_size], else return undefined.
      find:   function(key) {
                U32[0] = hash(key); // covert negative value to two's complement if necessary
        
                var hashcode = U32[0], hi = arr.length - 1, lo = 0, i = (lo + hi) >> 1, val = view[i << 1];

                while (true) {
                  if (hashcode === val) {
                    // NOTE: size of the last record is not required so leaving it with value of undefined.
                    var at = view[(i << 1) + 1];
                    return {offset: data[at], size: at < data.length - 2 ? data[at + 1] - data[at] : void 0};
                  } else if (hi === lo || i === hi || i === lo) {
                    return;
                  }

                  (hashcode < val) ? hi = i : lo = i;
                  i = (lo + hi) >> 1;
                  val = view[i << 1];
                }
              },
      debug:  function() { console.log(this.pack()); console.log(data); }
    }
  };
  
  /*
   * Create compact record block table which can be viewed as an Uint32Array containing N+1 pairs of (offset_comp, offset_decomp) value,
   * where N is number of record blocks. The tail of the table shows offset of the last record block's end.
   * How to look up for a given key:
   *   1. Find offset (offset_decomp) of record in key table.
   *   2. Execute binary search on RECORD_BLOCK_TABLE to get record block containing the record.
   *   3. Load found record block, using offset to retrieve content of the record.
   */
  function createRecordBlockTable() {
    var pos = 0, // current position
        arr;     // backed Uint32Array
    return {
      // Allocate required array buffer for storing record block table, where len is number of record blocks.
      alloc:  function(len) { 
                arr = new Uint32Array(len * 2);
              },
      // Store offset(compressed & decompressed) of a record block
      // NOTE: offset_comp is absolute offset counted from start of mdx/mdd file.
      put:    function(offset_comp, offset_decomp) { 
                arr[pos++] = offset_comp; arr[pos++] = offset_decomp;
              },
      // Given offset of a key after decompressed, return record block containing the position, else undefined if out of range.
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
  
  function isTrue(v) {
    v = ((v || false) + '').toLowerCase();
    return v === 'yes' || v === 'true';
  }
  
  var REGEXP_STRIPKEY = /[. ]/g;
  
  /**
   * Parse MDict dictionary/resource file (mdx/mdd).
   * @param file File object
   * @param ext file extension, mdx/mdd
   * @return a Promise object which will resolve to a lookup function.
   */
  function parse_mdict(file, ext) {

    var KEY_TABLE = createKeyTable(),                    // key table
        KEY_INDEX,
        RECORD_BLOCK_TABLE = createRecordBlockTable();   // record block table

    var attrs = {},
        _v2,            // true if enginge version > 2
        _bpu,           // bytes per unit when converting size to byte length for text data
        _tail,          // need to skip extra tail bytes after decoding text
        _decryptors  = [false, false],
                        // [keyword_header_decryptor, keyword_index_decryptor], only keyword_index_decryptor is supported
        _decoder,       // decorder for text data
        _searchTextLen, // search NUL to get text length
        _readShort   = function(scanner) { return scanner.readUint8(); },
                        // read a "short" number representing kewword text size, 8-bit for version < 2, 16-bit for version >= 2
        _readNum     = function(scanner) { return scanner.readInt(); },
                        // Read a number representing offset or data block size, 16-bit for version < 2, 32-bit for version >= 2
        _checksum_v2 = function() {},
                        // Version >= 2.0 only checksum
        _slice       = sliceThen.bind(null, file),
        _adaptKey    = function(key) { return key; };
                        // bind sliceThen() with file argument
    /**
     * Config scanner according to dictionary attributes.
     */
    function config() {
      attrs.Encoding = attrs.Encoding || 'UTF-16';
      
      _searchTextLen = (attrs.Encoding === 'UTF-16') ? function(dv, offset) {
        var mark = offset;
        while (dv.getUint16(offset++)) {};
        return offset - mark;
      } : function(dv, offset) {
        var mark = offset;
        while (dv.getUint8(offset++)) {}
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
      
      if (attrs.Encrypted & 0x02) {
        _decryptors[1] = decrypt; 
      }
      if (isTrue(attrs.KeyCaseSensitive)) {
        _adaptKey = isTrue(attrs.StripKey) 
                      ? function(key) { return key.replace(REGEXP_STRIPKEY, ''); }
                      : function(key) { return key; };
      } else {
        _adaptKey = isTrue(attrs.StripKey) 
                      ? function(key) { return key.toLowerCase().replace(REGEXP_STRIPKEY, ''); }
                      : function(key) { return key.toLowerCase(); };
      }
    }

    // Read data in current offset from target data ArrayBuffer
    function Scanner(buf, len) {
      var offset = 0;
      var dv = new DataView(buf);

      var methods = {
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
        // Read a "short" number representing kewword text size, 8-bit for version < 2, 16-bit for version >= 2
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
          return conseq(new Uint8Array(buf, offset, len), this.forward(len === void 0 ? buf.byteLength - offset : len));
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
     * @param input sliced file (start = 4, length = len + 48], header string + header section (max length 48)
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

      console.log('attrs: ', attrs);
      config();
      return len + 4;
    }

    /**
     * Read keyword section.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-section
     * @param input sliced file (start = 4, length = len + 48], header string + checksum + keyword section (max length 44)
     * @param offset start position of keyword section in sliced file
     * @return keyword_sect object
     */
    function read_keyword_sect(input, offset) {
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
     * Read keyword index. 
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-header-encryption
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index
     * @return keyword index array
     */
    function read_keyword_index(input, keyword_sect, offset) {
      var scanner = Scanner(input).readBlock(keyword_sect.key_index_comp_len, keyword_sect.key_index_decomp_len, _decryptors[1]),
          keyword_index = Array(keyword_sect.num_blocks);
//          offset = 0;
      offset += keyword_sect.key_index_comp_len;
      for (var i = 0, size; i < keyword_sect.num_blocks; i++) {
        keyword_index[i] = {
          num_entries: conseq(scanner.readNum(), size = scanner.readShort()),
// UNUSED          
//          first_size:  size = scanner.readShort(),
          first_word:  conseq(scanner.readTextSized(size), size = scanner.readShort(), scanner.readTextSized(size)),
// UNUSED          
//          last_size:   size = scanner.readShort(),
//          last_word:   scanner.readTextSized(size),
          comp_size:   size = scanner.readNum(),
          decomp_size: scanner.readNum(),
          // extra fields
          offset: offset,     // offset of the first byte for the target key block in mdx/mdd file
          index: i            // index of this key index, used to search previous/next block
        };
        offset += size;
      }
      return keyword_index;
    }

    /**
     * Read keyword entries inside a keyword block and fill KEY_TABLE.
     * @param scanner scanner object to read key entries, which starts at begining of target keyword block
     * @param kblok keyword block object
     */
    function read_key_block(scanner, kbloc) {
      var scanner = scanner.readBlock(kbloc.comp_size, kbloc.decomp_size);
      for (var i = 0; i < kbloc.num_entries; i++) {
        KEY_TABLE.put(scanner.readNum(), scanner.readText());
      }
    }

    /**
     * Read record section excluding following record block index.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
     * @param input sliced file, start = begining of record section, length = 32
     * @param pos begining of record section
     */
    function read_record_sect(input, pos) {
      var scanner = Scanner(input),
          record_sect = {
            num_blocks:   scanner.readNum(),
            num_entries:  scanner.readNum(),
            index_len:    scanner.readNum(),
            blocks_len:   scanner.readNum(),
            // extra field
            len:          scanner.offset(),   // actual length of record section (excluding record block index), varying with engine version attribute
          };
      
      // start position of record block from head of mdx/mdd file
      record_sect.block_pos = pos + record_sect.index_len + record_sect.len;

      return record_sect;
    }

    /**
     * Read record block index in record section, and fill RECORD_BLOCK_TABLE
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
     * @param input sliced file, start = begining of record block index, length = record_sect.index_len
     * @param record_sect record section object
     */
    function read_record_block(input, record_sect) {
      var scanner = Scanner(input),
          size = record_sect.num_blocks,
          record_index = Array(size),
          p0 = record_sect.block_pos, 
          p1 = 0;

      RECORD_BLOCK_TABLE.alloc(size + 1);
      for (var i = 0, rbloc; i < size; i++) {
        record_index[i] = rbloc = {
          comp_size:   scanner.readNum(),
          decomp_size: scanner.readNum()
        };
        RECORD_BLOCK_TABLE.put(p0, p1);
        p0 += rbloc.comp_size;
        p1 += rbloc.decomp_size;
      }
      RECORD_BLOCK_TABLE.put(p0, p1);
//      record_sect.record_index = record_index;
    }
    
    /**
     * Given a keyinfo, read its definition as text.
     */
    function read_definition(input, keyinfo, block) {
      var scanner = Scanner(input).readBlock(block.comp_size);
      scanner.forward(keyinfo.offset - block.decomp_offset);
      return scanner.readText();
    }

    /**
     * Given a keyinfo, read its content as raw array buffer.
     */
    function read_object(input, keyinfo, block) {
      var scanner = Scanner(input).readBlock(block.comp_size);
      scanner.forward(keyinfo.offset - block.decomp_offset);
      return scanner.readRaw(keyinfo.size);
    }

    // TODO: search nearest in case of collision of hashcode
    // TODO: following jump link
    var LOOKUP = {
      mdx: function(word, adjacent) {
        word = word.trim().toLowerCase();
        return new Promise(function(resolve, reject) {
          var keyinfo = KEY_TABLE.find(word);
          if (keyinfo) {
            var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
            _slice(block.comp_offset, block.comp_size)
              .exec(read_definition, keyinfo, block)
                .spread(function (definition) { resolve(definition); })
                .caught(function () { reject('*NOT FOUND*'); });
          } else {
            reject("*NOT FOUND*");
          }
        });
      },
      
      mdd: function(word) {
        word = word.trim().toLowerCase();
        word = '\\' + word.replace(/^[/\\]/, '');
        return new Promise(function(resolve, reject) {
          var keyinfo = KEY_TABLE.find(word);
          if (keyinfo) {
            var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
            _slice(block.comp_offset, block.comp_size)
              .exec(read_object, keyinfo, block)
                .spread(function (blob) { resolve(blob); })
                .caught(function () { reject("*NOT FOUND*"); });
          } else {
            reject("*NOT FOUND*");
          }
        });
      }
    };
    
    var MAX_CANDIDATES = 64, _last_keys;
    LOOKUP.mdx.search = function(phrase) {
        console.log('adjacent keys for ', phrase);
        phrase = _adaptKey(phrase);
        var kbloc = reduce(KEY_INDEX, phrase);
        return loadKeys(kbloc).then(function(list) {
          var idx = shrink(list, phrase),
              candidates = list.slice(idx, idx + MAX_CANDIDATES);
          
          var shortage = MAX_CANDIDATES - candidates.length;
          if (shortage > 0 && (kbloc = KEY_INDEX[kbloc.index + 1]) !== void 0) {
            return loadKeys(kbloc).then(function(nextList) {
              Array.prototype.push.apply(candidates, nextList.slice(0, shortage));
              return candidates;
            });
          }
          return candidates;
        });
    }
    
    function loadKeys(kbloc) {
      if (_last_keys && _last_keys.pilot === kbloc.first_word) {
        return Promise.resolve(_last_keys.list);
      } else {
        return _slice(kbloc.offset, kbloc.comp_size).then(function(input) {
          console.log('load keys...');
          var scanner = Scanner(input).readBlock(kbloc.comp_size, kbloc.decomp_size),
              list = Array(kbloc.num_entries);
          for (var i = 0; i < kbloc.num_entries; i++) {
            scanner.readNum();
            list[i] = scanner.readText();
          }
          _last_keys = {list: list, pilot: kbloc.first_word};
          return list;
        });
      }
    }
    
    
    // Reduce the key index array to an element which contains or is nearest one matching a given key.
    function reduce(arr, key) {
      var len = arr.length;
      if (len > 1) {
        len = len >> 1;
        return reduce(key < _adaptKey(arr[len].first_word) ? arr.slice(0, len) : arr.slice(len), key);
      } else {
        return arr[0];
      }
    }
    
    // Reduce the array to index of an element which contains or is nearest one matching a given key.
    function shrink(arr, key) {
      var len = arr.length, sub;
      if (len > 1) {
        len = len >> 1;
        var word = _adaptKey(arr[len]);
        if (key < word) {
          // Special Case: key ending with "-"
          // mdict key sort bug? 
          // i.e. "mini-" prios "mini" in some dictionary
          if (word[word.length - 1] === '-' && arr[len + 1] === key) {
            return arr.pos + len + 1;
          }
          sub = arr.slice(0, len);
          sub.pos = arr.pos;
        } else {
          // Special Case: key ending with whitespace
          word = arr[len];
          if (word[word.length - 1] === ' ' && arr[len - 1] === key) {
            return arr.pos + len - 1;
          }
          sub = arr.slice(len);
          sub.pos = (arr.pos || 0) + len;
        }
        return shrink(sub, key);
      } else {
        return (arr.pos || 0) + (key === _adaptKey(arr[0]) ? 0 : 1);
      }
    }
    
    return new Promise(function(resolve) {
      var pos = 0;

      // read first 4 bytes to get header length
      _slice(pos, 4).exec(read_file_head).spread(function(len) {
        pos += 4;
        // then parse dictionary attributes in remained header section (header_str:len + checksum:4 bytes),
        // also load next first 44 bytes of keyword section
        return _slice(pos, len + 48).exec(read_header_sect, len);
        
      }).spread(function(header_remain_len, input) {
          pos += header_remain_len;  // start of keyword section
          return [read_keyword_sect(input, header_remain_len)];
        
      }).spread(function(keyword_sect) {
        console.log(keyword_sect);
        pos += keyword_sect.len;    // start of key index
        var len = keyword_sect.key_index_comp_len + keyword_sect.key_blocks_len; 
                                    // total length of key index and key block
        
        // parallel reading both keyword & record section 
        return [
          // read keyword index, and then read all key blocks
          _slice(pos, len).exec(read_keyword_index, keyword_sect, pos).spread(function (keyword_index, input) {
            if (ext === 'mdx') {
              KEY_INDEX = keyword_index;
            }
            
            var scanner = Scanner(input);
            scanner.forward(keyword_sect.key_index_comp_len);

            KEY_TABLE.alloc(keyword_sect.num_entries);
            for (var i = 0, size = keyword_index.length; i < size; i++) {
              read_key_block(scanner, keyword_index[i]);
            }

            KEY_TABLE.sort();
          }),
          
          // read head of record section, and then read all record blocks
          _slice(pos += len, 32).exec(read_record_sect, pos).spread(function (record_sect) {
            pos += record_sect.len;         // start of record blocks
            len  = record_sect.index_len;   // total length of record blocks
            return _slice(pos, len).exec(read_record_block, record_sect);
          })      
        ];
        
      }).spread(function() {
        console.log('-- parse done --', file.name);

        // resolve and return lookup() function according to file extension (mdx/mdd)
        LOOKUP[ext].description = attrs.Description;
        resolve(LOOKUP[ext]);
      });
    });
  };
  
  
  // END OF parse_mdict()
  
  /**
   * Get file extension.
   */
  function getExtension(filename, defaultExt) {
    return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
  }
  
  /**
   * Load a set of files which will be parsed as MDict dictionary & resource (mdx/mdd).
   */
  return function load(files) {
      var resources = [];
      Array.prototype.forEach.call(files, function(f) {
        var ext =  getExtension(f.name, 'mdx')
        resources.push(resources[ext] = parse_mdict(f, ext));
      });
        
      return new Promise(function(resolve) {
        Promise.all(resources).then(function() { resolve(resources); });
      });
    };
  
}));


