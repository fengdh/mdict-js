DataView.prototype.getInt64 = function (byteOffset, litteEndian) {
	return (this.getInt32(byteOffset, litteEndian) << 32) |
		this.getInt32(byteOffset + 4, litteEndian);
}

// TODO - fix me
DataView.prototype.setInt64 = function (byteOffset, value, litteEndian) {
	return (this.setInt32(byteOffset, value >> 32, litteEndian));
}

DataView.prototype.getUint64 = function (byteOffset, litteEndian) {
	return (this.getUint32(byteOffset, litteEndian) << 32) |
		this.getUint32(byteOffset + 4, litteEndian);
}

// TODO - fix me
DataView.prototype.setUint64 = function (byteOffset, value, litteEndian) {
	return (this.setUint32(byteOffset, value >> 32, litteEndian));
}

Array.prototype.chunk = function(chunkSize) {
    var array=this;
    return [].concat.apply([],
        array.map(function(elem,i) {
            return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
        })
    );
}

function BitString(expr, options) {
	this.expr = expr;
	this.options = options || {};
	this.types = [];
	this.cache = {};
	this.byteLength = 0;
	(this.options.compile || true) && this.compile();
}

BitString.UNPACK_OP = 0;
BitString.PACK_OP = 1;
BitString.SPECIFIER_SEPARATOR = "-";
BitString.ATTR_SEPARATOR = ":";
BitString.SPECIFIER_DELIMITER = "/";
BitString.SEGMENT_DELIMITER = ",";

BitString.util = {
	dvdup: function (buffer, newSize) {
		var oldbuf = new Uint8Array(buffer);
		var newbuf = new Uint8Array(new ArrayBuffer(newSize));
		for(var i = 0, l = oldbuf.length; i<l; ++i) {
			newbuf[i] = oldbuf[i];
		}

		return new DataView(newbuf.buffer);
	}
  ,	str2dv: function (str) {
		var buf = new ArrayBuffer(str.length); // 2 bytes for each char
		var bufView = new Uint8Array(buf);
		for (var i=0, strLen=str.length; i<strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}

		return new DataView(buf);
	}
}

BitString.prototype.compile = function () {
	var segs = this.expr.split(BitString.SEGMENT_DELIMITER);
	for (var i = 0, len = segs.length; i < len; ++i) {
		var tks, attrs, specs, specs_attrs, t;
		tks = segs[i].split(BitString.SPECIFIER_DELIMITER);
		specs = tks[1] || "";
		attrs = tks[0].split(BitString.ATTR_SEPARATOR);
		specs_attrs = specs.split(BitString.SPECIFIER_SEPARATOR) || [];

		t = {
		   spec: attrs[1]
		 , size: parseInt(attrs[1] != "_" ? attrs[1] : 0)
		 , value: attrs[0]
		 , unit: this.unit(specs)
		 , ref: false
		 , sign: "Uint"
		};

		if (specs_attrs.indexOf("signed") >= 0 ||
			specs_attrs.indexOf("int") >= 0) {
			t.sign = "Int";
		}

		if (specs_attrs.indexOf("int") >= 0) {
			t.size = 4;
			t.unit = 0;
		}

		if (isNaN(t.size) && this.cache[t.spec] == 0) {
			t.ref = true;
		}

		this.byteLength += (t.size || 0);

		this.types.push(t);
		this.cache[t.value] = 0;
	}
}

BitString.prototype.unit = function (specifiers) {
	var att = specifiers.split(BitString.ATTR_SEPARATOR)
	  , has_attr = att.length == 2;

	s = has_attr ? parseInt(att[1]) : att[0];
	return !has_attr ? (s == "char" ? 1 :
		  	(s == "int" ? 4 :
		  	(s == "double" ? 8 :
		  		0))) : s;
}
BitString.prototype.__op = function (str, mode) {
	var view, o, util = BitString.util;

	if (mode == BitString.UNPACK_OP) {
		view = util.str2dv(str);
		o = {};
	} else {
		view = new DataView(new ArrayBuffer(this.byteLength));
		o = str;
	}

	var ofs = 0
	  , t = this.types
	  , le = !this.options.bigEndian;

	for (var i=0, len=t.length; i<len; ++i) {
		var l = t[i].size
		  , v = t[i].value
		  , u = t[i].unit
		  , ref = t[i].ref
		  , s = t[i].sign
		  , j = 0, iter = u*l || 1, inc = (u ? u : l)
		  , val = o[v], vop = null;

		if (ref) {
			t[i].size = o[t[i].spec];
			l = t[i].size;
			iter = u*l;
			if (mode)
				view = util.dvdup(view.buffer,
					view.buffer.byteLength + iter);
		}

		if (l) {
			vop = (!mode ? "get" : "set") + s + inc*8;
		}

		do {
			if (!mode) {
				val = (vop ? view[vop](ofs, le) : str.substr(ofs));
				if (u)
					(o[v] = o[v] || []).push(val);
				else
					(o[v] = val);
			} else if (l) {
				view[vop](ofs, !u ? o[v] : o[v][j], le);
			}

			ofs += inc;
			--iter;
			++j;
		} while (iter);

		this.cache[v] = val;
	}
	return (!mode ? o :
		String.fromCharCode.apply(null,
			new Uint8Array(view.buffer)));
}

BitString.prototype.unpack = function (str) {
	return this.__op(str, BitString.UNPACK_OP);
}

BitString.prototype.pack = function (values) {
	return this.__op(values, BitString.PACK_OP);
}