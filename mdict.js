(function(root, factory) {

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define('mdictjs', ['jquery', 'pako_inflate'], factory);
  } else {
    // Browser globals
    factory(jQuery);
  }

}(this, function($, pako) {

  return function parse_mdict(file) {

    var attrs = {},
        UTF_16LE = new TextDecoder('utf-16le'),
        willDone = $.Deferred();

    var keyword_index,
      START_KEY_BLOCK,
      START_RECORD_BLOCK;

    // return the first argument as result, used to simulate side effect
    function conseq() {
      return arguments.length ? Array.prototype.shift.call(arguments) : void 0;
    }

    function decrypt(buf, key) {
      var buflen = buf.length, keylen = keylen, i, byte, prev, old;
      for (i = 0; i < buflen; i++) {
        byte = old = buf[i];
        byte = (byte >> 4) | (byte << 4);
        byte = byte ^ (i & 0xFF) ^ key[i % keylen] ^ prev;
        prev = old;
        buf[i] = byte;
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
      _searchTextLen = (attrs.Encoding === 'UTF-16')
        ? function(buf, offset) {
          var bytes = new Uint16Array(buf, offset), len = 0, size = bytes.length;
        while (bytes[len++] !== 0 && len < size) { /* loop */ }
          return len * 2;
        }
        : function(buf, offset) {
          var bytes = new Uint8Array(buf, offset), len = 0, size = bytes.length;
        while (bytes[len++] !== 0 && len < size) { /* loop */ }
          return len;
        };
      _decoder = new TextDecoder(attrs.Encoding);

      if (parseInt(attrs.GeneratedByEngineVersion, 10) >= 2.0) {
        _v2 = true;

        _readNum = function(scanner) {
          scanner.forward(4);
          return scanner.readInt();
        };
        _readShort = function(scanner) { return scanner.readUint16(); };
        _checksum_v2 = function(scanner) { return scanner.checksum(); };
      }

    }

    function Scanner(buf) {
      var offset = 0;

      var methods = {
        forward: function(len) { return offset += len; },
        offset: function() { return offset; },
        slice: function(len) {
          return conseq(buf.slice(offset, offset + len), this.forward(len));
        },

        readInt: function() {
          return conseq(new DataView(buf, offset, 4).getUint32(0, false), this.forward(4));
        },
        readUint16: function() {
          return conseq(new DataView(buf, offset, 2).getUint16(0, false), this.forward(2));
        },
        readUint8: function() {
          return conseq(new DataView(buf, offset, 1).getUint8(0, false), this.forward(1));
        },
        readUTF16: function(len) {
          return conseq(UTF_16LE.decode(buf.slice(offset, offset + len)), this.forward(len));
        },
        readText: function(len, tail) {
          if (arguments.length) {
            return conseq(_decoder.decode(buf.slice(offset, offset + len)), this.forward(len + (tail || 0)));
          } else { // NUL-tailed string
            len = _searchTextLen(buf, offset);
            return conseq(_decoder.decode(buf.slice(offset, offset + len)), this.forward(len));
          }
        },
        readShort: function() { return _readShort(this); },
        readNum: function()   { return _readNum(this); },
        checksum: function() {
          // skip checksum
          // return this.readInt();

          return conseq(new Uint8Array(buf, offset, 4), this.forward(4));
        },
        checksum_v2: function() { return _checksum_v2(this); },

        readBlock: function(len) {
          var comp_type = new Uint8Array(buf, offset, 1)[0];
          if (comp_type === 0) {
            if (_v2) { this.forward(8); }
            return this;
          } else {
            this.forward(8);
            var tmp = this.slice(len - 8);
            tmp = comp_type === 2 ? pako.inflate(tmp) : lzo1x.decompress(tmp);
            return Scanner(tmp.buffer);
          }
        },
      };

      return Object.create(methods);
    }

    function toXml(str) {
      if (window.DOMParser) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
      } else {
        var obj = new ActiveXObject('Microsoft.XMLDOM');
        obj.loadXML(str);
        return obj;
      }
    }

    function read_header_sect(input, len) {
      var scanner = new Scanner(input);
      header_str = scanner.readUTF16(len).replace(/\0$/, ''); // need to remove endding NUL

      // parse dictionary attributes
      var xml = toXml(header_str).querySelector('Dictionary').attributes,
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

    function read_keyword_sect(input, attrs) {
      var scanner = Scanner(input);
      return {
        num_blocks: scanner.readNum(),
        num_entries: scanner.readNum(),
        key_index_decomp_len: _v2 && scanner.readNum(),
        key_index_comp_len: scanner.readNum(),
        key_blocks_len: scanner.readNum(),
        chksum: scanner.checksum_v2(),
        len: scanner.offset(),
      };
    }

    function read_keyword(input, attrs, keyword_sect, unit) {
      var scanner = Scanner(input),
          kscanner = scanner.readBlock(keyword_sect.key_index_comp_len),
          kx, pos = START_KEY_BLOCK;
      keyword_index = [];
      pos = 0;
      for (i = 0; i < keyword_sect.num_blocks; i++) {
        kx = read_keyword_index(kscanner, unit);
        kx.offset = pos;
        pos += kx.comp_size;
        keyword_index.push(kx);
      }
      START_RECORD_BLOCK = pos;

      console.log(keyword_index);

      return keyword_index;
    }

    function read_keyword_index(scanner, unit) {
      var size, tail = unit > 1 ? 0 : 1;
      return {
        num_entries: scanner.readNum(),
        first_size: size = scanner.readShort(),
        first_word: scanner.readText(size * unit, tail),
        last_size: size = scanner.readShort(),
        last_word: scanner.readText(size * unit, tail),
        comp_size: scanner.readNum(),
        decomp_size: scanner.readNum(),
      };
    }

    function read_key_block(input, kx) {
      var scanner = Scanner(input.slice(kx.offset, kx.offset + kx.comp_size)), i, kb;
      scanner = scanner.readBlock(kx.comp_size);
      console.log('mdx size:   ' + kx.decomp_size);
      for (i = 0; i < kx.num_entries; i++) {
        kb = {
          offset: scanner.readNum(),
          key: scanner.readText(),
        }
        i === 0 && console.log(' * ' + i, kb);
      }
      console.log(' * ' + i, kb);
    }

    function readPartial(offset, len) {
      var reader = new FileReader(), will = $.Deferred();

      reader.onload = function() { will.resolve(reader.result); };
      console.log('slice: ', offset, ' + ', len);
      reader.readAsArrayBuffer(file.slice(offset, offset + len));

      return will.promise({
        call: function(proc /* , args... */) {
          var args = Array.prototype.slice.call(arguments, 1),
              future = $.Deferred();
          will.done(function (input) {
              args.unshift(input);
              future.resolve(proc.apply(null, args), input);
            });
          return future.promise();
        }
      });
    }

    function read_file_head(input) {
      return new Scanner(input).readInt();
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

        var keyword_sect = read_keyword_sect(input.slice(len + 4), attrs);
        console.log('keyword_sect: ', keyword_sect);

        pos += keyword_sect.len;
        len = keyword_sect.key_index_comp_len + keyword_sect.key_blocks_len;

        START_KEY_BLOCK = pos + keyword_sect.key_index_comp_len;
        START_RECORD_BLOCK = pos + len;

        var unit = (attrs.Encoding === 'UTF-16') ? 2 : 1;
        readPartial(pos, len).call(read_keyword, attrs, keyword_sect, unit)
          .done(function(keyword_index, input) {
              var i = 0, size = keyword_index.length;
              input = input.slice(keyword_sect.key_index_comp_len);
              for (; i < size; i++) {
                read_key_block(input, keyword_index[i]);
                console.log('key block #' + i);
              }
            })
          .done(function() {
              willDone.resolve(lookup);
            });

      });
    });

    function lookup(word) {
      var kx,
        lo = 0,
        hi = keyword_index.length - 1,
        a = (lo + hi) >> 1;

      word = word.toLowerCase();
      while (true) {
        kx = keyword_index[a];
        if (lo === hi) {
          break;
        }
        if (word.localeCompare(kx.first_word) < 0) {
          hi = a;
        } else if (word.localeCompare(kx.last_word) > 0) {
          lo = a;
        } else {
          break;
        }
        a = (lo + hi) >> 1;
      }
      console.log(kx);

      // NEED TO ADJUST
      // readPartial(kx.offset, kx.comp_size).call(read_key_block, attrs, kx).done(function() {});

    };

    return willDone;
  };
}));

var $input = $('input');

$input.on('change', accept);

function accept(e) {
  var $src = $(e.target);
  var fileList = $src.prop('files');


  if (fileList.length > 0) {
    require(['mdictjs'], function(mdictjs) {
      mdictjs(fileList[0]).done(function(lookup) {
        lookup('ament');
      });
    });
  };

}
