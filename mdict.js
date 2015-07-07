
var TTTT;
(function (root, factory) {
  "use strict";

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define('mdictjs', ['jquery', 'pako_inflate', 'ripemd128'], factory);
  } else {
    // Browser globals
    factory(jQuery, pako, ripemd128);
  }

}(this, function($, pako, ripemd128) {
  ripemd128 = window.ripemd128;
  
  return function parse_mdict(file) {

    var UTF_16LE = new TextDecoder('utf-16le'), attrs = {}, willDone = $.Deferred();

    // Note: key = keyword or head word
    // Compact key table, which can be viewed as an Uint32Array containing N pairs of (key_hashcode, record_offset) value. 
    // where N is number of key entries.
    // This table should be sorted first according to key_hashcode before searching offset of a key (using Array.prototype.sort).
    // To execute binary search in the sorted key table, you have to calculate its hashcode for any given keyword.
    var KEY_TABLE = (function() {
      var pos = 0, arr, view, F64 = new Float64Array(2), U32 = new Uint32Array(F64.buffer);
      
      return {
        alloc:  function(len) { 
                  arr = new Float64Array(len); 
                  view = new Uint32Array(arr.buffer); 
                  return this; 
                },
        put:    function(hash, offset) {
                  view[pos++] = hash;
                  view[pos++] = offset;
                  return this;
                },
        pack:   function() {
                  if (pos * 2 < arr.byteLength) {
                    view = view.subarray(0, pos);
                    arr = new Float64Array(view.buffer);
                  }
                  return view;
                },
        sort:   function() {
                  this.pack();
                  Array.prototype.sort.call(arr, function(f1, f2) { return F64[0] = f1, F64[1] = f2, U32[0] - U32[2]; });
                  return this;
                },
        find:   function(hash) {
                  var hi = arr.length - 1, lo = 0, i = (lo + hi) >> 1, val = view[i << 1];
                  if (hash < 0) { 
                    hash += 0xFFFFFFFF; hash++;
                  }
                  while (true) {
                    if (hash === val) {
                      return view[(i << 1) + 1];
                    } else if (hi === lo || i === hi || i === lo) {
                      return -1;
                    }

                    (hash < val) ? hi = i : lo = i;
                    i = (lo + hi) >> 1;
                    val = view[i << 1];
                  }
                },
        debug:  function() { console.log(this.pack()); return this; }
      }
    })();

    // Compact record block table which can be viewed as an Uint32Array containing N+1 pairs of (absolute_offset_comp, offset_decomp) value,
    // where N is number of record blocks. The tail of the table shows offset of the last record block's end.
    // This table should be sorted first according to offset_decomp before searching.
    // How to look up for a given keyword:
    //     1. Find offset (offset_decomp) of record in KEY_TABLE.
    //     2. Execute binary search on RECORD_BLOCK_TABLE to get record block containing the record.
    //     3. Load found record block, using offset to retrieve content of the record.
    var RECORD_BLOCK_TABLE = (function() {
      var pos = 0, arr;
      return {
        alloc:  function(len) { 
                  arr = new Uint32Array(len * 2);
                  return this; 
                },
        put:    function(offset_comp, offset_decomp) { 
                  arr[pos++] = offset_comp;
                  arr[pos++] = offset_decomp;
                  return this; 
                },
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
        debug:  function() { console.log(arr); return this; },
        };
    })();


    var START_KEY_BLOCK, START_RECORD_BLOCK;


    var _HASHSEED = 0xFE179;

    /**
     * Calculate a 32-bit hash code for a string.
     */
    function hash(str) {
      return MurmurHash3.hashString(str.toLowerCase(), 32, _HASHSEED);
    }

    /**
     * Save array buffer data as a download file. 
     */
    var saveData = (function() {
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      return function(data, fileName, type) {
        var blob = new Blob([data], { type: type || "octet/stream" });
        a.href = window.URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      };
    }());

    /**
     * Return the first argument as result, used to simulate side effect such as forward after reading data.
     */
    function conseq() {
      return arguments[0];
    }

    // TODO: not finished
    function decrypt(buf, key) {
      key = ripemd128(key);
      var buflen = buf.length,
          keylen = key.length,
          i, byte, prev = 0x36;
      for (i = 0; i < buflen; i++) {
        byte = buf[i];
        byte = ((byte >> 4) | (byte << 4) ) & 0xFF;
        byte = byte  ^ prev ^ (i & 0xFF) ^ key[i % keylen];
        prev = buf[i];
        buf[i] = byte;
      }
      return buf;
    }

    /**
     * Create a XML object from string.
     */
    function toXml(str) {
      if (window.DOMParser) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
      } else {
        var obj = new ActiveXObject('Microsoft.XMLDOM');
        obj.loadXML(str);
        return obj;
      }
    }

    var _v2,
        _encrypted = [false, false],
        _decoder,
        _searchTextLen,
        _readNum = function(scanner) { return scanner.readInt(); },
        _checksum_v2 = new Function(),
        _readShort = function(scanner) { return scanner.readUint8(); };

    function init(attrs) {
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

      if (parseInt(attrs.GeneratedByEngineVersion, 10) >= 2.0) {
        _v2 = true;

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
//        } else {
//          return this.forward(len + tail);
          }
            return conseq(_decoder.decode(new Uint8Array(buf, offset, len)), this.forward(len + (tail || 0)));
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
//              var passkey = createKey(new Uint8Array(buf, offset - 4, 4));
              var passkey = new Uint8Array(8);
              passkey.set(new Uint8Array(buf, offset - 4, 4));
              passkey.set([0x95, 0x36, 0x00, 0x00], 4);
              tmp = decryptor(tmp, passkey);
            }
            
            tmp = comp_type === 2 ? pako.inflate(tmp) : lzo1x.decompress(tmp, expectedBufSize, 4096);
            this.forward(len);
            return Scanner(tmp.buffer, tmp.byteLength);
          }
        },
      };

      return Object.create(methods);
    }

    function read_file_head(input) {
      return new Scanner(input).readInt();
    }

    function read_header_sect(input, len) {
      var scanner = new Scanner(input);
      header_str = scanner.readUTF16(len).replace(/\0$/, ''); // need to remove endding NUL

      // parse dictionary attributes
      var xml = toXml(header_str).querySelector('Dictionary, Library_Data').attributes,
        i, item;

      for (i = 0; i < xml.length; i++) {
        item = xml.item(i);
        attrs[item.nodeName] = item.nodeValue;
      }

      attrs.Encrypted = parseInt(attrs.Encrypted, 10) || 0;
      attrs.Compact = attrs.Compact === 'Yes';
      attrs.KeyCaseSensitive = attrs.KeyCaseSensitive === 'Yes';

      init(attrs);
      return attrs;
    }

    function read_keyword_sect(input, start, attrs) {
      var scanner = Scanner(input);
      scanner.forward(start);
      return {
        num_blocks: scanner.readNum(),
        num_entries: scanner.readNum(),
        key_index_decomp_len: _v2 && scanner.readNum(),
        key_index_comp_len: scanner.readNum(),
        key_blocks_len: scanner.readNum(),
        chksum: scanner.checksum_v2(),
        len: scanner.offset() - start,
      };
    }

    function read_keyword(input, attrs, keyword_sect, unit) {
      var scanner = Scanner(input),
          kscanner = scanner.readBlock(keyword_sect.key_index_comp_len, keyword_sect.key_index_decomp_len, _encrypted[1]),
          kx, pos = START_KEY_BLOCK,
          keyword_index = [];
      pos = 0;
      tail = _v2 ? 1 : 0;
      if (attrs.Encoding === 'UTF-16') {
        tail *= 2;
      }
      
      for (i = 0; i < keyword_sect.num_blocks; i++) {
        kx = read_keyword_index(kscanner, unit, tail);
        kx.offset = pos;
        pos += kx.comp_size;
        keyword_index.push(kx);
      }
      START_RECORD_BLOCK = pos;

      console.log(keyword_index);

      return keyword_index;
    }

    function read_keyword_index(scanner, unit, tail) {
      var size, kx; // tail = unit > 1 ? 0 : 1;
      return kx = {
        num_entries: scanner.readNum(),
        first_size: size = scanner.readShort(),
        first_word: scanner.readText(size * unit, tail),
        last_size: size = scanner.readShort(),
        last_word: scanner.readText(size * unit, tail),
        comp_size: scanner.readNum(),
        decomp_size: scanner.readNum(),
      };
    }

    function read_key_block(scanner, kx) {
      var offset, key, h;
      scanner = scanner.readBlock(kx.comp_size, kx.decomp_size);
      if (scanner.size() === kx.decomp_size) {
        for (var i = 0, size = kx.num_entries; i < size; i++) {
          offset = scanner.readNum();
          key = scanner.readText();
          h = hash(key);
          KEY_TABLE.put(h, offset);
        }
      } else {
        console.log('Failed to decompress LZO data block:')
        console.log('  mdx size =   ' + kx.decomp_size);
        console.log('  lzo size =   ' + scanner.size());
      }
      console.log(' * ' + i, key);
    }

    function read_record_sect(input) {
      var scanner = Scanner(input);
      var record_sect = {
        num_blocks: scanner.readNum(),
        num_entries: scanner.readNum(),
        index_len: scanner.readNum(),
        blocks_len: scanner.readNum(),
        len: scanner.offset(),
      };
      return record_sect;
    }

    function read_record_index(input, record_sect) {
      var scanner = Scanner(input),
        i = 0,
        size = record_sect.num_blocks,
        pos = [START_RECORD_BLOCK, 0],
        num = [0, 0],
        record_index = [];
      RECORD_BLOCK_TABLE.alloc(size + 1);
      for (i; i < size; i++) {
        record_index.push({
          comp_size: num[0] = scanner.readNum(),
          decomp_size: num[1] = scanner.readNum()
        });
        RECORD_BLOCK_TABLE.put(pos[0], pos[1]);
        pos[0] += num[0];
        pos[1] += num[1];
      }
      RECORD_BLOCK_TABLE.put(pos[0], pos[1]);
      record_sect.record_index = record_index;
    }


    function readPartial(offset, len, aFile) {
      var reader = new FileReader(),
        will = $.Deferred();

      aFile = aFile || file;

      reader.onload = function() {
        will.resolve(reader.result);
      };
      console.log('slice: ', offset, ' + ', len);
      reader.readAsArrayBuffer(aFile.slice(offset, offset + len));

      return will.promise({
        call: function(proc /* , args... */ ) {
          var args = Array.prototype.slice.call(arguments, 1),
            future = $.Deferred();
          will.done(function(input) {
            args.unshift(input);
            future.resolve(proc.apply(null, args), input);
          });
          return future.promise();
        }
      });
    }

    var pos = 0;

    // read first 4 bytes to get header length
    readPartial(pos, 4).call(read_file_head).then(function(len) {
      console.log('len: ', len);
      pos += 4;

      // then parse dictionary attributes in remained header section (len + 4),
      // also load next first 44 bytes of keyword section
      readPartial(pos, len + 48).call(read_header_sect, len).done(function(attrs, input) {
        console.log('attrs: ', attrs, this);
        pos += len + 4;

        var keyword_sect = read_keyword_sect(input, len + 4, attrs);

        TTTT = KEY_TABLE.alloc(keyword_sect.num_entries);

        console.log('keyword_sect: ', keyword_sect);

        pos += keyword_sect.len;
        len = keyword_sect.key_index_comp_len + keyword_sect.key_blocks_len;

        START_KEY_BLOCK = pos + keyword_sect.key_index_comp_len;

        var unit = (attrs.Encoding === 'UTF-16') ? 2 : 1;
        readPartial(pos, len).call(read_keyword, attrs, keyword_sect, unit)
          .done(function(keyword_index, input) {
            var scanner = Scanner(input), 
                i = 0, size = keyword_index.length;
            scanner.forward(keyword_sect.key_index_comp_len);
            for (; i < size; i++) {
              console.log('== key block # ' + i);
              read_key_block(scanner, keyword_index[i]);
            }

            KEY_TABLE.debug();
            KEY_TABLE.sort();
            KEY_TABLE.debug();

            //KEY_TABLE.saveAs(file.name + '.mdq');

            pos += len;
            len = 32;
            readPartial(pos, len).call(read_record_sect).done(function(record_sect) {
              pos += record_sect.len;
              START_RECORD_BLOCK = pos + record_sect.index_len;
              readPartial(pos, record_sect.index_len).call(read_record_index, record_sect)
                .done(function() {
                  console.log('record_sect: ', record_sect);
                  console.log('RECORD BLOCK TABLE: ');
                  RECORD_BLOCK_TABLE.debug();
                  willDone.resolve(lookup);
                });
            });
          });

      });
    });

    function read_definition(input, offset, block) {
      var scanner = Scanner(input);
      scanner = scanner.readBlock(block.comp_size);
//      if (scanner.size() === block.decomp_size) {
        scanner.forward(offset - block.decomp_offset);
        return scanner.readText();
//      } else {
//        return '**NOT FOUND**';
//      }
    }

    function lookup(word) {
      word = word.trim().toLowerCase();
      var result = $.Deferred(),
        hashcode = hash(word)
      console.log(hashcode);
      var offset = KEY_TABLE.find(hashcode);
      if (offset >= 0) {
        var block = RECORD_BLOCK_TABLE.find(offset);
        readPartial(block.comp_offset, block.comp_size).call(read_definition, offset, block)
          .done(function(definition) {
            result.resolve(definition);
          }).fail(function() {
            result.reject();
          });

      } else {
        result.reject();
      }
      return result.promise(new String('OK! ' +
        '<p> hashcode: ' + hashcode +
        '<p> offset: ' + offset +
        '<p> block: #' + JSON.stringify(block)));
    }


    return willDone;
  };
}));

var $input = $('#dictfile').on('change', accept);

function accept(e) {
  var $src = $(e.target);
  var fileList = $src.prop('files');

  $('#btnLookup').attr('disabled', true);
  
  if (fileList.length > 0) {
    require(['mdictjs'], function(mdictjs) {
      $('#word').on('keyup', function(e) { e.which === 13 && $('#btnLookup').click(); });
      
      mdictjs(fileList[0]).done(function(lookup) {
        $('#btnLookup')
          .attr('disabled', false)
          .off('.#mdict')
          .on('click.#mdict', function() {
            var result = lookup($('#word').val()).done(function(definition) {
              $('#definition').html(definition);
            });
            $('#definition').html(result);
          });
      });
    });
  };

}
