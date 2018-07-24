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
 *       Only lower 32-bit is recognized that validate value must be lower than 2^32 or 4G, 
 *       due to number format supported in current Javascript standard (ECMAScript5).
 *       Huge dictionary file larger than 4G is considered out of scope for a web app IMHO.
 *
 *   ii. Encrypted keyword header which requires external or embedded regkey.
 *       Most of shared MDict dictionary files are not encrypted,
 *       and I have no intention to break protected ones.
 *       However keyword index encryption is common and supported.
 *
 *  iii. Stylesheet substitution.
 *       Have no example yet, I suppose it is not a popular feature.
 *       Contact me if you have one in need of support.
 *
 * MDict software and its file format is developed by Rayman Zhang(张文伟),
 * read more on http://www.mdict.cn/ or http://www.octopus-studio.com/.
 */

/**
 * Usage:
 *   mdict-parser.js is defined as an AMD (or Node::todo) module.
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
  
  if (typeof define === 'function') {
    if  (define.amd) {
      // AMD. Register as an anonymous module.
      define(['pako', 'lzo', 'ripemd128', 'bluebird', 'mdict-parseXml', 'mdict-common'], factory);
    } else {
      // TODO: For Node
      /*
      define(function(require, exports, module)) {
        exports = factory();       
      });
      */
    }
  }

}(this, function(pako, lzo, ripemd128, Promise, parseXml, common) {
  // Value of undefined.
  var UNDEFINED = void 0;
  
  // A shared UTF-16LE text decorder used to read dictionary header string.
  var UTF_16LE = new TextDecoder('utf-16le');
  
  /**
   * Return the first argument as result.
   * This function is used to simulate consequence, i.e. read data and return it, then forward to a new position.
   * @param any data or function call
   * @return the first arugment
   */
  function conseq(/* args... */) { return arguments[0]; }

  /*
   * Decrypt encrypted data block of keyword index (attrs.Encrypted = "2").
   * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index-encryption
   * @param buf an ArrayBuffer containing source data
   * @param key an ArrayBuffer holding decryption key, which will be supplied to ripemd128() before decryption
   * @return an ArrayBuffer carrying decrypted data, occupying the same memory space of source buffer
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
   * to be passed to further Promise#spread(..) call.
   */
  function spreadus() {
    var args = Array.prototype.slice.apply(arguments);
    args._spreadus_ = true;
    return args;
  }
  
  /**
   * Slice part of a file/blob object, return a promise object which will resolve to an ArrayBuffer to feed subsequent process.
   * The returned promise object is extened with an exec(proc, args...) method which can be chained with further process.
   * @param file file or blob object
   * @param offset start position to slice
   * @param len length to slice
   * @return a promise object which will resolve to an ArrayBuffer containing data been read
   */
  function sliceThen(file, offset, len) {
    var p = new Promise(function(_resolve) {
      var reader = new FileReader();
      reader.onload = function() { _resolve(reader.result); }
      reader.readAsArrayBuffer(file.slice(offset, offset + len));
    });

    /**
     * Call proc with specified arguments prepending with sliced file/blob data (ArrayBuffer) been read.
     * @param the first argument is a function to be executed
     * @param other optional arguments are passed to the function following auto supplied input ArrayBuffer
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
   * Harvest any resolved promises, if all failed then return reasons. 
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
  
  /*
   * Create a Record Block Table object to load record block info from record section in mdx/mdd file.
   * Retrived data is stored in an Uint32Array which contains N pairs of (offset_comp, offset_decomp) value,
   * where N is number of record blocks.
   *
   * When looking up a given key for its definition:
   *   1. Search KEY_INDEX to locate keyword block containing the given key.
   *   2. Scanning the found keyword block to get its record offset and size.
   *   3. Search RECORD_BLOCK_TABLE to get record block containing the record.
   *   4. Load the found record block, using its offset and size to retrieve record content.
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
      // Store offset pair value (compressed & decompressed) for a record block
      // NOTE: offset_comp is absolute offset counted from start of mdx/mdd file.
      put:    function(offset_comp, offset_decomp) { 
                arr[pos++] = offset_comp; arr[pos++] = offset_decomp;
              },
      // Given offset of a keyword after decompression, return a record block info containing it, else undefined if not found.
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
   * Parse a MDict dictionary/resource file (mdx/mdd).
   * @param file a File/Blob object
   * @param ext file extension, mdx/mdd
   * @return a Promise object which will resolve to a lookup function.
   */
  function parse_mdict(file, ext) {

    var KEY_INDEX,                                       // keyword index array
        RECORD_BLOCK_TABLE = createRecordBlockTable();   // record block table

    var attrs = {},     // storing dictionary attributes
        _v2,            // true if enginge version > 2
        _bpu,           // bytes per unit when converting text size to byte length for text data
        _tail,          // need to skip extra tail bytes after decoding text
        _decoder,       // text decorder

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
                                offset = offset;
                                var mark = offset;
                                while (dv.getUint16(offset)) { offset+= _bpu /* scan for \u0000 */ };
                                return offset - mark;
                          } : function(dv, offset) {
                                offset = offset;
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
      
      var regexp = common.REGEXP_STRIPKEY[ext];
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
      var offset = 0, dv = new DataView(buf);

      var methods = {
        // target data size in bytes
        size:     function() { return len || buf.byteLength; },
        // update offset to new position
        forward:  function(len) { return offset += len; },
        // return current offset
        offset:   function() { return offset; },
        
        // MDict file format uses big endian to store number
        
        // 32-bit unsigned int
        readInt:    function() { return conseq(dv.getUint32(offset, false), this.forward(4)); },
        readUint16: function() { return conseq(dv.getUint16(offset, false), this.forward(2)); },
        readUint8:  function() { return conseq(dv.getUint8(offset, false),  this.forward(1)); },
        
        // Read a "short" number representing keyword text size, 8-bit for version < 2, 16-bit for version >= 2
        readShort:  function() { return _readShort(this); },
        // Read a number representing offset or data block size, 16-bit for version < 2, 32-bit for version >= 2
        readNum:    function() { return _readNum(this); },

        readUTF16:  function(len) { return conseq(UTF_16LE.decode(new Uint8Array(buf, offset, len)), this.forward(len)); },
        
        // Read data to an Uint8Array and decode it to text with specified encoding.
        // Text length in bytes is determined by searching terminated NUL.
        // NOTE: After decoding the text, it is need to forward extra "tail" bytes according to specified encoding. 
        readText: function() {
          var len = _searchTextLen(dv, offset);
          return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + _bpu));
        },
        // Read data to an Uint8Array and decode it to text with specified encoding.
        // @param len length in basic unit, need to multiply byte per unit to get length in bytes
        // NOTE: After decoding the text, it is need to forward extra "tail" bytes according to specified encoding. 
        readTextSized: function(len) {
          len *= _bpu;
          return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + _tail));
        },
        
        // Skip checksum, just ignore it anyway.
        checksum:    function() { this.forward(4); },
        // Version >= 2.0 only
        checksum_v2: function() { return _checksum_v2(this); },

        // Read data block of keyword index, key block or record content.
        // These data block are maybe in compressed (gzip or lzo) format, while keyword index maybe be encrypted.
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
              passkey.set(new Uint8Array(buf, offset - 4, 4));  // key part 1: checksum
              passkey.set([0x95, 0x36, 0x00, 0x00], 4);         // key part 2: fixed data
              tmp = decryptor(tmp, passkey);
            }
            
            tmp = comp_type === 2 ? pako.inflate(tmp) : lzo.decompress(tmp, expectedBufSize, 1308672);
            this.forward(len);
            return Scanner(tmp.buffer, tmp.length);
          }
        },
        
        // Read raw data as Uint8Array from current offset with specified length in bytes
        readRaw: function(len) {
          return conseq(new Uint8Array(buf, offset, len), this.forward(len === UNDEFINED ? buf.length - offset : len));
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
     * @return [remained length of header section (header_str and checksum, = len + 4), original input]
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

      common.log('dictionary attributes: ', attrs);
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
     * @return [keyword_summary, array of keyword index]
     */
    function read_keyword_index(input, keyword_summary) {
      var scanner = Scanner(input).readBlock(keyword_summary.key_index_comp_len, keyword_summary.key_index_decomp_len, _decryptors[1]),
          keyword_index = Array(keyword_summary.num_blocks),
          offset = 0;
      
      for (var i = 0, size; i < keyword_summary.num_blocks; i++) {
        keyword_index[i] = {
          num_entries: conseq(scanner.readNum(), size = scanner.readShort()),
// UNUSED, can be ignored        
//          first_size:  size = scanner.readShort(),
          first_word:  conseq(scanner.readTextSized(size), size = scanner.readShort()),
// UNUSED, can be ignored
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
     * Read keyword entries inside a keyword block and fill KEY_TABLE.
     * @param scanner scanner object to read key entries, which starts at begining of target key block
     * @param kdx corresponding keyword index object
     * NOTE: no need to read keyword block anymore, for debug only.
     */
    function read_key_block(scanner, kdx) {
      var scanner = scanner.readBlock(kdx.comp_size, kdx.decomp_size);
      for (var i = 0; i < kdx.num_entries; i++) {
//        scanner.readNum(); scanner.readText();
        var kk = [scanner.readNum(), scanner.readText()];
//        console.log(scanner.readNum(), scanner.readText());
      }
    }
    
    /**
     * Delay to scan key table, for debug onyl.
     * @param slicedKeyBlock a promise object which will resolve to an ArrayBuffer containing keyword blocks 
     *                       sliced from mdx/mdd file.
     * @param num_entries number of keyword entries
     * @param keyword_index array of keyword index
     * @param delay time to delay for scanning key table
     */
    function willScanKeyTable(slicedKeyBlock, num_entries, keyword_index, delay) {
      slicedKeyBlock.delay(delay).then(function (input) {
        common.log('scan key table...');
        var scanner = Scanner(input);
        for (var i = 0, size = keyword_index.length; i < size; i++) {
          read_key_block(scanner, keyword_index[i]);
        }

        common.log('KEY_TABLE loaded.');
      });
    }

    /**
     * Read record summary at the begining of record section.
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#record-section
     * @param input sliced file, start = begining of record section, length = 32 (max length of record summary)
     * @param pos begining of record section
     * @returj record summary object
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
     * Read definition in text for given keyinfo object.
     * @param input record block sliced from the file
     * @param block record block index 
     * @param keyinfo a object with property of record's offset and optional size for the given keyword
     * @return definition in text
     */
    function read_definition(input, block, keyinfo) {
      var scanner = Scanner(input).readBlock(block.comp_size, block.decomp_size);
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
     * Read content in ArrayBuffer for give keyinfo object
     * @param input record block sliced from the file
     * @param block record block index 
     * @param keyinfo a object with property of record's offset and optional size for the given keyword
     * @return an ArrayBuffer containing resource of image/audio/css/font etc.
     */
    function read_object(input, block, keyinfo) {
      if (input.byteLength > 0) {
        var scanner = Scanner(input).readBlock(block.comp_size, block.decomp_size);
        scanner.forward(keyinfo.offset - block.decomp_offset);
        return scanner.readRaw(keyinfo.size);
      } else {
        throw '* OUT OF FILE RANGE * ' + keyinfo + ' @offset=' + block.comp_offset;
      }
    }
    
    /**
     * Find word definition for given keyinfo object.
     * @param keyinfo a object with property of record's offset and optional size for the given keyword
     * @return a promise object which will resolve to definition in text. Link to other keyword is followed to get actual definition.
     */
    function findWord(keyinfo) {
      var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
      return _slice(block.comp_offset, block.comp_size)
                .exec(read_definition, block, keyinfo)
                  .spread(function (definition) { return resolve(followLink(definition, LOOKUP.mdx)); });
    }
    
    /**
     * Find resource (image, sound etc.) for given keyinfo object.
     * @param keyinfo a object with property of record's offset and optional size for the given keyword
     * @return a promise object which will resolve to an ArrayBuffer containing resource of image/audio/css/font etc.
     * TODO: Follow link, maybe it's too expensive and a rarely used feature?
     */
    function findResource(keyinfo) {
      var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
      return _slice(block.comp_offset, block.comp_size)
                .exec(read_object, block, keyinfo)
                  .spread(function (blob) { return resolve(blob); });
    }
    
    //------------------------------------------------------------------------------------------------
    // Implementation for look-up
    //------------------------------------------------------------------------------------------------
    var slicedKeyBlock,
        _cached_keys,             // cache latest keys 
        _trail,                   // store latest visited record block & position when search for candidate keys
        mutual_ticket = 0;        // a oneway increased ticket used to cancel unfinished pattern match

    
    /**
      * Reduce the key index array to an element which contains or is the nearest one matching a given phrase.
      */
    function reduce(arr, phrase) {
      var len = arr.length;
      if (len > 1) {
        len = len >> 1;
        return phrase > _adaptKey(arr[len - 1].last_word)
                  ? reduce(arr.slice(len), phrase)
                  : reduce(arr.slice(0, len), phrase);
      } else {
        return arr[0];
      }
    }
    
    /**
      * Reduce the array to index of an element which contains or is the nearest one matching a given phrase.
      */
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
        return (arr.pos || 0) + (phrase <= _adaptKey(arr[0]) ? 0 : 1);
      }
    }

    /**
     * Load keys for a keyword index object from mdx/mdd file.
     * @param kdx keyword index object
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
          return [kdx, Math.min(idx, list.length - 1), list];
        });
    }
    
    // TODO: have to restrict max count to improve response
    /**
     * Append more to word list according to a filter or expected size.
     */
    function appendMore(word, list, nextKdx, expectedSize, filter, ticket) {
      if (ticket !== mutual_ticket) {
        throw 'force terminated';
      }

      if (filter) {
        if (_trail.count < expectedSize && nextKdx && nextKdx.first_word.substr(0, word.length) === word) {
          return loadKeys(nextKdx).delay(30).then(function(more) {
            common.log(nextKdx);
            _trail.offset = 0;
            _trail.block = nextKdx.index;
            Array.prototype.push.apply(list, more.filter(filter, _trail));
            return appendMore(word, list, KEY_INDEX[nextKdx.index + 1], expectedSize, filter, ticket);
          });
        } else {
          if (list.length === 0) {
            _trail.exhausted = true;
          }
          return resolve(list);
        }
      } else {
        var shortage = expectedSize - list.length;
        if (shortage > 0 && nextKdx) {
console.log('go next', nextKdx);
          _trail.block = nextKdx.index;
          return loadKeys(nextKdx).then(function(more) {
            _trail.offset = 0;
            _trail.pos = Math.min(shortage, more.length);
            Array.prototype.push.apply(list, more.slice(0, shortage));
console.log('$$ ' + more[shortage - 1], shortage);                
            return appendMore(word, list, KEY_INDEX[nextKdx.index + 1], expectedSize, filter, ticket);
          });
        } else {
          if (_trail.pos > expectedSize) {
            _trail.pos = expectedSize;
          }
          list = list.slice(0, expectedSize);
          _trail.count = list.length;
          _trail.total += _trail.count;
          return resolve(list);
        }
      }
    }
        
    function followUp() {
      var kdx = KEY_INDEX[_trail.block];
      return loadKeys(kdx).then(function (list) {
                return [kdx, Math.min(_trail.offset + _trail.pos, list.length - 1), list];
              });
    }
      
    function matchKeys(phrase, expectedSize, follow) {
      expectedSize = Math.max(expectedSize || 0, 10);
      var str = phrase.trim().toLowerCase(),
          m = /([^?*]+)[?*]+/.exec(str), 
          word;
      if (m) {
        word = m[1];
        var wildcard = new RegExp('^' + str.replace(/([\.\\\+\[\^\]\$\(\)])/g, '\\$1').replace(/\*+/g, '.*').replace(/\?/g, '.') + '$'),
            tester = phrase[phrase.length - 1] === ' ' 
                        ? function(s) { return wildcard.test(s); } 
                        : function(s) { return wildcard.test(s) && !/ /.test(s); },
            filter = function (s, i) { 
                       if (_trail.count < expectedSize && tester(s)) {
                         _trail.count++;
                         _trail.total++;
                         _trail.pos = i + 1;
                         return true;
                       }
                       return false;
                     };
      } else {
        word = phrase.trim();
      }
      
      if (_trail && _trail.phrase !== phrase) {
        follow = false;
      }
      
      if (follow && _trail && _trail.exhausted) {
        return resolve([]);
      }
      
      var startFrom = follow && _trail ? followUp() : seekVanguard(word);
      
      return startFrom.spread(function(kdx, idx, list) {
console.log('start  ', kdx);
        list = list.slice(idx);
        _trail = {phrase: phrase, 
                  block:  kdx.index, 
                  offset: idx, 
                  pos:    list.length, 
                  count:  0,
                  total:  follow ? _trail && _trail.total || 0 : 0
                };
        if (filter) {
          list = list.filter(filter, _trail);
        }
        return appendMore(word, list, KEY_INDEX[kdx.index + 1], expectedSize, filter, ++mutual_ticket)
                  .then(function(result) {
                    if (_trail.block === KEY_INDEX.length - 1) {
                      if (_trail.offset + _trail.pos >= KEY_INDEX[_trail.block].num_entries) {
                        _trail.exhausted = true;
console.log('EXHAUSTED!!!!');
                      }
                    }
console.log('trail: ', _trail);          
                    return result;
                  });
      });
    };
    
    
    /**
     * Match the first element in list with given offset.
     */
    function matchOffset(list, offset) {
      return list.some(function(el) { return el.offset === offset ? list = [el] : false; }) ? list : [];
    }
    
    // Lookup functions
    var LOOKUP = {
      /**
       * @param query 
       *          String
       *          {phrase: .., max: .., follow: true} object
       */
      mdx: function(query) {
        if (typeof query === 'string' || query instanceof String) {
          _trail = null;
          var word = query.trim().toLowerCase(), offset = query.offset;

          return seekVanguard(word).spread(function(kdx, idx, list) {
            list = list.slice(idx);
            if (offset !== UNDEFINED) {
              list = matchOffset(list, offset);
            } else {
              list = list.filter(function(el) { return el.toLowerCase() === word; });
            }
            return harvest(list.map(findWord));
          });
        } else {
          return matchKeys(query.phrase, query.max, query.follow);
        }
      },
      
      // TODO: chain multiple mdd file
      mdd: function(phrase) {
        var word = phrase.trim().toLowerCase();
        word = '\\' + word.replace(/(^[/\\])|([/]$)/, '');
        word = word.replace(/\//g, '\\');
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
    };    
    
    // ------------------------------------------
    // start to load mdx/mdd file
    // ------------------------------------------
    common.log('start to load ' + file.name);
    
    var pos = 0;

    // read first 4 bytes to get header length
    return _slice(pos, 4).exec(read_file_head).spread(function(len) {
      pos += 4;                                   // start of header string in header section
      return _slice(pos, len + 48)
                .exec(read_header_sect, len);

    }).spread(function(header_remain_len, input) {
      pos += header_remain_len;                   // start of keyword section
      return read_keyword_summary(input, header_remain_len);

    }).then(function(keyword_summary) {           common.log(keyword_summary);
      pos += keyword_summary.len;                 // start of key index in keyword section
      return _slice(pos, keyword_summary.key_index_comp_len)
                .exec(read_keyword_index, keyword_summary);

    }).spread(function (keyword_summary, keyword_index) {
      pos += keyword_summary.key_index_comp_len;  // start of keyword block in keyword section
      slicedKeyBlock = _slice(pos, keyword_summary.key_blocks_len);

      /*
      // Now it's fast enough to look up word without key table, which scans keyword from the specified key blocks in an effcient way.
      // No need to scan the whole key table in ahead.
      willScanKeyTable(slicedKeyBlock, keyword_summary.num_entries, keyword_index, 00);
      // */
      
      pos += keyword_summary.key_blocks_len;    // start of record section
      
      KEY_INDEX = keyword_index;
      
    }).then(function () { 
      return _slice(pos, 32)
                .exec(read_record_summary, pos);
      
    }).spread(function (record_summary) {       common.log(record_summary);
      pos += record_summary.len;                // start of record blocks in record section
      return _slice(pos, record_summary.index_len)
                .exec(read_record_block, record_summary);

    }).spread(function() {                      common.log('-- parse done --', file.name);
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
        var ext =  common.getExtension(f.name, 'mdx');
        
        resources.push(resources[ext] = parse_mdict(f, ext));
      });
        
      return Promise.all(resources)
                    .then(function() { return resolve(resources); });
    };
  
}));
