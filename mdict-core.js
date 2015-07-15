
/*
 * A pure JavaScript implemented parser for MDict dictionary file (mdx/mdd).
 * By Feng Dihai <fengdh@gmail.com>, 2015/07/01
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

  // TODO: remove dependency on jQuery
  
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'pako_inflate', 'lzo', 'ripemd128', 'murmurhash3', 'bluebird', 'mdict-parseXml'], factory);
  } else {
    // Browser globals
    factory(jQuery, pako, lzo, ripemd128, MurmurHash3, Promise, parseXml);
  }

}(this, function($, pako, lzo, ripemd128, MurmurHash3, Promise, parseXml) {
  
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
  
  
  function parse_mdict(file, ext) {

    var KEY_TABLE = createKeyTable(),                    // key table
        RECORD_BLOCK_TABLE = createRecordBlockTable();   // record block table

    var attrs = {},
        _v2,
        _tail,
        _unit,
        _encrypted = [false, false],
        _decoder,
        _searchTextLen,
        _readNum = function(scanner) { return scanner.readInt(); },
        _checksum_v2 = new Function(),
        _readShort = function(scanner) { return scanner.readUint8(); },
        readPartial = sliceThen.bind(null, file);

    function config(attrs) {
      attrs.Encoding = attrs.Encoding || 'UTF-16';
      
      _searchTextLen = (attrs.Encoding === 'UTF-16') ? function(dv, offset) {
        var mark = offset;
        while (dv.getUint16(offset++)) {};
        return [offset - mark, 2];
      } : function(dv, offset) {
        var mark = offset;
        while (dv.getUint8(offset++)) {}
        return [offset - mark, 0];
      };
      
      _decoder = new TextDecoder(attrs.Encoding || 'UTF-16LE');

      _unit = (attrs.Encoding === 'UTF-16') ? 2 : 1;
      if (parseInt(attrs.GeneratedByEngineVersion, 10) >= 2.0) {
        _v2 = true;
        _tail = _unit;

        _readNum = function(scanner) {
          // not going to handle HUGE dictionary file (>4G) inside browser!
          scanner.forward(4);
          return scanner.readInt();
        };
        _readShort = function(scanner) {
          return scanner.readUint16();
        };
        _checksum_v2 = function(scanner) {
          return scanner.checksum();
        };
      } else {
        _tail = 0;
      }
      
      if (attrs.Encrypted & 0x02) {
        _encrypted[1] = decrypt; 
      }
    }

    function Scanner(buf, len) {
      var offset = 0;
      var dv = new DataView(buf);

      var methods = {
        size: function() {
          return len || buf.byteLength;
        },
        forward: function(len) {
          return offset += len;
        },
        offset: function() {
          return offset;
        },

        readInt: function() {
          return conseq(dv.getUint32(offset, false), this.forward(4));
        },
        readUint16: function() {
          return conseq(dv.getUint16(offset, false), this.forward(2));
        },
        readUint8: function() {
          return conseq(dv.getUint8(offset, false), this.forward(1));
        },
        readUTF16: function(len) {
          return conseq(UTF_16LE.decode(new Uint8Array(buf, offset, len)), this.forward(len));
        },
        readText: function(len, tail) {
          if (arguments.length === 0) {
            var r = _searchTextLen(dv, offset);
            len = r[0];
            tail = r[1];
          } else {
            len *= _unit;
          }
          return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + tail));
        },
        readShort: function() {
          return _readShort(this);
        },
        readNum: function() {
          return _readNum(this);
        },
        checksum: function() {
          return conseq(new Uint8Array(buf, offset, 4), this.forward(4));
        },
        checksum_v2: function() {
          return _checksum_v2(this);
        },

        readBlock: function(len, expectedBufSize, decryptor) {
          var comp_type = dv.getUint8(offset, false);
          if (comp_type === 0) {
            if (_v2) {
              this.forward(8);
            }
            return this;
          } else {
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
        // TODO:
        readRaw: function(len) {
          return conseq(new Uint8Array(buf, offset, len), this.forward(len === void 0 ? buf.byteLength - offset :len));
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
     * @return length of header_str, same as input argument len
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
      attrs.Compact = attrs.Compact === 'Yes';
      attrs.KeyCaseSensitive = attrs.KeyCaseSensitive === 'Yes';

      mdict_obj.description = attrs.Description;
      
      console.log('attrs: ', attrs);
      config(attrs);
      return len;
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
        len:                  scanner.offset() - offset,  // actual length of keyword section, varying with engine version attribute
      };
    }

    /**
     * Read keyword index. 
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-header-encryption
     * @see https://github.com/zhansliu/writemdict/blob/master/fileformat.md#keyword-index
     * @return keyword index array
     */
    function read_keyword_index(input, keyword_sect) {
      var scanner = Scanner(input).readBlock(keyword_sect.key_index_comp_len, keyword_sect.key_index_decomp_len, _encrypted[1]),
          keyword_index = Array(keyword_sect.num_blocks);
      
      for (var i = 0, size; i < keyword_sect.num_blocks; i++) {
        keyword_index[i] = {
          num_entries: scanner.readNum(),
          first_size:  size = scanner.readShort(),
          first_word:  scanner.readText(size, _tail),
          last_size:   size = scanner.readShort(),
          last_word:   scanner.readText(size, _tail),
          comp_size:   scanner.readNum(),
          decomp_size: scanner.readNum(),
        };
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
    function read_record_index(input, record_sect) {
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
     *
     */
    function read_definition(input, keyinfo, block) {
      var scanner = Scanner(input);
      scanner = scanner.readBlock(block.comp_size);
      scanner.forward(keyinfo.offset - block.decomp_offset);
      return scanner.readText();
    }

    /**
     *
     */
    function read_object(input, keyinfo, block) {
      var scanner = Scanner(input);
      scanner = scanner.readBlock(block.comp_size);
      scanner.forward(keyinfo.offset - block.decomp_offset);
      return scanner.readRaw(keyinfo.size);
    }

    // TODO: search nearest in case of collision of hashcode
    var LOOKUP = {
      mdx: function(word) {
        word = word.trim().toLowerCase();
        return new Promise(function(resolve, reject) {
          var keyinfo = KEY_TABLE.find(word);
          if (keyinfo) {
            var block = RECORD_BLOCK_TABLE.find(keyinfo.offset);
            readPartial(block.comp_offset, block.comp_size).exec(read_definition, keyinfo, block)
              .spread(function (definition) {
                resolve(definition);
              }).caught(function () {
                reject("*NOT FOUND*");
              });

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
            readPartial(block.comp_offset, block.comp_size).exec(read_object, keyinfo, block)
              .spread(function (blob) {
                resolve(blob);
              }).caught(function () {
                reject("*NOT FOUND*");
              });

          } else {
            reject("*NOT FOUND*");
          }
        });
      }
    };
    
    return new Promise(function(resolve) {
      var pos = 0;

      // read first 4 bytes to get header length
      readPartial(pos, 4).exec(read_file_head).spread(function(len) {
        pos += 4;
        // then parse dictionary attributes in remained header section (header_str:len + checksum:4 bytes),
        // also load next first 44 bytes of keyword section
        return readPartial(pos, len + 48).exec(read_header_sect, len);
        
      }).spread(function(len, input) {
          pos += len + 4;  // start of keyword section
          return read_keyword_sect(input, len + 4);
        
      }).then(function(keyword_sect) {
//        console.log('keyword_sect: ', keyword_sect);

        pos += keyword_sect.len;  // start of key index
        var len = keyword_sect.key_index_comp_len + keyword_sect.key_blocks_len; // total length of key index and key block
        
        // read keyword index, and then read all key block
        return readPartial(pos, len).exec(read_keyword_index, keyword_sect).spread(function (keyword_index, input) {
//          console.log(keyword_index);

          var scanner = Scanner(input);
          scanner.forward(keyword_sect.key_index_comp_len);

          KEY_TABLE.alloc(keyword_sect.num_entries);
          for (var i = 0, size = keyword_index.length; i < size; i++) {
//            console.log('== key block # ' + i);
            read_key_block(scanner, keyword_index[i]);
          }

//          KEY_TABLE.debug();
          KEY_TABLE.sort();
//          KEY_TABLE.debug();

          return len;
        });
        
      }).then(function(len) {
        pos += len;   // start of record section
        len = 32;     // max length of record section excluding record block index
        
        // read head of record section
        return readPartial(pos, len).exec(read_record_sect, pos).spread(function (record_sect) {
          pos += record_sect.len;
          // read record block index, then finish parsing mdx/mdd file 
          return readPartial(pos, record_sect.index_len).exec(read_record_index, record_sect).spread(function () {
              console.log('record_sect: ', record_sect);
//              console.log('RECORD BLOCK TABLE: ');
//              RECORD_BLOCK_TABLE.debug();
              resolve();
            });
        });
      });
      
    // resolve and return lookup() function according to file extension (mdx/mdd)
    }).thenReturn(LOOKUP[ext]);
  };
  
  
  // END OF parse_mdict()
  
  // TODO: how to parss dictionary description
  var mdict_obj = {};
  
  return function load(files) {
      return new Promise(function(resolve) {
        var dicts = [];

        Array.prototype.forEach.call(files, function(f) {
          var ext =  /(?:\.([^.]+))?$/.exec(f.name)[1] || 'mdx',
              d = parse_mdict(f, ext);
          dicts.push(d);
          dicts[ext] = d;
        });
        
        mdict_obj.lookup = function lookup(word) {
          return new Promise(function(resolve) {
            (dicts['mdx'] || dicts['mdd']).then(function(lookup) {
                
              lookup(word).done(function(definition) {
              var $content = $('<div>').html(definition);
              if (dicts['mdd']) {
                $content.find('img[src]').each(function() {
                  var $this = $(this);
                  dicts['mdd'].then(function(lookup) {
                    lookup($this.attr('src')).done(function(blob) {
                      blob = new Blob([blob], {type: 'image'});
                      var url = URL.createObjectURL(blob);
                      // TODO: need to call window.URL.revokeObjectURL() to release memory
                      //       or use LRU cache
                      $this.attr('src', url);
                    });
                  });
                });
              }
              resolve($content);
            });
          });
        });
        
      };
     
      Promise.all(dicts).then(function() {
        resolve(mdict_obj);
      });
        
    });
    
  };
}));
