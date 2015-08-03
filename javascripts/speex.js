// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };
  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };
  Module['load'] = function load(f) {
    globalEval(read(f));
  };
  Module['arguments'] = process['argv'].slice(2);
  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }
  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  this['Module'] = Module;
  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  if (typeof console !== 'undefined') {
    Module['print'] = function print(x) {
      console.log(x);
    };
    Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];
// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (type == 'i64' || type == 'double' || vararg) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }), name_: "" };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    return Runtime.asmConstCache[code] = eval('(function(' + args.join(',') + '){ ' + Pointer_stringify(code) + ' })'); // new Function does not allow upvars in node
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;
      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }
      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0
}
Module['stringToUTF16'] = stringToUTF16;
// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0
}
Module['stringToUTF32'] = stringToUTF32;
function demangle(func) {
  try {
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++; // ignore const
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        if (func[i] === 'C') { // constructor
          parts.push(parts[parts.length-1]);
          i += 2;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    var first = true;
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] === 'N') {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      } else {
        // not namespaced
        if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      }
      first = false;
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}
function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}
function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk
function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited
var runtimeInitialized = false;
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math['imul']) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
var memoryInitializer = null;
// === Body ===
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 14688;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });
var _stderr;
var _stderr=_stderr=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
/* memory initializer */ allocate([0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,120,4,0,0,0,0,128,191,96,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,120,4,0,0,0,0,128,191,192,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,96,4,0,0,0,0,128,191,112,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,191,36,0,0,0,0,0,0,0,36,0,0,0,112,0,0,0,192,0,0,0,96,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,154,153,121,64,0,0,32,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,64,0,0,32,64,0,0,0,64,154,153,153,63,0,0,0,63,0,0,0,0,0,0,0,191,51,51,51,191,205,204,76,191,102,102,102,191,0,0,128,191,0,0,32,65,0,0,208,64,102,102,166,64,0,0,144,64,154,153,121,64,0,0,96,64,0,0,64,64,0,0,32,64,51,51,19,64,102,102,230,63,0,0,128,63,0,0,48,65,205,204,12,65,0,0,240,64,0,0,208,64,0,0,160,64,154,153,121,64,154,153,121,64,154,153,121,64,0,0,96,64,0,0,64,64,0,0,128,63,0,0,48,65,0,0,48,65,102,102,30,65,0,0,8,65,0,0,224,64,0,0,192,64,0,0,144,64,0,0,128,64,0,0,128,64,0,0,128,64,0,0,0,64,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,24,65,0,0,8,65,0,0,0,65,0,0,224,64,0,0,192,64,0,0,160,64,0,0,64,64,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,24,65,0,0,8,65,0,0,224,64,0,0,192,64,0,0,160,64,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,205,204,28,65,0,0,24,65,0,0,240,64,0,0,224,64,0,0,144,64,205,204,108,64,0,0,64,64,0,0,32,64,0,0,0,64,102,102,230,63,0,0,192,63,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,0,0,48,65,0,0,48,65,0,0,24,65,0,0,8,65,0,0,240,64,0,0,192,64,0,0,160,64,154,153,121,64,0,0,64,64,0,0,0,64,0,0,128,63,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,24,65,51,51,11,65,154,153,249,64,0,0,224,64,0,0,208,64,0,0,128,64,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,0,0,48,65,205,204,28,65,0,0,240,64,0,0,176,64,0,0,0,0,5,0,0,0,8,0,0,0,96,32,0,0,8,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,4,0,0,0,32,41,0,0,4,0,0,0,0,0,0,0,0,0,0,0,20,0,0,0,2,0,0,0,96,37,0,0,5,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,5,0,0,0,32,27,0,0,7,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,4,0,0,0,224,39,0,0,5,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,8,0,0,0,32,31,0,0,6,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,4,0,0,0,80,21,0,0,5,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,5,0,0,0,80,17,0,0,7,0,0,0,1,0,0,0,0,0,0,0,160,5,0,0,16,0,0,0,248,54,0,0,1,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,20,0,0,0,18,0,0,0,8,0,0,0,0,0,0,0,72,6,0,0,16,0,0,0,72,53,0,0,2,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,6,0,0,0,20,0,0,0,18,0,0,0,8,0,0,0,0,0,0,0,176,8,0,0,2,0,0,0,152,49,0,0,0,0,0,0,4,0,0,0,8,0,0,0,8,0,0,0,12,0,0,0,2,0,0,0,2,0,0,0,4,0,0,0,10,0,0,0,14,0,0,0,0,0,0,0,0,5,0,0,144,4,0,0,200,4,0,0,0,0,0,0,34,55,67,188,212,125,64,61,171,7,28,190,47,54,29,63,47,54,29,63,171,7,28,190,212,125,64,61,132,15,5,189,155,20,176,61,167,51,81,190,167,202,118,63,64,166,85,62,81,113,247,188,34,142,208,187,34,142,208,187,81,113,247,188,64,166,85,62,167,202,118,63,167,51,81,190,155,20,176,61,132,15,5,189,0,0,0,0,0,5,0,0,160,0,0,0,40,0,0,0,8,0,0,0,102,102,102,63,154,153,25,63,23,183,81,57,102,102,102,63,0,0,0,0,176,0,0,0,120,0,0,0,64,0,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1,0,0,0,8,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,6,0,0,0,7,0,0,0,7,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,240,2,0,0,5,0,0,0,0,0,0,0,144,4,0,0,64,1,0,0,80,0,0,0,8,0,0,0,102,102,102,63,154,153,25,63,23,183,81,57,51,51,51,63,0,0,0,0,176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,8,1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,4,0,0,0,0,0,63,79,0,0,0,255,255,255,255,0,0,0,0,3,0,0,0,1,0,0,0,6,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,80,9,0,0,2,0,0,0,2,0,0,0,72,4,0,0,205,204,204,61,236,1,0,0,255,255,255,255,0,0,0,0,3,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,80,9,0,0,2,0,0,0,2,0,0,0,208,3,0,0,205,204,76,62,108,1,0,0,255,255,255,255,0,0,0,0,3,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,4,0,0,0,4,0,0,0,80,9,0,0,2,0,0,0,2,0,0,0,72,4,0,0,154,153,153,62,44,1,0,0,255,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,4,0,0,0,96,9,0,0,2,0,0,0,2,0,0,0,24,4,0,0,102,102,230,62,220,0,0,0,255,255,255,255,0,0,0,0,1,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,4,0,0,0,112,9,0,0,2,0,0,0,2,0,0,0,48,4,0,0,205,204,12,63,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,4,0,0,0,4,0,0,0,64,9,0,0,2,0,0,0,2,0,0,0,232,3,0,0,154,153,25,63,119,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,6,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,128,191,43,0,0,0,160,0,0,0,40,0,0,0,10,0,0,0,17,0,0,0,144,0,0,0,102,102,102,63,154,153,25,63,23,183,81,57,0,0,0,0,120,8,0,0,64,8,0,0,8,8,0,0,208,7,0,0,152,7,0,0,96,7,0,0,40,7,0,0,240,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,1,0,0,0,8,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,208,25,0,0,5,0,0,0,0,0,0,0,0,0,0,0,208,23,0,0,7,0,0,0,7,0,0,0,0,0,0,0,208,25,0,0,5,0,0,0,7,0,0,0,0,0,0,0,208,25,0,0,5,0,0,0,7,0,0,0,0,0,0,0,10,215,163,61,225,41,164,61,87,33,165,61,123,190,166,61,63,0,169,61,29,230,171,61,21,112,175,61,161,157,179,61,47,109,184,61,190,222,189,61,187,240,195,61,161,162,202,61,220,242,209,61,97,224,217,61,156,105,226,61,252,140,235,61,115,73,245,61,233,156,255,61,162,66,5,62,122,0,11,62,238,6,17,62,55,85,23,62,192,233,29,62,126,195,36,62,101,225,43,62,36,66,51,62,176,228,58,62,50,199,66,62,159,232,74,62,166,71,83,62,113,226,91,62,179,183,100,62,214,197,109,62,74,11,119,62,61,67,128,62,202,26,133,62,128,11,138,62,119,20,143,62,227,52,148,62,219,107,153,62,82,184,158,62,126,25,164,62,84,142,169,62,9,22,175,62,113,175,180,62,192,89,186,62,203,19,192,62,165,220,197,62,66,179,203,62,183,150,209,62,215,133,215,62,183,127,221,62,73,131,227,62,96,143,233,62,240,162,239,62,14,189,245,62,140,220,251,62,46,0,1,63,169,19,4,63,82,40,7,63,113,61,10,63,143,82,13,63,56,103,16,63,179,122,19,63,156,140,22,63,90,156,25,63,105,169,28,63,49,179,31,63,61,185,34,63,6,187,37,63,246,183,40,63,134,175,43,63,64,161,46,63,143,140,49,63,252,112,52,63,1,78,55,63,41,35,58,63,221,239,60,63,183,179,63,63,34,110,66,63,184,30,69,63,244,196,71,63,112,96,74,63,166,240,76,63,33,117,79,63,124,237,81,63,67,89,84,63,15,184,86,63,108,9,89,63,245,76,91,63,69,130,93,63,248,168,95,63,186,192,97,63,21,201,99,63,181,193,101,63,88,170,103,63,136,130,105,63,2,74,107,63,113,0,109,63,148,165,110,63,38,57,112,63,195,186,113,63,57,42,115,63,68,135,116,63,179,209,117,63,66,9,119,63,174,45,120,63,213,62,121,63,134,60,122,63,141,38,123,63,202,252,123,63,10,191,124,63,59,109,125,63,45,7,126,63,223,140,126,63,30,254,126,63,217,90,127,63,18,163,127,63,182,214,127,63,165,245,127,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,223,166,127,63,225,155,126,63,156,223,124,63,113,115,122,63,20,89,119,63,192,146,115,63,54,35,111,63,153,13,106,63,151,85,100,63,113,255,93,63,191,15,87,63,139,139,79,63,121,120,71,63,110,220,62,63,249,189,53,63,251,35,44,63,253,21,34,63,237,155,23,63,115,190,12,63,219,134,1,63,71,255,235,62,236,104,212,62,77,102,188,62,5,26,164,62,11,180,139,62,143,251,102,62,123,247,55,62,80,140,12,62,100,4,212,61,0,0,128,63,225,69,127,63,202,26,125,63,144,136,121,63,69,158,116,63,59,112,110,63,80,25,103,63,2,183,94,63,102,107,85,63,222,89,75,63,21,169,64,63,0,0,0,0,206,223,116,63,34,224,244,191,206,223,116,63,218,230,118,63,151,226,246,191,218,230,118,63,99,156,119,63,15,156,247,191,99,156,119,63,253,135,124,63,186,131,252,191,253,135,124,63,174,71,97,63,174,71,225,191,174,71,97,63,0,0,0,0,0,0,128,63,52,162,244,191,33,60,106,63,0,0,128,63,94,162,246,191,3,67,110,63,0,0,128,63,255,120,247,191,229,126,111,63,0,0,128,63,4,115,252,191,128,43,121,63,0,0,128,63,41,92,175,191,186,73,204,62,0,0,0,0,220,194,6,247,246,242,200,23,1,230,23,208,239,12,8,249,23,29,220,228,250,227,239,251,40,23,10,10,210,243,36,6,4,226,227,62,32,224,255,22,242,1,252,234,211,2,54,4,226,199,197,244,27,253,225,8,247,5,10,242,32,66,19,9,2,231,219,23,241,18,218,225,5,247,235,15,0,22,62,30,15,244,242,210,77,21,33,3,34,29,237,50,2,11,9,218,244,219,62,1,241,54,32,6,2,232,20,35,235,2,19,24,243,55,4,9,39,237,30,255,235,73,54,33,8,18,3,15,6,237,209,6,253,208,206,1,26,20,8,233,206,65,242,201,239,225,219,228,53,255,239,203,1,57,11,248,231,226,219,64,5,204,211,15,23,31,15,14,231,24,33,254,212,200,238,6,235,213,4,244,17,219,20,246,34,15,2,15,55,21,245,225,250,46,25,16,247,231,248,194,28,17,20,224,227,26,30,25,237,2,240,239,26,205,2,50,42,19,190,23,29,254,3,19,237,219,32,15,6,30,222,13,11,251,40,31,10,214,4,247,26,247,186,17,254,233,20,234,201,51,232,225,22,234,15,243,3,246,228,240,56,4,193,11,238,241,238,218,221,16,249,34,255,235,207,209,9,219,7,8,69,55,20,6,223,211,246,247,6,247,12,71,15,253,214,249,232,32,221,254,214,239,251,0,254,223,202,13,244,222,47,23,19,55,7,248,74,31,14,16,233,230,19,12,238,207,228,225,236,2,242,236,209,78,40,13,233,245,21,250,18,1,47,5,38,35,32,46,22,8,13,16,242,18,51,19,40,39,11,230,255,239,47,2,203,241,31,234,38,21,241,240,5,223,53,15,218,86,11,253,232,49,13,252,245,238,28,20,244,229,230,35,231,221,253,236,195,30,10,201,244,234,204,202,242,19,224,244,45,15,248,208,247,11,224,8,240,222,243,51,18,38,254,224,239,22,254,238,228,186,59,27,228,237,246,236,247,247,248,235,21,248,35,254,45,253,247,12,0,30,7,217,43,27,218,165,30,26,19,201,252,63,14,239,13,9,13,2,7,4,6,61,72,255,239,29,255,234,239,8,228,219,63,44,41,3,2,14,9,250,75,248,249,244,241,244,13,9,252,30,234,191,15,0,211,4,252,1,5,22,11,23,39,12,242,236,227,195,189,180,224,185,189,68,77,46,34,5,243,208,210,184,175,172,196,198,216,228,82,93,68,45,29,3,237,209,228,213,221,226,248,243,217,165,165,133,160,10,10,250,238,201,196,165,200,220,229,240,208,181,40,28,246,228,35,9,37,19,1,236,225,215,238,231,221,188,176,45,27,255,47,13,0,227,221,199,206,177,183,218,237,5,35,14,246,233,16,248,5,232,216,194,233,229,234,240,238,210,184,179,43,21,33,1,176,186,186,192,200,204,217,223,225,218,237,237,241,32,33,254,7,241,241,232,233,223,215,200,232,199,5,89,64,41,27,5,247,209,196,159,159,132,236,247,212,183,31,29,252,64,48,7,221,199,0,253,230,209,253,250,216,180,177,208,12,81,55,10,9,232,213,183,199,187,16,5,228,203,18,29,20,0,252,245,6,243,23,7,239,221,219,219,226,188,193,6,24,247,242,3,21,243,229,199,207,176,232,215,251,240,251,1,45,25,12,249,3,241,250,240,241,248,6,243,214,175,176,169,14,1,246,253,213,187,210,232,228,227,36,6,213,200,244,12,54,79,43,9,54,22,2,8,244,213,210,204,218,187,167,251,75,38,33,5,243,203,194,169,167,143,157,201,222,219,62,55,33,16,21,254,239,210,227,218,218,208,217,214,220,181,184,168,208,226,21,2,241,199,192,158,172,180,25,1,210,176,244,18,249,3,34,6,38,31,23,4,255,20,14,241,213,178,165,232,14,253,54,16,0,229,228,212,200,173,164,167,253,34,56,41,36,22,20,248,249,221,214,194,207,3,12,246,206,169,160,190,92,70,38,9,186,185,194,214,217,213,245,249,206,177,198,206,225,32,31,250,252,231,7,239,218,186,198,229,213,173,228,59,36,20,31,2,229,185,176,147,158,181,223,224,225,254,33,15,250,43,33,251,0,234,246,229,222,207,245,236,215,165,156,135,217,57,41,10,237,206,218,197,196,186,238,236,248,225,248,241,1,242,230,231,33,21,32,17,1,237,237,230,198,175,221,234,45,30,11,245,3,230,208,169,189,173,198,3,255,230,236,44,10,25,39,5,247,221,229,218,7,10,4,247,214,171,154,129,52,44,28,10,209,195,216,217,239,255,246,223,214,182,208,21,252,70,52,10,232,21,236,5,251,249,14,246,2,229,16,236,0,224,26,19,8,245,215,31,28,229,224,34,42,34,239,22,246,13,227,18,244,230,232,11,22,5,251,251,54,188,213,57,231,24,4,4,26,248,244,239,54,30,211,1,10,241,18,215,11,68,189,37,240,232,240,38,234,6,227,30,66,229,5,7,240,13,2,244,249,253,236,36,4,228,9,3,32,48,26,39,3,0,7,235,243,5,174,249,73,236,34,247,251,1,255,10,251,246,255,9,1,247,10,0,242,11,255,254,255,11,20,96,175,234,244,247,198,9,24,226,26,221,27,244,13,238,56,197,15,249,23,241,255,6,231,14,234,236,47,245,16,2,38,233,237,226,247,40,245,5,4,250,8,26,235,245,127,4,1,6,247,2,249,254,253,7,251,10,237,7,150,91,253,9,252,21,248,26,176,8,1,254,246,239,239,229,32,71,6,227,11,233,54,218,29,234,39,87,225,244,236,3,254,254,2,20,0,255,221,27,9,250,244,3,244,250,13,1,14,234,197,241,239,231,13,249,7,3,0,1,249,6,253,61,219,233,233,227,38,225,27,1,248,2,229,23,230,36,222,5,24,232,250,7,3,197,78,194,44,240,1,6,0,17,8,45,0,146,6,14,254,32,179,200,62,253,3,243,4,240,102,241,220,255,9,143,6,23,0,9,9,5,248,255,242,5,244,121,203,229,248,247,22,243,3,2,253,1,254,185,95,38,237,15,240,251,71,10,2,224,243,251,15,255,254,242,171,30,29,6,3,2,0,0,0,0,0,0,0,0,2,191,200,247,18,18,23,242,254,0,12,227,26,244,1,2,244,192,90,250,4,1,5,251,146,253,225,22,227,9,0,8,216,251,21,251,251,13,10,238,40,1,35,236,30,228,11,250,19,7,14,18,192,9,250,16,51,68,8,16,12,248,0,247,20,234,25,7,252,243,41,221,93,238,202,11,255,1,247,4,190,66,225,20,234,25,233,11,10,9,19,15,11,251,225,246,233,228,250,250,253,252,5,3,228,22,245,214,25,231,240,41,34,47,250,2,42,237,234,5,217,32,6,221,22,17,226,8,230,245,245,3,244,33,33,219,21,255,6,252,3,0,251,5,12,244,57,27,195,253,20,239,2,0,4,0,254,223,198,81,233,39,246,251,2,6,249,5,4,253,254,243,233,184,107,15,251,0,249,253,250,5,252,15,47,12,225,25,240,8,22,231,194,200,238,14,28,12,2,245,74,190,41,236,249,16,236,16,248,0,240,4,237,92,12,197,242,217,49,231,240,23,229,19,253,223,19,85,227,6,249,246,16,249,244,1,250,2,4,254,64,10,231,41,254,225,15,0,110,50,69,35,28,19,246,2,213,207,200,241,240,10,3,12,255,248,1,26,244,255,7,245,229,41,25,1,245,238,22,249,255,209,248,23,253,239,249,18,131,59,251,3,18,1,2,3,27,221,65,203,50,210,37,235,228,7,14,219,251,251,12,5,248,78,237,21,250,240,8,249,5,2,7,2,10,250,12,196,44,11,220,224,31,0,2,254,2,1,253,7,246,17,235,10,6,254,19,254,59,218,170,38,8,215,226,211,223,7,15,28,29,249,24,216,7,7,5,254,9,24,233,238,6,227,30,2,28,49,245,210,10,43,243,247,255,253,249,249,239,250,97,223,235,3,5,1,12,213,248,28,7,213,249,17,236,19,255,2,243,9,54,34,9,228,245,247,239,110,197,44,230,0,3,244,209,73,222,213,38,223,16,251,210,252,250,254,231,19,227,28,243,5,14,27,216,213,4,32,243,254,221,252,112,214,9,244,37,228,17,14,237,35,217,23,3,242,255,199,251,94,247,3,217,5,30,246,224,42,243,242,159,193,30,247,1,249,12,5,20,17,247,220,226,25,47,247,241,12,234,98,248,206,15,229,21,240,245,2,12,246,10,253,33,36,160,0,239,31,247,9,3,236,13,245,8,252,10,246,9,1,112,186,229,5,235,2,199,253,227,10,19,235,21,246,190,253,91,221,30,244,0,249,59,228,26,2,14,238,1,1,11,17,20,202,197,27,4,29,32,5,19,12,252,1,7,246,5,254,10,0,23,251,28,152,46,11,16,3,29,1,248,242,1,7,206,88,194,26,8,239,242,50,0,32,244,253,229,18,248,251,8,3,236,245,37,244,9,33,46,155,255,252,1,6,255,28,214,241,16,5,255,254,201,85,38,247,252,11,254,247,250,3,236,246,179,89,24,253,152,199,230,225,236,250,247,14,20,233,46,241,225,28,1,241,254,6,254,31,45,180,23,231,253,254,255,0,252,5,35,216,247,13,212,5,229,255,249,6,245,7,248,7,19,242,15,252,9,246,10,248,10,247,255,1,0,0,2,5,238,22,203,50,1,233,50,220,15,3,243,14,246,6,1,5,253,4,254,5,224,25,5,254,255,252,1,11,227,26,250,241,30,238,0,15,239,40,215,3,9,254,254,3,253,255,251,2,21,250,240,235,23,2,60,15,16,240,247,14,9,255,7,247,0,1,1,0,255,250,17,228,54,211,255,1,255,250,250,2,11,26,227,254,46,235,34,12,233,32,233,16,246,3,66,19,236,24,7,11,253,0,253,255,206,210,2,238,253,4,255,254,3,253,237,41,220,9,11,232,21,240,9,253,231,253,10,18,247,254,251,255,251,6,252,253,2,230,21,237,35,241,7,243,17,237,39,213,48,225,16,247,7,254,251,3,252,9,237,27,201,63,221,10,26,212,254,9,4,1,250,8,247,5,248,255,253,240,45,214,5,15,240,10,0,0,0,0,0,0,0,0,0,0,240,24,201,47,218,27,237,7,253,1,16,27,20,237,18,5,249,1,251,2,250,8,234,0,253,253,8,255,7,248,1,253,5,0,17,208,58,204,29,249,254,3,246,6,230,58,225,1,250,3,93,227,39,3,17,5,6,255,255,255,27,13,10,19,249,222,12,10,252,9,180,9,8,228,254,245,2,255,3,1,173,38,217,4,240,250,254,251,5,254,201,213,22,56,65,158,235,184,16,166,231,184,119,74,146,57,58,2,113,57,175,17,28,186,232,119,200,185,171,49,149,58,1,41,11,58,133,42,2,187,236,172,35,186,2,17,84,59,176,141,22,58,0,124,163,187,40,132,135,185,79,104,241,59,26,178,254,185,23,37,44,188,13,88,248,58,129,27,111,60,184,89,141,187,222,96,163,188,140,200,7,60,205,127,222,60,17,94,115,188,154,54,26,189,97,167,216,60,35,13,99,61,14,182,80,189,160,70,200,189,209,141,13,62,250,145,235,62,250,145,235,62,209,141,13,62,160,70,200,189,14,182,80,189,35,13,99,61,97,167,216,60,154,54,26,189,17,94,115,188,205,127,222,60,140,200,7,60,222,96,163,188,184,89,141,187,129,27,111,60,13,88,248,58,23,37,44,188,26,178,254,185,79,104,241,59,40,132,135,185,0,124,163,187,176,141,22,58,2,17,84,59,236,172,35,186,133,42,2,187,1,41,11,58,171,49,149,58,232,119,200,185,175,17,28,186,58,2,113,57,119,74,146,57,16,166,231,184,65,158,235,184,201,213,22,56,132,211,122,63,222,84,164,63,80,83,215,63,153,18,13,64,190,217,56,64,143,54,114,64,33,176,158,64,141,238,207,64,126,58,8,65,178,128,50,65,54,229,105,65,29,61,153,65,166,202,200,65,234,140,3,66,125,95,44,66,16,221,97,66,224,224,224,0,228,189,251,33,214,250,224,18,199,246,202,35,240,27,215,42,19,237,216,36,211,24,235,40,248,242,238,28,1,14,198,53,238,168,217,39,218,21,238,37,237,20,213,38,10,17,208,54,204,198,243,33,212,255,245,32,244,245,222,22,14,0,210,46,219,221,222,5,231,44,226,43,6,252,193,49,225,43,215,43,233,30,213,41,213,26,242,44,223,1,243,27,243,18,219,37,210,183,211,34,220,24,231,34,220,245,236,19,231,12,238,33,220,187,197,34,211,6,8,46,234,242,232,18,255,13,212,44,217,208,230,15,224,31,219,34,223,15,210,31,232,30,220,37,215,31,233,41,206,22,252,50,234,2,235,28,239,30,222,40,249,196,228,29,218,42,228,42,212,245,21,43,240,8,212,34,217,201,213,21,245,221,26,41,247,0,222,29,248,121,175,113,7,240,234,33,219,33,225,36,229,249,220,17,222,70,199,65,219,245,208,21,216,17,255,44,223,6,250,33,247,0,236,34,235,69,223,57,227,33,225,35,201,12,255,49,223,27,234,35,206,223,209,17,206,54,51,94,255,251,212,35,252,22,216,45,217,190,231,24,223,1,230,20,232,233,231,12,245,21,211,44,231,211,237,17,213,105,240,82,5,235,1,41,240,11,223,30,243,157,252,57,219,33,241,44,231,37,193,54,220,24,225,31,203,200,218,26,215,252,4,37,223,13,226,24,49,52,162,114,251,226,241,23,1,38,216,56,233,12,220,29,239,40,209,51,219,215,217,11,207,34,0,58,238,249,252,34,240,17,229,35,30,5,194,65,4,48,188,76,213,11,245,38,238,19,241,41,233,194,217,23,214,10,254,41,235,243,243,25,247,13,209,42,233,194,232,24,212,60,235,58,238,253,204,32,234,22,220,34,181,57,16,90,237,3,10,45,227,23,218,32,251,194,205,38,205,40,238,53,214,13,232,32,222,14,236,30,200,181,230,37,230,32,15,59,230,17,227,29,249,28,204,53,244,226,5,30,251,208,251,35,2,2,213,40,21,16,16,75,231,211,224,10,213,18,246,42,9,0,255,52,255,7,226,36,19,208,252,48,228,25,227,32,234,0,225,22,224,17,246,36,192,215,194,36,204,15,16,58,226,234,224,6,249,9,218,36,224,224,224,0,225,198,240,22,215,232,213,14,200,234,201,29,243,33,215,47,252,217,247,29,215,15,244,38,248,241,244,31,1,2,212,40,234,190,214,27,218,28,233,38,235,14,219,31,0,21,206,52,203,185,229,33,219,255,237,25,237,251,228,22,6,65,212,74,223,208,223,9,216,57,242,58,239,4,211,32,225,38,223,36,233,28,216,39,213,29,244,46,222,13,233,28,240,15,229,34,242,174,241,43,225,25,224,29,235,5,251,38,209,193,205,33,210,12,3,47,228,239,227,11,246,14,216,38,87,38,156,62,44,241,176,62,27,129,200,62,51,51,227,62,120,185,0,63,194,221,17,63,82,73,37,63,115,75,59,63,79,59,84,63,212,125,112,63,137,65,136,63,19,102,154,63,241,244,174,63,100,64,198,63,206,165,224,63,92,143,254,63,42,58,16,64,47,110,35,64,232,48,57,64,85,217,81,64,67,202,109,64,203,185,134,64,17,170,152,64,202,253,172,64,79,6,196,64,8,32,222,64,104,179,251,64,113,155,14,65,85,152,33,65,120,28,55,65,254,125,79,65,153,30,107,65,119,17,230,61,227,170,114,62,253,22,189,62,128,238,251,62,77,49,35,63,22,49,84,63,17,255,144,63,0,0,0,0,115,99,122,61,154,120,39,62,116,238,158,62,167,63,219,62,156,78,14,63,253,19,56,63,64,78,112,63,2,215,169,63,76,195,96,63,0,0,0,0,144,102,52,63,4,144,134,63,242,9,13,224,2,246,31,246,248,248,6,252,255,10,192,23,6,20,13,6,8,234,16,34,7,42,207,228,5,26,4,241,41,34,41,32,33,24,23,14,8,40,34,4,232,215,237,241,13,243,33,202,24,27,212,33,27,241,241,24,237,14,220,14,247,24,244,252,37,251,16,222,5,10,33,241,202,240,12,25,12,1,2,0,3,255,252,252,11,2,200,54,27,236,13,250,210,215,223,245,251,7,12,14,242,251,8,20,6,3,4,248,251,214,11,8,242,25,254,2,13,11,234,39,247,9,5,211,247,7,247,12,249,34,239,154,7,2,214,18,35,247,222,11,251,254,3,22,46,204,231,247,162,8,11,251,251,251,4,249,221,249,54,5,224,3,24,247,234,8,65,37,255,244,233,250,247,228,55,223,14,253,2,18,196,41,239,8,240,17,245,0,245,29,228,37,9,203,33,242,247,7,231,249,245,26,224,248,24,235,22,237,19,246,29,242,0,0,0,0,0,0,0,0,251,204,10,41,6,226,252,16,32,22,229,234,32,253,228,253,3,221,6,17,23,21,8,2,4,211,239,14,23,252,225,245,253,14,1,19,245,2,61,248,9,244,7,246,12,253,232,99,208,23,50,219,251,233,0,8,242,35,192,251,46,231,13,255,207,237,241,9,34,50,25,11,250,247,240,236,224,223,224,229,10,248,12,241,56,242,224,33,3,247,1,65,247,247,246,254,250,233,9,17,3,228,13,224,4,254,246,4,240,76,12,204,6,13,33,250,4,242,247,253,1,241,240,28,1,241,11,16,9,4,235,219,216,250,22,12,241,233,242,239,240,247,246,247,13,217,41,5,247,16,218,25,46,209,4,49,242,17,254,6,18,5,250,223,234,44,50,254,1,3,250,7,7,253,235,38,238,34,242,215,60,243,6,16,232,35,19,243,220,24,3,239,242,246,36,44,212,227,253,3,202,248,12,55,26,4,254,251,2,245,22,233,2,22,1,231,217,66,207,21,248,254,10,242,196,25,6,10,27,231,16,5,254,247,26,243,236,58,254,7,52,247,2,5,252,241,23,255,218,23,8,27,250,0,229,249,39,246,242,26,11,211,244,9,251,34,4,221,10,43,234,245,56,249,20,1,10,1,230,9,94,11,229,242,243,1,245,0,14,251,250,246,252,241,248,215,21,251,1,228,248,22,247,33,233,252,252,244,39,4,249,3,196,80,8,239,2,250,12,251,1,9,15,27,31,30,27,23,61,47,26,10,251,248,244,243,5,238,25,241,252,241,245,12,254,254,240,254,250,24,12,11,252,9,1,247,14,211,57,12,20,221,26,11,192,32,246,246,42,252,247,240,32,24,7,10,52,245,199,29,0,8,0,250,17,239,200,216,7,20,18,12,250,16,5,7,255,9,1,10,29,12,16,13,254,23,7,9,253,252,251,18,192,13,55,231,9,247,24,14,231,15,245,216,226,37,1,237,22,251,225,13,254,0,7,252,16,189,12,66,220,24,248,18,241,233,19,0,211,249,4,3,243,13,35,5,13,33,10,27,23,0,249,245,43,182,36,244,2,5,248,6,223,11,240,242,251,249,253,17,222,27,240,11,247,15,33,225,8,240,7,250,249,63,201,239,11,255,20,210,34,226,6,9,19,28,247,5,232,248,233,254,31,237,240,251,241,238,0,26,18,37,251,241,254,17,5,229,21,223,44,12,229,247,17,11,25,235,225,249,13,33,248,231,249,7,246,4,250,247,48,174,233,248,6,11,233,3,253,49,227,25,31,4,14,16,9,252,238,10,230,3,5,212,247,9,209,201,15,9,28,1,4,253,46,6,250,218,227,225,241,250,3,0,14,250,8,202,206,33,251,1,242,33,208,26,252,251,253,251,253,251,228,234,77,55,255,2,10,10,247,242,190,207,11,220,250,236,10,246,16,12,4,255,240,45,212,206,31,254,25,42,23,224,234,0,11,20,216,221,216,220,224,230,235,243,52,234,6,232,236,17,251,248,36,231,245,21,230,6,34,248,7,20,253,5,231,248,18,251,247,252,1,247,20,20,39,48,232,9,5,191,22,29,4,3,213,245,32,250,9,19,229,246,209,242,24,10,249,220,249,255,252,251,251,16,53,25,230,227,252,244,45,198,222,33,251,2,255,27,208,31,241,22,251,4,7,7,231,253,11,234,16,244,8,253,7,245,45,14,183,237,56,210,24,236,28,244,254,255,220,253,223,19,250,7,2,241,5,225,211,8,35,13,20,0,247,48,243,213,253,243,2,251,72,188,229,2,1,254,249,5,36,33,216,244,252,251,23,19,1,5,241,49,190,208,252,50,212,7,37,16,238,25,230,230,241,19,19,229,209,28,57,5,239,224,215,68,21,254,64,56,8,240,243,230,247,240,11,6,217,25,237,22,225,20,211,55,213,10,240,47,216,40,236,205,3,239,242,241,232,53,236,210,46,27,188,32,3,238,251,9,225,16,247,246,255,233,48,95,47,25,215,224,253,15,231,201,36,41,229,20,5,13,14,234,5,2,233,18,46,241,17,238,222,251,248,27,201,73,16,2,255,239,40,178,33,0,2,19,4,53,240,241,240,228,253,243,49,8,249,227,27,243,32,20,32,195,16,14,41,44,40,24,20,7,4,48,196,179,17,250,208,65,241,32,226,185,246,253,250,10,254,249,227,200,67,226,7,251,86,250,246,0,5,225,60,34,218,253,24,10,254,30,23,24,215,12,70,213,15,239,6,13,16,243,8,30,241,248,5,23,222,158,252,243,13,208,225,70,12,31,25,24,232,26,249,33,240,8,5,245,242,248,191,13,10,254,247,0,253,188,5,35,7,0,225,255,239,247,247,16,219,238,255,69,208,228,22,235,245,5,49,55,23,170,220,16,2,13,63,205,30,245,13,24,238,250,14,237,1,41,9,251,27,220,212,222,219,235,230,31,217,15,43,5,248,29,20,248,236,204,228,255,13,26,222,246,247,27,248,8,27,190,4,12,234,49,10,179,32,238,3,218,12,253,255,2,2,0,248,219,5,213,5,73,61,39,12,253,195,224,2,42,30,253,17,229,9,34,20,255,251,2,23,249,210,26,53,209,20,254,223,167,205,192,27,11,15,222,251,200,25,247,255,227,1,40,67,233,240,16,33,19,7,14,85,22,246,246,244,249,255,52,89,29,11,236,219,210,241,17,232,228,24,2,1,0,23,155,23,14,255,233,238,9,5,243,38,1,228,228,4,27,51,230,34,216,35,47,54,38,202,230,250,42,231,13,226,220,18,41,252,223,23,224,249,252,51,253,17,204,56,209,36,254,235,36,10,8,223,31,19,9,251,216,10,247,235,19,18,178,238,251,0,230,220,209,205,212,18,40,27,254,29,49,230,2,32,202,30,183,54,3,251,36,22,53,10,255,172,203,227,251,3,212,53,205,4,22,71,221,255,33,251,229,249,36,17,233,217,16,247,201,241,236,39,221,6,217,242,18,48,192,239,241,9,39,81,37,188,37,47,235,250,152,13,6,9,254,35,8,233,18,42,45,21,33,251,207,9,250,213,200,39,2,240,231,87,1,253,247,17,231,245,247,255,10,2,242,242,4,255,246,28,233,40,224,26,247,26,4,229,233,3,42,196,1,49,253,27,10,204,216,254,18,45,233,17,212,3,253,17,210,52,216,209,25,75,31,207,53,30,226,224,220,38,250,241,240,54,229,208,3,38,227,224,234,242,252,233,243,32,217,9,8,211,243,34,240,49,40,32,31,28,23,23,32,47,59,188,8,62,44,25,242,232,191,240,36,67,231,218,235,4,223,254,42,5,193,40,11,26,214,233,195,79,225,23,236,10,224,53,231,220,10,230,251,3,0,185,5,246,219,1,232,21,202,239,1,227,231,241,229,32,68,45,240,219,238,251,1,0,179,71,250,3,236,71,189,29,221,10,226,19,4,16,17,5,0,242,19,2,28,26,59,3,2,24,39,55,206,211,238,239,33,221,14,255,1,8,87,221,227,0,229,13,249,23,243,37,216,50,221,14,19,249,242,49,54,251,22,254,227,248,229,38,13,27,48,12,215,235,241,28,7,240,232,237,236,11,236,9,2,13,23,236,11,27,229,71,187,8,2,250,22,12,16,16,9,240,248,239,1,25,1,40,219,223,66,94,53,4,234,231,215,214,25,35,240,241,57,31,227,224,21,16,196,45,15,255,7,57,230,209,227,11,8,15,19,151,248,54,27,10,239,6,244,255,246,4,0,23,246,31,13,11,10,12,192,23,253,248,237,16,52,24,216,16,10,40,5,9,0,243,249,235,248,250,249,235,59,16,203,18,196,11,209,14,238,25,243,232,4,217,16,228,54,26,189,30,27,236,204,20,244,55,12,18,240,39,242,250,230,56,168,201,12,25,26,219,6,75,0,222,175,54,226,1,249,49,233,242,21,10,194,198,199,209,222,15,252,34,178,31,25,245,7,50,246,42,193,14,220,252,57,55,57,53,42,214,255,15,40,37,15,25,245,6,1,31,254,250,255,249,192,34,28,30,255,3,21,0,168,244,200,25,228,40,8,228,242,9,12,2,250,239,22,49,250,230,14,28,236,4,244,50,35,40,13,218,198,227,17,30,22,60,26,202,217,244,58,228,193,10,235,248,244,26,194,6,246,245,234,250,249,4,1,18,2,186,11,14,4,13,19,232,222,24,67,17,51,235,13,23,54,226,48,1,243,80,26,240,254,13,252,6,226,29,232,73,198,30,229,20,254,235,41,45,30,229,253,251,238,236,207,253,221,10,42,237,189,203,245,9,13,241,223,205,226,15,7,25,226,4,28,234,222,54,227,39,210,20,16,34,252,47,75,1,212,201,232,7,255,9,214,50,248,220,41,68,0,252,246,233,241,206,64,36,247,229,12,25,218,209,219,32,207,51,220,2,252,69,230,19,7,45,67,46,13,193,46,15,209,4,215,13,250,5,235,37,26,201,249,33,255,228,10,239,192,242,0,220,239,93,253,247,190,44,235,3,244,38,250,243,244,19,13,43,213,246,244,6,251,9,207,32,251,2,4,5,15,240,10,235,8,194,248,64,8,79,255,190,207,238,5,40,251,226,211,1,250,21,224,93,238,226,235,32,21,238,22,8,5,215,202,80,22,246,249,248,233,192,66,56,242,226,215,210,242,227,219,27,242,42,254,247,227,34,14,33,242,22,4,10,26,26,28,32,23,184,224,3,0,242,35,214,178,224,6,29,238,211,251,7,223,211,253,234,222,8,248,4,205,231,247,59,178,21,251,231,208,66,241,239,232,207,243,25,233,192,250,40,232,237,245,57,223,248,1,10,204,202,28,39,49,34,245,195,215,213,10,15,241,51,30,15,205,32,222,254,222,14,18,16,1,1,253,253,1,1,238,6,16,48,12,251,214,7,36,48,7,236,246,7,12,2,54,39,218,37,54,4,245,248,210,246,5,246,222,46,244,29,219,39,36,245,24,56,17,14,20,25,0,231,228,55,249,251,27,3,9,230,248,6,232,246,226,225,222,18,4,22,21,40,255,227,219,248,235,92,227,11,253,11,73,23,22,7,4,212,247,245,21,243,11,9,178,255,47,114,244,219,237,251,245,234,19,12,226,7,38,45,235,248,247,55,211,56,235,7,17,46,199,169,250,27,31,31,7,200,244,46,21,251,244,36,3,3,235,43,19,12,249,9,242,0,247,223,165,7,26,3,245,64,83,225,210,25,2,9,5,2,2,255,20,239,10,251,229,248,20,8,237,16,235,243,225,5,5,42,24,9,34,236,28,195,22,11,217,64,236,255,226,247,236,24,231,232,227,22,196,6,251,41,247,169,14,34,15,199,52,69,15,253,154,58,16,3,6,60,181,224,26,7,199,229,224,232,235,227,240,62,210,31,30,229,241,7,15,12,32,25,46,36,33,9,14,253,6,1,248,0,246,251,249,249,249,251,251,31,229,24,224,252,10,245,21,253,19,23,247,22,24,246,255,246,243,249,245,42,223,31,19,248,0,246,240,1,235,239,10,248,14,8,4,11,254,5,254,223,11,240,33,11,252,9,252,11,2,6,251,8,251,11,252,250,26,220,240,0,4,254,248,12,6,255,34,210,234,9,9,21,9,5,190,251,26,2,10,13,2,19,9,12,175,3,13,13,0,242,22,221,6,249,252,6,250,10,250,225,38,223,0,246,245,5,244,12,239,5,0,250,13,247,10,8,25,33,2,244,8,250,10,254,21,7,17,43,5,11,249,247,236,220,236,233,252,252,253,27,247,247,207,217,218,245,247,6,5,23,25,5,3,3,4,1,2,253,255,87,39,17,235,247,237,247,241,243,242,239,245,246,245,248,250,255,253,253,255,202,222,229,248,245,252,251,0,0,4,8,6,9,7,9,7,6,5,5,5,48,10,19,246,12,255,9,253,2,5,253,2,254,254,0,254,230,6,9,249,240,247,2,7,7,251,213,11,22,245,247,34,37,241,243,250,1,255,1,1,192,56,52,245,229,5,4,3,1,2,1,3,255,252,252,246,249,252,252,2,255,249,249,244,246,241,247,251,251,245,240,243,6,16,4,243,240,246,252,2,209,243,25,47,19,242,236,248,239,0,253,243,1,6,239,242,15,1,10,6,232,0,246,19,187,248,14,49,17,251,33,227,3,252,0,2,248,5,250,2,120,200,244,209,23,247,6,251,1,2,251,1,246,4,255,255,4,255,0,253,30,204,189,30,22,11,255,252,3,0,7,2,0,1,246,252,248,243,5,1,1,255,5,13,247,253,246,194,22,48,252,250,2,3,5,1,1,4,1,13,3,236,10,247,13,254,252,9,236,44,255,20,224,189,19,0,28,11,8,2,245,15,237,203,31,2,34,10,6,252,198,8,10,13,14,1,12,2,0,0,128,37,248,44,247,26,253,18,2,6,11,255,9,1,5,3,0,1,1,2,12,3,254,253,7,25,9,18,250,219,3,248,240,3,246,249,17,222,212,11,17,241,253,240,255,243,11,210,191,254,8,13,2,4,4,5,15,5,9,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,247,19,244,12,228,38,29,255,12,2,5,23,246,3,4,241,21,252,3,3,6,17,247,252,248,236,26,5,246,6,1,237,18,241,244,47,250,254,249,247,255,239,254,254,242,30,242,2,249,252,255,244,11,231,16,253,244,11,249,7,239,1,19,228,31,249,246,7,246,3,12,5,240,6,24,41,227,202,0,1,7,255,5,250,13,10,252,248,8,247,229,203,218,255,10,19,17,16,12,12,0,3,249,252,13,12,225,242,6,251,3,5,17,43,50,25,10,1,250,254,7,17,17,27,25,22,12,4,253,0,28,220,39,232,241,3,247,15,251,10,31,228,11,31,235,9,245,245,254,249,231,14,234,31,4,242,19,244,14,251].concat([4,249,4,251,9,0,254,42,209,240,1,8,0,9,23,199,0,28,245,6,225,55,211,3,251,4,2,254,4,249,253,6,254,7,253,12,5,8,54,246,8,249,248,232,231,229,242,251,8,5,44,23,5,247,245,245,243,247,244,248,227,248,234,6,241,3,244,255,251,253,34,255,29,240,17,252,12,2,1,4,254,252,2,255,11,253,204,28,30,247,224,25,44,236,232,4,6,255,0,0,0,0,0,0,0,0,0,0,0,0,231,246,22,29,13,243,234,243,252,0,252,240,10,15,220,232,28,25,255,253,66,223,245,241,6,0,3,4,254,5,24,236,209,29,19,254,252,255,0,255,254,3,1,8,245,5,5,199,28,28,0,240,4,252,12,250,255,2,236,61,247,24,234,214,29,6,17,8,4,2,191,15,8,10,5,6,5,3,2,254,253,5,247,4,251,23,13,23,253,193,3,251,252,250,0,253,23,220,210,9,5,5,8,4,9,251,1,253,10,1,250,10,245,24,209,31,22,244,14,246,6,11,249,249,7,225,51,244,250,7,6,239,9,245,236,52,237,3,250,250,248,251,23,215,37,1,235,10,242,8,7,5,241,241,23,39,230,223,7,2,224,226,235,248,4,12,17,15,14,11,22,39,14,44,11,35,254,23,252,6,46,228,13,229,233,12,4,20,251,9,37,238,233,23,0,9,250,236,4,255,239,251,252,17,0,1,9,254,1,2,2,244,8,231,39,15,9,16,201,245,9,11,5,10,254,196,8,13,250,11,240,27,209,244,11,1,16,249,9,253,227,9,242,25,237,34,36,12,40,246,253,232,242,219,235,221,254,220,3,250,67,28,6,239,253,244,240,241,239,249,197,220,243,1,7,1,2,10,2,11,13,10,8,254,7,3,5,4,2,2,253,248,4,251,6,7,214,15,35,254,210,38,28,236,247,1,7,253,0,254,0,0,0,0,0,0,0,0,0,0,241,228,52,32,5,251,239,236,246,255,215,163,144,62,162,69,182,62,203,161,229,62,0,0,0,0,0,0,128,62,174,71,161,62,150,67,203,62,0,0,0,63,250,53,235,232,4,26,17,252,219,25,17,220,243,31,3,250,27,15,246,31,28,26,246,246,216,16,249,15,13,41,247,0,252,50,250,249,14,38,22,0,208,2,1,243,237,32,253,196,11,239,255,232,222,255,35,251,229,28,44,13,25,15,42,245,15,51,35,220,20,8,252,244,227,19,209,49,241,252,16,227,217,14,226,4,25,247,251,205,242,253,216,224,38,5,247,248,252,255,234,71,253,14,26,238,234,24,215,231,232,6,23,19,246,39,230,229,65,45,2,249,230,248,22,244,16,15,16,221,251,33,235,248,0,23,33,34,6,21,36,6,249,234,8,219,242,31,38,11,252,253,217,224,248,32,233,250,244,16,20,228,252,23,13,204,255,22,6,223,216,250,4,194,13,5,230,35,39,11,2,57,245,9,236,228,223,52,251,250,254,22,242,240,208,35,1,198,20,13,33,255,182,56,238,234,225,12,6,242,4,254,247,209,10,253,29,239,251,61,14,47,244,2,72,217,239,92,64,203,205,241,226,218,215,227,228,27,9,36,9,221,214,81,235,20,25,240,251,239,221,21,15,228,48,2,254,9,237,29,216,30,238,238,18,240,199,15,236,244,241,219,241,33,217,21,234,243,35,11,13,218,193,29,23,229,32,18,3,230,42,33,192,190,239,16,56,2,36,3,31,21,215,217,8,199,14,37,254,19,220,237,233,227,240,1,253,248,246,31,64,191,222,204,241,45,2,23,21,52,24,223,247,255,9,212,215,243,239,44,22,239,250,252,255,22,38,26,16,2,50,27,221,222,247,215,6,0,240,222,51,8,242,225,207,15,223,45,49,33,245,219,194,202,45,11,251,184,11,255,244,245,24,27,245,213,46,43,33,244,247,255,1,252,233,199,185,11,8,16,17,248,236,225,215,53,48,240,3,65,232,248,233,224,219,224,207,246,239,6,38,5,247,239,210,8,52,3,6,45,40,39,249,250,222,182,31,8,1,240,43,68,245,237,225,4,6,0,250,239,240,218,240,226,2,9,217,240,255,43,246,48,3,3,240,225,253,62,68,43,13,3,246,8,20,200,12,12,254,238,22,241,216,220,1,7,41,0,1,46,250,194,252,244,254,245,173,243,254,91,33,246,0,4,245,240,79,32,37,14,9,51,235,228,200,222,0,21,9,230,11,28,214,202,233,254,241,31,30,8,217,190,217,220,31,228,216,210,35,40,22,24,33,48,23,222,14,40,32,17,27,253,25,26,243,195,239,11,4,31,60,250,230,215,192,13,16,230,54,31,245,233,247,245,222,185,235,222,221,55,50,29,234,229,206,218,57,33,42,57,48,26,11,0,207,225,26,252,242,5,78,37,17,0,207,244,233,26,14,2,2,213,239,244,10,248,252,8,18,12,250,20,244,250,243,231,34,15,40,49,7,8,13,20,20,237,234,254,248,2,51,205,11,47,16,247,210,224,26,192,34,251,38,249,47,20,2,183,157,253,211,20,70,204,15,250,249,174,31,21,47,51,39,253,9,0,215,249,241,202,2,0,27,225,9,211,234,218,232,232,8,223,23,5,50,220,239,238,205,254,13,19,43,12,241,244,61,38,38,7,13,0,6,255,3,62,9,27,22,223,38,221,247,30,213,247,224,255,4,252,1,251,245,248,38,31,11,246,214,235,219,1,43,15,243,221,237,238,15,23,230,59,1,235,53,8,215,206,242,228,4,21,25,228,216,5,216,215,4,51,223,248,248,1,17,196,12,25,215,17,34,43,19,45,7,219,24,241,56,254,35,246,48,4,209,254,5,251,202,5,253,223,246,30,254,212,232,218,9,247,42,4,6,200,44,240,9,216,230,18,236,10,28,215,235,252,13,238,32,226,253,37,15,22,28,50,216,3,227,192,7,51,237,245,17,229,216,192,24,244,249,229,3,37,48,255,2,247,218,222,46,1,27,250,19,243,26,10,34,20,25,40,50,250,249,30,9,232,0,233,71,195,22,58,222,252,2,207,223,25,30,248,250,240,77,2,38,248,221,250,226,56,78,31,33,236,13,217,20,22,4,21,248,4,250,10,173,215,9,231,213,15,249,244,222,217,219,223,19,30,16,223,42,231,25,188,44,241,245,252,23,50,14,4,217,213,20,226,60,9,236,7,16,19,223,37,29,16,221,7,38,229,230,248,29,21,4,19,217,33,249,220,56,54,48,40,29,252,232,214,190,213,196,19,254,37,41,246,219,196,192,18,234,77,73,40,25,4,19,237,190,254,11,5,21,14,26,231,170,252,18,1,26,219,10,37,255,24,244,197,245,20,250,34,240,240,42,19,228,205,53,32,4,10,62,21,244,222,27,4,208,208,206,207,31,249,235,214,231,252,213,234,59,2,27,12,247,250,240,248,224,198,240,227,251,41,23,226,223,210,243,246,218,52,52,1,239,247,10,26,231,250,33,236,53,55,25,224,251,214,23,21,66,5,228,20,9,75,29,249,214,217,15,3,233,21,6,11,1,227,14,63,10,54,26,232,205,207,7,233,205,15,190,1,60,25,10,0,226,252,241,17,19,59,40,4,251,33,6,234,198,186,251,23,250,60,44,227,240,209,227,52,237,50,28,16,35,31,36,0,235,6,21,27,22,42,7,190,216,248,7,19,46,0,252,60,36,45,249,227,250,224,217,2,6,247,33,20,205,222,18,250,19,6,11,5,237,227,254,42,245,211,235,201,57,37,2,242,189,240,229,218,69,48,19,2,239,20,236,240,222,239,231,195,10,73,45,16,216,192,239,227,234,56,17,217,8,245,8,231,238,243,237,8,54,57,36,239,230,252,6,235,40,42,252,20,31,53,10,222,203,31,239,35,0,15,250,236,193,183,22,25,29,17,8,227,217,187,18,15,241,251,30,19,38,34,40,32,46,43,58,43,5,238,231,216,223,201,204,20,34,28,236,193,159,164,61,53,47,49,53,75,242,203,179,177,0,253,251,19,22,26,247,203,201,66,90,72,85,68,74,52,252,215,198,225,238,225,27,32,30,18,24,3,8,5,244,253,26,28,74,63,254,217,189,179,150,182,59,59,73,65,44,40,71,72,82,83,98,88,89,60,250,225,209,208,243,217,247,7,2,79,255,217,196,239,87,81,65,50,45,19,235,189,165,169,215,206,7,18,39,74,10,225,228,39,24,13,23,5,56,45,29,10,251,243,245,221,238,248,246,248,231,185,179,235,2,16,50,63,87,87,5,224,216,205,188,0,12,6,54,34,5,244,32,52,68,64,69,59,65,45,14,240,225,216,191,189,41,49,47,37,245,204,181,172,252,57,48,42,42,33,245,205,188,250,13,0,8,248,26,32,233,203,0,36,56,76,97,105,111,97,255,228,217,216,213,202,212,216,238,35,16,236,237,228,214,29,47,38,74,45,3,227,208,194,176,152,223,56,59,59,10,17,46,72,84,101,117,123,123,106,249,223,207,205,186,189,229,225,70,67,240,194,171,236,82,71,86,80,85,74,237,198,181,211,227,223,238,231,45,57,244,214,251,12,28,36,52,64,81,82,13,247,229,228,22,3,2,22,26,6,250,212,205,2,15,10,48,43,49,34,237,194,172,167,154,232,8,17,61,68,39,24,23,19,16,251,12,15,27,15,248,212,207,196,238,224,228,52,54,62,248,208,179,186,66,101,83,63,61,37,244,206,181,192,33,17,13,25,15,77,1,214,227,72,64,46,49,31,61,44,248,209,202,210,226,19,20,255,240,0,16,244,238,247,230,229,246,234,53,45,246,209,181,174,151,147,8,25,49,77,50,65,114,117,124,118,115,96,90,61,247,211,193,196,181,199,8,11,20,29,0,221,207,213,40,47,35,40,55,38,232,180,153,144,229,3,23,34,52,75,8,227,213,12,63,38,35,29,24,8,25,11,1,241,238,213,249,37,40,21,236,200,237,237,252,254,11,29,51,63,254,212,194,181,167,30,57,51,74,51,50,46,68,64,65,52,63,55,65,43,18,247,230,221,201,187,3,6,8,17,241,195,170,159,1,86,93,74,78,67,255,218,190,208,48,39,29,25,17,255,13,13,29,39,50,51,69,82,97,98,254,220,210,229,240,226,243,252,249,252,25,251,245,250,231,235,33,12,31,29,248,218,204,193,188,167,223,255,10,74,254,241,59,91,105,105,101,87,84,62,249,223,206,221,202,209,25,17,82,81,243,200,173,21,58,31,42,25,72,65,232,190,165,200,9,254,21,10,69,75,2,232,11,22,25,28,38,34,48,33,7,227,230,17,15,255,14,0,254,0,250,215,189,6,254,247,19,2,85,74,234,189,172,185,206,3,11,247,2,62,0,0,128,63,25,4,118,63,172,28,90,63,33,176,50,63,121,233,6,63,127,106,188,62,33,176,114,62,78,98,16,62,45,178,157,61,119,190,31,61,119,97,114,110,105,110,103,58,32,37,115,32,37,100,10,0,110,97,114,114,111,119,98,97,110,100,0,0,0,0,0,0,85,110,107,110,111,119,110,32,110,98,95,99,116,108,32,114,101,113,117,101,115,116,58,32,0,0,0,0,0,0,0,0,110,111,116,105,102,105,99,97,116,105,111,110,58,32,37,115,10,0,0,0,0,0,0,0,85,110,107,110,111,119,110,32,110,98,95,109,111,100,101,95,113,117,101,114,121,32,114,101,113,117,101,115,116,58,32,0,97,115,115,101,114,116,105,111,110,32,102,97,105,108,101,100,58,32,83,85,66,77,79,68,69,40,105,110,110,111,118,97,116,105,111,110,95,117,110,113,117,97,110,116,41,0,0,0,119,97,114,110,105,110,103,58,32,37,115,10,0,0,0,0,119,97,114,110,105,110,103,58,32,37,115,10,0,0,0,0,97,115,115,101,114,116,105,111,110,32,102,97,105,108,101,100,58,32,83,85,66,77,79,68,69,40,108,116,112,95,117,110,113,117,97,110,116,41,0,0,110,111,116,105,102,105,99,97,116,105,111,110,58,32,37,115,10,0,0,0,0,0,0,0,68,111,32,110,111,116,32,111,119,110,32,105,110,112,117,116,32,98,117,102,102,101,114,58,32,110,111,116,32,112,97,99,107,105,110,103,0,0,0,0,73,110,118,97,108,105,100,32,109,111,100,101,32,101,110,99,111,117,110,116,101,114,101,100,46,32,84,104,101,32,115,116,114,101,97,109,32,105,115,32,99,111,114,114,117,112,116,101,100,46,0,0,0,0,0,0,77,111,114,101,32,116,104,97,110,32,116,119,111,32,119,105,100,101,98,97,110,100,32,108,97,121,101,114,115,32,102,111,117,110,100,46,32,84,104,101,32,115,116,114,101,97,109,32,105,115,32,99,111,114,114,117,112,116,101,100,46,0,0,0,73,110,118,97,108,105,100,32,109,111,100,101,32,115,112,101,99,105,102,105,101,100,32,105,110,32,83,112,101,101,120,32,104,101,97,100,101,114,0,0,67,111,117,108,100,32,110,111,116,32,114,101,115,105,122,101,32,105,110,112,117,116,32,98,117,102,102,101,114,58,32,110,111,116,32,112,97,99,107,105,110,103,0,0,0,0,0,0,119,97,114,110,105,110,103,58,32,37,115,32,37,100,10,0,73,110,118,97,108,105,100,32,109,111,100,101,32,101,110,99,111,117,110,116,101,114,101,100,46,32,84,104,101,32,115,116,114,101,97,109,32,105,115,32,99,111,114,114,117,112,116,101,100,46,0,0,0,0,0,0,83,112,101,101,120,32,104,101,97,100,101,114,32,116,111,111,32,115,109,97,108,108,0,0,66,117,102,102,101,114,32,116,111,111,32,115,109,97,108,108,32,116,111,32,112,97,99,107,32,98,105,116,115,0,0,0,85,110,107,110,111,119,110,32,119,98,95,109,111,100,101,95,113,117,101,114,121,32,114,101,113,117,101,115,116,58,32,0,110,111,116,105,102,105,99,97,116,105,111,110,58,32,37,115,10,0,0,0,0,0,0,0,97,115,115,101,114,116,105,111,110,32,102,97,105,108,101,100,58,32,83,85,66,77,79,68,69,40,105,110,110,111,118,97,116,105,111,110,95,113,117,97,110,116,41,0,0,0,0,0,119,97,114,110,105,110,103,58,32,37,115,32,37,100,10,0,84,104,105,115,32,100,111,101,115,110,39,116,32,108,111,111,107,32,108,105,107,101,32,97,32,83,112,101,101,120,32,102,105,108,101,0,0,0,0,0,67,111,117,108,100,32,110,111,116,32,114,101,115,105,122,101,32,105,110,112,117,116,32,98,117,102,102,101,114,58,32,116,114,117,110,99,97,116,105,110,103,32,111,118,101,114,115,105,122,101,32,105,110,112,117,116,0,0,0,0,0,0,0,0,49,46,50,114,99,49,0,0,119,97,114,110,105,110,103,58,32,37,115,32,37,100,10,0,97,115,115,101,114,116,105,111,110,32,102,97,105,108,101,100,58,32,83,85,66,77,79,68,69,40,108,116,112,95,113,117,97,110,116,41,0,0,0,0,105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,117,108,116,114,97,45,119,105,100,101,98,97,110,100,32,40,115,117,98,45,98,97,110,100,32,67,69,76,80,41,0,0,84,104,105,115,32,109,111,100,101,32,105,115,32,109,101,97,110,116,32,116,111,32,98,101,32,117,115,101,100,32,97,108,111,110,101,0,0,0,0,0,68,111,32,110,111,116,32,111,119,110,32,105,110,112,117,116,32,98,117,102,102,101,114,58,32,116,114,117,110,99,97,116,105,110,103,32,111,118,101,114,115,105,122,101,32,105,110,112,117,116,0,0,0,0,0,0,85,110,107,110,111,119,110,32,110,98,95,99,116,108,32,114,101,113,117,101,115,116,58,32,0,0,0,0,0,0,0,0,97,115,115,101,114,116,105,111,110,32,102,97,105,108,101,100,58,32,115,116,45,62,119,105,110,100,111,119,83,105,122,101,45,115,116,45,62,102,114,97,109,101,83,105,122,101,32,61,61,32,115,116,45,62,115,117,98,102,114,97,109,101,83,105,122,101,0,0,0,0,0,0,109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,110,98,95,99,101,108,112,46,99,0,0,0,0,0,0,0,115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,85,110,107,110,111,119,110,32,119,98,95,109,111,100,101,95,113,117,101,114,121,32,114,101,113,117,101,115,116,58,32,0,70,97,116,97,108,32,40,105,110,116,101,114,110,97,108,41,32,101,114,114,111,114,32,105,110,32,37,115,44,32,108,105,110,101,32,37,100,58,32,37,115,10,0,0,0,0,0,0,110,111,116,105,102,105,99,97,116,105,111,110,58,32,37,115,10,0,0,0,0,0,0,0,83,112,101,101,120,32,32,32,0,0,0,0,0,0,0,0,119,105,100,101,98,97,110,100,32,40,115,117,98,45,98,97,110,100,32,67,69,76,80,41,0,0,0,0,0,0,0,0,67,111,117,108,100,32,110,111,116,32,114,101,115,105,122,101,32,105,110,112,117,116,32,98,117,102,102,101,114,58,32,116,114,117,110,99,97,116,105,110,103,32,105,110,112,117,116,0,80,97,99,107,101,116,32,105,115,32,108,97,114,103,101,114,32,116,104,97,110,32,97,108,108,111,99,97,116,101,100,32,98,117,102,102,101,114,0,0])
, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
  Module["_memcpy"] = _memcpy; 
  Module["_memmove"] = _memmove;var _llvm_memmove_p0i8_p0i8_i32=_memmove;
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },reconcile:function (src, dst, callback) {
        var total = 0;
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
        if (!total) {
          // early out
          return callback(null);
        }
        var completed = 0;
        function done(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function transaction_onerror() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function req_onsuccess() { done(null); };
            req.onerror = function req_onerror() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
        while (check.length) {
          var path = check.pop();
          var stat, node;
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function req_onupgradeneeded() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function req_onsuccess() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function req_onerror() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function transaction_onerror() { callback(this.error); };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function store_openCursor_onsuccess(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
        });
      }};
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.position = position;
          return position;
        }}};
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
        // start at the root
        var current = FS.root;
        var current_path = '/';
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            current = current.mount.root;
          }
          // follow symlinks
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.parent = null;
            this.mount = null;
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            FS.hashAddNode(this);
          };
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
          FS.FSNode.prototype = {};
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
        return new FS.FSNode(parent, name, mode, rdev);
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 1;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        if (stream.__proto__) {
          // reuse the object
          stream.__proto__ = FS.FSStream.prototype;
        } else {
          var newStream = new FS.FSStream();
          for (var p in stream) {
            newStream[p] = stream[p];
          }
          stream = newStream;
        }
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
        var completed = 0;
        var total = FS.mounts.length;
        function done(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path, { follow: false });
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.errnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
          this.stack = stackTrace();
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
        FS.mount(MEMFS, {}, '/');
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureErrnoError();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
              if (!hasByteServing) chunkSize = datalength;
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 0777, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              var url = 'ws://' + addr + ':' + port;
              // the node ws library API is slightly different than the browser's
              var opts = ENVIRONMENT_IS_NODE ? {headers: {'websocket-protocol': ['binary']}} : ['binary'];
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  Module["_strlen"] = _strlen;
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
          // Handle precision.
          var precisionSet = false;
          if (next == 46) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }
  function _llvm_stacksave() {
      var self = _llvm_stacksave;
      if (!self.LLVM_SAVEDSTACKS) {
        self.LLVM_SAVEDSTACKS = [];
      }
      self.LLVM_SAVEDSTACKS.push(Runtime.stackSave());
      return self.LLVM_SAVEDSTACKS.length-1;
    }
  var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function _llvm_stackrestore(p) {
      var self = _llvm_stacksave;
      var ret = self.LLVM_SAVEDSTACKS[p];
      self.LLVM_SAVEDSTACKS.splice(p, 1);
      Runtime.stackRestore(ret);
    }
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i32=_memset;
  var _sqrt=Math_sqrt;
  var _sqrtf=Math_sqrt;
  var _acos=Math_acos;
  var _fabsf=Math_abs;
  var _floor=Math_floor;
  var _log=Math_log;
  var _exp=Math_exp;
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }
  var _llvm_memset_p0i8_i64=_memset;
  var _floorf=Math_floor;
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)|0)]=chr
      var ret = _write(stream, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }
  var _llvm_pow_f64=Math_pow;
  var _fabs=Math_abs;
  function _abort() {
      Module['abort']();
    }
  function ___errno_location() {
      return ___errno_state;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
            ['experimental-webgl', 'webgl'].some(function(webglId) {
              return ctx = canvas.getContext(webglId, contextAttributes);
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (window.scrollX + rect.left);
              y = t.pageY - (window.scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (window.scrollX + rect.left);
            y = event.pageY - (window.scrollY + rect.top);
          }
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var Math_min = Math.min;
function invoke_viiiiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13) {
  try {
    Module["dynCall_viiiiiiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiiiiiiiifiiiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15,a16,a17,a18,a19,a20) {
  try {
    return Module["dynCall_iiiiiiiiiifiiiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15,a16,a17,a18,a19,a20);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiiifiiiiiiiifi(index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15) {
  try {
    Module["dynCall_viiiifiiiiiiiifi"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env._stderr|0;var n=+env.NaN;var o=+env.Infinity;var p=0;var q=0;var r=0;var s=0;var t=0,u=0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0.0;var C=0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=0;var M=global.Math.floor;var N=global.Math.abs;var O=global.Math.sqrt;var P=global.Math.pow;var Q=global.Math.cos;var R=global.Math.sin;var S=global.Math.tan;var T=global.Math.acos;var U=global.Math.asin;var V=global.Math.atan;var W=global.Math.atan2;var X=global.Math.exp;var Y=global.Math.log;var Z=global.Math.ceil;var _=global.Math.imul;var $=env.abort;var aa=env.assert;var ab=env.asmPrintInt;var ac=env.asmPrintFloat;var ad=env.min;var ae=env.invoke_viiiiiiiiiiiii;var af=env.invoke_viiiiii;var ag=env.invoke_vi;var ah=env.invoke_v;var ai=env.invoke_iiii;var aj=env.invoke_ii;var ak=env.invoke_viii;var al=env.invoke_iiiiiiiiiifiiiiiiiiii;var am=env.invoke_viiiifiiiiiiiifi;var an=env.invoke_iii;var ao=env.invoke_viiii;var ap=env._fabsf;var aq=env._floorf;var ar=env._abort;var as=env._fprintf;var at=env._sqrt;var au=env._fflush;var av=env.__reallyNegative;var aw=env._sqrtf;var ax=env._fputc;var ay=env._log;var az=env._fabs;var aA=env._floor;var aB=env.___setErrNo;var aC=env._fwrite;var aD=env._send;var aE=env._write;var aF=env._exit;var aG=env._sysconf;var aH=env.__exit;var aI=env.__formatString;var aJ=env._llvm_stackrestore;var aK=env._pwrite;var aL=env._llvm_pow_f64;var aM=env._sbrk;var aN=env._llvm_stacksave;var aO=env.___errno_location;var aP=env._exp;var aQ=env._time;var aR=env._acos;var aS=0.0;
// EMSCRIPTEN_START_FUNCS
function a2(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function a3(){return i|0}function a4(a){a=a|0;i=a}function a5(a,b){a=a|0;b=b|0;if((p|0)==0){p=a;q=b}}function a6(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function a7(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function a8(a){a=a|0;C=a}function a9(a){a=a|0;D=a}function ba(a){a=a|0;E=a}function bb(a){a=a|0;F=a}function bc(a){a=a|0;G=a}function bd(a){a=a|0;H=a}function be(a){a=a|0;I=a}function bf(a){a=a|0;J=a}function bg(a){a=a|0;K=a}function bh(a){a=a|0;L=a}function bi(){}function bj(b){b=b|0;var d=0;d=di(2e3,1)|0;c[b>>2]=d;if((d|0)==0){return}c[b+24>>2]=2e3;c[b+16>>2]=1;a[d]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+20>>2]=0;return}function bk(b){b=b|0;a[c[b>>2]|0]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+20>>2]=0;return}function bl(b,d,e){b=b|0;d=d|0;e=e|0;c[b>>2]=d;c[b+24>>2]=e;c[b+16>>2]=0;a[d]=0;c[b+4>>2]=0;c[b+8>>2]=0;c[b+12>>2]=0;c[b+20>>2]=0;return}function bm(a,b,d){a=a|0;b=b|0;d=d|0;c[a>>2]=b;c[a+24>>2]=d;c[a+16>>2]=0;c[a+4>>2]=d<<3;c[a+8>>2]=0;c[a+12>>2]=0;c[a+20>>2]=0;return}function bn(a){a=a|0;if((c[a+16>>2]|0)==0){return}dh(c[a>>2]|0);return}function bo(a){a=a|0;c[a+8>>2]=0;c[a+12>>2]=0;c[a+20>>2]=0;return}function bp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=i;g=b+24|0;do{if((c[g>>2]|0)<(e|0)){h=c[m>>2]|0;as(h|0,12744,(j=i,i=i+8|0,c[j>>2]=14152,j)|0)|0;i=j;if((c[b+16>>2]|0)==0){as(h|0,12864,(j=i,i=i+8|0,c[j>>2]=13712,j)|0)|0;i=j;k=c[g>>2]|0;break}l=b|0;n=dj(c[l>>2]|0,e)|0;if((n|0)==0){o=c[g>>2]|0;as(h|0,12864,(j=i,i=i+8|0,c[j>>2]=14104,j)|0)|0;i=j;k=o;break}else{c[g>>2]=e;c[l>>2]=n;k=e;break}}else{k=e}}while(0);if((k|0)<=0){p=k<<3;q=b+4|0;c[q>>2]=p;r=b+8|0;c[r>>2]=0;s=b+12|0;c[s>>2]=0;t=b+20|0;c[t>>2]=0;i=f;return}e=b|0;g=0;do{a[(c[e>>2]|0)+g|0]=a[d+g|0]|0;g=g+1|0;}while((g|0)<(k|0));p=k<<3;q=b+4|0;c[q>>2]=p;r=b+8|0;c[r>>2]=0;s=b+12|0;c[s>>2]=0;t=b+20|0;c[t>>2]=0;i=f;return}function bq(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;f=i;g=b+4|0;h=c[g>>2]|0;j=b+24|0;do{if(((h+7>>3)+e|0)>(c[j>>2]|0)){if((c[b+16>>2]|0)==0){k=c[m>>2]|0;as(k|0,12864,(l=i,i=i+8|0,c[l>>2]=13712,l)|0)|0;i=l;n=c[j>>2]|0;break}k=b|0;o=e+1|0;p=dj(c[k>>2]|0,o+(h>>3)|0)|0;if((p|0)==0){q=(c[j>>2]|0)-1-(c[g>>2]>>3)|0;r=c[m>>2]|0;as(r|0,12864,(l=i,i=i+8|0,c[l>>2]=13480,l)|0)|0;i=l;n=q;break}else{c[j>>2]=o+(c[g>>2]>>3);c[k>>2]=p;n=e;break}}else{n=e}}while(0);e=b+8|0;j=c[e>>2]|0;if((j|0)>0){l=c[b>>2]|0;dC(l|0,l+j|0,((c[g>>2]|0)+7>>3)-j|0);s=c[e>>2]|0}else{s=j}j=(c[g>>2]|0)-(s<<3)|0;c[g>>2]=j;c[e>>2]=0;e=j>>3;if((n|0)<=0){t=j;u=n<<3;v=t+u|0;c[g>>2]=v;i=f;return}j=b|0;b=0;do{a[(c[j>>2]|0)+(b+e)|0]=a[d+b|0]|0;b=b+1|0;}while((b|0)<(n|0));t=c[g>>2]|0;u=n<<3;v=t+u|0;c[g>>2]=v;i=f;return}function br(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=b+12|0;g=c[f>>2]|0;h=b+8|0;i=c[h>>2]|0;j=b+4|0;k=c[j>>2]|0;do{if((g|0)!=0){bu(b,0,1);if((c[f>>2]|0)==0){break}do{bu(b,1,1);}while((c[f>>2]|0)!=0)}}while(0);c[f>>2]=g;c[h>>2]=i;c[j>>2]=k;j=k+7>>3;k=(j|0)<(e|0)?j:e;if((k|0)<=0){return k|0}e=b|0;b=0;do{a[d+b|0]=a[(c[e>>2]|0)+b|0]|0;b=b+1|0;}while((b|0)<(k|0));return k|0}function bs(a){a=a|0;var b=0;b=a+12|0;if((c[b>>2]|0)==0){return}bu(a,0,1);if((c[b>>2]|0)==0){return}do{bu(a,1,1);}while((c[b>>2]|0)!=0);return}function bt(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+4|0;g=c[f>>2]>>3;h=(g|0)<(e|0)?g:e;e=b|0;if((h|0)>0){g=0;do{a[d+g|0]=a[(c[e>>2]|0)+g|0]|0;g=g+1|0;}while((g|0)<(h|0))}g=c[e>>2]|0;if((c[b+12>>2]|0)>0){i=a[g+h|0]|0}else{i=0}a[g]=i;c[b+8>>2]=0;c[f>>2]=c[f>>2]&7;return h|0}function bu(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0;g=i;h=b+8|0;j=b+12|0;k=b+24|0;do{if((((c[j>>2]|0)+f>>3)+(c[h>>2]|0)|0)>=(c[k>>2]|0)){l=c[m>>2]|0;as(l|0,12744,(n=i,i=i+8|0,c[n>>2]=13288,n)|0)|0;i=n;if((c[b+16>>2]|0)==0){as(l|0,12864,(n=i,i=i+8|0,c[n>>2]=12944,n)|0)|0;i=n;i=g;return}o=((c[k>>2]|0)*3|0)+15>>1;p=b|0;q=dj(c[p>>2]|0,o)|0;if((q|0)!=0){c[k>>2]=o;c[p>>2]=q;break}as(l|0,12864,(n=i,i=i+8|0,c[n>>2]=13144,n)|0)|0;i=n;i=g;return}}while(0);if((f|0)==0){i=g;return}k=b|0;n=b+4|0;b=f;do{b=b-1|0;f=(c[k>>2]|0)+(c[h>>2]|0)|0;a[f]=(d[f]|0|(e>>>(b>>>0)&1)<<7-(c[j>>2]|0))&255;f=(c[j>>2]|0)+1|0;c[j>>2]=f;if((f|0)==8){c[j>>2]=0;f=(c[h>>2]|0)+1|0;c[h>>2]=f;a[(c[k>>2]|0)+f|0]=0}c[n>>2]=(c[n>>2]|0)+1;}while((b|0)!=0);i=g;return}function bv(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;e=b+8|0;f=c[e>>2]|0;g=b+12|0;h=c[g>>2]|0;i=b+20|0;do{if((h+d+(f<<3)|0)>(c[b+4>>2]|0)){c[i>>2]=1;j=0}else{if((c[i>>2]|0)!=0|(d|0)==0){j=0;break}k=c[b>>2]|0;l=d;m=0;n=f;o=h;while(1){p=(a[k+n|0]|0)>>>((7-o|0)>>>0)&1|m<<1;q=o+1|0;c[g>>2]=q;if((q|0)==8){c[g>>2]=0;r=n+1|0;c[e>>2]=r;s=r;t=0}else{s=n;t=q}q=l-1|0;if((q|0)==0){j=p;break}else{l=q;m=p;n=s;o=t}}}}while(0);if((j>>>((d-1|0)>>>0)|0)==0){u=j;return u|0}u=j|-1<<d;return u|0}function bw(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;e=b+8|0;f=c[e>>2]|0;g=b+12|0;h=c[g>>2]|0;i=b+20|0;if((h+d+(f<<3)|0)>(c[b+4>>2]|0)){c[i>>2]=1;j=0;return j|0}if((c[i>>2]|0)!=0|(d|0)==0){j=0;return j|0}i=c[b>>2]|0;b=d;d=0;k=f;f=h;while(1){h=(a[i+k|0]|0)>>>((7-f|0)>>>0)&1|d<<1;l=f+1|0;c[g>>2]=l;if((l|0)==8){c[g>>2]=0;m=k+1|0;c[e>>2]=m;n=m;o=0}else{n=k;o=l}l=b-1|0;if((l|0)==0){j=h;break}else{b=l;d=h;k=n;f=o}}return j|0}function bx(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=c[b+8>>2]|0;f=c[b+12>>2]|0;g=b+20|0;if((f+d+(e<<3)|0)>(c[b+4>>2]|0)){c[g>>2]=1;h=0;return h|0}if((c[g>>2]|0)!=0){h=0;return h|0}g=c[b>>2]|0;if((d|0)==0){h=0;return h|0}else{i=d;j=0;k=f;l=e}while(1){e=(a[g+l|0]|0)>>>((7-k|0)>>>0)&1|j<<1;f=k+1|0;d=(f|0)==8;b=i-1|0;if((b|0)==0){h=e;break}else{i=b;j=e;k=d?0:f;l=(d&1)+l|0}}return h|0}function by(b){b=b|0;var d=0,e=0,f=0,g=0;d=c[b+8>>2]|0;e=c[b+12>>2]|0;f=b+20|0;if((e+1+(d<<3)|0)>(c[b+4>>2]|0)){c[f>>2]=1;g=0;return g|0}if((c[f>>2]|0)!=0){g=0;return g|0}g=(a[(c[b>>2]|0)+d|0]|0)>>>((7-e|0)>>>0)&1;return g|0}function bz(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=a+8|0;e=c[d>>2]|0;f=a+12|0;g=(c[f>>2]|0)+b|0;b=a+20|0;do{if((g+(e<<3)|0)<=(c[a+4>>2]|0)){if((c[b>>2]|0)!=0){break}c[d>>2]=(g>>3)+e;c[f>>2]=g&7;return}}while(0);c[b>>2]=1;return}function bA(a){a=a|0;var b=0;if((c[a+20>>2]|0)!=0){b=-1;return b|0}b=(c[a+4>>2]|0)-(c[a+12>>2]|0)-(c[a+8>>2]<<3)|0;return b|0}function bB(a){a=a|0;return(c[a+4>>2]|0)+7>>3|0}function bC(b,d,e,f,h,j,k,l,m,n,o,p,q){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;var r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0.0,ag=0,ah=0.0,ai=0.0,aj=0.0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0;r=i;s=(p|0)>10?20:p<<1;p=(s|0)<3?1:(s|0)/3|0;if((p|0)==1){bD(b,d,e,f,h,j,k,l,m,n,o,q);i=r;return}s=aN()|0;t=i;i=i+(p*4|0)|0;i=i+7&-8;u=i;i=i+(p*4|0)|0;i=i+7&-8;v=i;i=i+(p*4|0)|0;i=i+7&-8;w=i;i=i+(p*4|0)|0;i=i+7&-8;x=c[h>>2]|0;y=c[h+4>>2]|0;z=h+12|0;A=c[z>>2]|0;B=1<<A;C=c[h+8>>2]|0;D=c[h+16>>2]|0;h=i;i=i+((x<<A)*4|0)|0;i=i+7&-8;A=i;i=i+(B*4|0)|0;i=i+7&-8;E=i;i=i+(k*4|0)|0;i=i+7&-8;F=i;i=i+(k*4|0)|0;i=i+7&-8;G=F;H=i;i=i+(y*4|0)|0;i=i+7&-8;I=p<<1;J=_(I,k)|0;K=i;i=i+(J*4|0)|0;i=i+7&-8;J=(p|0)>0;if(J){L=0;do{M=L<<1;c[t+(L<<2)>>2]=K+((_(M,k)|0)<<2);c[u+(L<<2)>>2]=K+((_(M|1,k)|0)<<2);L=L+1|0;}while((L|0)<(p|0))}L=i;i=i+(p*4|0)|0;i=i+7&-8;K=i;i=i+(p*4|0)|0;i=i+7&-8;M=i;i=i+(p*4|0)|0;i=i+7&-8;N=M;O=i;i=i+(p*4|0)|0;i=i+7&-8;P=O;Q=i;i=i+(p*4|0)|0;i=i+7&-8;R=Q;S=i;i=i+(p*4|0)|0;i=i+7&-8;T=S;U=_(y,I)|0;I=i;i=i+(U*4|0)|0;i=i+7&-8;do{if(J){U=0;do{V=U<<1;c[w+(U<<2)>>2]=I+((_(V,y)|0)<<2);c[v+(U<<2)>>2]=I+((_(V|1,y)|0)<<2);U=U+1|0;}while((U|0)<(p|0));U=E;V=b;W=k<<2;dB(U|0,V|0,W)|0;if(J){X=0}else{Y=142;break}do{V=c[t+(X<<2)>>2]|0;dB(V|0,U|0,W)|0;X=X+1|0;}while((X|0)<(p|0));bE(C,m,h,A,B,x);if(!J){break}dE(T|0,0,p<<2|0)}else{W=E;U=b;V=k<<2;dB(W|0,U|0,V)|0;Y=142}}while(0);if((Y|0)==142){bE(C,m,h,A,B,x)}Y=(y|0)>0;do{if(Y){E=(x|0)>0;X=(D|0)==0;I=p-1|0;V=Q+(I<<2)|0;U=p<<2;W=u;Z=t;$=0;while(1){do{if(J){aa=0;do{g[Q+(aa<<2)>>2]=999999986991104.0;aa=aa+1|0;}while((aa|0)<(p|0));if(!J){break}dE(P|0,0,U|0);dE(N|0,0,U|0)}}while(0);aa=_($,x)|0;ab=($|0)==0;ac=0;while(1){if((ac|0)>=(p|0)){break}ad=c[Z+(ac<<2)>>2]|0;ae=ad+(aa<<2)|0;if(E){af=0.0;ag=0;do{ah=+g[ad+(ag+aa<<2)>>2];af=af+ah*ah;ag=ag+1|0;}while((ag|0)<(x|0));ai=af*.5}else{ai=0.0}if(X){de(ae,h,x,B,A,p,L,K,o)}else{df(ae,h,x,B,A,p,L,K,o)}if(J){ah=+g[S+(ac<<2)>>2];ag=0;do{aj=ai+(ah+ +g[K+(ag<<2)>>2]);L211:do{if(aj<+g[V>>2]){ad=0;while(1){if((ad|0)>=(p|0)){break L211}ak=Q+(ad<<2)|0;if(aj<+g[ak>>2]){break}else{ad=ad+1|0}}if((I|0)>(ad|0)){al=I;while(1){am=al-1|0;g[Q+(al<<2)>>2]=+g[Q+(am<<2)>>2];c[M+(al<<2)>>2]=c[M+(am<<2)>>2];c[O+(al<<2)>>2]=c[O+(am<<2)>>2];if((am|0)>(ad|0)){al=am}else{an=ad;break}}}else{an=I}g[ak>>2]=aj;c[M+(an<<2)>>2]=c[L+(ag<<2)>>2];c[O+(an<<2)>>2]=ac}}while(0);ag=ag+1|0;}while((ag|0)<(p|0))}if(ab){break}else{ac=ac+1|0}}do{if(J){ac=_($+1|0,x)|0;ab=(ac|0)<(k|0);aa=k-ac|0;ag=(aa|0)>0;ae=0;do{if(ab){ad=W+(ae<<2)|0;al=c[O+(ae<<2)>>2]|0;am=ac;do{g[(c[ad>>2]|0)+(am<<2)>>2]=+g[(c[Z+(al<<2)>>2]|0)+(am<<2)>>2];am=am+1|0;}while((am|0)<(k|0))}if(E){am=W+(ae<<2)|0;al=c[M+(ae<<2)>>2]|0;ad=0;do{ao=(al|0)<(B|0);ap=x-ad|0;ah=(ao?.03125:-.03125)*+(a[C+((_(al-(ao?0:B)|0,x)|0)+ad)|0]|0);ao=c[am>>2]|0;if(ag){aq=0;do{ar=ao+(aq+ac<<2)|0;g[ar>>2]=+g[ar>>2]-ah*+g[m+(ap+aq<<2)>>2];aq=aq+1|0;}while((aq|0)<(aa|0))}ad=ad+1|0;}while((ad|0)<(x|0))}ad=c[v+(c[O+(ae<<2)>>2]<<2)>>2]|0;am=w+(ae<<2)|0;al=c[am>>2]|0;aq=0;do{c[al+(aq<<2)>>2]=c[ad+(aq<<2)>>2];aq=aq+1|0;}while((aq|0)<(y|0));c[(c[am>>2]|0)+($<<2)>>2]=c[M+(ae<<2)>>2];ae=ae+1|0;}while((ae|0)<(p|0));if(J){as=0}else{break}do{ae=c[w+(as<<2)>>2]|0;aa=c[v+(as<<2)>>2]|0;ac=0;do{c[aa+(ac<<2)>>2]=c[ae+(ac<<2)>>2];ac=ac+1|0;}while((ac|0)<(y|0));as=as+1|0;}while((as|0)<(p|0));if(!J){break}dB(T|0,R|0,U)|0}}while(0);ac=$+1|0;if((ac|0)<(y|0)){ae=W;W=Z;$=ac;Z=ae}else{break}}if(!Y){break}Z=c[w>>2]|0;$=0;do{W=c[Z+($<<2)>>2]|0;c[H+($<<2)>>2]=W;bu(n,W,(c[z>>2]|0)+D|0);$=$+1|0;}while(($|0)<(y|0));if(!Y){break}$=(x|0)>0;Z=0;do{W=c[H+(Z<<2)>>2]|0;U=(W|0)<(B|0);ah=U?.03125:-.03125;if($){E=_(W-(U?0:B)|0,x)|0;U=_(Z,x)|0;W=0;do{g[F+(W+U<<2)>>2]=ah*+(a[C+(W+E)|0]|0);W=W+1|0;}while((W|0)<(x|0))}Z=Z+1|0;}while((Z|0)<(y|0))}}while(0);y=(k|0)>0;if(y){x=0;do{C=l+(x<<2)|0;g[C>>2]=+g[C>>2]+ +g[F+(x<<2)>>2];x=x+1|0;}while((x|0)<(k|0))}if((q|0)!=0){q=aN()|0;x=i;i=i+(k*4|0)|0;i=i+7&-8;if(y){y=x;F=k<<2;dB(y|0,G|0,F)|0;bS(x,d,e,f,x,k,j,o);F=0;do{G=b+(F<<2)|0;g[G>>2]=+g[G>>2]- +g[x+(F<<2)>>2];F=F+1|0;}while((F|0)<(k|0))}else{bS(x,d,e,f,x,k,j,o)}aJ(q|0)}aJ(s|0);i=r;return}function bD(b,d,e,f,h,j,k,l,m,n,o,p){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0.0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0;q=i;i=i+16|0;r=q|0;s=q+8|0;t=c[h>>2]|0;u=c[h+4>>2]|0;v=h+12|0;w=c[v>>2]|0;x=1<<w;y=c[h+8>>2]|0;z=c[h+16>>2]|0;h=i;i=i+((t<<w)*4|0)|0;i=i+7&-8;w=i;i=i+(x*4|0)|0;i=i+7&-8;A=i;i=i+(k*4|0)|0;i=i+7&-8;B=i;i=i+(k*4|0)|0;i=i+7&-8;C=B;D=A;E=b;F=k<<2;dB(D|0,E|0,F)|0;bE(y,m,h,w,x,t);if((u|0)>0){F=(z|0)==0;E=(t|0)>0;D=0;while(1){G=_(D,t)|0;H=A+(G<<2)|0;if(F){de(H,h,t,x,w,1,r,s,o)}else{df(H,h,t,x,w,1,r,s,o)}bu(n,c[r>>2]|0,(c[v>>2]|0)+z|0);H=c[r>>2]|0;I=(H|0)<(x|0);J=_(H-(I?0:x)|0,t)|0;do{if(I){if(E){K=0}else{L=225;break}while(1){H=A+(K+G<<2)|0;g[H>>2]=+g[H>>2]- +g[h+(K+J<<2)>>2];H=K+1|0;if((H|0)<(t|0)){K=H}else{L=221;break}}}else{if(E){M=0}else{L=225;break}while(1){H=A+(M+G<<2)|0;g[H>>2]=+g[H>>2]+ +g[h+(M+J<<2)>>2];H=M+1|0;if((H|0)<(t|0)){M=H}else{L=221;break}}}}while(0);do{if((L|0)==221){L=0;if(!E){L=225;break}N=I?.03125:-.03125;H=0;do{g[B+(H+G<<2)>>2]=N*+(a[y+(H+J)|0]|0);H=H+1|0;}while((H|0)<(t|0));if(!E){L=225;break}H=D+1|0;O=_(H,t)|0;P=k-O|0;Q=(P|0)>0;R=0;while(1){S=t-R|0;N=(I?.03125:-.03125)*+(a[y+(J+R)|0]|0);if(Q){T=0;do{U=A+(T+O<<2)|0;g[U>>2]=+g[U>>2]-N*+g[m+(S+T<<2)>>2];T=T+1|0;}while((T|0)<(P|0))}T=R+1|0;if((T|0)<(t|0)){R=T}else{V=H;break}}}}while(0);if((L|0)==225){L=0;V=D+1|0}if((V|0)<(u|0)){D=V}else{break}}}V=(k|0)>0;if(V){D=0;do{u=l+(D<<2)|0;g[u>>2]=+g[u>>2]+ +g[B+(D<<2)>>2];D=D+1|0;}while((D|0)<(k|0))}if((p|0)==0){i=q;return}p=aN()|0;D=i;i=i+(k*4|0)|0;i=i+7&-8;if(V){V=D;B=k<<2;dB(V|0,C|0,B)|0;bS(D,d,e,f,D,k,j,o);B=0;do{C=b+(B<<2)|0;g[C>>2]=+g[C>>2]- +g[D+(B<<2)>>2];B=B+1|0;}while((B|0)<(k|0))}else{bS(D,d,e,f,D,k,j,o)}aJ(p|0);i=q;return}function bE(b,c,d,e,f,h){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0;j=i;k=i;i=i+(h*4|0)|0;i=i+7&-8;if((f|0)<=0){i=j;return}if((h|0)>0){l=0}else{dE(e|0,0,f<<2|0);i=j;return}do{m=_(l,h)|0;n=0;do{g[k+(n<<2)>>2]=+(a[b+(n+m)|0]|0);n=n+1|0;}while((n|0)<(h|0));n=e+(l<<2)|0;g[n>>2]=0.0;o=0;do{p=0;q=0.0;do{q=q+ +g[k+(p<<2)>>2]*+g[c+(o-p<<2)>>2];p=p+1|0;}while((p|0)<=(o|0));r=q*.03125;g[n>>2]=r*r+ +g[n>>2];g[d+(o+m<<2)>>2]=r;o=o+1|0;}while((o|0)<(h|0));l=l+1|0;}while((l|0)<(f|0));i=j;return}function bF(b,d,e,f,h,j){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0;j=i;h=c[d>>2]|0;e=c[d+4>>2]|0;k=d+12|0;l=c[d+8>>2]|0;m=i;i=i+(e*4|0)|0;i=i+7&-8;n=i;i=i+(e*4|0)|0;i=i+7&-8;o=(e|0)>0;if(!o){i=j;return}p=(c[d+16>>2]|0)==0;d=0;do{if(p){c[n+(d<<2)>>2]=0}else{c[n+(d<<2)>>2]=bw(f,1)|0}c[m+(d<<2)>>2]=bw(f,c[k>>2]|0)|0;d=d+1|0;}while((d|0)<(e|0));if(!o){i=j;return}o=(h|0)>0;d=0;do{q=(c[n+(d<<2)>>2]|0)==0?.03125:-.03125;if(o){k=_(c[m+(d<<2)>>2]|0,h)|0;f=_(d,h)|0;p=0;do{r=b+(p+f<<2)|0;g[r>>2]=+g[r>>2]+q*+(a[l+(k+p)|0]|0);p=p+1|0;}while((p|0)<(h|0))}d=d+1|0;}while((d|0)<(e|0));i=j;return}function bG(a,b,c,d,e,f,h,j,k,l,m,n,o){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;o=i;n=i;i=i+(h*4|0)|0;i=i+7&-8;bT(a,b,c,d,n,h,f,m);if((h|0)>0){m=0;do{f=j+(m<<2)|0;g[f>>2]=+g[n+(m<<2)>>2]+ +g[f>>2];m=m+1|0;}while((m|0)<(h|0))}dE(a|0,0,h<<2|0);i=o;return}function bH(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0;if((d|0)>0){i=0}else{return}do{f=(_(c[h>>2]|0,1664525)|0)+1013904223|0;c[h>>2]=f;g[a+(i<<2)>>2]=((c[k>>2]=f&8388607|1065353216,+g[k>>2])+ -1.5)*3.4642;i=i+1|0;}while((i|0)<(d|0));return}function bI(a,b,c,d){a=+a;b=b|0;c=c|0;d=d|0;var e=0,f=0.0,h=0;if((d|0)>0){e=0;f=a}else{return}while(1){g[c+(e<<2)>>2]=f*+g[b+(e<<2)>>2];h=e+1|0;if((h|0)<(d|0)){e=h;f=f*a}else{break}}return}function bJ(a,b,c,d){a=a|0;b=+b;c=+c;d=d|0;var e=0,f=0,h=0.0;if((d|0)>0){e=0}else{return}do{f=a+(e<<2)|0;h=+g[f>>2];do{if(h<b|h>c){if(h<b){g[f>>2]=b;break}if(h>c){g[f>>2]=c;break}else{g[f>>2]=0.0;break}}}while(0);e=e+1|0;}while((e|0)<(d|0));return}function bK(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0.0,i=0.0,j=0.0,k=0.0,l=0.0,m=0,n=0.0,o=0.0;f=(d|0)>4?4:d;if((c|0)<=0){return}h=+g[3280+(f*12|0)>>2];d=e+4|0;i=+g[3284+(f*12|0)>>2];j=-0.0- +g[3348+(f*12|0)>>2];k=+g[3288+(f*12|0)>>2];l=-0.0- +g[3352+(f*12|0)>>2];f=0;do{m=a+(f<<2)|0;n=+g[m>>2];o=h*n+ +g[e>>2];g[e>>2]=+g[d>>2]+n*i+o*j;g[d>>2]=k*+g[m>>2]+o*l;g[b+(f<<2)>>2]=o;f=f+1|0;}while((f|0)<(c|0));return}function bL(a,b,c,d){a=a|0;b=b|0;c=+c;d=d|0;var e=0;if((d|0)>0){e=0}else{return}do{g[b+(e<<2)>>2]=+g[a+(e<<2)>>2]*c;e=e+1|0;}while((e|0)<(d|0));return}function bM(a,b,c,d){a=a|0;b=b|0;c=+c;d=d|0;var e=0.0,f=0;e=1.0/c;if((d|0)>0){f=0}else{return}do{g[b+(f<<2)>>2]=e*+g[a+(f<<2)>>2];f=f+1|0;}while((f|0)<(d|0));return}function bN(a,b){a=a|0;b=b|0;var c=0,d=0.0,e=0.0,f=0.0,h=0,i=0.0;if((b|0)>0){c=0;d=0.0;while(1){e=+g[a+(c<<2)>>2];f=d+e*e;h=c+1|0;if((h|0)<(b|0)){c=h;d=f}else{i=f;break}}}else{i=0.0}return+(+O(i/+(b|0)+.1))}function bO(a,b){a=a|0;b=b|0;var c=0,d=0.0,e=0.0,f=0.0,h=0,i=0.0;if((b|0)>0){c=0;d=0.0;while(1){e=+g[a+(c<<2)>>2];f=d+e*e;h=c+1|0;if((h|0)<(b|0)){c=h;d=f}else{i=f;break}}}else{i=0.0}return+(+O(i/+(b|0)+.1))}function bP(a,b,c,d,e,f,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;var j=0,k=0.0,l=0.0,m=0.0,n=0;if((e|0)<=0){return}i=f-1|0;if((i|0)>0){j=0}else{f=0;do{k=+g[a+(f<<2)>>2];l=k+ +g[h>>2];g[h+(i<<2)>>2]=k*+g[b+(i<<2)>>2]+ +g[c+(i<<2)>>2]*(-0.0-l);g[d+(f<<2)>>2]=l;f=f+1|0;}while((f|0)<(e|0));return}do{l=+g[a+(j<<2)>>2];k=l+ +g[h>>2];m=-0.0-k;f=0;while(1){n=f+1|0;g[h+(f<<2)>>2]=+g[h+(n<<2)>>2]+l*+g[b+(f<<2)>>2]+ +g[c+(f<<2)>>2]*m;if((n|0)<(i|0)){f=n}else{break}}g[h+(i<<2)>>2]=l*+g[b+(i<<2)>>2]+ +g[c+(i<<2)>>2]*m;g[d+(j<<2)>>2]=k;j=j+1|0;}while((j|0)<(e|0));return}function bQ(a,b,c,d,e,f,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0.0,k=0.0,l=0;if((d|0)<=0){return}h=e-1|0;if((h|0)>0){i=0}else{e=0;do{j=+g[a+(e<<2)>>2]+ +g[f>>2];g[f+(h<<2)>>2]=+g[b+(h<<2)>>2]*(-0.0-j);g[c+(e<<2)>>2]=j;e=e+1|0;}while((e|0)<(d|0));return}do{j=+g[a+(i<<2)>>2]+ +g[f>>2];k=-0.0-j;e=0;while(1){l=e+1|0;g[f+(e<<2)>>2]=+g[f+(l<<2)>>2]+ +g[b+(e<<2)>>2]*k;if((l|0)<(h|0)){e=l}else{break}}g[f+(h<<2)>>2]=+g[b+(h<<2)>>2]*k;g[c+(i<<2)>>2]=j;i=i+1|0;}while((i|0)<(d|0));return}function bR(a,b,c,d,e,f,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0.0,k=0.0,l=0;if((d|0)<=0){return}h=e-1|0;if((h|0)>0){i=0}else{e=0;do{j=+g[a+(e<<2)>>2];k=j+ +g[f>>2];g[f+(h<<2)>>2]=j*+g[b+(h<<2)>>2];g[c+(e<<2)>>2]=k;e=e+1|0;}while((e|0)<(d|0));return}do{k=+g[a+(i<<2)>>2];j=k+ +g[f>>2];e=0;while(1){l=e+1|0;g[f+(e<<2)>>2]=+g[f+(l<<2)>>2]+k*+g[b+(e<<2)>>2];if((l|0)<(h|0)){e=l}else{break}}g[f+(h<<2)>>2]=k*+g[b+(h<<2)>>2];g[c+(i<<2)>>2]=j;i=i+1|0;}while((i|0)<(d|0));return}function bS(a,b,c,d,e,f,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0,v=0,w=0,x=0.0,y=0.0,z=0.0;j=i;k=i;i=i+(h*4|0)|0;i=i+7&-8;l=k;m=(h|0)>0;if(m){dE(l|0,0,h<<2|0)}n=(f|0)>0;L476:do{if(n){o=h-1|0;p=b+(o<<2)|0;q=k+(o<<2)|0;if((o|0)>0){r=0}else{s=0;while(1){t=+g[a+(s<<2)>>2]+ +g[k>>2];g[q>>2]=+g[p>>2]*(-0.0-t);g[e+(s<<2)>>2]=t;s=s+1|0;if((s|0)>=(f|0)){break L476}}}do{t=+g[a+(r<<2)>>2]+ +g[k>>2];u=-0.0-t;s=0;while(1){v=s+1|0;g[k+(s<<2)>>2]=+g[k+(v<<2)>>2]+ +g[b+(s<<2)>>2]*u;if((v|0)<(o|0)){s=v}else{break}}g[q>>2]=+g[p>>2]*u;g[e+(r<<2)>>2]=t;r=r+1|0;}while((r|0)<(f|0))}}while(0);if(m){dE(l|0,0,h<<2|0)}if(!n){i=j;return}n=h-1|0;h=c+(n<<2)|0;l=d+(n<<2)|0;m=k+(n<<2)|0;if((n|0)>0){w=0}else{r=0;do{b=e+(r<<2)|0;x=+g[b>>2];y=x+ +g[k>>2];g[m>>2]=x*+g[h>>2]+ +g[l>>2]*(-0.0-y);g[b>>2]=y;r=r+1|0;}while((r|0)<(f|0));i=j;return}do{r=e+(w<<2)|0;y=+g[r>>2];x=y+ +g[k>>2];z=-0.0-x;b=0;while(1){a=b+1|0;g[k+(b<<2)>>2]=+g[k+(a<<2)>>2]+y*+g[c+(b<<2)>>2]+ +g[d+(b<<2)>>2]*z;if((a|0)<(n|0)){b=a}else{break}}g[m>>2]=y*+g[h>>2]+ +g[l>>2]*z;g[r>>2]=x;w=w+1|0;}while((w|0)<(f|0));i=j;return}function bT(a,b,c,d,e,f,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0.0,v=0.0,w=0.0,x=0,y=0,z=0.0,A=0.0;j=i;k=i;i=i+(h*4|0)|0;i=i+7&-8;l=k;m=(h|0)>0;if(m){dE(l|0,0,h<<2|0)}n=(f|0)>0;L507:do{if(n){o=h-1|0;p=b+(o<<2)|0;q=c+(o<<2)|0;r=k+(o<<2)|0;if((o|0)>0){s=0}else{t=0;while(1){u=+g[a+(t<<2)>>2];v=u+ +g[k>>2];g[r>>2]=u*+g[p>>2]+ +g[q>>2]*(-0.0-v);g[e+(t<<2)>>2]=v;t=t+1|0;if((t|0)>=(f|0)){break L507}}}do{v=+g[a+(s<<2)>>2];u=v+ +g[k>>2];w=-0.0-u;t=0;while(1){x=t+1|0;g[k+(t<<2)>>2]=+g[k+(x<<2)>>2]+v*+g[b+(t<<2)>>2]+ +g[c+(t<<2)>>2]*w;if((x|0)<(o|0)){t=x}else{break}}g[r>>2]=v*+g[p>>2]+ +g[q>>2]*w;g[e+(s<<2)>>2]=u;s=s+1|0;}while((s|0)<(f|0))}}while(0);if(m){dE(l|0,0,h<<2|0)}if(!n){i=j;return}n=h-1|0;h=d+(n<<2)|0;l=k+(n<<2)|0;if((n|0)>0){y=0}else{m=0;do{s=e+(m<<2)|0;z=+g[s>>2];A=z+ +g[k>>2];g[l>>2]=z*+g[h>>2];g[s>>2]=A;m=m+1|0;}while((m|0)<(f|0));i=j;return}do{m=e+(y<<2)|0;A=+g[m>>2];z=+g[k>>2];s=0;while(1){c=s+1|0;g[k+(s<<2)>>2]=+g[k+(c<<2)>>2]+A*+g[d+(s<<2)>>2];if((c|0)<(n|0)){s=c}else{break}}g[l>>2]=A*+g[h>>2];g[m>>2]=A+z;y=y+1|0;}while((y|0)<(f|0));i=j;return}function bU(a,b,c,d,e,f,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0,t=0.0,u=0.0;h=i;j=i;i=i+(f*4|0)|0;i=i+7&-8;k=j;l=i;i=i+(f*4|0)|0;i=i+7&-8;m=l;g[d>>2]=1.0;n=(f|0)>0;if(n){o=0;while(1){p=o+1|0;g[d+(p<<2)>>2]=+g[b+(o<<2)>>2];if((p|0)<(f|0)){o=p}else{break}}q=f+1|0}else{q=1}if((q|0)<(e|0)){o=q;do{g[d+(o<<2)>>2]=1.0000000036274937e-15;o=o+1|0;}while((o|0)<(e|0))}if(n){n=f<<2;dE(m|0,0,n|0);dE(k|0,0,n|0)}if((e|0)<=0){i=h;return}n=f-1|0;if((n|0)>0){r=0}else{f=0;do{k=d+(f<<2)|0;s=+g[k>>2]+ +g[j>>2];t=s+ +g[l>>2];g[k>>2]=t;g[j+(n<<2)>>2]=+g[c+(n<<2)>>2]*(-0.0-s);g[l+(n<<2)>>2]=+g[a+(n<<2)>>2]*(-0.0-t);f=f+1|0;}while((f|0)<(e|0));i=h;return}do{f=d+(r<<2)|0;t=+g[f>>2]+ +g[j>>2];s=-0.0-t;u=t+ +g[l>>2];g[f>>2]=u;t=-0.0-u;f=0;while(1){k=f+1|0;g[j+(f<<2)>>2]=+g[j+(k<<2)>>2]+ +g[c+(f<<2)>>2]*s;g[l+(f<<2)>>2]=+g[l+(k<<2)>>2]+ +g[a+(f<<2)>>2]*t;if((k|0)<(n|0)){f=k}else{break}}g[j+(n<<2)>>2]=+g[c+(n<<2)>>2]*s;g[l+(n<<2)>>2]=+g[a+(n<<2)>>2]*t;r=r+1|0;}while((r|0)<(e|0));i=h;return}function bV(a,b,c,d,e,f,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0;j=i;k=a;l=i;i=i+(f*4|0)|0;i=i+7&-8;m=e-1|0;n=i;i=i+((m+f|0)*4|0)|0;i=i+7&-8;o=f-1|0;p=f>>1;if((f|0)>0){q=0;do{g[l+(o-q<<2)>>2]=+g[b+(q<<2)>>2];q=q+1|0;}while((q|0)<(f|0))}q=(o|0)>0;if(q){b=f-2|0;f=0;do{g[n+(f<<2)>>2]=+g[h+(b-f<<2)>>2];f=f+1|0;}while((f|0)<(o|0))}f=(e|0)>0;if(f){b=n+(o<<2)|0;r=e<<2;dB(b|0,k|0,r)|0}if(q){q=0;do{g[h+(q<<2)>>2]=+g[a+(m-q<<2)>>2];q=q+1|0;}while((q|0)<(o|0))}if(!f){i=j;return}f=(p|0)>0;q=0;m=0;while(1){if(f){a=m+o|0;h=0;s=0.0;t=0.0;while(1){u=+g[l+(h<<2)>>2];v=+g[n+(h+m<<2)>>2];w=+g[n+(a-h<<2)>>2];r=h|1;x=+g[l+(r<<2)>>2];y=+g[n+(r+m<<2)>>2];z=+g[n+(a-r<<2)>>2];A=s+u*(v+w)+x*(y+z);B=t-u*(v-w)+x*(y-z);r=h+2|0;if((r|0)<(p|0)){h=r;s=A;t=B}else{C=A;D=B;break}}}else{C=0.0;D=0.0}g[c+(q<<2)>>2]=C;g[d+(q<<2)>>2]=D;h=m+2|0;if((h|0)<(e|0)){q=q+1|0;m=h}else{break}}i=j;return}function bW(a,b,c,d,e,f,h,j,k){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0,A=0.0,B=0.0,C=0,D=0.0,E=0.0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0.0,N=0.0,O=0.0,P=0.0,Q=0.0,R=0,S=0;k=i;l=f>>1;f=e>>1;e=l+f|0;m=i;i=i+(e*4|0)|0;i=i+7&-8;n=i;i=i+(e*4|0)|0;i=i+7&-8;e=(f|0)>0;if(e){o=f-1|0;p=0;do{g[m+(p<<2)>>2]=+g[a+(o-p<<2)>>2];p=p+1|0;}while((p|0)<(f|0))}p=(l|0)>0;if(p){o=0;do{g[m+(o+f<<2)>>2]=+g[h+((o<<1|1)<<2)>>2];o=o+1|0;}while((o|0)<(l|0))}if(e){o=f-1|0;a=0;do{g[n+(a<<2)>>2]=+g[b+(o-a<<2)>>2];a=a+1|0;}while((a|0)<(f|0))}if(p){a=0;do{g[n+(a+f<<2)>>2]=+g[j+((a<<1|1)<<2)>>2];a=a+1|0;}while((a|0)<(l|0))}if(e){e=f-2|0;a=f-1|0;o=0;b=0;while(1){q=e+b|0;if(p){r=a+b|0;s=b+f|0;t=0.0;u=0.0;v=+g[m+(q<<2)>>2];w=+g[n+(q<<2)>>2];x=0.0;y=0.0;q=0;while(1){z=q<<1;A=+g[c+(z<<2)>>2];B=+g[c+((z|1)<<2)>>2];C=r+q|0;D=+g[m+(C<<2)>>2];E=+g[n+(C<<2)>>2];F=D-E;G=D+E;E=+g[c+((z|2)<<2)>>2];D=+g[c+((z|3)<<2)>>2];z=s+q|0;H=+g[m+(z<<2)>>2];I=+g[n+(z<<2)>>2];J=y+A*F+E*(H-I);K=x+B*G+D*(H+I);L=t+(v-w)*A+E*F;M=u+(v+w)*B+G*D;z=q+2|0;if((z|0)<(l|0)){t=L;u=M;v=H;w=I;x=K;y=J;q=z}else{break}}N=L*2.0;O=M*2.0;P=K*2.0;Q=J*2.0}else{N=0.0;O=0.0;P=0.0;Q=0.0}q=o<<1;g[d+(q<<2)>>2]=Q;g[d+((q|1)<<2)>>2]=P;g[d+((q|2)<<2)>>2]=N;g[d+((q|3)<<2)>>2]=O;q=o+2|0;s=-2-o|0;if((q|0)<(f|0)){o=q;b=s}else{break}}}if(p){R=0}else{i=k;return}do{g[h+((R<<1|1)<<2)>>2]=+g[m+(R<<2)>>2];R=R+1|0;}while((R|0)<(l|0));if(p){S=0}else{i=k;return}do{g[j+((S<<1|1)<<2)>>2]=+g[n+(S<<2)>>2];S=S+1|0;}while((S|0)<(l|0));i=k;return}function bX(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0.0,q=0.0,r=0.0,s=0,t=0.0,u=0,v=0.0,w=0,x=0,y=0,z=0,A=0,B=0,C=0.0;e=i;i=i+112|0;f=e|0;h=-3-c|0;j=f|0;g[j>>2]=+b3(a,a+(h<<2)|0,d);g[f+4>>2]=+b3(a,a+(h+1<<2)|0,d);g[f+8>>2]=+b3(a,a+(h+2<<2)|0,d);g[f+12>>2]=+b3(a,a+(h+3<<2)|0,d);g[f+16>>2]=+b3(a,a+(h+4<<2)|0,d);g[f+20>>2]=+b3(a,a+(h+5<<2)|0,d);g[f+24>>2]=+b3(a,a+(h+6<<2)|0,d);k=0;while(1){l=3-k|0;m=(l|0)<0?0:l;l=10-k|0;n=(l|0)>7?7:l;if((m|0)<(n|0)){l=k-3|0;o=m;p=0.0;while(1){q=p+ +g[1352+(o<<2)>>2]*+g[f+(l+o<<2)>>2];m=o+1|0;if((m|0)<(n|0)){o=m;p=q}else{r=q;break}}}else{r=0.0}g[f+28+(k<<2)>>2]=r;o=k+1|0;if((o|0)<7){k=o}else{s=0;break}}while(1){k=3-s|0;o=(k|0)<0?0:k;k=10-s|0;n=(k|0)>7?7:k;if((o|0)<(n|0)){k=s-3|0;l=o;r=0.0;while(1){p=r+ +g[1380+(l<<2)>>2]*+g[f+(k+l<<2)>>2];o=l+1|0;if((o|0)<(n|0)){l=o;r=p}else{t=p;break}}}else{t=0.0}g[f+56+(s<<2)>>2]=t;l=s+1|0;if((l|0)<7){s=l}else{u=0;break}}do{s=3-u|0;l=(s|0)<0?0:s;s=10-u|0;n=(s|0)>7?7:s;if((l|0)<(n|0)){s=u-3|0;k=l;t=0.0;while(1){r=t+ +g[1408+(k<<2)>>2]*+g[f+(s+k<<2)>>2];l=k+1|0;if((l|0)<(n|0)){k=l;t=r}else{v=r;break}}}else{v=0.0}g[f+84+(u<<2)>>2]=v;u=u+1|0;}while((u|0)<7);v=+g[j>>2];j=0;t=v;u=0;k=0;r=v;while(1){n=r>t;v=n?r:t;p=+g[f+(j*28|0)+4>>2];s=p>v;q=s?p:v;v=+g[f+(j*28|0)+8>>2];l=v>q;p=l?v:q;q=+g[f+(j*28|0)+12>>2];o=q>p;v=o?q:p;p=+g[f+(j*28|0)+16>>2];m=p>v;q=m?p:v;v=+g[f+(j*28|0)+20>>2];w=v>q;p=w?v:q;q=+g[f+(j*28|0)+24>>2];x=q>p;y=x?j:w?j:m?j:o?j:l?j:s?j:n?j:u;z=x?6:w?5:m?4:o?3:l?2:s?1:n?0:k;n=j+1|0;if((n|0)>=4){break}j=n;t=x?q:p;u=y;k=z;r=+g[f+(n*28|0)>>2]}if((d|0)<=0){A=c+3|0;B=A-z|0;i=e;return B|0}f=(y|0)>0;k=h+z|0;h=-6-c+z|0;u=y-1|0;y=0;do{if(f){j=h+y|0;C=+g[a+(j<<2)>>2]*+g[1352+(u*28|0)>>2]+0.0+ +g[a+(j+1<<2)>>2]*+g[1356+(u*28|0)>>2]+ +g[a+(j+2<<2)>>2]*+g[1360+(u*28|0)>>2]+ +g[a+(j+3<<2)>>2]*+g[1364+(u*28|0)>>2]+ +g[a+(j+4<<2)>>2]*+g[1368+(u*28|0)>>2]+ +g[a+(j+5<<2)>>2]*+g[1372+(u*28|0)>>2]+ +g[a+(j+6<<2)>>2]*+g[1376+(u*28|0)>>2]}else{C=+g[a+(k+y<<2)>>2]}g[b+(y<<2)>>2]=C;y=y+1|0;}while((y|0)<(d|0));A=c+3|0;B=A-z|0;i=e;return B|0}function bY(a,b,c,d,e,f,h,j,k){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=+j;k=k|0;var l=0,m=0.0,n=0.0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0,z=0.0,A=0.0,B=0.0,C=0;k=i;d=i;i=i+((e<<1)*4|0)|0;i=i+7&-8;bX(a,d,f,80)|0;c=(f|0)>(h|0);h=d+(e<<2)|0;if(c){l=f<<1;bX(a,h,l,80)|0}else{l=-f|0;bX(a,h,l,80)|0}m=+O(+b3(d,d,e)+1.0e3);n=+O(+b3(h,h,e)+1.0e3);o=+O(+b3(a,a,e)+1.0);p=+b3(d,a,e);q=p<0.0?0.0:p;p=+b3(h,a,e);r=p<0.0?0.0:p;if(q>m*o){s=1.0}else{s=q/o/m}if(r>n*o){t=1.0}else{t=r/o/n}r=o/n;if(j>0.0){n=j*.4+.07;u=(n+-.07)*1.72+.5;v=n}else{u=0.0;v=0.0}n=1.0-s*s*u;s=1.0-t*t*u;u=v/(s<v?v:s);s=o/m*(v/(n<v?v:n));if(c){w=r*u*.3;x=s*.7}else{w=r*u*.6;x=s*.6}s=w;w=x;c=(e|0)>0;do{if(c){h=0;do{g[b+(h<<2)>>2]=+g[a+(h<<2)>>2]+(w*+g[d+(h<<2)>>2]+s*+g[d+(h+e<<2)>>2]);h=h+1|0;}while((h|0)<(e|0));if(c){y=0;z=0.0}else{A=0.0;break}while(1){x=+g[b+(y<<2)>>2];u=z+x*x;h=y+1|0;if((h|0)<(e|0)){y=h;z=u}else{A=u;break}}}else{A=0.0}}while(0);z=+(e|0);s=+O(A/z+.1);if(c){y=0;A=0.0;while(1){w=+g[a+(y<<2)>>2];u=A+w*w;d=y+1|0;if((d|0)<(e|0)){y=d;A=u}else{B=u;break}}}else{B=0.0}A=+O(B/z+.1);z=A<1.0?1.0:A;A=s<1.0?1.0:s;s=(z>A?A:z)/A;if(c){C=0}else{i=k;return}do{c=b+(C<<2)|0;g[c>>2]=s*+g[c>>2];C=C+1|0;}while((C|0)<(e|0));i=k;return}function bZ(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0.0,f=0,h=0.0,i=0,j=0.0,k=0.0,l=0.0,m=0,n=0.0,o=0,p=0,q=0,r=0;d=a;e=+g[b>>2];f=(c|0)>0;if(e==0.0){if(!f){h=0.0;return+h}dE(d|0,0,c<<2|0);h=0.0;return+h}if(f){i=0;j=e}else{h=e;return+h}while(1){f=i+1|0;e=-0.0- +g[b+(f<<2)>>2];if((i|0)>0){d=0;k=e;while(1){l=k- +g[a+(d<<2)>>2]*+g[b+(i-d<<2)>>2];m=d+1|0;if((m|0)<(i|0)){d=m;k=l}else{n=l;break}}}else{n=e}k=n/(j+ +g[b>>2]*.003);g[a+(i<<2)>>2]=k;d=i>>1;if((d|0)>0){m=i-1|0;o=0;while(1){p=a+(o<<2)|0;l=+g[p>>2];q=a+(m-o<<2)|0;g[p>>2]=l+k*+g[q>>2];g[q>>2]=k*l+ +g[q>>2];q=o+1|0;if((q|0)<(d|0)){o=q}else{r=d;break}}}else{r=0}if((i&1|0)!=0){d=a+(r<<2)|0;e=+g[d>>2];g[d>>2]=e+k*e}e=j-k*j*k;if((f|0)<(c|0)){i=f;j=e}else{h=e;break}}return+h}function b_(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0.0,f=0.0,h=0,i=0.0,j=0.0,k=0,l=0.0;if((c|0)==0){e=+g[b>>2];f=e+10.0;g[b>>2]=f;return}else{h=c}do{h=h-1|0;if((h|0)<(d|0)){i=0.0;c=h;while(1){j=i+ +g[a+(c<<2)>>2]*+g[a+(c-h<<2)>>2];k=c+1|0;if((k|0)<(d|0)){i=j;c=k}else{l=j;break}}}else{l=0.0}g[b+(h<<2)>>2]=l;}while((h|0)!=0);e=+g[b>>2];f=e+10.0;g[b>>2]=f;return}function b$(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=f|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0,v=0,w=0,x=0,y=0,z=0,A=0,B=0.0,C=0.0,D=0.0,E=0.0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0.0,O=0.0,P=0.0,Q=0.0,R=0.0,S=0.0,U=0.0,V=0.0,W=0.0,X=0.0,Y=0.0,Z=0.0,_=0.0,$=0.0,aa=0.0,ab=0.0,ac=0.0,ad=0.0,ae=0,af=0.0,ag=0.0,ah=0.0,ai=0.0,aj=0.0,ak=0.0,al=0.0,am=0.0,an=0.0;f=i;h=(b|0)/2|0;j=h+1|0;k=i;i=i+(j*4|0)|0;i=i+7&-8;l=k;m=i;i=i+(j*4|0)|0;i=i+7&-8;n=m;g[m>>2]=1.0;g[k>>2]=1.0;o=(b|0)>1;L735:do{if(o){p=b-1|0;q=0;r=k;s=m;t=1.0;u=1.0;do{r=r+4|0;s=s+4|0;v=a+(q<<2)|0;w=a+(p-q<<2)|0;t=+g[v>>2]+ +g[w>>2]-t;g[s>>2]=t;u=+g[v>>2]- +g[w>>2]+u;g[r>>2]=u;q=q+1|0;}while((q|0)<(h|0));if(o){x=1;y=m;z=k}else{break}while(1){g[y>>2]=+g[y>>2]*2.0;g[z>>2]=+g[z>>2]*2.0;if((x|0)>=(h|0)){break L735}x=x+1|0;y=y+4|0;z=z+4|0}}}while(0);z=i;i=i+(j*4|0)|0;i=i+7&-8;y=i;i=i+(j*4|0)|0;i=i+7&-8;if((j|0)>0){j=y;x=z;k=(h<<2)+4|0;dB(x|0,n|0,k)|0;dB(j|0,l|0,k)|0}if((b|0)<=0){A=0;i=f;return A|0}u=e;k=(d|0)<0;l=0;e=0.0;j=0;t=0.0;B=1.0;while(1){n=(l&1|0)==0?z:y;C=B*2.0;if(o){x=h;D=0.0;E=0.0;while(1){F=C*D-E+ +g[n+(h-x<<2)>>2];m=x-1|0;if((m|0)>0){x=m;E=D;D=F}else{break}}G=F;H=D}else{G=0.0;H=0.0}E=+g[n+(h<<2)>>2];I=E;x=c+(l<<2)|0;J=B;K=t;m=j;a=0;L=e;M=C*.5*G+(-0.0-H)+I;L757:while(1){if(a){O=K;P=J;break}else{Q=J;R=K;S=M}while(1){if(R<-1.0){O=R;P=Q;break L757}U=Q;V=u*(1.0-U*U*.9);if(+N(+S)<.2){W=V*.5}else{W=V}X=Q-W;V=X*2.0;if(o){q=h;U=0.0;Y=0.0;while(1){Z=V*U-Y+ +g[n+(h-q<<2)>>2];r=q-1|0;if((r|0)>0){q=r;Y=U;U=Z}else{break}}_=Z;$=U}else{_=0.0;$=0.0}Y=V*.5*_+(-0.0-$)+I;if(S*Y<0.0){break}else{Q=X;R=X;S=Y}}q=m+1|0;L771:do{if(k){aa=S;ab=L;ac=X}else{Y=E;if(o){ad=S;ae=0;af=X;ag=Q}else{ah=S;r=0;ai=X;aj=Q;while(1){ak=(ai+aj)*.5;al=ak*2.0*.5*0.0+Y;s=ah*al<0.0;am=s?ah:al;al=s?ak:ai;p=r+1|0;if((p|0)>(d|0)){aa=am;ab=ak;ac=al;break L771}else{ah=am;r=p;ai=al;aj=s?aj:ak}}}while(1){aj=(af+ag)*.5;ai=aj*2.0;r=h;ah=0.0;V=0.0;while(1){an=ai*ah-V+ +g[n+(h-r<<2)>>2];s=r-1|0;if((s|0)>0){r=s;V=ah;ah=an}else{break}}V=ai*.5*an+(-0.0-ah)+Y;r=ad*V<0.0;U=r?ad:V;V=r?aj:af;s=ae+1|0;if((s|0)>(d|0)){aa=U;ab=aj;ac=V;break}else{ad=U;ae=s;af=V;ag=r?ag:aj}}}}while(0);g[x>>2]=+T(ab);J=ab;K=ac;m=q;a=1;L=ab;M=aa}a=l+1|0;if((a|0)<(b|0)){l=a;e=L;j=m;t=O;B=P}else{A=m;break}}i=f;return A|0}function b0(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,j=0,k=0.0,l=0.0,m=0.0,n=0.0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0.0,w=0.0,x=0.0;d=i;e=c>>1;f=e<<2;h=i;i=i+((f|2)*4|0)|0;i=i+7&-8;if((f|0)>=0){f=e<<2|2;dE(h|0,0,((f|0)>1?f<<2:4)|0)}f=i;i=i+(c*4|0)|0;i=i+7&-8;if((c|0)>0){j=0;do{k=+g[a+(j<<2)>>2];l=k;if(l<1.5707963268){m=k*k;n=m*(m*(m*-.0012712094467133284+.04148774594068527)+-.49991244077682495)+.9999933242797852}else{m=3.141592653589793-l;l=m*m;n=-0.0-(l*(l*(l*-.0012712094467133284+.04148774594068527)+-.49991244077682495)+.9999933242797852)}g[f+(j<<2)>>2]=n;j=j+1|0;}while((j|0)<(c|0))}if((c|0)<0){i=d;return}if((e|0)<=0){n=1.0;j=0;while(1){if((j|0)>0){l=+$(8);g[b+(j-1<<2)>>2]=(n-l+(n+ +$(4)))*.5}g[1]=n;g[2]=n;a=j+1|0;if((a|0)>(c|0)){break}else{n=0.0;j=a}}i=d;return}j=e<<2;n=1.0;a=0;while(1){l=n;m=n;o=0;p=0;while(1){q=o<<2;r=h+(q<<2)|0;s=q|1;t=h+(s<<2)|0;u=h+(s+1<<2)|0;s=h+((q|3)<<2)|0;k=+g[r>>2];v=+g[t>>2]+(m- +g[f+(p<<2)>>2]*2.0*k);w=+g[u>>2];x=+g[s>>2]+(l- +g[f+((p|1)<<2)>>2]*2.0*w);g[t>>2]=k;g[s>>2]=w;g[r>>2]=m;g[u>>2]=l;u=o+1|0;if((u|0)>=(e|0)){break}l=x;m=v;o=u;p=p+2|0}p=h+(j<<2)|0;o=h+((j|1)<<2)|0;if((a|0)>0){g[b+(a-1<<2)>>2]=(x- +g[o>>2]+(v+ +g[p>>2]))*.5}g[p>>2]=v;g[o>>2]=x;o=a+1|0;if((o|0)>(c|0)){break}else{n=0.0;a=o}}i=d;return}function b1(a,b,c){a=a|0;b=b|0;c=+c;var d=0,e=0.0,f=0.0,h=0,i=0.0,j=0.0,k=0,l=0.0,m=0.0;if(+g[a>>2]<c){g[a>>2]=c}d=b-1|0;b=a+(d<<2)|0;e=3.141592653589793-c;if(+g[b>>2]>e){g[b>>2]=e}if((d|0)<=1){return}b=1;e=+g[a+4>>2];f=+g[a>>2];while(1){h=a+(b<<2)|0;i=f+c;if(e<i){g[h>>2]=i;j=i}else{j=e}k=b+1|0;i=+g[a+(k<<2)>>2];if(j>i-c){l=(j+i-c)*.5;g[h>>2]=l;m=l}else{m=j}if((k|0)<(d|0)){b=k;e=i;f=m}else{break}}return}function b2(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var h=0.0,i=0.0;h=(+(e|0)+1.0)/+(f|0);if((d|0)<=0){return}i=1.0-h;f=0;do{g[c+(f<<2)>>2]=i*+g[a+(f<<2)>>2]+h*+g[b+(f<<2)>>2];f=f+1|0;}while((f|0)<(d|0));return}function b3(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0.0,f=0,h=0,i=0.0,j=0,k=0.0;d=c>>2;if((d|0)==0){e=0.0;return+e}else{f=b;h=d;i=0.0;j=a}while(1){a=h-1|0;k=i+(+g[j>>2]*+g[f>>2]+0.0+ +g[j+4>>2]*+g[f+4>>2]+ +g[j+8>>2]*+g[f+8>>2]+ +g[j+12>>2]*+g[f+12>>2]);if((a|0)==0){e=k;break}else{f=f+16|0;h=a;i=k;j=j+16|0}}return+e}function b4(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var h=0,i=0,j=0,k=0.0,l=0,m=0,n=0.0;if((e|0)<=0){return}f=d>>2;d=e-1|0;if((f|0)==0){h=0;do{g[c+(d-h<<2)>>2]=0.0;h=h+1|0;}while((h|0)<(e|0));return}else{i=0}do{h=b+(i<<2)|0;j=f;k=0.0;l=a;while(1){m=j-1|0;n=k+(+g[l>>2]*+g[h>>2]+0.0+ +g[l+4>>2]*+g[h+4>>2]+ +g[l+8>>2]*+g[h+8>>2]+ +g[l+12>>2]*+g[h+12>>2]);if((m|0)==0){break}else{h=h+16|0;j=m;k=n;l=l+16|0}}g[c+(d-i<<2)>>2]=n;i=i+1|0;}while((i|0)<(e|0));return}function b5(a,b,d,e,f,h,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0.0,v=0,w=0.0,x=0,y=0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0,F=0.0,G=0,H=0,I=0;k=i;l=d-b|0;m=i;i=i+((l+2|0)*4|0)|0;i=i+7&-8;n=l+1|0;o=i;i=i+(n*4|0)|0;i=i+7&-8;p=i;i=i+(j*4|0)|0;i=i+7&-8;q=i;i=i+(j*4|0)|0;i=i+7&-8;r=(j|0)>0;if(r){dE(q|0,0,j<<2|0);s=0;do{g[p+(s<<2)>>2]=-1.0;c[f+(s<<2)>>2]=b;s=s+1|0;}while((s|0)<(j|0))}s=e>>2;t=(s|0)==0;if(t){g[m>>2]=0.0;u=0.0}else{v=s;w=0.0;x=a+(-b<<2)|0;while(1){y=v-1|0;z=+g[x>>2];A=+g[x+4>>2];B=+g[x+8>>2];C=+g[x+12>>2];D=w+(z*z+0.0+A*A+B*B+C*C);if((y|0)==0){break}else{v=y;w=D;x=x+16|0}}g[m>>2]=D;x=s;D=0.0;v=a;while(1){y=x-1|0;w=+g[v>>2];C=+g[v+4>>2];B=+g[v+8>>2];A=+g[v+12>>2];z=D+(w*w+0.0+C*C+B*B+A*A);if((y|0)==0){u=z;break}else{x=y;D=z;v=v+16|0}}}if((b|0)<(d|0)){v=e-1|0;e=b;do{x=e-b|0;D=+g[a+(~e<<2)>>2];z=+g[a+(v-e<<2)>>2];A=+g[m+(x<<2)>>2]+D*D-z*z;g[m+(x+1<<2)>>2]=A<0.0?0.0:A;e=e+1|0;}while((e|0)<(d|0))}L883:do{if((n|0)>0){if(t){e=0;while(1){g[o+(l-e<<2)>>2]=0.0;e=e+1|0;if((e|0)>=(n|0)){break L883}}}else{E=0}do{e=a+(E-d<<2)|0;v=s;A=0.0;x=a;while(1){y=v-1|0;F=A+(+g[x>>2]*+g[e>>2]+0.0+ +g[x+4>>2]*+g[e+4>>2]+ +g[x+8>>2]*+g[e+8>>2]+ +g[x+12>>2]*+g[e+12>>2]);if((y|0)==0){break}else{e=e+16|0;v=y;A=F;x=x+16|0}}g[o+(l-E<<2)>>2]=F;E=E+1|0;}while((E|0)<(n|0))}}while(0);if((b|0)<=(d|0)){n=j-1|0;E=q+(n<<2)|0;l=p+(n<<2)|0;a=f+(n<<2)|0;s=b;do{t=s-b|0;F=+g[o+(t<<2)>>2];A=F*F;F=+g[m+(t<<2)>>2]+1.0;L898:do{if(A*+g[E>>2]>+g[l>>2]*F){g[l>>2]=A;g[E>>2]=F;c[a>>2]=s;t=0;while(1){if((t|0)>=(n|0)){break L898}G=q+(t<<2)|0;H=p+(t<<2)|0;if(A*+g[G>>2]>+g[H>>2]*F){I=n;break}else{t=t+1|0}}while(1){x=I-1|0;g[p+(I<<2)>>2]=+g[p+(x<<2)>>2];g[q+(I<<2)>>2]=+g[q+(x<<2)>>2];c[f+(I<<2)>>2]=c[f+(x<<2)>>2];if((x|0)>(t|0)){I=x}else{break}}g[H>>2]=A;g[G>>2]=F;c[f+(t<<2)>>2]=s}}while(0);s=s+1|0;}while((s|0)<=(d|0))}if((h|0)==0|r^1){i=k;return}F=+O(u);r=0;do{d=(c[f+(r<<2)>>2]|0)-b|0;u=+g[o+(d<<2)>>2]/(F*+O(+g[m+(d<<2)>>2])+10.0);g[h+(r<<2)>>2]=u<0.0?0.0:u;r=r+1|0;}while((r|0)<(j|0));i=k;return}function b6(b,d,e,f,h,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=+n;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;w=w|0;x=x|0;var y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0.0,Q=0,R=0.0,S=0,T=0,U=0,V=0,W=0,X=0.0;y=i;i=i+8|0;z=y|0;A=k+4|0;B=c[A>>2]|0;C=1<<B;D=k;E=(c[D>>2]|0)+(v<<2<<B)|0;B=(u|0)>10?10:u;u=(B|0)<1?1:B;B=i;i=i+(u*4|0)|0;i=i+7&-8;if((m|0)<(l|0)){bu(q,0,c[k+8>>2]|0);bu(q,0,c[A>>2]|0);dE(j|0,0,p<<2|0);F=l;i=y;return F|0}v=m-l+1|0;G=(u|0)>(v|0)?v:u;if((m|0)==(l|0)){c[B>>2]=m}else{b5(d,l,m,p,B,0,G,0)}m=i;i=i+(p*4|0)|0;i=i+7&-8;d=i;i=i+(p*4|0)|0;i=i+7&-8;u=i;i=i+(p*4|0)|0;i=i+7&-8;if((G|0)>0){v=j;H=p<<2;I=m;J=u;K=d;L=0;n=-1.0;M=0;N=0;while(1){O=c[B+(N<<2)>>2]|0;dE(v|0,0,H|0);P=+b7(b,e,f,h,j,E,C,O,o,p,r,s,t,d,z,w,+g[x>>2]);if(P<n|n<0.0){dB(I|0,v|0,H)|0;dB(J|0,K|0,H)|0;Q=c[z>>2]|0;R=P;S=O}else{Q=M;R=n;S=L}T=N+1|0;if((T|0)<(G|0)){L=S;n=R;M=Q;N=T}else{U=S;V=Q;W=O;break}}}else{U=0;V=0;W=0}bu(q,U-l|0,c[k+8>>2]|0);bu(q,V,c[A>>2]|0);R=+g[x>>2];if(R<1024.0){X=32.0}else{X=R*.03125}g[x>>2]=X*+(a[(c[D>>2]|0)+(V<<2|3)|0]|0);V=j;j=m;m=p<<2;dB(V|0,j|0,m)|0;j=b;b=u;dB(j|0,b|0,m)|0;F=W;i=y;return F|0}function b7(b,d,e,f,h,j,k,l,m,n,o,p,q,r,s,t,u){b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=+u;var v=0,w=0,x=0,y=0,z=0,A=0.0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0.0,Q=0.0,R=0.0,S=0.0,T=0.0,U=0,V=0,W=0.0,X=0,Y=0.0,Z=0,_=0,$=0.0,aa=0,ab=0.0,ac=0.0,ad=0.0,ae=0.0,af=0.0,ag=0,ah=0.0,ai=0,aj=0.0,ak=0,al=0.0,am=0;v=i;i=i+56|0;w=v|0;x=v+16|0;y=i;i=i+((n*3|0)*4|0)|0;i=i+7&-8;z=i;i=i+(n*4|0)|0;i=i+7&-8;A=u>262144.0?31.0:128.0;c[w>>2]=y;B=y+(n<<2)|0;c[w+4>>2]=B;C=n<<1;D=y+(C<<2)|0;c[w+8>>2]=D;E=(n|0)>0;do{if(E){F=0;do{g[r+(F<<2)>>2]=+g[b+(F<<2)>>2];F=F+1|0;}while((F|0)<(n|0));F=aN()|0;G=i;i=i+(m*4|0)|0;i=i+7&-8;H=G;if(!E){I=F;J=G;K=H;break}L=1-l|0;M=0;while(1){N=L+M|0;do{if((N|0)<0){g[z+(M<<2)>>2]=+g[p+(N<<2)>>2]}else{O=N-l|0;if((O|0)<0){g[z+(M<<2)>>2]=+g[p+(O<<2)>>2];break}else{g[z+(M<<2)>>2]=0.0;break}}}while(0);N=M+1|0;if((N|0)<(n|0)){M=N}else{I=F;J=G;K=H;break}}}else{H=aN()|0;G=i;i=i+(m*4|0)|0;i=i+7&-8;I=H;J=G;K=G}}while(0);if((m|0)>0){dE(K|0,0,m<<2|0);bQ(z,d,z,n,m,J,o);dE(K|0,0,m<<2|0)}else{bQ(z,d,z,n,m,J,o)}bP(z,e,f,z,n,m,J,o);if(E){o=0;do{g[y+(C+o<<2)>>2]=+g[z+(o<<2)>>2];o=o+1|0;}while((o|0)<(n|0))}aJ(I|0);I=~l;o=n-1|0;u=+g[p+(-l<<2)>>2];P=+g[q>>2];g[B>>2]=u*P;if((o|0)>0){z=0;while(1){J=z+1|0;g[y+(J+n<<2)>>2]=+g[y+(C+z<<2)>>2]+u*+g[q+(J<<2)>>2];if((J|0)<(o|0)){z=J}else{break}}u=+g[p+(I<<2)>>2];g[y>>2]=u*P;z=0;while(1){J=z+1|0;g[y+(J<<2)>>2]=+g[y+(z+n<<2)>>2]+u*+g[q+(J<<2)>>2];if((J|0)<(o|0)){z=J}else{break}}}else{g[y>>2]=+g[p+(I<<2)>>2]*P}I=n>>2;z=(I|0)==0;if(z){Q=0.0;R=0.0;S=0.0}else{o=r;q=I;P=0.0;J=y;while(1){m=q-1|0;T=P+(+g[J>>2]*+g[o>>2]+0.0+ +g[J+4>>2]*+g[o+4>>2]+ +g[J+8>>2]*+g[o+8>>2]+ +g[J+12>>2]*+g[o+12>>2]);if((m|0)==0){U=r;V=I;W=0.0;X=B;break}o=o+16|0;q=m;P=T;J=J+16|0}while(1){J=V-1|0;Y=W+(+g[X>>2]*+g[U>>2]+0.0+ +g[X+4>>2]*+g[U+4>>2]+ +g[X+8>>2]*+g[U+8>>2]+ +g[X+12>>2]*+g[U+12>>2]);if((J|0)==0){Z=r;_=I;$=0.0;aa=D;break}else{U=U+16|0;V=J;W=Y;X=X+16|0}}while(1){X=_-1|0;W=$+(+g[aa>>2]*+g[Z>>2]+0.0+ +g[aa+4>>2]*+g[Z+4>>2]+ +g[aa+8>>2]*+g[Z+8>>2]+ +g[aa+12>>2]*+g[Z+12>>2]);if((X|0)==0){Q=W;R=Y;S=T;break}else{Z=Z+16|0;_=X;$=W;aa=aa+16|0}}}aa=0;do{_=w+(aa<<2)|0;if(z){Z=0;do{g[x+(Z*12|0)+(aa<<2)>>2]=0.0;g[x+(aa*12|0)+(Z<<2)>>2]=0.0;Z=Z+1|0;}while((Z|0)<=(aa|0))}else{Z=0;do{X=c[w+(Z<<2)>>2]|0;V=I;$=0.0;U=c[_>>2]|0;while(1){D=V-1|0;ab=$+(+g[U>>2]*+g[X>>2]+0.0+ +g[U+4>>2]*+g[X+4>>2]+ +g[U+8>>2]*+g[X+8>>2]+ +g[U+12>>2]*+g[X+12>>2]);if((D|0)==0){break}else{X=X+16|0;V=D;$=ab;U=U+16|0}}g[x+(Z*12|0)+(aa<<2)>>2]=ab;g[x+(aa*12|0)+(Z<<2)>>2]=ab;Z=Z+1|0;}while((Z|0)<=(aa|0))}aa=aa+1|0;}while((aa|0)<3);ab=+g[x+20>>2];$=+g[x+4>>2];T=+g[x+8>>2];aa=(t|0)<2?2:t;Y=(((aa|0)>30?.6:+(aa|0)*.02)+1.0)*.5;W=Y*+g[x+32>>2];P=Y*+g[x+16>>2];u=Y*+g[x>>2];if((k|0)>0){Y=-999999986991104.0;x=0;aa=0;while(1){t=aa<<2;ac=+(a[j+t|0]|0)+32.0;ad=+(a[j+(t|1)|0]|0)+32.0;ae=+(a[j+(t|2)|0]|0)+32.0;af=Q*ac*64.0+0.0+R*ad*64.0+S*ae*64.0-ab*ac*ad-$*ad*ae-T*ac*ae-W*ac*ac-P*ad*ad-u*ae*ae;do{if(af>Y){if(+(a[j+(t|3)|0]|0)>A){ag=x;ah=Y;break}ag=aa;ah=af}else{ag=x;ah=Y}}while(0);t=aa+1|0;if((t|0)<(k|0)){Y=ah;x=ag;aa=t}else{ai=ag;break}}}else{ai=0}ag=ai<<2;ah=+(a[j+ag|0]|0)*.015625+.5;Y=+(a[j+(ag|1)|0]|0)*.015625+.5;A=+(a[j+(ag|2)|0]|0)*.015625+.5;c[s>>2]=ai;dE(h|0,0,n<<2|0);ai=l+1|0;s=(ai|0)<(n|0)?ai:n;if((s|0)>0){ag=0;do{j=h+(ag<<2)|0;g[j>>2]=+g[j>>2]+A*+g[p+(ag-ai<<2)>>2];ag=ag+1|0;}while((ag|0)<(s|0))}ag=ai+l|0;ai=(ag|0)<(n|0)?ag:n;if((s|0)<(ai|0)){j=s;do{s=h+(j<<2)|0;g[s>>2]=+g[s>>2]+A*+g[p+(j-ag<<2)>>2];j=j+1|0;}while((j|0)<(ai|0))}ai=(l|0)<(n|0)?l:n;if((ai|0)>0){j=0;do{ag=h+(j<<2)|0;g[ag>>2]=+g[ag>>2]+Y*+g[p+(j-l<<2)>>2];j=j+1|0;}while((j|0)<(ai|0))}j=l<<1;ag=(j|0)<(n|0)?j:n;if((ai|0)<(ag|0)){s=ai;do{ai=h+(s<<2)|0;g[ai>>2]=+g[ai>>2]+Y*+g[p+(s-j<<2)>>2];s=s+1|0;}while((s|0)<(ag|0))}ag=l-1|0;s=(ag|0)<(n|0)?ag:n;if((s|0)>0){j=0;do{ai=h+(j<<2)|0;g[ai>>2]=+g[ai>>2]+ah*+g[p+(j-ag<<2)>>2];j=j+1|0;}while((j|0)<(s|0))}j=ag+l|0;l=(j|0)<(n|0)?j:n;if((s|0)<(l|0)){ag=s;do{s=h+(ag<<2)|0;g[s>>2]=+g[s>>2]+ah*+g[p+(ag-j<<2)>>2];ag=ag+1|0;}while((ag|0)<(l|0))}if(E){E=0;do{l=r+(E<<2)|0;g[l>>2]=+g[l>>2]-(ah*+g[y+(C+E<<2)>>2]+Y*+g[y+(E+n<<2)>>2]+A*+g[y+(E<<2)>>2]);E=E+1|0;}while((E|0)<(n|0))}if(z){aj=0.0;i=v;return+aj}else{ak=I;al=0.0;am=r}while(1){r=ak-1|0;A=+g[am>>2];Y=+g[am+4>>2];ah=+g[am+8>>2];u=+g[am+12>>2];P=al+(A*A+0.0+Y*Y+ah*ah+u*u);if((r|0)==0){aj=P;break}else{ak=r;al=P;am=am+16|0}}i=v;return+aj}function b8(b,d,e,f,h,i,j,k,l,m,n,o,p,q,r){b=b|0;d=d|0;e=e|0;f=f|0;h=+h;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=+q;r=r|0;var s=0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0.0,F=0;n=i+4|0;f=c[i>>2]|0;s=_(4<<c[n>>2],r)|0;r=(bw(m,c[i+8>>2]|0)|0)+e|0;e=(bw(m,c[n>>2]|0)|0)<<2;h=+(a[f+(e+s)|0]|0)*.015625+.5;t=+(a[f+((e|1)+s)|0]|0)*.015625+.5;u=+(a[f+((e|2)+s)|0]|0)*.015625+.5;do{if((o|0)!=0&(r|0)>(p|0)){v=q;if((o|0)<4){w=v}else{w=v*.5}v=w;x=v>.95?.949999988079071:v;if(t<0.0){y=-0.0-t}else{y=t}v=h;if(h>0.0){z=v}else{z=v*-.5}v=u;if(u>0.0){A=v}else{A=v*-.5}v=y+z+A;if(v<=x){B=h;C=t;D=u;break}E=x/v;B=E*h;C=E*t;D=E*u}else{B=h;C=t;D=u}}while(0);c[k>>2]=r;g[l>>2]=B;g[l+4>>2]=C;g[l+8>>2]=D;dE(d|0,0,j<<2|0);l=r+1|0;k=(l|0)<(j|0)?l:j;if((k|0)>0){o=0;do{p=d+(o<<2)|0;g[p>>2]=+g[p>>2]+D*+g[b+(o-l<<2)>>2];o=o+1|0;}while((o|0)<(k|0))}o=l+r|0;l=(o|0)<(j|0)?o:j;if((k|0)<(l|0)){p=k;do{k=d+(p<<2)|0;g[k>>2]=+g[k>>2]+D*+g[b+(p-o<<2)>>2];p=p+1|0;}while((p|0)<(l|0))}l=(r|0)<(j|0)?r:j;if((l|0)>0){p=0;do{o=d+(p<<2)|0;g[o>>2]=+g[o>>2]+C*+g[b+(p-r<<2)>>2];p=p+1|0;}while((p|0)<(l|0))}p=r<<1;o=(p|0)<(j|0)?p:j;if((l|0)<(o|0)){k=l;do{l=d+(k<<2)|0;g[l>>2]=+g[l>>2]+C*+g[b+(k-p<<2)>>2];k=k+1|0;}while((k|0)<(o|0))}o=r-1|0;k=(o|0)<(j|0)?o:j;if((k|0)>0){p=0;do{l=d+(p<<2)|0;g[l>>2]=+g[l>>2]+B*+g[b+(p-o<<2)>>2];p=p+1|0;}while((p|0)<(k|0))}p=o+r|0;r=(p|0)<(j|0)?p:j;if((k|0)<(r|0)){F=k}else{return}do{k=d+(F<<2)|0;g[k>>2]=+g[k>>2]+B*+g[b+(F-p<<2)>>2];F=F+1|0;}while((F|0)<(r|0));return}function b9(a,b,c,d,e,f,h,j,k,l,m,n,o,p,q,r,s,t,u,v){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;j=j|0;k=k|0;l=+l;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;var w=0.0,x=0;v=i;u=f;t=i;i=i+(n*4|0)|0;i=i+7&-8;s=t;w=l>.99?.9900000095367432:l;r=(n|0)>0;if(r&(j|0)>0){o=-n|0;k=-j|0;h=o>>>0>k>>>0?o:k;k=0;do{g[f+(k<<2)>>2]=w*+g[q+(k-j<<2)>>2];k=k+1|0;}while((k|0)<(n|0)&(k|0)<(j|0));x=-h|0}else{x=0}if((x|0)<(n|0)){h=x;do{g[f+(h<<2)>>2]=w*+g[f+(h-j<<2)>>2];h=h+1|0;}while((h|0)<(n|0))}if(!r){bS(t,c,d,e,t,n,m,p);i=v;return j|0}r=n<<2;dB(s|0,u|0,r)|0;bS(t,c,d,e,t,n,m,p);p=0;do{m=a+(p<<2)|0;g[m>>2]=+g[m>>2]- +g[t+(p<<2)>>2];p=p+1|0;}while((p|0)<(n|0));i=v;return j|0}function ca(a,b,d,e,f,h,i,j,k,l,m,n,o,p,q){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=+p;q=q|0;p=f>.99?.9900000095367432:f;if((i|0)>0){q=0;do{f=p*+g[a+(q-d<<2)>>2];g[b+(q<<2)>>2]=f;g[a+(q<<2)>>2]=f;q=q+1|0;}while((q|0)<(i|0))}c[j>>2]=d;g[k+8>>2]=0.0;g[k>>2]=0.0;g[k+4>>2]=p;return}function cb(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[a+4>>2]&31](c[a>>2]|0,b,d)|0}function cc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;if((b|0)==0){c[d>>2]=c[a+4>>2]<<1;f=0;i=e;return f|0}else if((b|0)==1){g=d;d=c[g>>2]|0;if((d|0)==0){c[g>>2]=4;f=0;i=e;return f|0}h=c[a+32+(d<<2)>>2]|0;if((h|0)==0){c[g>>2]=-1;f=0;i=e;return f|0}else{c[g>>2]=c[h+52>>2];f=0;i=e;return f|0}}else{as(c[m>>2]|0,13424,(h=i,i=i+16|0,c[h>>2]=13952,c[h+8>>2]=b,h)|0)|0;i=h;f=-1;i=e;return f|0}return 0}function cd(a){a=a|0;var b=0;if(a>>>0>2>>>0){b=0;return b|0}b=c[1336+(a<<2)>>2]|0;return b|0}function ce(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;b=c[a>>2]|0;d=di(228,1)|0;if((d|0)==0){e=0;return e|0}c[d+68>>2]=0;c[d>>2]=a;a=b;f=c[a>>2]|0;c[d+8>>2]=f;h=b+4|0;i=(c[a>>2]|0)/(c[h>>2]|0)|0;j=d+16|0;c[j>>2]=i;k=c[h>>2]|0;c[d+12>>2]=k;c[d+20>>2]=f+k;f=c[b+8>>2]|0;h=d+24|0;c[h>>2]=f;g[d+56>>2]=+g[b+20>>2];g[d+60>>2]=+g[b+24>>2];c[d+28>>2]=c[b+12>>2];l=b+16|0;c[d+32>>2]=c[l>>2];g[d+64>>2]=+g[b+28>>2];c[d+208>>2]=b+32;m=c[b+96>>2]|0;c[d+216>>2]=m;c[d+212>>2]=m;c[d+40>>2]=1;c[d+204>>2]=1;g[d+36>>2]=1024.0;c[d+72>>2]=di(k<<2,1)|0;k=di(((c[l>>2]|0)+(c[a>>2]|0)<<2)+8|0,1)|0;c[d+76>>2]=k;c[d+80>>2]=k+((c[l>>2]|0)+2<<2);k=di(((c[l>>2]|0)+(c[a>>2]|0)<<2)+8|0,1)|0;c[d+84>>2]=k;c[d+88>>2]=k+((c[l>>2]|0)+2<<2);c[d+92>>2]=2432;c[d+96>>2]=3232;l=f<<2;k=di(l,1)|0;a=d+100|0;c[a>>2]=k;c[d+104>>2]=di(l,1)|0;c[d+4>>2]=1;if((f|0)>0){l=0;m=f;b=k;while(1){k=l+1|0;g[b+(l<<2)>>2]=+(k|0)*3.1415927410125732/+(m+1|0);n=c[h>>2]|0;if((k|0)>=(n|0)){break}l=k;m=n;b=c[a>>2]|0}o=n;p=c[j>>2]|0}else{o=f;p=i}c[d+108>>2]=di(o<<2,1)|0;i=o<<2;c[d+112>>2]=di(i,1)|0;c[d+116>>2]=di(i,1)|0;c[d+120>>2]=di(i,1)|0;c[d+124>>2]=di(i,1)|0;i=p<<2;c[d+136>>2]=di(i,1)|0;c[d+140>>2]=0;c[d+52>>2]=di(i,1)|0;i=di(64,1)|0;c[d+144>>2]=i;c9(i);g[d+148>>2]=8.0;dE(d+156|0,0,32);c[d+200>>2]=2;c[d+192>>2]=2;c[d+196>>2]=8e3;c[d+220>>2]=0;c[d+224>>2]=1;e=d;return e|0}function cf(a){a=a|0;var b=0;dh(c[a+72>>2]|0);dh(c[a+76>>2]|0);dh(c[a+104>>2]|0);dh(c[a+84>>2]|0);dh(c[a+100>>2]|0);dh(c[a+108>>2]|0);dh(c[a+112>>2]|0);dh(c[a+116>>2]|0);dh(c[a+120>>2]|0);dh(c[a+124>>2]|0);dh(c[a+136>>2]|0);dh(c[a+52>>2]|0);b=a+144|0;db(c[b>>2]|0);dh(c[b>>2]|0);dh(a);return}function cg(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,N=0,P=0,Q=0,R=0,S=0.0,T=0.0,U=0,V=0,W=0,Z=0.0,$=0,aa=0,ab=0,ac=0.0,ad=0.0,ae=0.0,af=0.0,ag=0.0,ah=0,ai=0.0,aj=0.0,ak=0.0,al=0,am=0,an=0.0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0.0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aK=0,aL=0.0,aM=0,aO=0,aP=0,aQ=0,aR=0,aS=0,aU=0,aV=0,aW=0,aX=0,aY=0.0,aZ=0,a$=0,a0=0,a2=0,a3=0;e=i;i=i+72|0;f=e|0;h=e+24|0;j=e+48|0;k=e+56|0;l=e+64|0;m=b;n=c[a+68>>2]|0;o=a+24|0;p=c[o>>2]|0;q=i;i=i+(p*4|0)|0;i=i+7&-8;r=i;i=i+(p*4|0)|0;i=i+7&-8;s=i;i=i+(p*4|0)|0;i=i+7&-8;t=s;u=i;i=i+(p*4|0)|0;i=i+7&-8;v=u;w=i;i=i+(p*4|0)|0;i=i+7&-8;x=i;i=i+(p*4|0)|0;i=i+7&-8;y=x;z=i;i=i+(p*4|0)|0;i=i+7&-8;A=i;i=i+(p*4|0)|0;i=i+7&-8;B=i;i=i+(p*4|0)|0;i=i+7&-8;p=c[a+76>>2]|0;C=a+8|0;D=a+32|0;dC(p|0,p+(c[C>>2]<<2)|0,(c[D>>2]<<2)+8|0);p=c[a+84>>2]|0;dC(p|0,p+(c[C>>2]<<2)|0,(c[D>>2]<<2)+8|0);if((c[a+224>>2]|0)!=0){bK(m,m,c[C>>2]|0,(c[a+220>>2]|0)!=0?2:0,a+128|0)}p=a+20|0;E=c[p>>2]|0;F=aN()|0;G=i;i=i+(E*4|0)|0;i=i+7&-8;E=(c[o>>2]|0)+1|0;H=i;i=i+(E*4|0)|0;i=i+7&-8;I=c[p>>2]|0;J=c[C>>2]|0;K=I-J|0;if((K|0)>0){L=c[a+72>>2]|0;N=c[a+92>>2]|0;P=0;while(1){g[G+(P<<2)>>2]=+g[L+(P<<2)>>2]*+g[N+(P<<2)>>2];Q=P+1|0;if((Q|0)<(K|0)){P=Q}else{R=Q;break}}}else{R=0}if((R|0)<(I|0)){P=c[a+92>>2]|0;K=R;do{g[G+(K<<2)>>2]=+g[m+(K-I+J<<2)>>2]*+g[P+(K<<2)>>2];K=K+1|0;}while((K|0)<(I|0))}b_(G,H,E,I);S=+g[H>>2];T=S+S*+g[a+64>>2];g[H>>2]=T;I=c[o>>2]|0;E=I+1|0;L1143:do{if((E|0)>0){G=c[a+96>>2]|0;K=0;S=T;while(1){g[H+(K<<2)>>2]=S*+g[G+(K<<2)>>2];P=K+1|0;if((P|0)>=(E|0)){break L1143}K=P;S=+g[H+(P<<2)>>2]}}}while(0);+bZ(q,H,I);I=b$(q,c[o>>2]|0,u,10,.20000000298023224,n)|0;q=c[o>>2]|0;if((I|0)!=(q|0)&(q|0)>0){I=c[a+100>>2]|0;H=0;do{g[u+(H<<2)>>2]=+g[I+(H<<2)>>2];H=H+1|0;}while((H|0)<(q|0))}aJ(F|0);F=(c[p>>2]|0)-(c[C>>2]|0)|0;q=a+4|0;do{if((c[q>>2]|0)==0){H=c[a+16>>2]|0;b2(c[a+100>>2]|0,u,x,c[o>>2]|0,H,H<<1);U=c[o>>2]|0}else{H=c[o>>2]|0;if((H|0)<=0){U=H;break}I=(H|0)>1?H<<2:4;dB(y|0,v|0,I)|0;U=H}}while(0);b1(x,U,.0020000000949949026);b0(x,A,c[o>>2]|0,n);U=a+212|0;v=a+208|0;y=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;do{if((y|0)==0){V=815}else{if((c[a+192>>2]|0)>2){if((c[y+8>>2]|0)<3){V=815;break}}if((c[y+4>>2]|0)!=0){V=815;break}if((c[y>>2]|0)!=-1){V=815;break}if((c[a+156>>2]|0)!=0){V=815;break}if((c[a+164>>2]|0)!=0){V=815;break}W=0;Z=0.0;$=a+72|0;aa=F<<2}}while(0);if((V|0)==815){bI(+g[a+56>>2],A,r,c[o>>2]|0);bI(+g[a+60>>2],A,s,c[o>>2]|0);y=a+88|0;H=c[y>>2]|0;I=a+72|0;E=c[I>>2]|0;K=F<<2;dB(H|0,E|0,K)|0;E=(c[y>>2]|0)+(F<<2)|0;H=(c[C>>2]|0)-F<<2;dB(E|0,b|0,H)|0;H=c[y>>2]|0;bP(H,r,s,H,c[C>>2]|0,c[o>>2]|0,c[a+116>>2]|0,n);H=f|0;E=h|0;b5(c[y>>2]|0,c[a+28>>2]|0,c[D>>2]|0,c[C>>2]|0,H,E,6,n);T=+g[E>>2];S=T*.85;E=c[H>>2]|0;H=1;while(1){L1172:do{if(+g[h+(H<<2)>>2]>S){y=c[f+(H<<2)>>2]|0;G=(y<<1)-E|0;do{if((((G|0)<0?-G|0:G)|0)>=3){P=(y*3|0)-E|0;if((((P|0)<0?-P|0:P)|0)<4){break}P=(y<<2)-E|0;if((((P|0)<0?-P|0:P)|0)<5){break}P=(y*5|0)-E|0;if((((P|0)<0?-P|0:P)|0)>=6){ab=E;break L1172}}}while(0);ab=y}else{ab=E}}while(0);G=H+1|0;if((G|0)<6){E=ab;H=G}else{W=ab;Z=T;$=I;aa=K;break}}}K=a+80|0;I=c[K>>2]|0;ab=c[$>>2]|0;dB(I|0,ab|0,aa)|0;aa=(c[K>>2]|0)+(F<<2)|0;ab=(c[C>>2]|0)-F<<2;dB(aa|0,b|0,ab)|0;ab=c[K>>2]|0;bR(ab,A,ab,c[C>>2]|0,c[o>>2]|0,c[a+120>>2]|0,n);T=+bO(c[K>>2]|0,c[C>>2]|0);if((c[U>>2]|0)!=1&(W|0)>0){ac=T*+O(1.0-Z*Z*.8)*1.1}else{ac=T}ab=c[a+144>>2]|0;do{if((ab|0)==0){V=866}else{b=a+156|0;if((c[b>>2]|0)==0){if((c[a+164>>2]|0)==0){V=866;break}}aa=c[o>>2]|0;if((aa|0)>0){F=c[a+100>>2]|0;T=0.0;I=0;do{S=+g[F+(I<<2)>>2]- +g[u+(I<<2)>>2];T=T+S*S;I=I+1|0;}while((I|0)<(aa|0));ad=T}else{ad=0.0}aa=a+176|0;do{if((c[aa>>2]|0)!=0){S=+g[a+180>>2];do{if(+g[a+184>>2]*S>0.0){ae=S*-1.0e-5/(+g[a+188>>2]+1.0);af=ae>.05?.05000000074505806:ae;if(af>=-.05){ag=af;break}ag=-.05000000074505806}else{ag=0.0}}while(0);y=a+148|0;S=ag+ +g[y>>2];af=S>10.0?10.0:S;g[y>>2]=af;if(af>=0.0){break}g[y>>2]=0.0}}while(0);T=+da(ab,m,c[C>>2]|0,W,Z);g[a+152>>2]=T;if((c[b>>2]|0)==0){y=a+172|0;L1205:do{if(T<2.0){I=c[y>>2]|0;do{if(!((I|0)==0|ad>.05)){if((c[a+168>>2]|0)==0|(I|0)>20){break}c[y>>2]=I+1;ah=0;break L1205}}while(0);c[y>>2]=1;ah=1}else{c[y>>2]=0;ah=c[a+216>>2]|0}}while(0);c[U>>2]=ah;break}c[j>>2]=8;af=+g[a+148>>2];y=~~+M(af);S=af- +(y|0);b=y+1|0;ae=+(b|0)-af;if((y|0)==10){I=0;af=100.0;F=8;while(1){ai=+g[392+(F*44|0)>>2];do{if(T>ai){aj=T-ai;if(aj>=af){ak=af;al=I;break}ak=aj;al=F}else{ak=af;al=I}}while(0);H=F-1|0;if((H|0)==0){am=al;break}else{I=al;af=ak;F=H}}}else{F=0;af=100.0;I=8;while(1){ai=S*+g[352+(I*44|0)+(b<<2)>>2]+ae*+g[352+(I*44|0)+(y<<2)>>2];do{if(T>ai){aj=T-ai;if(aj>=af){an=af;ao=F;break}an=aj;ao=I}else{an=af;ao=F}}while(0);H=I-1|0;if((H|0)==0){am=ao;break}else{F=ao;af=an;I=H}}}c[j>>2]=am;I=a+172|0;L1228:do{if((am|0)==0){F=c[I>>2]|0;do{if(!((F|0)==0|ad>.05)){if((c[a+168>>2]|0)==0|(F|0)>20){break}c[j>>2]=0;c[I>>2]=F+1;break L1228}}while(0);c[j>>2]=1;c[I>>2]=1}else{c[I>>2]=0}}while(0);I=j;cK(a,6,I)|0;I=a+160|0;do{if((c[I>>2]|0)>0){F=k;cK(a,19,F)|0;y=c[I>>2]|0;if((c[k>>2]|0)<=(y|0)){break}c[k>>2]=y;cK(a,18,F)|0}}while(0);if((c[aa>>2]|0)==0){break}I=l;cK(a,19,I)|0;I=(c[l>>2]|0)-(c[aa>>2]|0)|0;F=a+180|0;g[F>>2]=+g[F>>2]+ +(I|0);F=a+184|0;g[F>>2]=+g[F>>2]*.95+ +(I|0)*.05;I=a+188|0;g[I>>2]=+g[I>>2]+1.0}}while(0);if((V|0)==866){g[a+152>>2]=-1.0}if((c[a+204>>2]|0)!=0){bu(d,0,1);bu(d,c[U>>2]|0,4)}l=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;if((l|0)==0){k=c[C>>2]|0;if((k|0)>0){j=a+88|0;am=0;while(1){g[(c[j>>2]|0)+(am<<2)>>2]=1.0000000036274937e-15;g[(c[K>>2]|0)+(am<<2)>>2]=1.0000000036274937e-15;ao=am+1|0;al=c[C>>2]|0;if((ao|0)<(al|0)){am=ao}else{ap=al;break}}}else{ap=k}if((c[o>>2]|0)>0){k=a+112|0;am=0;do{g[(c[k>>2]|0)+(am<<2)>>2]=0.0;am=am+1|0;}while((am|0)<(c[o>>2]|0));aq=c[C>>2]|0}else{aq=ap}c[q>>2]=1;c[a+40>>2]=1;ap=c[$>>2]|0;am=c[p>>2]|0;k=m+((aq<<1)-am<<2)|0;j=am-aq<<2;dB(ap|0,k|0,j)|0;if((c[o>>2]|0)<=0){ar=0;i=e;return ar|0}j=a+108|0;k=0;while(1){g[(c[j>>2]|0)+(k<<2)>>2]=0.0;ap=k+1|0;if((ap|0)<(c[o>>2]|0)){k=ap}else{ar=0;break}}i=e;return ar|0}k=c[o>>2]|0;if((c[q>>2]|0)!=0&(k|0)>0){j=a+100|0;ap=0;do{g[(c[j>>2]|0)+(ap<<2)>>2]=+g[u+(ap<<2)>>2];ap=ap+1|0;as=c[o>>2]|0;}while((ap|0)<(as|0));at=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;au=as}else{at=l;au=k}a1[c[at+16>>2]&7](u,w,au,d);au=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;if((c[au>>2]|0)==-1){av=au}else{bu(d,W-(c[a+28>>2]|0)|0,7);av=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0}if((c[av+4>>2]|0)==0){aw=Z}else{av=~~+M(Z*.9*15.0+.5);au=(av|0)>15?15:av;av=(au|0)<0?0:au;bu(d,av,4);aw=+(av|0)*.066667}av=~~+M(+Y(ac)*3.5+.5);au=(av|0)<0?0:av;av=(au|0)>31?31:au;ac=+X(+(av|0)/3.5);bu(d,av,5);av=c[o>>2]|0;if((c[q>>2]|0)!=0&(av|0)>0){au=a+104|0;at=0;while(1){g[(c[au>>2]|0)+(at<<2)>>2]=+g[w+(at<<2)>>2];k=at+1|0;l=c[o>>2]|0;if((k|0)<(l|0)){at=k}else{ax=l;break}}}else{ax=av}av=a+12|0;at=c[av>>2]|0;au=i;i=i+(at*4|0)|0;i=i+7&-8;l=i;i=i+(at*4|0)|0;i=i+7&-8;k=i;i=i+(at*4|0)|0;i=i+7&-8;as=i;i=i+(at*4|0)|0;i=i+7&-8;ap=i;i=i+(at*4|0)|0;i=i+7&-8;j=i;i=i+(at*4|0)|0;i=i+7&-8;aq=i;i=i+(ax*4|0)|0;i=i+7&-8;am=a+16|0;al=c[am>>2]|0;L1284:do{if((al|0)>0){ao=a+88|0;ah=a+100|0;ab=a+104|0;I=a+136|0;F=a+56|0;y=a+60|0;b=a+124|0;H=a+192|0;E=a+112|0;f=a+28|0;h=a+40|0;G=a+200|0;P=a+36|0;J=a+52|0;R=l;N=a+140|0;L=a+108|0;Q=W;ay=0;az=al;aA=at;aB=ax;while(1){aC=_(aA,ay)|0;aD=c[K>>2]|0;aE=aD+(aC<<2)|0;aF=c[ao>>2]|0;aG=aF+(aC<<2)|0;b2(c[ah>>2]|0,u,x,aB,ay,az);b2(c[ab>>2]|0,w,z,c[o>>2]|0,ay,c[am>>2]|0);b1(x,c[o>>2]|0,.0020000000949949026);b1(z,c[o>>2]|0,.0020000000949949026);b0(x,A,c[o>>2]|0,n);b0(z,B,c[o>>2]|0,n);aH=c[o>>2]|0;if((aH|0)>0){Z=1.0;aI=0;while(1){ad=Z+(+g[B+((aI|1)<<2)>>2]- +g[B+(aI<<2)>>2]);aK=aI+2|0;if((aK|0)<(aH|0)){Z=ad;aI=aK}else{aL=ad;break}}}else{aL=1.0}g[(c[I>>2]|0)+(ay<<2)>>2]=aL;bI(+g[F>>2],A,r,c[o>>2]|0);Z=+g[y>>2];aI=c[o>>2]|0;do{if(Z<0.0){if((aI|0)<=0){break}dE(t|0,0,((aI|0)>1?aI<<2:4)|0)}else{bI(Z,A,s,aI)}}while(0);aI=(c[p>>2]|0)-(c[C>>2]|0)|0;if((aI|0)!=(c[av>>2]|0)){V=900;break}aH=(aI|0)>0;do{if((ay|0)==0){if(aH){aM=0}else{aO=aI;break}while(1){Z=+g[(c[$>>2]|0)+(aM<<2)>>2];g[aF+(aM+aC<<2)>>2]=Z;g[j+(aM<<2)>>2]=Z;aK=aM+1|0;aP=c[av>>2]|0;if((aK|0)<(aP|0)){aM=aK}else{aO=aP;break}}}else{if(!aH){aO=aI;break}aP=ay-1|0;aK=0;aQ=aI;while(1){Z=+g[m+((_(aQ,aP)|0)+aK<<2)>>2];g[aF+(aK+aC<<2)>>2]=Z;g[j+(aK<<2)>>2]=Z;aR=aK+1|0;aS=c[av>>2]|0;if((aR|0)<(aS|0)){aK=aR;aQ=aS}else{aO=aS;break}}}}while(0);bR(j,B,j,aO,c[o>>2]|0,c[b>>2]|0,n);aI=aA>>((c[H>>2]|0)==0);bU(B,r,s,ap,aI,c[o>>2]|0,n);aH=c[av>>2]|0;if((aI|0)<(aH|0)){aQ=aI;do{g[ap+(aQ<<2)>>2]=1.0000000036274937e-15;aQ=aQ+1|0;}while((aQ|0)<(aH|0))}aQ=c[o>>2]|0;if((aQ|0)>0){aI=c[L>>2]|0;aK=0;do{g[aq+(aK<<2)>>2]=+g[aI+(aK<<2)>>2];aK=aK+1|0;}while((aK|0)<(aQ|0))}if((aH|0)>0){aK=0;do{g[as+(aK<<2)>>2]=1.0000000036274937e-15;aK=aK+1|0;}while((aK|0)<(aH|0))}bQ(as,B,as,aH,aQ,aq,n);aK=c[o>>2]|0;if((aK|0)>0){aI=c[E>>2]|0;aP=0;do{g[aq+(aP<<2)>>2]=+g[aI+(aP<<2)>>2];aP=aP+1|0;}while((aP|0)<(aK|0))}bP(as,r,s,as,c[av>>2]|0,aK,aq,n);aP=c[o>>2]|0;if((aP|0)>0){aI=c[E>>2]|0;aQ=0;do{g[aq+(aQ<<2)>>2]=+g[aI+(aQ<<2)>>2];aQ=aQ+1|0;}while((aQ|0)<(aP|0))}bP(aG,r,s,aG,c[av>>2]|0,aP,aq,n);do{if((c[H>>2]|0)==0){if((c[o>>2]|0)>0){aU=0}else{break}do{g[(c[E>>2]|0)+(aU<<2)>>2]=+g[aq+(aU<<2)>>2];aU=aU+1|0;}while((aU|0)<(c[o>>2]|0))}}while(0);aP=c[av>>2]|0;if((aP|0)>0){aQ=0;do{g[au+(aQ<<2)>>2]=+g[aF+(aQ+aC<<2)>>2]- +g[as+(aQ<<2)>>2];aQ=aQ+1|0;}while((aQ|0)<(aP|0))}dE(aE|0,0,aP<<2|0);aQ=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;aF=c[aQ+24>>2]|0;if((aF|0)==0){V=926;break}aI=c[aQ>>2]|0;if((aI|0)==(-1|0)){aV=c[D>>2]|0;aW=c[f>>2]|0;aX=Q}else if((aI|0)==0){aV=Q;aW=Q;aX=Q}else{aK=aI-1+(c[f>>2]|0)|0;aH=(Q|0)<(aK|0)?aK:Q;aK=(c[D>>2]|0)-aI|0;aS=(aH|0)>(aK|0)?aK:aH;aV=aS+aI|0;aW=1-aI+aS|0;aX=aS}aS=a_[aF&7](au,aG,B,r,s,k,c[aQ+32>>2]|0,aW,(c[h>>2]|0)!=0&(aV|0)>(aC|0)?aC:aV,aw,c[o>>2]|0,c[av>>2]|0,d,n,aE,ap,c[H>>2]|0,0,c[G>>2]|0,P)|0;c[(c[J>>2]|0)+(ay<<2)>>2]=aS;aS=c[av>>2]|0;dE(R|0,0,aS<<2|0);if((aS|0)>0){aQ=0;do{aF=j+(aQ<<2)|0;g[aF>>2]=+g[aF>>2]- +g[k+(aQ<<2)>>2];aQ=aQ+1|0;}while((aQ|0)<(aS|0))}Z=+bO(j,aS)/ac;aQ=c[(c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0)+8>>2]|0;if((aQ|0)==3){aP=dc(Z,6864,8)|0;bu(d,aP,3);aY=ac*+g[6896+(aP<<2)>>2]}else if((aQ|0)==0){aY=ac}else{aQ=dc(Z,6928,2)|0;bu(d,aQ,1);aY=ac*+g[6936+(aQ<<2)>>2]}bM(au,au,aY,c[av>>2]|0);aQ=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;aP=c[aQ+36>>2]|0;if((aP|0)==0){V=936;break}aT[aP&7](au,B,r,s,c[aQ+44>>2]|0,c[o>>2]|0,c[av>>2]|0,l,ap,d,n,c[H>>2]|0,c[aQ+12>>2]|0);bL(l,l,aY,c[av>>2]|0);aQ=c[av>>2]|0;if((aQ|0)>0){aP=0;while(1){g[aD+(aP+aC<<2)>>2]=+g[k+(aP<<2)>>2]+ +g[l+(aP<<2)>>2];aF=aP+1|0;aI=c[av>>2]|0;if((aF|0)<(aI|0)){aP=aF}else{aZ=aI;break}}}else{aZ=aQ}if((c[(c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0)+12>>2]|0)==0){a$=aZ}else{aP=aN()|0;aS=i;i=i+(aZ*4|0)|0;i=i+7&-8;aI=c[av>>2]|0;dE(aS|0,0,aI<<2|0);if((aI|0)>0){aF=0;do{aH=au+(aF<<2)|0;g[aH>>2]=+g[aH>>2]*2.200000047683716;aF=aF+1|0;}while((aF|0)<(aI|0))}aF=c[(c[v>>2]|0)+(c[U>>2]<<2)>>2]|0;aT[c[aF+36>>2]&7](au,B,r,s,c[aF+44>>2]|0,c[o>>2]|0,aI,aS,ap,d,n,c[H>>2]|0,0);bL(aS,aS,aY*.4545449912548065,c[av>>2]|0);aF=c[av>>2]|0;if((aF|0)>0){aQ=0;do{aH=l+(aQ<<2)|0;g[aH>>2]=+g[aH>>2]+ +g[aS+(aQ<<2)>>2];aQ=aQ+1|0;}while((aQ|0)<(aF|0))}aJ(aP|0);a$=c[av>>2]|0}if((a$|0)>0){aF=0;while(1){g[aD+(aF+aC<<2)>>2]=+g[k+(aF<<2)>>2]+ +g[l+(aF<<2)>>2];aQ=aF+1|0;aS=c[av>>2]|0;if((aQ|0)<(aS|0)){aF=aQ}else{a0=aS;break}}}else{a0=a$}if((c[N>>2]|0)==0){a2=a0}else{Z=+bN(l,a0);g[(c[N>>2]|0)+(ay<<2)>>2]=Z;a2=c[av>>2]|0}bQ(aE,B,aG,a2,c[o>>2]|0,c[L>>2]|0,n);if((c[H>>2]|0)!=0){bP(aG,r,s,aG,c[av>>2]|0,c[o>>2]|0,c[E>>2]|0,n)}aF=ay+1|0;aC=c[am>>2]|0;if((aF|0)>=(aC|0)){break L1284}Q=aX;ay=aF;az=aC;aA=c[av>>2]|0;aB=c[o>>2]|0}if((V|0)==900){ch(13800,708);return 0}else if((V|0)==926){ch(13568,760);return 0}else if((V|0)==936){ch(13376,842);return 0}}}while(0);do{if((c[U>>2]|0)>0){do{if((c[o>>2]|0)>0){V=a+100|0;av=0;do{g[(c[V>>2]|0)+(av<<2)>>2]=+g[u+(av<<2)>>2];av=av+1|0;a3=c[o>>2]|0;}while((av|0)<(a3|0));if((a3|0)<=0){break}av=a+104|0;V=0;do{g[(c[av>>2]|0)+(V<<2)>>2]=+g[w+(V<<2)>>2];V=V+1|0;}while((V|0)<(c[o>>2]|0))}}while(0);if((c[U>>2]|0)!=1){break}if((c[a+172>>2]|0)==0){bu(d,0,4);break}else{bu(d,15,4);break}}}while(0);c[q>>2]=0;q=c[$>>2]|0;$=c[C>>2]|0;C=c[p>>2]|0;p=m+(($<<1)-C<<2)|0;m=C-$<<2;dB(q|0,p|0,m)|0;m=c[U>>2]|0;U=a+40|0;if((c[(c[(c[v>>2]|0)+(m<<2)>>2]|0)+36>>2]|0)==4|(m|0)==0){c[U>>2]=1;ar=1;i=e;return ar|0}else{c[U>>2]=0;ar=1;i=e;return ar|0}return 0}function ch(a,b){a=a|0;b=b|0;var d=0;as(c[m>>2]|0,13984,(d=i,i=i+24|0,c[d>>2]=13904,c[d+8>>2]=b,c[d+16>>2]=a,d)|0)|0;i=d;aF(1)}function ci(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,i=0,j=0,k=0,l=0;b=c[a>>2]|0;d=di(508,1)|0;if((d|0)==0){e=0;return e|0}c[d+44>>2]=0;c[d>>2]=a;c[d+124>>2]=1;c[d+4>>2]=1;a=b;f=c[a>>2]|0;c[d+12>>2]=f;h=b+4|0;i=(c[a>>2]|0)/(c[h>>2]|0)|0;c[d+20>>2]=i;a=c[h>>2]|0;c[d+16>>2]=a;h=c[b+8>>2]|0;c[d+24>>2]=h;c[d+28>>2]=c[b+12>>2];j=c[b+16>>2]|0;c[d+32>>2]=j;c[d+128>>2]=b+32;c[d+132>>2]=c[b+96>>2];c[d+136>>2]=1;b=j<<1;k=di((b+f+a<<2)+48|0,1)|0;l=k;c[d+48>>2]=l;c[d+52>>2]=l+(a+6+b<<2);dE(k|0,0,j+f<<2|0);f=h<<2;c[d+60>>2]=di(f,1)|0;c[d+56>>2]=di(f,1)|0;c[d+64>>2]=di(f,1)|0;c[d+76>>2]=di(i<<2,1)|0;c[d+96>>2]=40;c[d+8>>2]=0;dE(d+104|0,0,16);c[d+120>>2]=1e3;c[d+36>>2]=8e3;g[d+40>>2]=0.0;c[d+464>>2]=22;c[d+468>>2]=0;c[d+144>>2]=0;c[d+164>>2]=0;c[d+184>>2]=0;c[d+204>>2]=0;c[d+224>>2]=0;c[d+244>>2]=0;c[d+264>>2]=0;c[d+284>>2]=0;c[d+304>>2]=0;c[d+324>>2]=0;c[d+344>>2]=0;c[d+364>>2]=0;c[d+384>>2]=0;c[d+404>>2]=0;c[d+424>>2]=0;c[d+444>>2]=0;dE(d+480|0,0,24);c[d+504>>2]=1;e=d;return e|0}function cj(a){a=a|0;dh(c[a+48>>2]|0);dh(c[a+60>>2]|0);dh(c[a+56>>2]|0);dh(c[a+64>>2]|0);dh(c[a+76>>2]|0);dh(a);return}function ck(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,l=0,n=0,o=0,p=0,q=0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0.0,G=0,H=0,I=0,J=0,K=0,L=0,M=0.0,N=0,P=0,Q=0.0,R=0,S=0,T=0,U=0,V=0,W=0,Y=0,Z=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0.0,at=0.0,au=0.0,av=0.0,aw=0.0,ax=0,ay=0.0,az=0,aA=0,aB=0.0,aC=0.0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aK=0,aL=0,aM=0.0,aO=0,aP=0,aQ=0.0,aR=0;e=i;i=i+24|0;f=e|0;h=e+8|0;j=d;l=a;n=c[a+44>>2]|0;do{if((b|0)==0){if((c[a+496>>2]|0)!=0){o=a+132|0;c[o>>2]=0;p=o;break}o=a+8|0;q=c[o>>2]|0;if((q|0)<10){r=+g[12640+(q<<2)>>2]}else{r=0.0}s=+g[a+104>>2];t=+g[a+108>>2];u=+g[a+112>>2];do{if(s<t){if(t<u){v=t;break}v=s<u?u:s}else{if(u<t){v=t;break}v=u<s?u:s}}while(0);q=a+100|0;s=+g[q>>2];if(v<s){g[q>>2]=v;w=v}else{w=s}s=r*(w>.85?.8500000238418579:w)+1.0000000036274937e-15;q=a+52|0;x=a+12|0;u=+bO(c[q>>2]|0,c[x>>2]|0);y=c[a+48>>2]|0;z=a+32|0;A=a+16|0;dC(y|0,y+(c[x>>2]<<2)|0,((c[z>>2]<<1)+(c[A>>2]|0)<<2)+48|0);y=c[a+96>>2]|0;t=+((c[o>>2]|0)+1|0);B=a+120|0;C=(_(c[B>>2]|0,1664525)|0)+1013904223|0;c[B>>2]=C;D=~~(t*3.4642*((c[k>>2]=C&8388607|1065353216,+g[k>>2])+ -1.5))+y|0;y=c[z>>2]|0;z=(D|0)>(y|0)?y:D;D=c[a+28>>2]|0;y=(z|0)<(D|0)?D:z;L1430:do{if((c[x>>2]|0)>0){t=u*r*(1.0-s*s)*3.4642;z=0;D=C;while(1){E=c[q>>2]|0;F=s*(+g[E+(z-y<<2)>>2]+1.0000000036274937e-15);G=(_(D,1664525)|0)+1013904223|0;c[B>>2]=G;g[E+(z<<2)>>2]=F+t*((c[k>>2]=G&8388607|1065353216,+g[k>>2])+ -1.5);G=z+1|0;if((G|0)>=(c[x>>2]|0)){break L1430}z=G;D=c[B>>2]|0}}}while(0);B=a+60|0;y=c[B>>2]|0;C=a+24|0;bI(.9800000190734863,y,y,c[C>>2]|0);bQ((c[q>>2]|0)+(-(c[A>>2]|0)<<2)|0,c[B>>2]|0,j,c[x>>2]|0,c[C>>2]|0,c[a+64>>2]|0,n);bK(j,j,c[x>>2]|0,1,a+68|0);c[a+4>>2]=0;c[o>>2]=(c[o>>2]|0)+1;C=a+116|0;B=c[C>>2]|0;c[C>>2]=B+1;g[l+104+(B<<2)>>2]=s;if((c[C>>2]|0)<=2){H=0;i=e;return H|0}c[C>>2]=0;H=0;i=e;return H|0}else{if((c[a+124>>2]|0)==0){p=a+132|0;break}if((bA(b)|0)<5){H=-1;i=e;return H|0}C=a+140|0;B=a+464|0;y=a+468|0;L1447:while(1){do{if((bw(b,1)|0)!=0){bz(b,(c[232+((bw(b,3)|0)<<2)>>2]|0)-4|0);if((bA(b)|0)<5){H=-1;I=1124;break L1447}if((bw(b,1)|0)==0){break}bz(b,(c[232+((bw(b,3)|0)<<2)>>2]|0)-4|0);if((bw(b,1)|0)!=0){I=1005;break L1447}}}while(0);if((bA(b)|0)<4){H=-1;I=1129;break}J=bw(b,4)|0;if((J|0)==14){D=cQ(b,C,a)|0;if((D|0)!=0){H=D;I=1121;break}}else if((J|0)==13){D=aX[c[B>>2]&31](b,a,c[y>>2]|0)|0;if((D|0)!=0){H=D;I=1125;break}}else if((J|0)==15){H=-1;I=1130;break}else{I=1011;break}if((bA(b)|0)<5){H=-1;I=1122;break}}if((I|0)==1005){y=c[m>>2]|0;as(y|0,14032,(K=i,i=i+8|0,c[K>>2]=13040,K)|0)|0;i=K;H=-2;i=e;return H|0}else if((I|0)==1011){if((J|0)<=8){y=a+132|0;c[y>>2]=J;p=y;break}as(c[m>>2]|0,14032,(K=i,i=i+8|0,c[K>>2]=13208,K)|0)|0;i=K;H=-2;i=e;return H|0}else if((I|0)==1121){i=e;return H|0}else if((I|0)==1122){i=e;return H|0}else if((I|0)==1124){i=e;return H|0}else if((I|0)==1125){i=e;return H|0}else if((I|0)==1129){i=e;return H|0}else if((I|0)==1130){i=e;return H|0}}}while(0);K=c[a+48>>2]|0;J=a+12|0;l=a+32|0;y=a+16|0;dC(K|0,K+(c[J>>2]<<2)|0,((c[l>>2]<<1)+(c[y>>2]|0)<<2)+48|0);K=a+128|0;B=(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)==0;C=a+24|0;o=c[C>>2]|0;x=aN()|0;A=i;i=i+(o*4|0)|0;i=i+7&-8;if(B){bI(.9300000071525574,c[a+60>>2]|0,A,c[C>>2]|0);B=a+52|0;r=+bO(c[B>>2]|0,c[J>>2]|0);o=c[J>>2]|0;if((o|0)>0){q=a+120|0;w=r*3.4642;D=0;while(1){z=(_(c[q>>2]|0,1664525)|0)+1013904223|0;c[q>>2]=z;g[(c[B>>2]|0)+(D<<2)>>2]=w*((c[k>>2]=z&8388607|1065353216,+g[k>>2])+ -1.5);z=D+1|0;G=c[J>>2]|0;if((z|0)<(G|0)){D=z}else{L=G;break}}}else{L=o}c[a+4>>2]=1;bQ(c[B>>2]|0,A,j,L,c[C>>2]|0,c[a+64>>2]|0,n);c[a+8>>2]=0;aJ(x|0);H=0;i=e;return H|0}aZ[c[(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)+20>>2]&7](A,c[C>>2]|0,b);L=a+8|0;do{if((c[L>>2]|0)!=0){B=c[C>>2]|0;o=(B|0)>0;if(!o){break}D=c[a+56>>2]|0;w=0.0;q=0;do{r=+g[D+(q<<2)>>2]- +g[A+(q<<2)>>2];if(r<0.0){M=-0.0-r}else{M=r}w=w+M;q=q+1|0;}while((q|0)<(B|0));r=+X(w*-.2)*.6;if(!o){break}B=a+64|0;q=0;do{D=(c[B>>2]|0)+(q<<2)|0;g[D>>2]=r*+g[D>>2];q=q+1|0;}while((q|0)<(c[C>>2]|0))}}while(0);q=a+4|0;if((c[q>>2]|0)==0){if((c[L>>2]|0)!=0){I=1030}}else{I=1030}do{if((I|0)==1030){if((c[C>>2]|0)<=0){break}B=a+56|0;o=0;do{g[(c[B>>2]|0)+(o<<2)>>2]=+g[A+(o<<2)>>2];o=o+1|0;}while((o|0)<(c[C>>2]|0))}}while(0);o=c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0;if((c[o>>2]|0)==-1){N=0;P=o}else{o=c[a+28>>2]|0;B=(bw(b,7)|0)+o|0;N=B;P=c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0}if((c[P+4>>2]|0)==0){Q=0.0}else{Q=+(bw(b,4)|0)*.066667}M=+X(+(bw(b,5)|0)/3.5);P=i;i=i+((c[C>>2]|0)*4|0)|0;i=i+7&-8;B=c[y>>2]|0;o=i;i=i+(B*4|0)|0;i=i+7&-8;D=i;i=i+(B*4|0)|0;i=i+7&-8;B=c[p>>2]|0;if((B|0)==1){c[a+496>>2]=(bw(b,4)|0)==15;R=c[p>>2]|0}else{R=B}if((R|0)>1){c[a+496>>2]=0}R=a+20|0;do{if((c[R>>2]|0)>0){B=a+52|0;G=a+80|0;z=a+28|0;E=h|0;S=a+100|0;T=h+4|0;U=h+8|0;V=o;W=a+120|0;r=(Q+-.20000000298023224)*1.5;w=r<0.0?0.0:r;r=w>1.0?1.0:w;Y=a+492|0;Z=a+480|0;w=1.0-r*.8500000238418579;v=r*.15000000596046448;$=a+484|0;aa=a+488|0;s=+(N<<1|0);u=M*r;r=0.0;t=0.0;ab=40;ac=0;ad=c[y>>2]|0;while(1){ae=_(ad,ac)|0;af=c[B>>2]|0;ag=af+(ae<<2)|0;ah=c[G>>2]|0;if((ah|0)==0){ai=0}else{ai=ah+(ae<<2)|0}ah=ag;dE(ah|0,0,ad<<2|0);aj=c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0;ak=c[aj+28>>2]|0;if((ak|0)==0){I=1046;break}al=c[aj>>2]|0;if((al|0)==(-1|0)){am=c[l>>2]|0;an=c[z>>2]|0}else if((al|0)==0){am=N;an=N}else{ao=N-al+1|0;ap=c[z>>2]|0;aq=al+N|0;al=c[l>>2]|0;am=(aq|0)>(al|0)?al:aq;an=(ao|0)<(ap|0)?ap:ao}a$[ak&7](ag,D,an,am,Q,c[aj+32>>2]|0,c[y>>2]|0,f,E,b,n,c[L>>2]|0,ae,+g[S>>2],0);bJ(D,-32.0e3,32.0e3,c[y>>2]|0);F=+g[T>>2];if(F<0.0){ar=-0.0-F}else{ar=F}F=+g[E>>2];at=F;if(F>0.0){au=at}else{au=at*-.5}at=+g[U>>2];F=at;if(at>0.0){av=F}else{av=F*-.5}F=ar+au+av;aw=r+F;aj=F>t;do{if(aj){ag=c[f>>2]|0;ak=(ab<<1)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)<=2){I=1060;break}ak=(ab*3|0)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)<=3){I=1060;break}ak=(ab<<2)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)>4){ax=ag;I=1069}else{I=1060}}else{I=1060}}while(0);L1541:do{if((I|0)==1060){I=0;at=F;ay=t;do{if(at>ay*.6){ag=c[f>>2]|0;ak=ab-(ag<<1)|0;if((((ak|0)<0?-ak|0:ak)|0)<3){az=ag;break}ak=(ag*-3|0)+ab|0;if((((ak|0)<0?-ak|0:ak)|0)<4){az=ag;break}ak=ab-(ag<<2)|0;if((((ak|0)<0?-ak|0:ak)|0)<5){az=ag}else{I=1064}}else{I=1064}}while(0);do{if((I|0)==1064){I=0;if(at*.67<=ay){aA=ab;aB=t;break L1541}ag=c[f>>2]|0;ak=(ab<<1)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)<3){az=ag;break}ak=(ab*3|0)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)<4){az=ag;break}ak=(ab<<2)-ag|0;if((((ak|0)<0?-ak|0:ak)|0)<5){az=ag}else{aA=ab;aB=t;break L1541}}}while(0);if(aj){ax=az;I=1069}else{aA=az;aB=t}}}while(0);if((I|0)==1069){I=0;aA=ax;aB=F}dE(V|0,0,c[y>>2]<<2|0);aj=c[(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)+8>>2]|0;if((aj|0)==3){aC=M*+g[6896+((bw(b,3)|0)<<2)>>2]}else if((aj|0)==1){aC=M*+g[6936+((bw(b,1)|0)<<2)>>2]}else{aC=M}aj=c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0;ag=c[aj+40>>2]|0;if((ag|0)==0){I=1074;break}aU[ag&7](o,c[aj+44>>2]|0,c[y>>2]|0,b,n,W);bL(o,o,aC,c[y>>2]|0);if((c[(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)+12>>2]|0)!=0){aj=c[y>>2]|0;ag=aN()|0;ak=i;i=i+(aj*4|0)|0;i=i+7&-8;aj=c[y>>2]|0;dE(ak|0,0,aj<<2|0);ao=c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0;aU[c[ao+40>>2]&7](ak,c[ao+44>>2]|0,aj,b,n,W);bL(ak,ak,aC*.4545449912548065,c[y>>2]|0);aj=c[y>>2]|0;if((aj|0)>0){ao=0;do{ap=o+(ao<<2)|0;g[ap>>2]=+g[ap>>2]+ +g[ak+(ao<<2)>>2];ao=ao+1|0;}while((ao|0)<(aj|0))}aJ(ag|0)}aj=c[y>>2]|0;if((aj|0)>0){ao=0;while(1){g[af+(ao+ae<<2)>>2]=+g[D+(ao<<2)>>2]+ +g[o+(ao<<2)>>2];ak=ao+1|0;ap=c[y>>2]|0;if((ak|0)<(ap|0)){ao=ak}else{aD=ap;break}}}else{aD=aj}if((ai|0)!=0&(aD|0)>0){ao=0;while(1){g[ai+(ao<<2)>>2]=+g[o+(ao<<2)>>2];ag=ao+1|0;ap=c[y>>2]|0;if((ag|0)<(ap|0)){ao=ag}else{aE=ap;break}}}else{aE=aD}do{if((c[p>>2]|0)==1){dE(ah|0,0,aE<<2|0);ao=c[Y>>2]|0;aj=c[y>>2]|0;if((ao|0)<(aj|0)){ap=ao;ag=aj;while(1){if((ap|0)>-1){g[af+(ap+ae<<2)>>2]=u*+O(s);aF=c[Y>>2]|0;aG=c[y>>2]|0}else{aF=ap;aG=ag}ak=aF+N|0;c[Y>>2]=ak;if((ak|0)<(aG|0)){ap=ak;ag=aG}else{aH=ak;aI=aG;break}}}else{aH=ao;aI=aj}c[Y>>2]=aH-aI;if((aI|0)>0){aK=0}else{aL=aI;break}while(1){ag=af+(aK+ae<<2)|0;F=+g[ag>>2];ap=o+(aK<<2)|0;g[ag>>2]=F*.699999988079071+ +g[Z>>2]*.30000001192092896+(w*+g[ap>>2]-v*+g[$>>2]);g[Z>>2]=F;g[$>>2]=+g[ap>>2];F=+g[aa>>2]*.800000011920929+ +g[ag>>2]*.20000000298023224;g[aa>>2]=F;g[ag>>2]=+g[ag>>2]-F;ag=aK+1|0;ap=c[y>>2]|0;if((ag|0)<(ap|0)){aK=ag}else{aL=ap;break}}}else{aL=aE}}while(0);ae=ac+1|0;if((ae|0)<(c[R>>2]|0)){r=aw;t=aB;ab=aA;ac=ae;ad=aL}else{I=1091;break}}if((I|0)==1046){ch(12880,1321);return 0}else if((I|0)==1074){ch(12800,1397);return 0}else if((I|0)==1091){aM=aw*.25;aO=aA;break}}else{aM=0.0;aO=40}}while(0);aA=c[C>>2]|0;aL=i;i=i+(aA*4|0)|0;i=i+7&-8;do{if((c[a+136>>2]|0)==0){I=1096}else{aw=+g[(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)+48>>2];if(aw<=0.0){I=1096;break}if((c[L>>2]|0)!=0){I=1096;break}aE=a+52|0;aK=c[y>>2]|0;o=a+60|0;bY((c[aE>>2]|0)+(-aK<<2)|0,j,c[o>>2]|0,aA,aK<<1,aO,40,aw,n);aK=c[y>>2]|0;aI=aK<<1;bY((c[aE>>2]|0)+(aK<<2)|0,j+(aI<<2)|0,c[o>>2]|0,c[C>>2]|0,aI,aO,40,+g[(c[(c[K>>2]|0)+(c[p>>2]<<2)>>2]|0)+48>>2],n)}}while(0);if((I|0)==1096){I=(c[a+52>>2]|0)+(-(c[y>>2]|0)<<2)|0;p=c[J>>2]<<2;dB(d|0,I|0,p)|0}do{if((c[L>>2]|0)!=0){p=a+52|0;aw=M/(+bO(c[p>>2]|0,c[J>>2]|0)+1.0);aB=aw>2.0?2.0:aw;if((c[J>>2]|0)>0){aP=0}else{break}do{I=(c[p>>2]|0)+(aP<<2)|0;g[I>>2]=aB*+g[I>>2];g[j+(aP<<2)>>2]=+g[(c[p>>2]|0)+(aP-(c[y>>2]|0)<<2)>>2];aP=aP+1|0;}while((aP|0)<(c[J>>2]|0))}}while(0);aP=c[R>>2]|0;if((aP|0)>0){p=a+56|0;I=a+76|0;d=a+60|0;K=a+64|0;aA=0;aI=aP;aP=c[C>>2]|0;while(1){o=j+((_(c[y>>2]|0,aA)|0)<<2)|0;b2(c[p>>2]|0,A,aL,aP,aA,aI);b1(aL,c[C>>2]|0,.0020000000949949026);b0(aL,P,c[C>>2]|0,n);aK=c[C>>2]|0;if((aK|0)>0){aE=0;aB=1.0;while(1){aw=aB+(+g[P+((aE|1)<<2)>>2]- +g[P+(aE<<2)>>2]);aH=aE+2|0;if((aH|0)<(aK|0)){aE=aH;aB=aw}else{aQ=aw;break}}}else{aQ=1.0}g[(c[I>>2]|0)+(aA<<2)>>2]=aQ;bQ(o,c[d>>2]|0,o,c[y>>2]|0,c[C>>2]|0,c[K>>2]|0,n);aE=c[C>>2]|0;if((aE|0)>0){aK=0;while(1){g[(c[d>>2]|0)+(aK<<2)>>2]=+g[P+(aK<<2)>>2];aH=aK+1|0;aG=c[C>>2]|0;if((aH|0)<(aG|0)){aK=aH}else{aR=aG;break}}}else{aR=aE}aK=aA+1|0;o=c[R>>2]|0;if((aK|0)<(o|0)){aA=aK;aI=o;aP=aR}else{break}}}if((c[a+504>>2]|0)!=0){bK(j,j,c[J>>2]|0,(c[a+500>>2]|0)!=0?3:1,a+68|0)}aQ=M+1.0;g[a+84>>2]=aQ;J=a+88|0;aB=+g[J>>2]*.9900000095367432;aw=aB>aQ?aB:aQ;g[J>>2]=aw;j=a+92|0;aB=+g[j>>2]*1.0099999904632568+1.0;aC=aB<aQ?aB:aQ;g[j>>2]=aC;aQ=aC+1.0;if(aw<aQ){g[J>>2]=aQ}if((c[C>>2]|0)>0){J=a+56|0;j=0;do{g[(c[J>>2]|0)+(j<<2)>>2]=+g[A+(j<<2)>>2];j=j+1|0;}while((j|0)<(c[C>>2]|0))}c[q>>2]=0;c[L>>2]=0;c[a+96>>2]=aO;g[a+100>>2]=aM;aO=a+116|0;L=c[aO>>2]|0;c[aO>>2]=L+1;g[a+104+(L<<2)>>2]=aM;if((c[aO>>2]|0)>2){c[aO>>2]=0}g[a+40>>2]=M;aJ(x|0);H=0;i=e;return H|0}function cl(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0.0,v=0,w=0;e=i;i=i+40|0;f=e|0;h=e+8|0;j=e+16|0;k=e+24|0;l=e+32|0;switch(b|0){case 8:case 6:{n=c[d>>2]|0;c[a+212>>2]=n;c[a+216>>2]=n;o=0;i=e;return o|0};case 17:{c[d>>2]=c[a+192>>2];o=0;i=e;return o|0};case 18:{c[k>>2]=10;n=c[d>>2]|0;p=k;q=l;while(1){cK(a,4,p)|0;cK(a,19,q)|0;if((c[l>>2]|0)<=(n|0)){o=0;r=1227;break}s=c[k>>2]|0;c[k>>2]=s-1;if((s|0)<=0){o=0;r=1232;break}}if((r|0)==1227){i=e;return o|0}else if((r|0)==1232){i=e;return o|0}break};case 12:{c[a+156>>2]=c[d>>2];o=0;i=e;return o|0};case 101:{r=a+16|0;if((c[r>>2]|0)<=0){o=0;i=e;return o|0}k=a+80|0;n=a+12|0;l=d;q=0;while(1){p=c[n>>2]|0;g[l+(q<<2)>>2]=+bO((c[k>>2]|0)+((_(p,q)|0)<<2)|0,p);p=q+1|0;if((p|0)<(c[r>>2]|0)){q=p}else{o=0;break}}i=e;return o|0};case 34:{c[a+168>>2]=c[d>>2];o=0;i=e;return o|0};case 35:{c[d>>2]=c[a+168>>2];o=0;i=e;return o|0};case 42:{c[a+160>>2]=c[d>>2];o=0;i=e;return o|0};case 43:{c[d>>2]=c[a+160>>2];o=0;i=e;return o|0};case 44:{c[a+224>>2]=c[d>>2];o=0;i=e;return o|0};case 45:{c[d>>2]=c[a+224>>2];o=0;i=e;return o|0};case 100:{q=d;r=a+16|0;if((c[r>>2]|0)<=0){o=0;i=e;return o|0}k=a+136|0;l=0;while(1){g[q+(l<<2)>>2]=+g[(c[k>>2]|0)+(l<<2)>>2];n=l+1|0;if((n|0)<(c[r>>2]|0)){l=n}else{o=0;break}}i=e;return o|0};case 29:{g[d>>2]=+g[a+152>>2];o=0;i=e;return o|0};case 4:{l=c[d>>2]|0;r=(l|0)<0?0:l;l=c[(c[c[a>>2]>>2]|0)+100+(((r|0)>10?10:r)<<2)>>2]|0;c[a+212>>2]=l;c[a+216>>2]=l;o=0;i=e;return o|0};case 15:{g[d>>2]=+g[a+148>>2];o=0;i=e;return o|0};case 104:{c[a+140>>2]=d;o=0;i=e;return o|0};case 105:{c[a+220>>2]=c[d>>2];o=0;i=e;return o|0};case 106:{c[d>>2]=c[a+68>>2];o=0;i=e;return o|0};case 9:case 7:{c[d>>2]=c[a+212>>2];o=0;i=e;return o|0};case 39:{c[d>>2]=(c[a+20>>2]|0)-(c[a+8>>2]|0);o=0;i=e;return o|0};case 40:{l=c[d>>2]|0;r=a+200|0;c[r>>2]=l;if((l|0)<=100){o=0;i=e;return o|0}c[r>>2]=100;o=0;i=e;return o|0};case 41:{c[d>>2]=c[a+200>>2];o=0;i=e;return o|0};case 32:{r=d;l=c[r>>2]|0;c[a+176>>2]=l;k=(l|0)!=0;c[a+156>>2]=k&1;if(!k){o=0;i=e;return o|0}c[f>>2]=10;k=c[r>>2]|0;r=f;l=h;while(1){cK(a,4,r)|0;cK(a,19,l)|0;q=c[f>>2]|0;if((c[h>>2]|0)<=(k|0)){t=q;break}n=q-1|0;c[f>>2]=n;if((q|0)<=0){t=n;break}}u=+(t|0);g[j>>2]=u<0.0?0.0:u;cK(a,14,j)|0;g[a+188>>2]=0.0;g[a+180>>2]=0.0;g[a+184>>2]=0.0;o=0;i=e;return o|0};case 3:{c[d>>2]=c[a+8>>2];o=0;i=e;return o|0};case 30:{c[a+164>>2]=c[d>>2];o=0;i=e;return o|0};case 25:{c[d>>2]=c[a+196>>2];o=0;i=e;return o|0};case 26:{c[a+40>>2]=1;c[a+4>>2]=1;j=a+24|0;t=c[j>>2]|0;do{if((t|0)>0){f=a+100|0;k=0;h=t;while(1){l=k+1|0;g[(c[f>>2]|0)+(k<<2)>>2]=+(l|0)*3.1415927410125732/+(h+1|0);v=c[j>>2]|0;if((l|0)<(v|0)){k=l;h=v}else{break}}if((v|0)<=0){break}h=a+120|0;k=a+108|0;f=a+116|0;l=a+112|0;r=0;do{g[(c[h>>2]|0)+(r<<2)>>2]=0.0;g[(c[k>>2]|0)+(r<<2)>>2]=0.0;g[(c[f>>2]|0)+(r<<2)>>2]=0.0;g[(c[l>>2]|0)+(r<<2)>>2]=0.0;r=r+1|0;}while((r|0)<(c[j>>2]|0))}}while(0);j=a+8|0;v=c[j>>2]|0;t=a+32|0;if((v+1+(c[t>>2]|0)|0)>0){r=a+84|0;l=a+76|0;f=0;while(1){g[(c[r>>2]|0)+(f<<2)>>2]=0.0;g[(c[l>>2]|0)+(f<<2)>>2]=0.0;k=f+1|0;h=c[j>>2]|0;if((k|0)<(h+1+(c[t>>2]|0)|0)){f=k}else{w=h;break}}}else{w=v}v=a+20|0;if(((c[v>>2]|0)-w|0)<=0){o=0;i=e;return o|0}w=a+72|0;f=0;while(1){g[(c[w>>2]|0)+(f<<2)>>2]=0.0;t=f+1|0;if((t|0)<((c[v>>2]|0)-(c[j>>2]|0)|0)){f=t}else{o=0;break}}i=e;return o|0};case 14:{g[a+148>>2]=+g[d>>2];o=0;i=e;return o|0};case 31:{c[d>>2]=c[a+164>>2];o=0;i=e;return o|0};case 19:{f=c[(c[a+208>>2]|0)+(c[a+212>>2]<<2)>>2]|0;j=c[a+196>>2]|0;if((f|0)==0){c[d>>2]=(j*5|0|0)/(c[a+8>>2]|0)|0;o=0;i=e;return o|0}else{v=_(c[f+52>>2]|0,j)|0;c[d>>2]=(v|0)/(c[a+8>>2]|0)|0;o=0;i=e;return o|0}break};case 24:{c[a+196>>2]=c[d>>2];o=0;i=e;return o|0};case 13:{c[d>>2]=c[a+156>>2];o=0;i=e;return o|0};case 33:{c[d>>2]=c[a+176>>2];o=0;i=e;return o|0};case 36:{c[a+204>>2]=c[d>>2];o=0;i=e;return o|0};case 37:{c[d>>2]=c[a+204>>2];o=0;i=e;return o|0};case 16:{v=c[d>>2]|0;d=a+192|0;c[d>>2]=v;if((v|0)>=0){o=0;i=e;return o|0}c[d>>2]=0;o=0;i=e;return o|0};default:{as(c[m>>2]|0,12680,(d=i,i=i+16|0,c[d>>2]=12712,c[d+8>>2]=b,d)|0)|0;i=d;o=-1;i=e;return o|0}}return 0}function cm(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0.0,n=0.0,o=0,p=0,q=0;e=i;switch(b|0){case 19:{f=c[(c[a+128>>2]|0)+(c[a+132>>2]<<2)>>2]|0;h=c[a+36>>2]|0;if((f|0)==0){c[d>>2]=(h*5|0|0)/(c[a+12>>2]|0)|0;j=0;i=e;return j|0}else{k=_(c[f+52>>2]|0,h)|0;c[d>>2]=(k|0)/(c[a+12>>2]|0)|0;j=0;i=e;return j|0}break};case 24:{c[a+36>>2]=c[d>>2];j=0;i=e;return j|0};case 47:{l=+g[a+92>>2];n=+Y(+g[a+84>>2]/l)/+Y(+g[a+88>>2]/l);l=n>1.0?1.0:n;c[d>>2]=l>0.0?~~(l*100.0):0;j=0;i=e;return j|0};case 100:{k=d;h=a+20|0;if((c[h>>2]|0)<=0){j=0;i=e;return j|0}f=a+76|0;o=0;while(1){g[k+(o<<2)>>2]=+g[(c[f>>2]|0)+(o<<2)>>2];p=o+1|0;if((p|0)<(c[h>>2]|0)){o=p}else{j=0;break}}i=e;return j|0};case 20:{o=d;h=a+140|0;c[h+((c[o>>2]|0)*20|0)+4>>2]=c[d+4>>2];c[h+((c[o>>2]|0)*20|0)+8>>2]=c[d+8>>2];f=c[o>>2]|0;c[h+(f*20|0)>>2]=f;j=0;i=e;return j|0};case 8:case 6:{c[a+132>>2]=c[d>>2];j=0;i=e;return j|0};case 36:{c[a+124>>2]=c[d>>2];j=0;i=e;return j|0};case 106:{c[d>>2]=c[a+44>>2];j=0;i=e;return j|0};case 26:{f=a+24|0;if((c[f>>2]|0)>0){h=a+64|0;o=0;do{g[(c[h>>2]|0)+(o<<2)>>2]=0.0;o=o+1|0;}while((o|0)<(c[f>>2]|0))}f=a+12|0;o=a+32|0;if(((c[f>>2]|0)+1+(c[o>>2]|0)|0)<=0){j=0;i=e;return j|0}h=a+48|0;k=0;while(1){g[(c[h>>2]|0)+(k<<2)>>2]=0.0;p=k+1|0;if((p|0)<((c[f>>2]|0)+1+(c[o>>2]|0)|0)){k=p}else{j=0;break}}i=e;return j|0};case 101:{k=a+20|0;if((c[k>>2]|0)<=0){j=0;i=e;return j|0}o=a+52|0;f=a+16|0;h=d;p=0;while(1){q=c[f>>2]|0;g[h+(p<<2)>>2]=+bO((c[o>>2]|0)+((_(q,p)|0)<<2)|0,q);q=p+1|0;if((q|0)<(c[k>>2]|0)){p=q}else{j=0;break}}i=e;return j|0};case 9:case 7:{c[d>>2]=c[a+132>>2];j=0;i=e;return j|0};case 0:{c[a+136>>2]=c[d>>2];j=0;i=e;return j|0};case 22:{c[a+464>>2]=c[d+4>>2];c[a+468>>2]=c[d+8>>2];c[a+460>>2]=c[d>>2];j=0;i=e;return j|0};case 3:{c[d>>2]=c[a+12>>2];j=0;i=e;return j|0};case 105:{c[a+500>>2]=c[d>>2];j=0;i=e;return j|0};case 37:{c[d>>2]=c[a+124>>2];j=0;i=e;return j|0};case 39:{c[d>>2]=c[a+16>>2];j=0;i=e;return j|0};case 1:{c[d>>2]=c[a+136>>2];j=0;i=e;return j|0};case 103:{c[d>>2]=c[a+496>>2];j=0;i=e;return j|0};case 25:{c[d>>2]=c[a+36>>2];j=0;i=e;return j|0};case 44:{c[a+504>>2]=c[d>>2];j=0;i=e;return j|0};case 45:{c[d>>2]=c[a+504>>2];j=0;i=e;return j|0};case 104:{c[a+80>>2]=d;j=0;i=e;return j|0};default:{as(c[m>>2]|0,12680,(d=i,i=i+16|0,c[d>>2]=12712,c[d+8>>2]=b,d)|0)|0;i=d;j=-1;i=e;return j|0}}return 0}function cn(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0.0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0,u=0,v=0,w=0,x=0,y=0.0,z=0,A=0,B=0.0,C=0.0,D=0,E=0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0.0,N=0.0,O=0.0,P=0,Q=0,R=0,S=0,T=0,U=0;f=i;i=i+40|0;h=f|0;j=(d|0)>0;do{if(j){k=0;do{g[c+(k<<2)>>2]=+g[b+(k<<2)>>2];k=k+1|0;}while((k|0)<(d|0));if(!j){l=0;m=999999986991104.0;n=0;o=1326;break}k=d-1|0;p=0;while(1){q=+g[c+(p<<2)>>2];if((p|0)==0){r=q}else{r=q- +g[c+(p-1<<2)>>2]}if((p|0)==(k|0)){s=3.141592653589793-q;t=d}else{u=p+1|0;s=+g[c+(u<<2)>>2]-q;t=u}g[h+(p<<2)>>2]=10.0/((s<r?s:r)+.04);if((t|0)<(d|0)){p=t}else{break}}if(j){v=0}else{l=0;m=999999986991104.0;n=0;o=1326;break}do{p=c+(v<<2)|0;g[p>>2]=+g[p>>2]-(+(v|0)*.25+.25);v=v+1|0;}while((v|0)<(d|0));if(j){w=0}else{l=0;m=999999986991104.0;n=0;o=1326;break}do{p=c+(w<<2)|0;g[p>>2]=+g[p>>2]*256.0;w=w+1|0;}while((w|0)<(d|0));if(j){x=0;y=999999986991104.0;z=0;A=12e3}else{l=0;m=999999986991104.0;n=0;o=1326;break}while(1){p=0;q=0.0;k=A;while(1){B=+g[c+(p<<2)>>2]- +(a[k]|0);C=q+B*B;u=p+1|0;if((u|0)<(d|0)){p=u;q=C;k=k+1|0}else{break}}k=C<y;p=k?x:z;u=x+1|0;if((u|0)<64){x=u;y=k?C:y;z=p;A=A+d|0}else{D=p;break}}}else{l=0;m=999999986991104.0;n=0;o=1326}}while(0);if((o|0)==1326){while(1){o=0;A=m>0.0;z=A?l:n;x=l+1|0;if((x|0)<64){l=x;m=A?0.0:m;n=z;o=1326}else{D=z;break}}}do{if(j){o=_(D,d)|0;n=0;do{l=c+(n<<2)|0;g[l>>2]=+g[l>>2]- +(a[12e3+(n+o)|0]|0);n=n+1|0;}while((n|0)<(d|0));bu(e,D,6);if(j){E=0}else{break}do{n=c+(E<<2)|0;g[n>>2]=+g[n>>2]*2.0;E=E+1|0;}while((E|0)<(d|0))}else{bu(e,D,6)}}while(0);m=+g[c>>2];y=+g[h>>2];D=c+4|0;C=+g[D>>2];r=+g[h+4>>2];E=c+8|0;s=+g[E>>2];q=+g[h+8>>2];n=c+12|0;B=+g[n>>2];F=+g[h+12>>2];o=c+16|0;G=+g[o>>2];H=+g[h+16>>2];l=0;I=999999986991104.0;z=0;A=11040;while(1){J=m- +(a[A]|0);K=C- +(a[A+1|0]|0);L=s- +(a[A+2|0]|0);M=B- +(a[A+3|0]|0);N=G- +(a[A+4|0]|0);O=y*J*J+0.0+r*K*K+q*L*L+F*M*M+H*N*N;x=O<I;P=x?l:z;w=l+1|0;if((w|0)<64){l=w;I=x?O:I;z=P;A=A+5|0}else{break}}A=P*5|0;g[c>>2]=m- +(a[11040+A|0]|0);g[D>>2]=C- +(a[A+11041|0]|0);g[E>>2]=s- +(a[A+11042|0]|0);g[n>>2]=B- +(a[A+11043|0]|0);g[o>>2]=G- +(a[A+11044|0]|0);bu(e,P,6);G=+g[c>>2]*2.0;g[c>>2]=G;B=+g[D>>2]*2.0;g[D>>2]=B;s=+g[E>>2]*2.0;g[E>>2]=s;C=+g[n>>2]*2.0;g[n>>2]=C;m=+g[o>>2]*2.0;g[o>>2]=m;P=0;I=999999986991104.0;A=0;z=10720;while(1){O=G- +(a[z]|0);N=B- +(a[z+1|0]|0);M=s- +(a[z+2|0]|0);L=C- +(a[z+3|0]|0);K=m- +(a[z+4|0]|0);J=y*O*O+0.0+r*N*N+q*M*M+F*L*L+H*K*K;l=J<I;Q=l?P:A;x=P+1|0;if((x|0)<64){P=x;I=l?J:I;A=Q;z=z+5|0}else{break}}z=Q*5|0;g[c>>2]=G- +(a[10720+z|0]|0);g[D>>2]=B- +(a[z+10721|0]|0);g[E>>2]=s- +(a[z+10722|0]|0);g[n>>2]=C- +(a[z+10723|0]|0);g[o>>2]=m- +(a[z+10724|0]|0);bu(e,Q,6);Q=c+20|0;m=+g[Q>>2];C=+g[h+20>>2];z=c+24|0;s=+g[z>>2];B=+g[h+24>>2];o=c+28|0;G=+g[o>>2];I=+g[h+28>>2];n=c+32|0;H=+g[n>>2];F=+g[h+32>>2];E=c+36|0;q=+g[E>>2];r=+g[h+36>>2];h=0;y=999999986991104.0;D=0;A=11680;while(1){J=m- +(a[A]|0);K=s- +(a[A+1|0]|0);L=G- +(a[A+2|0]|0);M=H- +(a[A+3|0]|0);N=q- +(a[A+4|0]|0);O=C*J*J+0.0+B*K*K+I*L*L+F*M*M+r*N*N;P=O<y;R=P?h:D;l=h+1|0;if((l|0)<64){h=l;y=P?O:y;D=R;A=A+5|0}else{break}}A=R*5|0;g[Q>>2]=m- +(a[11680+A|0]|0);g[z>>2]=s- +(a[A+11681|0]|0);g[o>>2]=G- +(a[A+11682|0]|0);g[n>>2]=H- +(a[A+11683|0]|0);g[E>>2]=q- +(a[A+11684|0]|0);bu(e,R,6);q=+g[Q>>2]*2.0;g[Q>>2]=q;H=+g[z>>2]*2.0;g[z>>2]=H;G=+g[o>>2]*2.0;g[o>>2]=G;s=+g[n>>2]*2.0;g[n>>2]=s;m=+g[E>>2]*2.0;g[E>>2]=m;R=0;y=999999986991104.0;A=0;D=11360;while(1){O=q- +(a[D]|0);N=H- +(a[D+1|0]|0);M=G- +(a[D+2|0]|0);L=s- +(a[D+3|0]|0);K=m- +(a[D+4|0]|0);J=C*O*O+0.0+B*N*N+I*M*M+F*L*L+r*K*K;h=J<y;S=h?R:A;P=R+1|0;if((P|0)<64){R=P;y=h?J:y;A=S;D=D+5|0}else{break}}D=S*5|0;g[Q>>2]=q- +(a[11360+D|0]|0);g[z>>2]=H- +(a[D+11361|0]|0);g[o>>2]=G- +(a[D+11362|0]|0);g[n>>2]=s- +(a[D+11363|0]|0);g[E>>2]=m- +(a[D+11364|0]|0);bu(e,S,6);if(j){T=0}else{i=f;return}do{S=c+(T<<2)|0;g[S>>2]=+g[S>>2]*97656.0e-8;T=T+1|0;}while((T|0)<(d|0));if(j){U=0}else{i=f;return}do{j=c+(U<<2)|0;g[j>>2]=+g[b+(U<<2)>>2]- +g[j>>2];U=U+1|0;}while((U|0)<(d|0));i=f;return}function co(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;if((c|0)>0){e=0;do{g[b+(e<<2)>>2]=+(e|0)*.25+.25;e=e+1|0;}while((e|0)<(c|0))}c=(bw(d,6)|0)*10|0;g[b>>2]=+g[b>>2]+ +(a[12e3+c|0]|0)*.0039062;e=b+4|0;g[e>>2]=+g[e>>2]+ +(a[12e3+(c|1)|0]|0)*.0039062;f=b+8|0;g[f>>2]=+g[f>>2]+ +(a[c+12002|0]|0)*.0039062;h=b+12|0;g[h>>2]=+g[h>>2]+ +(a[c+12003|0]|0)*.0039062;i=b+16|0;g[i>>2]=+g[i>>2]+ +(a[c+12004|0]|0)*.0039062;j=b+20|0;g[j>>2]=+g[j>>2]+ +(a[c+12005|0]|0)*.0039062;k=b+24|0;g[k>>2]=+g[k>>2]+ +(a[c+12006|0]|0)*.0039062;l=b+28|0;g[l>>2]=+g[l>>2]+ +(a[c+12007|0]|0)*.0039062;m=b+32|0;g[m>>2]=+g[m>>2]+ +(a[c+12008|0]|0)*.0039062;n=b+36|0;g[n>>2]=+g[n>>2]+ +(a[c+12009|0]|0)*.0039062;c=(bw(d,6)|0)*5|0;g[b>>2]=+g[b>>2]+ +(a[11040+c|0]|0)*.0019531;g[e>>2]=+g[e>>2]+ +(a[c+11041|0]|0)*.0019531;g[f>>2]=+g[f>>2]+ +(a[c+11042|0]|0)*.0019531;g[h>>2]=+g[h>>2]+ +(a[c+11043|0]|0)*.0019531;g[i>>2]=+g[i>>2]+ +(a[c+11044|0]|0)*.0019531;c=(bw(d,6)|0)*5|0;g[b>>2]=+g[b>>2]+ +(a[10720+c|0]|0)*97656.0e-8;g[e>>2]=+g[e>>2]+ +(a[c+10721|0]|0)*97656.0e-8;g[f>>2]=+g[f>>2]+ +(a[c+10722|0]|0)*97656.0e-8;g[h>>2]=+g[h>>2]+ +(a[c+10723|0]|0)*97656.0e-8;g[i>>2]=+g[i>>2]+ +(a[c+10724|0]|0)*97656.0e-8;c=(bw(d,6)|0)*5|0;g[j>>2]=+g[j>>2]+ +(a[11680+c|0]|0)*.0019531;g[k>>2]=+g[k>>2]+ +(a[c+11681|0]|0)*.0019531;g[l>>2]=+g[l>>2]+ +(a[c+11682|0]|0)*.0019531;g[m>>2]=+g[m>>2]+ +(a[c+11683|0]|0)*.0019531;g[n>>2]=+g[n>>2]+ +(a[c+11684|0]|0)*.0019531;c=(bw(d,6)|0)*5|0;g[j>>2]=+g[j>>2]+ +(a[11360+c|0]|0)*97656.0e-8;g[k>>2]=+g[k>>2]+ +(a[c+11361|0]|0)*97656.0e-8;g[l>>2]=+g[l>>2]+ +(a[c+11362|0]|0)*97656.0e-8;g[m>>2]=+g[m>>2]+ +(a[c+11363|0]|0)*97656.0e-8;g[n>>2]=+g[n>>2]+ +(a[c+11364|0]|0)*97656.0e-8;return}function cp(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0.0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0,u=0,v=0,w=0,x=0,y=0.0,z=0,A=0,B=0.0,C=0.0,D=0,E=0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0.0,N=0.0,O=0.0,P=0,Q=0,R=0,S=0;f=i;i=i+40|0;h=f|0;j=(d|0)>0;do{if(j){k=0;do{g[c+(k<<2)>>2]=+g[b+(k<<2)>>2];k=k+1|0;}while((k|0)<(d|0));if(!j){l=0;m=999999986991104.0;n=0;o=1370;break}k=d-1|0;p=0;while(1){q=+g[c+(p<<2)>>2];if((p|0)==0){r=q}else{r=q- +g[c+(p-1<<2)>>2]}if((p|0)==(k|0)){s=3.141592653589793-q;t=d}else{u=p+1|0;s=+g[c+(u<<2)>>2]-q;t=u}g[h+(p<<2)>>2]=10.0/((s<r?s:r)+.04);if((t|0)<(d|0)){p=t}else{break}}if(j){v=0}else{l=0;m=999999986991104.0;n=0;o=1370;break}do{p=c+(v<<2)|0;g[p>>2]=+g[p>>2]-(+(v|0)*.25+.25);v=v+1|0;}while((v|0)<(d|0));if(j){w=0}else{l=0;m=999999986991104.0;n=0;o=1370;break}do{p=c+(w<<2)|0;g[p>>2]=+g[p>>2]*256.0;w=w+1|0;}while((w|0)<(d|0));if(j){x=0;y=999999986991104.0;z=0;A=12e3}else{l=0;m=999999986991104.0;n=0;o=1370;break}while(1){p=0;q=0.0;k=A;while(1){B=+g[c+(p<<2)>>2]- +(a[k]|0);C=q+B*B;u=p+1|0;if((u|0)<(d|0)){p=u;q=C;k=k+1|0}else{break}}k=C<y;p=k?x:z;u=x+1|0;if((u|0)<64){x=u;y=k?C:y;z=p;A=A+d|0}else{D=p;break}}}else{l=0;m=999999986991104.0;n=0;o=1370}}while(0);if((o|0)==1370){while(1){o=0;A=m>0.0;z=A?l:n;x=l+1|0;if((x|0)<64){l=x;m=A?0.0:m;n=z;o=1370}else{D=z;break}}}do{if(j){o=_(D,d)|0;n=0;do{l=c+(n<<2)|0;g[l>>2]=+g[l>>2]- +(a[12e3+(n+o)|0]|0);n=n+1|0;}while((n|0)<(d|0));bu(e,D,6);if(j){E=0}else{break}do{n=c+(E<<2)|0;g[n>>2]=+g[n>>2]*2.0;E=E+1|0;}while((E|0)<(d|0))}else{bu(e,D,6)}}while(0);m=+g[c>>2];D=c+4|0;y=+g[D>>2];E=c+8|0;C=+g[E>>2];n=c+12|0;r=+g[n>>2];o=c+16|0;s=+g[o>>2];q=+g[h>>2];B=+g[h+4>>2];F=+g[h+8>>2];G=+g[h+12>>2];H=+g[h+16>>2];l=0;I=999999986991104.0;z=0;A=11040;while(1){J=m- +(a[A]|0);K=y- +(a[A+1|0]|0);L=C- +(a[A+2|0]|0);M=r- +(a[A+3|0]|0);N=s- +(a[A+4|0]|0);O=q*J*J+0.0+B*K*K+F*L*L+G*M*M+H*N*N;x=O<I;P=x?l:z;w=l+1|0;if((w|0)>=64){break}l=w;I=x?O:I;z=P;A=A+5|0}A=P*5|0;g[c>>2]=m- +(a[11040+A|0]|0);g[D>>2]=y- +(a[A+11041|0]|0);g[E>>2]=C- +(a[A+11042|0]|0);g[n>>2]=r- +(a[A+11043|0]|0);g[o>>2]=s- +(a[A+11044|0]|0);bu(e,P,6);P=c+20|0;s=+g[P>>2];r=+g[h+20>>2];A=c+24|0;C=+g[A>>2];y=+g[h+24>>2];o=c+28|0;m=+g[o>>2];I=+g[h+28>>2];n=c+32|0;H=+g[n>>2];G=+g[h+32>>2];E=c+36|0;F=+g[E>>2];B=+g[h+36>>2];h=0;q=999999986991104.0;D=0;z=11680;while(1){O=s- +(a[z]|0);N=C- +(a[z+1|0]|0);M=m- +(a[z+2|0]|0);L=H- +(a[z+3|0]|0);K=F- +(a[z+4|0]|0);J=r*O*O+0.0+y*N*N+I*M*M+G*L*L+B*K*K;l=J<q;Q=l?h:D;x=h+1|0;if((x|0)<64){h=x;q=l?J:q;D=Q;z=z+5|0}else{break}}z=Q*5|0;g[P>>2]=s- +(a[11680+z|0]|0);g[A>>2]=C- +(a[z+11681|0]|0);g[o>>2]=m- +(a[z+11682|0]|0);g[n>>2]=H- +(a[z+11683|0]|0);g[E>>2]=F- +(a[z+11684|0]|0);bu(e,Q,6);if(j){R=0}else{i=f;return}do{Q=c+(R<<2)|0;g[Q>>2]=+g[Q>>2]*.0019531;R=R+1|0;}while((R|0)<(d|0));if(j){S=0}else{i=f;return}do{j=c+(S<<2)|0;g[j>>2]=+g[b+(S<<2)>>2]- +g[j>>2];S=S+1|0;}while((S|0)<(d|0));i=f;return}function cq(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;if((c|0)>0){e=0;do{g[b+(e<<2)>>2]=+(e|0)*.25+.25;e=e+1|0;}while((e|0)<(c|0))}c=(bw(d,6)|0)*10|0;g[b>>2]=+g[b>>2]+ +(a[12e3+c|0]|0)*.0039062;e=b+4|0;g[e>>2]=+g[e>>2]+ +(a[12e3+(c|1)|0]|0)*.0039062;f=b+8|0;g[f>>2]=+g[f>>2]+ +(a[c+12002|0]|0)*.0039062;h=b+12|0;g[h>>2]=+g[h>>2]+ +(a[c+12003|0]|0)*.0039062;i=b+16|0;g[i>>2]=+g[i>>2]+ +(a[c+12004|0]|0)*.0039062;j=b+20|0;g[j>>2]=+g[j>>2]+ +(a[c+12005|0]|0)*.0039062;k=b+24|0;g[k>>2]=+g[k>>2]+ +(a[c+12006|0]|0)*.0039062;l=b+28|0;g[l>>2]=+g[l>>2]+ +(a[c+12007|0]|0)*.0039062;m=b+32|0;g[m>>2]=+g[m>>2]+ +(a[c+12008|0]|0)*.0039062;n=b+36|0;g[n>>2]=+g[n>>2]+ +(a[c+12009|0]|0)*.0039062;c=(bw(d,6)|0)*5|0;g[b>>2]=+g[b>>2]+ +(a[11040+c|0]|0)*.0019531;g[e>>2]=+g[e>>2]+ +(a[c+11041|0]|0)*.0019531;g[f>>2]=+g[f>>2]+ +(a[c+11042|0]|0)*.0019531;g[h>>2]=+g[h>>2]+ +(a[c+11043|0]|0)*.0019531;g[i>>2]=+g[i>>2]+ +(a[c+11044|0]|0)*.0019531;c=(bw(d,6)|0)*5|0;g[j>>2]=+g[j>>2]+ +(a[11680+c|0]|0)*.0019531;g[k>>2]=+g[k>>2]+ +(a[c+11681|0]|0)*.0019531;g[l>>2]=+g[l>>2]+ +(a[c+11682|0]|0)*.0019531;g[m>>2]=+g[m>>2]+ +(a[c+11683|0]|0)*.0019531;g[n>>2]=+g[n>>2]+ +(a[c+11684|0]|0)*.0019531;return}function cr(b,c,d,e){b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0.0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0,u=0,v=0,w=0,x=0,y=0.0,z=0,A=0,B=0.0,C=0.0,D=0,E=0,F=0,G=0.0,H=0,I=0,J=0.0,K=0,L=0,M=0.0,N=0,O=0,P=0;f=i;i=i+40|0;h=f|0;j=(d|0)>0;do{if(j){k=0;do{g[c+(k<<2)>>2]=+g[b+(k<<2)>>2];k=k+1|0;}while((k|0)<(d|0));if(!j){l=0;m=999999986991104.0;n=0;o=1411;break}k=d-1|0;p=0;while(1){q=+g[c+(p<<2)>>2];if((p|0)==0){r=q}else{r=q- +g[c+(p-1<<2)>>2]}if((p|0)==(k|0)){s=3.141592653589793-q;t=d}else{u=p+1|0;s=+g[c+(u<<2)>>2]-q;t=u}g[h+(p<<2)>>2]=10.0/((s<r?s:r)+.04);if((t|0)<(d|0)){p=t}else{break}}if(j){v=0}else{l=0;m=999999986991104.0;n=0;o=1411;break}do{p=c+(v<<2)|0;g[p>>2]=+g[p>>2]-(+(v|0)*.3125+.75);v=v+1|0;}while((v|0)<(d|0));if(j){w=0}else{l=0;m=999999986991104.0;n=0;o=1411;break}do{p=c+(w<<2)|0;g[p>>2]=+g[p>>2]*256.0;w=w+1|0;}while((w|0)<(d|0));if(j){x=0;y=999999986991104.0;z=0;A=3920}else{l=0;m=999999986991104.0;n=0;o=1411;break}while(1){p=0;q=0.0;k=A;while(1){B=+g[c+(p<<2)>>2]- +(a[k]|0);C=q+B*B;u=p+1|0;if((u|0)<(d|0)){p=u;q=C;k=k+1|0}else{break}}k=C<y;p=k?x:z;u=x+1|0;if((u|0)<64){x=u;y=k?C:y;z=p;A=A+d|0}else{D=p;break}}}else{l=0;m=999999986991104.0;n=0;o=1411}}while(0);if((o|0)==1411){while(1){o=0;A=m>0.0;z=A?l:n;x=l+1|0;if((x|0)<64){l=x;m=A?0.0:m;n=z;o=1411}else{D=z;break}}}do{if(j){n=_(D,d)|0;l=0;do{z=c+(l<<2)|0;g[z>>2]=+g[z>>2]- +(a[3920+(l+n)|0]|0);l=l+1|0;}while((l|0)<(d|0));bu(e,D,6);if(j){E=0}else{F=0;G=999999986991104.0;H=0;o=1422;break}do{l=c+(E<<2)|0;g[l>>2]=+g[l>>2]*2.0;E=E+1|0;}while((E|0)<(d|0));if(j){I=0;J=999999986991104.0;K=0;L=3408}else{F=0;G=999999986991104.0;H=0;o=1422;break}while(1){l=0;m=0.0;n=L;while(1){y=+g[c+(l<<2)>>2]- +(a[n]|0);M=m+ +g[h+(l<<2)>>2]*y*y;z=l+1|0;if((z|0)<(d|0)){l=z;m=M;n=n+1|0}else{break}}n=M<J;l=n?I:K;z=I+1|0;if((z|0)<64){I=z;J=n?M:J;K=l;L=L+d|0}else{N=l;break}}}else{bu(e,D,6);F=0;G=999999986991104.0;H=0;o=1422}}while(0);if((o|0)==1422){while(1){o=0;D=G>0.0;L=D?F:H;K=F+1|0;if((K|0)<64){F=K;G=D?0.0:G;H=L;o=1422}else{N=L;break}}}if(!j){bu(e,N,6);i=f;return}o=_(N,d)|0;H=0;do{F=c+(H<<2)|0;g[F>>2]=+g[F>>2]- +(a[3408+(H+o)|0]|0);H=H+1|0;}while((H|0)<(d|0));bu(e,N,6);if(j){O=0}else{i=f;return}do{N=c+(O<<2)|0;g[N>>2]=+g[N>>2]*.0019531;O=O+1|0;}while((O|0)<(d|0));if(j){P=0}else{i=f;return}do{j=c+(P<<2)|0;g[j>>2]=+g[b+(P<<2)>>2]- +g[j>>2];P=P+1|0;}while((P|0)<(d|0));i=f;return}function cs(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,i=0;e=(c|0)>0;do{if(e){f=0;do{g[b+(f<<2)>>2]=+(f|0)*.3125+.75;f=f+1|0;}while((f|0)<(c|0));f=bw(d,6)|0;if(!e){break}h=_(f,c)|0;f=0;do{i=b+(f<<2)|0;g[i>>2]=+g[i>>2]+ +(a[3920+(f+h)|0]|0)*.0039062;f=f+1|0;}while((f|0)<(c|0));f=bw(d,6)|0;if(!e){return}h=_(f,c)|0;f=0;do{i=b+(f<<2)|0;g[i>>2]=+g[i>>2]+ +(a[3408+(f+h)|0]|0)*.0019531;f=f+1|0;}while((f|0)<(c|0));return}else{bw(d,6)|0}}while(0);bw(d,6)|0;return}function ct(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;b=i;i=i+8|0;d=b|0;e=di(172,1)|0;if((e|0)==0){f=0;i=b;return f|0}c[e>>2]=a;h=c[a>>2]|0;a=cC(c[h>>2]|0)|0;j=e+4|0;c[j>>2]=a;c[e+48>>2]=0;k=h+4|0;c[e+8>>2]=c[k>>2]<<1;l=c[k>>2]|0;m=e+12|0;c[m>>2]=l;n=h+8|0;o=c[n>>2]|0;c[e+16>>2]=o;p=e+20|0;c[p>>2]=(c[k>>2]|0)/(c[n>>2]|0)|0;n=e+24|0;c[n>>2]=o+l;l=e+28|0;c[l>>2]=c[h+12>>2];c[e+148>>2]=1;c[e+152>>2]=h+32;o=c[h+64>>2]|0;c[e+156>>2]=o;c[e+160>>2]=o;c[d>>2]=9;o=d;cK(a,4,o)|0;c[d>>2]=1;cK(c[j>>2]|0,105,o)|0;g[e+36>>2]=+g[h+24>>2];g[e+40>>2]=+g[h+16>>2];g[e+44>>2]=+g[h+20>>2];c[e+32>>2]=1;c[e+52>>2]=di((c[n>>2]|0)-(c[m>>2]|0)<<2,1)|0;c[e+56>>2]=di(256,1)|0;c[e+60>>2]=di(256,1)|0;c[e+64>>2]=2432;c[e+68>>2]=3232;m=c[l>>2]|0;n=m<<2;h=di(n,1)|0;o=e+72|0;c[o>>2]=h;c[e+76>>2]=di(n,1)|0;c[e+80>>2]=di(n,1)|0;d=c[p>>2]<<2;c[e+96>>2]=di(d,1)|0;c[e+100>>2]=di(d,1)|0;c[e+104>>2]=0;c[e+84>>2]=di(n,1)|0;c[e+88>>2]=di(n,1)|0;c[e+92>>2]=di(n,1)|0;L2051:do{if((m|0)>0){n=0;d=m;p=h;while(1){a=n+1|0;g[p+(n<<2)>>2]=+(a|0)*3.1415927410125732/+(d+1|0);k=c[l>>2]|0;if((a|0)>=(k|0)){break L2051}n=a;d=k;p=c[o>>2]|0}}}while(0);g[e+108>>2]=8.0;c[e+112>>2]=0;c[e+116>>2]=0;c[e+120>>2]=2e4;c[e+140>>2]=0;c[e+124>>2]=0;g[e+144>>2]=0.0;c[e+164>>2]=2;o=e+168|0;l=o;cK(c[j>>2]|0,25,o)|0;c[l>>2]=c[l>>2]<<1;f=e;i=b;return f|0}function cu(a){a=a|0;cE(c[a+4>>2]|0);dh(c[a+52>>2]|0);dh(c[a+56>>2]|0);dh(c[a+60>>2]|0);dh(c[a+72>>2]|0);dh(c[a+76>>2]|0);dh(c[a+80>>2]|0);dh(c[a+96>>2]|0);dh(c[a+100>>2]|0);dh(c[a+84>>2]|0);dh(c[a+88>>2]|0);dh(c[a+92>>2]|0);dh(a);return}function cv(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0.0,s=0.0,t=0,u=0.0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,N=0,O=0,P=0,Q=0,R=0,S=0.0,T=0.0,U=0.0,V=0,W=0.0,X=0,Z=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0.0,aq=0,ar=0.0,as=0.0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0;e=i;i=i+24|0;f=e|0;h=e+8|0;j=e+16|0;k=b;b=c[a+48>>2]|0;l=c[c[a>>2]>>2]|0;m=a+12|0;n=c[m>>2]|0;o=k+(n<<2)|0;p=a+8|0;bV(k,5776,k,o,c[p>>2]|0,64,c[a+56>>2]|0,b);q=a+112|0;if((c[q>>2]|0)==0){if((c[a+140>>2]|0)==0){r=1.0;s=1.0}else{t=1458}}else{t=1458}if((t|0)==1458){u=+bO(k,c[m>>2]|0);r=u+1.0;s=+bO(o,c[m>>2]|0)+1.0}o=a+20|0;v=i;i=i+((c[o>>2]|0)*4|0)|0;i=i+7&-8;w=a+4|0;cK(c[w>>2]|0,104,v)|0;cG(c[w>>2]|0,k,d)|0;x=a+24|0;y=(c[x>>2]|0)-(c[m>>2]|0)|0;z=n-y|0;n=k+(z<<2)|0;A=n;B=a+52|0;C=c[B>>2]|0;D=y<<2;dB(A|0,C|0,D)|0;D=c[B>>2]|0;B=c[m>>2]|0;C=k+(B+z<<2)|0;A=(c[x>>2]|0)-B<<2;dB(D|0,C|0,A)|0;A=c[o>>2]|0;C=i;i=i+(A*4|0)|0;i=i+7&-8;D=i;i=i+(A*4|0)|0;i=i+7&-8;cK(c[w>>2]|0,100,C)|0;cK(c[w>>2]|0,101,D)|0;cK(c[w>>2]|0,9,f)|0;c[f>>2]=(c[f>>2]|0)==0;A=a+28|0;B=c[A>>2]|0;y=i;i=i+(B*4|0)|0;i=i+7&-8;E=i;i=i+(B*4|0)|0;i=i+7&-8;F=i;i=i+(B*4|0)|0;i=i+7&-8;G=i;i=i+(B*4|0)|0;i=i+7&-8;H=i;i=i+(B*4|0)|0;i=i+7&-8;I=i;i=i+(B*4|0)|0;i=i+7&-8;J=i;i=i+(B*4|0)|0;i=i+7&-8;K=i;i=i+(B*4|0)|0;i=i+7&-8;L=aN()|0;N=i;i=i+((B+1|0)*4|0)|0;i=i+7&-8;B=c[x>>2]|0;x=i;i=i+(B*4|0)|0;i=i+7&-8;O=a+16|0;P=(B|0)>0;do{if((c[O>>2]|0)==80){if(!P){break}Q=c[a+64>>2]|0;R=0;do{g[x+(R<<2)>>2]=+g[k+(R+z<<2)>>2]*+g[Q+(R>>1<<2)>>2];R=R+1|0;}while((R|0)<(B|0))}else{if(!P){break}R=c[a+64>>2]|0;Q=0;do{g[x+(Q<<2)>>2]=+g[k+(Q+z<<2)>>2]*+g[R+(Q<<2)>>2];Q=Q+1|0;}while((Q|0)<(B|0))}}while(0);b_(x,N,(c[A>>2]|0)+1|0,B);u=+g[N>>2];S=u+u*+g[a+36>>2];g[N>>2]=S;B=c[A>>2]|0;x=B+1|0;L2074:do{if((x|0)>0){P=c[a+68>>2]|0;Q=0;u=S;while(1){g[N+(Q<<2)>>2]=u*+g[P+(Q<<2)>>2];R=Q+1|0;if((R|0)>=(x|0)){break L2074}Q=R;u=+g[N+(R<<2)>>2]}}}while(0);+bZ(y,N,B);aJ(L|0);L=b$(y,c[A>>2]|0,H,10,.20000000298023224,b)|0;B=c[A>>2]|0;do{if((L|0)!=(B|0)){N=b$(y,B,H,10,.05000000074505806,b)|0;x=c[A>>2]|0;if(!((N|0)!=(x|0)&(x|0)>0)){break}N=c[a+72>>2]|0;Q=0;do{g[H+(Q<<2)>>2]=+g[N+(Q<<2)>>2];Q=Q+1|0;}while((Q|0)<(x|0))}}while(0);if((c[q>>2]|0)==0){if((c[a+140>>2]|0)!=0){t=1476}}else{t=1476}do{if((t|0)==1476){if((c[f>>2]|0)!=0){break}B=a+124|0;do{if((c[B>>2]|0)!=0){S=+g[a+128>>2];do{if(+g[a+132>>2]*S>0.0){u=S*-1.0e-5/(+g[a+136>>2]+1.0);T=u>.1?.10000000149011612:u;if(T>=-.1){U=T;break}U=-.10000000149011612}else{U=0.0}}while(0);y=a+108|0;S=U+ +g[y>>2];T=S>10.0?10.0:S;g[y>>2]=T;if(T>=0.0){break}g[y>>2]=0.0}}while(0);T=+Y(s/r)*2.0;y=c[w>>2]|0;L=a+144|0;x=L;cK(y,29,L)|0;S=T<-4.0?-4.0:T;if((c[q>>2]|0)==0){if(+g[x>>2]<2.0){V=1}else{V=c[a+160>>2]|0}c[a+156>>2]=V;break}L=(c[l+160>>2]|0)-1|0;c[h>>2]=L;T=(S>2.0?2.0:S)+2.0+ +g[x>>2];S=T<-1.0?-1.0:T;g[x>>2]=S;x=a+168|0;L2105:do{if((L|0)!=0){y=l+156|0;Q=a+152|0;N=a+120|0;T=+g[a+108>>2];P=L;do{R=~~+M(T);if((R|0)==10){W=+g[(c[y>>2]|0)+(P*44|0)+40>>2]}else{X=R+1|0;Z=c[y>>2]|0;W=(T- +(R|0))*+g[Z+(P*44|0)+(X<<2)>>2]+(+(X|0)-T)*+g[Z+(P*44|0)+(R<<2)>>2]}if(S>=W){R=_(c[(c[(c[Q>>2]|0)+(P<<2)>>2]|0)+52>>2]|0,c[x>>2]|0)|0;if(((R|0)/(c[p>>2]|0)|0|0)<=(c[N>>2]|0)){break L2105}}P=P-1|0;c[h>>2]=P;}while((P|0)!=0)}}while(0);x=h;cK(a,10,x)|0;if((c[B>>2]|0)==0){break}x=j;cK(a,19,x)|0;x=(c[j>>2]|0)-(c[B>>2]|0)|0;L=a+128|0;g[L>>2]=+g[L>>2]+ +(x|0);L=a+132|0;g[L>>2]=+g[L>>2]*.95+ +(x|0)*.05;x=a+136|0;g[x>>2]=+g[x>>2]+1.0}}while(0);do{if((c[a+148>>2]|0)!=0){bu(d,1,1);if((c[f>>2]|0)==0){bu(d,c[a+156>>2]|0,3);break}else{bu(d,0,3);break}}}while(0);do{if((c[f>>2]|0)==0){j=a+156|0;h=a+152|0;p=c[(c[h>>2]|0)+(c[j>>2]<<2)>>2]|0;if((p|0)==0){break}a1[c[p+16>>2]&7](H,I,c[A>>2]|0,d);p=a+32|0;l=c[A>>2]|0;do{if((c[p>>2]|0)!=0&(l|0)>0){V=a+72|0;q=0;do{g[(c[V>>2]|0)+(q<<2)>>2]=+g[H+(q<<2)>>2];q=q+1|0;$=c[A>>2]|0;}while((q|0)<($|0));if(($|0)<=0){aa=$;break}q=a+76|0;V=0;while(1){g[(c[q>>2]|0)+(V<<2)>>2]=+g[I+(V<<2)>>2];w=V+1|0;t=c[A>>2]|0;if((w|0)<(t|0)){V=w}else{aa=t;break}}}else{aa=l}}while(0);l=i;i=i+(aa*4|0)|0;i=i+7&-8;B=c[O>>2]|0;V=i;i=i+(B*4|0)|0;i=i+7&-8;q=i;i=i+(B*4|0)|0;i=i+7&-8;t=q;w=i;i=i+(B*4|0)|0;i=i+7&-8;if((c[o>>2]|0)>0){x=a+72|0;L=a+76|0;P=a+80|0;N=a+40|0;Q=a+44|0;y=a+96|0;R=a+88|0;Z=a+104|0;X=a+100|0;ab=a+164|0;ac=a+92|0;ad=a+84|0;ae=0;af=B;while(1){B=k+((_(af,ae)|0)+z<<2)|0;ag=aN()|0;ah=i;i=i+(af*4|0)|0;i=i+7&-8;ai=ah;aj=c[O>>2]|0;ak=i;i=i+(aj*4|0)|0;i=i+7&-8;al=i;i=i+(aj*4|0)|0;i=i+7&-8;b2(c[x>>2]|0,H,J,c[A>>2]|0,ae,c[o>>2]|0);b2(c[L>>2]|0,I,K,c[A>>2]|0,ae,c[o>>2]|0);b1(J,c[A>>2]|0,.05000000074505806);b1(K,c[A>>2]|0,.05000000074505806);b0(J,E,c[A>>2]|0,b);b0(K,c[P>>2]|0,c[A>>2]|0,b);bI(+g[N>>2],E,F,c[A>>2]|0);bI(+g[Q>>2],E,G,c[A>>2]|0);g[(c[y>>2]|0)+(ae<<2)>>2]=1.0;aj=c[A>>2]|0;if((aj|0)>0){W=1.0;am=0;do{an=c[P>>2]|0;r=+g[an+((am|1)<<2)>>2];s=+g[an+(am<<2)>>2];W=W+(r-s);an=(c[y>>2]|0)+(ae<<2)|0;g[an>>2]=r+s+ +g[an>>2];am=am+2|0;ao=c[A>>2]|0;}while((am|0)<(ao|0));ap=W+.01;aq=ao}else{ap=1.01;aq=aj}s=(+g[C+(ae<<2)>>2]+.01)/ap;bR(B,c[P>>2]|0,ah,c[O>>2]|0,aq,c[R>>2]|0,b);r=+bO(ah,c[O>>2]|0);if((c[(c[(c[h>>2]|0)+(c[j>>2]<<2)>>2]|0)+36>>2]|0)==0){am=dc(s*r/(+g[v+(ae<<2)>>2]+1.0),6736,32)|0;an=(am|0)<0?0:am;bu(d,(an|0)>31?31:an,5);an=c[Z>>2]|0;if((an|0)!=0){g[an+(ae<<2)>>2]=r}g[(c[X>>2]|0)+(ae<<2)>>2]=r}else{U=+g[D+(ae<<2)>>2]+1.0;S=s*(r+1.0)/U;if((c[O>>2]|0)==80){ar=S*.7071099877357483}else{ar=S}an=dc(ar,6032,16)|0;bu(d,an,4);S=+g[6032+(an<<2)>>2]*.8736;an=c[O>>2]|0;if((an|0)==80){as=S*1.414199948310852}else{as=S}S=U*(as/s);bU(c[P>>2]|0,F,G,V,an,c[A>>2]|0,b);an=c[O>>2]|0;if((an|0)>0){am=0;do{g[ak+(am<<2)>>2]=1.0000000036274937e-15;am=am+1|0;}while((am|0)<(an|0))}am=c[A>>2]|0;if((am|0)>0){aj=c[ad>>2]|0;at=0;do{g[l+(at<<2)>>2]=+g[aj+(at<<2)>>2];at=at+1|0;}while((at|0)<(am|0))}bQ(ak,c[P>>2]|0,ak,an,am,l,b);at=c[A>>2]|0;if((at|0)>0){aj=c[ac>>2]|0;au=0;do{g[l+(au<<2)>>2]=+g[aj+(au<<2)>>2];au=au+1|0;}while((au|0)<(at|0))}bP(ak,F,G,ak,c[O>>2]|0,at,l,b);au=c[A>>2]|0;if((au|0)>0){aj=c[ac>>2]|0;am=0;do{g[l+(am<<2)>>2]=+g[aj+(am<<2)>>2];am=am+1|0;}while((am|0)<(au|0))}bP(B,F,G,al,c[O>>2]|0,au,l,b);am=c[O>>2]|0;if((am|0)>0){aj=0;do{g[w+(aj<<2)>>2]=+g[al+(aj<<2)>>2]- +g[ak+(aj<<2)>>2];aj=aj+1|0;}while((aj|0)<(am|0))}bM(w,w,S,am);aj=c[O>>2]|0;dE(t|0,0,aj<<2|0);ak=c[(c[h>>2]|0)+(c[j>>2]<<2)>>2]|0;aT[c[ak+36>>2]&7](w,c[P>>2]|0,F,G,c[ak+44>>2]|0,c[A>>2]|0,aj,q,V,d,b,c[ab>>2]|0,c[ak+12>>2]|0);bL(q,q,S,c[O>>2]|0);if((c[(c[(c[h>>2]|0)+(c[j>>2]<<2)>>2]|0)+12>>2]|0)!=0){ak=c[O>>2]|0;aj=aN()|0;au=i;i=i+(ak*4|0)|0;i=i+7&-8;ak=c[O>>2]|0;dE(au|0,0,ak<<2|0);if((ak|0)>0){at=0;do{an=w+(at<<2)|0;g[an>>2]=+g[an>>2]*2.5;at=at+1|0;}while((at|0)<(ak|0))}at=c[(c[h>>2]|0)+(c[j>>2]<<2)>>2]|0;aT[c[at+36>>2]&7](w,c[P>>2]|0,F,G,c[at+44>>2]|0,c[A>>2]|0,ak,au,V,d,b,c[ab>>2]|0,0);bL(au,au,S*.4000000059604645,c[O>>2]|0);at=c[O>>2]|0;if((at|0)>0){am=0;do{an=q+(am<<2)|0;g[an>>2]=+g[an>>2]+ +g[au+(am<<2)>>2];am=am+1|0;}while((am|0)<(at|0))}aJ(aj|0)}at=c[O>>2]|0;if((at|0)>0){am=(at|0)>1?at<<2:4;dB(ai|0,t|0,am)|0}if((c[Z>>2]|0)==0){av=at}else{S=+bN(q,at)*.7071099877357483;g[(c[Z>>2]|0)+(ae<<2)>>2]=S;av=c[O>>2]|0}S=+bO(ah,av);g[(c[X>>2]|0)+(ae<<2)>>2]=S}at=c[A>>2]|0;am=c[ad>>2]|0;if((at|0)>0){au=0;do{g[l+(au<<2)>>2]=+g[am+(au<<2)>>2];au=au+1|0;}while((au|0)<(at|0))}bQ(ah,c[P>>2]|0,B,c[O>>2]|0,at,am,b);bP(B,F,G,al,c[O>>2]|0,c[A>>2]|0,c[ac>>2]|0,b);aJ(ag|0);au=ae+1|0;if((au|0)>=(c[o>>2]|0)){break}ae=au;af=c[O>>2]|0}aw=c[A>>2]|0}else{aw=aa}do{if((aw|0)>0){af=a+72|0;ae=0;do{g[(c[af>>2]|0)+(ae<<2)>>2]=+g[H+(ae<<2)>>2];ae=ae+1|0;ax=c[A>>2]|0;}while((ae|0)<(ax|0));if((ax|0)<=0){break}ae=a+76|0;af=0;do{g[(c[ae>>2]|0)+(af<<2)>>2]=+g[I+(af<<2)>>2];af=af+1|0;}while((af|0)<(c[A>>2]|0))}}while(0);c[p>>2]=0;ay=1;i=e;return ay|0}}while(0);I=c[m>>2]|0;if((I|0)>0){ax=0;while(1){g[k+(ax+z<<2)>>2]=1.0000000036274937e-15;H=ax+1|0;aw=c[m>>2]|0;if((H|0)<(aw|0)){ax=H}else{az=aw;break}}}else{az=I}I=c[A>>2]|0;if((I|0)>0){ax=a+92|0;z=0;do{g[(c[ax>>2]|0)+(z<<2)>>2]=0.0;z=z+1|0;aA=c[A>>2]|0;}while((z|0)<(aA|0));aB=c[m>>2]|0;aC=aA}else{aB=az;aC=I}c[a+32>>2]=1;bQ(n,c[a+80>>2]|0,n,aB,aC,c[a+84>>2]|0,b);ay=(c[f>>2]|0)==0|0;i=e;return ay|0}function cw(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+8|0;d=b|0;e=di(100,1)|0;if((e|0)==0){f=0;i=b;return f|0}c[e>>2]=a;g=c[a>>2]|0;c[e+88>>2]=1;a=cD(c[g>>2]|0)|0;h=e+4|0;c[h>>2]=a;c[e+40>>2]=0;j=g+4|0;c[e+8>>2]=c[j>>2]<<1;c[e+12>>2]=c[j>>2];k=g+8|0;l=e+16|0;c[l>>2]=c[k>>2];m=e+20|0;c[m>>2]=(c[j>>2]|0)/(c[k>>2]|0)|0;k=e+24|0;c[k>>2]=c[g+12>>2];j=e+32|0;n=j;cN(a,25,j)|0;c[n>>2]=c[n>>2]<<1;c[d>>2]=1;cN(c[h>>2]|0,105,d)|0;c[e+92>>2]=g+32;c[e+96>>2]=c[g+64>>2];c[e+28>>2]=1;c[e+44>>2]=di(256,1)|0;c[e+48>>2]=di(256,1)|0;c[e+52>>2]=di(c[l>>2]<<2,1)|0;l=c[k>>2]|0;k=l<<2;c[e+56>>2]=di(k,1)|0;c[e+60>>2]=di(k,1)|0;k=c[m>>2]<<2;c[e+68>>2]=di(k,1)|0;c[e+72>>2]=di(k,1)|0;c[e+64>>2]=di(l<<3,1)|0;c[e+76>>2]=0;c[e+36>>2]=0;c[e+84>>2]=1e3;f=e;i=b;return f|0}function cx(a){a=a|0;cF(c[a+4>>2]|0);dh(c[a+44>>2]|0);dh(c[a+48>>2]|0);dh(c[a+52>>2]|0);dh(c[a+56>>2]|0);dh(c[a+60>>2]|0);dh(c[a+68>>2]|0);dh(c[a+72>>2]|0);dh(c[a+64>>2]|0);dh(a);return}function cy(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0.0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0,R=0,S=0.0,T=0.0,U=0.0,V=0.0,W=0,Y=0.0,Z=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0.0;e=i;i=i+8|0;f=e|0;h=d;d=a;j=c[a+40>>2]|0;k=c[c[a>>2]>>2]|0;l=a+12|0;n=c[l>>2]|0;o=a+4|0;cN(c[o>>2]|0,104,h+(n<<2)|0)|0;p=cH(c[o>>2]|0,b,h)|0;cN(c[o>>2]|0,103,f)|0;if((p|0)!=0){q=p;i=e;return q|0}if((b|0)==0){cz(d,h,c[f>>2]|0,j);q=0;i=e;return q|0}L2242:do{if((c[a+88>>2]|0)==0){r=c[a+96>>2]|0}else{do{if((bA(b)|0)>0){if((by(b)|0)==0){break}bw(b,1)|0;p=bw(b,3)|0;c[a+96>>2]=p;if((p|0)==0){r=0;break L2242}if((c[(c[a+92>>2]|0)+(p<<2)>>2]|0)!=0){r=p;break L2242}p=c[m>>2]|0;as(p|0,13352,(p=i,i=i+8|0,c[p>>2]=12984,p)|0)|0;i=p;q=-2;i=e;return q|0}}while(0);c[a+96>>2]=0;r=0}}while(0);p=a+96|0;s=a+92|0;if((c[(c[s>>2]|0)+(r<<2)>>2]|0)==0){if((c[f>>2]|0)!=0){cz(d,h,1,j);q=0;i=e;return q|0}d=c[l>>2]|0;if((d|0)>0){f=0;r=d;while(1){g[h+(r+f<<2)>>2]=1.0000000036274937e-15;t=f+1|0;u=c[l>>2]|0;if((t|0)<(u|0)){f=t;r=u}else{v=u;break}}}else{v=d}c[a+28>>2]=1;d=h+(v<<2)|0;bQ(d,c[a+60>>2]|0,d,v,c[a+24>>2]|0,c[a+64>>2]|0,j);bW(h,h+(c[l>>2]<<2)|0,5776,h,c[a+8>>2]|0,64,c[a+44>>2]|0,c[a+48>>2]|0,j);q=0;i=e;return q|0}v=a+20|0;d=c[v>>2]|0;r=aN()|0;f=i;i=i+(d*4|0)|0;i=i+7&-8;d=i;i=i+((c[v>>2]|0)*4|0)|0;i=i+7&-8;cN(c[o>>2]|0,100,f)|0;cN(c[o>>2]|0,101,d)|0;o=a+24|0;u=c[o>>2]|0;t=i;i=i+(u*4|0)|0;i=i+7&-8;w=i;i=i+(u*4|0)|0;i=i+7&-8;aZ[c[(c[(c[s>>2]|0)+(c[p>>2]<<2)>>2]|0)+20>>2]&7](t,u,b);u=a+28|0;x=c[o>>2]|0;if((c[u>>2]|0)!=0&(x|0)>0){y=a+56|0;z=0;while(1){g[(c[y>>2]|0)+(z<<2)>>2]=+g[t+(z<<2)>>2];A=z+1|0;B=c[o>>2]|0;if((A|0)<(B|0)){z=A}else{C=B;break}}}else{C=x}x=i;i=i+(C*4|0)|0;i=i+7&-8;if((c[v>>2]|0)>0){C=a+16|0;z=a+76|0;y=a+56|0;B=a+68|0;A=k+28|0;k=n+1|0;D=a+52|0;E=a+60|0;F=a+64|0;G=a+72|0;H=a+84|0;I=0.0;J=0;while(1){K=c[C>>2]|0;L=_(K,J)|0;M=h+((c[l>>2]|0)+L<<2)|0;N=aN()|0;P=i;i=i+(K*4|0)|0;i=i+7&-8;K=c[z>>2]|0;if((K|0)==0){Q=0}else{R=K+(L<<1<<2)|0;dE(R|0,0,c[C>>2]<<3|0);Q=R}b2(c[y>>2]|0,t,w,c[o>>2]|0,J,c[v>>2]|0);b1(w,c[o>>2]|0,.05000000074505806);b0(w,x,c[o>>2]|0,j);g[(c[B>>2]|0)+(J<<2)>>2]=1.0;if((c[o>>2]|0)>0){S=1.0;R=0;do{T=+g[x+((R|1)<<2)>>2];U=+g[x+(R<<2)>>2];S=S+(T-U);K=(c[B>>2]|0)+(J<<2)|0;g[K>>2]=T+U+ +g[K>>2];R=R+2|0;}while((R|0)<(c[o>>2]|0));V=S+.01}else{V=1.01}U=(+g[f+(J<<2)>>2]+.01)/V;dE(P|0,0,c[C>>2]<<2|0);do{if((c[(c[(c[s>>2]|0)+(c[p>>2]<<2)>>2]|0)+40>>2]|0)==0){T=+X(+((bw(b,5)|0)-10|0)*.125)/U;R=c[C>>2]|0;if((R|0)>0){W=0}else{break}do{K=W+L|0;g[P+(W<<2)>>2]=T*+g[A>>2]*+g[h+(K+n<<2)>>2];g[P+((W|1)<<2)>>2]=-0.0-T*+g[A>>2]*+g[h+(k+K<<2)>>2];W=W+2|0;}while((W|0)<(R|0))}else{R=bw(b,4)|0;T=+g[6032+(R<<2)>>2]*.8736;R=c[C>>2]|0;if((R|0)==80){Y=T*1.414199948310852}else{Y=T}T=+g[d+(J<<2)>>2]*Y/U;K=c[(c[s>>2]|0)+(c[p>>2]<<2)>>2]|0;aU[c[K+40>>2]&7](P,c[K+44>>2]|0,R,b,j,H);bL(P,P,T,c[C>>2]|0);if((c[(c[(c[s>>2]|0)+(c[p>>2]<<2)>>2]|0)+12>>2]|0)==0){break}R=c[C>>2]|0;K=aN()|0;Z=i;i=i+(R*4|0)|0;i=i+7&-8;R=c[C>>2]|0;dE(Z|0,0,R<<2|0);$=c[(c[s>>2]|0)+(c[p>>2]<<2)>>2]|0;aU[c[$+40>>2]&7](Z,c[$+44>>2]|0,R,b,j,H);bL(Z,Z,T*.4000000059604645,c[C>>2]|0);R=c[C>>2]|0;if((R|0)>0){$=0;do{aa=P+($<<2)|0;g[aa>>2]=+g[aa>>2]+ +g[Z+($<<2)>>2];$=$+1|0;}while(($|0)<(R|0))}aJ(K|0)}}while(0);L=c[C>>2]|0;if((c[z>>2]|0)!=0&(L|0)>0){R=0;while(1){g[Q+(R<<1<<2)>>2]=+g[P+(R<<2)>>2];$=R+1|0;Z=c[C>>2]|0;if(($|0)<(Z|0)){R=$}else{ab=Z;break}}}else{ab=L}bQ(c[D>>2]|0,c[E>>2]|0,M,ab,c[o>>2]|0,c[F>>2]|0,j);R=c[C>>2]|0;if((R|0)>0){Z=0;while(1){g[(c[D>>2]|0)+(Z<<2)>>2]=+g[P+(Z<<2)>>2];$=Z+1|0;aa=c[C>>2]|0;if(($|0)<(aa|0)){Z=$}else{ac=aa;break}}}else{ac=R}if((c[o>>2]|0)>0){Z=0;do{g[(c[E>>2]|0)+(Z<<2)>>2]=+g[x+(Z<<2)>>2];Z=Z+1|0;}while((Z|0)<(c[o>>2]|0));ad=c[C>>2]|0}else{ad=ac}U=+bO(c[D>>2]|0,ad);g[(c[G>>2]|0)+(J<<2)>>2]=U;U=+g[(c[G>>2]|0)+(J<<2)>>2];S=I+U*U/+(c[v>>2]|0);aJ(N|0);Z=J+1|0;if((Z|0)<(c[v>>2]|0)){I=S;J=Z}else{ae=S;break}}}else{ae=0.0}g[a+80>>2]=+O(ae);bW(h,h+(c[l>>2]<<2)|0,5776,h,c[a+8>>2]|0,64,c[a+44>>2]|0,c[a+48>>2]|0,j);if((c[o>>2]|0)>0){j=a+56|0;a=0;do{g[(c[j>>2]|0)+(a<<2)>>2]=+g[t+(a<<2)>>2];a=a+1|0;}while((a|0)<(c[o>>2]|0))}c[u>>2]=0;aJ(r|0);q=0;i=e;return q|0}function cz(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0.0,p=0,q=0,r=0;f=(d|0)!=0;if(f){d=a+96|0;h=c[d>>2]|0;c[d>>2]=1;c[a+28>>2]=1;i=h}else{h=c[a+60>>2]|0;bI(.9900000095367432,h,h,c[a+24>>2]|0);c[a+28>>2]=1;h=a+80|0;g[h>>2]=+g[h>>2]*.8999999761581421;i=0}h=a+12|0;d=c[h>>2]|0;if((d|0)>0){j=a+80|0;l=a+84|0;m=0;n=d;while(1){o=+g[j>>2];p=(_(c[l>>2]|0,1664525)|0)+1013904223|0;c[l>>2]=p;g[b+(n+m<<2)>>2]=o*3.4642*((c[k>>2]=p&8388607|1065353216,+g[k>>2])+ -1.5);p=m+1|0;q=c[h>>2]|0;if((p|0)<(q|0)){m=p;n=q}else{r=q;break}}}else{r=d}d=b+(r<<2)|0;bQ(d,c[a+60>>2]|0,d,r,c[a+24>>2]|0,c[a+64>>2]|0,e);bW(b,b+(c[h>>2]<<2)|0,5776,b,c[a+8>>2]|0,64,c[a+44>>2]|0,c[a+48>>2]|0,e);if(!f){return}c[a+96>>2]=i;return}function cA(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0.0,z=0.0,A=0,B=0,C=0,D=0,E=0;e=i;i=i+80|0;f=e|0;h=e+8|0;j=e+16|0;k=e+24|0;l=e+32|0;n=e+40|0;o=e+48|0;p=e+56|0;q=e+64|0;r=e+72|0;switch(b|0){case 8:{cK(c[a+4>>2]|0,8,d)|0;s=0;i=e;return s|0};case 35:{cK(c[a+4>>2]|0,35,d)|0;s=0;i=e;return s|0};case 106:{c[d>>2]=c[a+48>>2];s=0;i=e;return s|0};case 3:{c[d>>2]=c[a+8>>2];s=0;i=e;return s|0};case 34:{cK(c[a+4>>2]|0,34,d)|0;s=0;i=e;return s|0};case 9:{cK(c[a+4>>2]|0,9,d)|0;s=0;i=e;return s|0};case 101:{t=a+20|0;if((c[t>>2]|0)<=0){s=0;i=e;return s|0}u=a+100|0;v=d;w=0;while(1){g[v+(w<<2)>>2]=+g[(c[u>>2]|0)+(w<<2)>>2];x=w+1|0;if((x|0)<(c[t>>2]|0)){w=x}else{s=0;break}}i=e;return s|0};case 10:{w=c[d>>2]|0;c[a+156>>2]=w;c[a+160>>2]=w;s=0;i=e;return s|0};case 6:{cK(a,4,d)|0;s=0;i=e;return s|0};case 104:{c[a+104>>2]=d;s=0;i=e;return s|0};case 12:{c[a+112>>2]=c[d>>2];cK(c[a+4>>2]|0,12,d)|0;s=0;i=e;return s|0};case 13:{c[d>>2]=c[a+112>>2];s=0;i=e;return s|0};case 30:{c[a+140>>2]=c[d>>2];cK(c[a+4>>2]|0,30,d)|0;s=0;i=e;return s|0};case 31:{c[d>>2]=c[a+140>>2];s=0;i=e;return s|0};case 14:{w=d;y=+g[w>>2];z=y+.6;g[h>>2]=z;g[a+108>>2]=y;if(z>10.0){g[h>>2]=10.0}t=~~+M(+g[w>>2]+.5);c[f>>2]=(t|0)>10?10:t;cK(c[a+4>>2]|0,14,h)|0;cK(a,4,f)|0;s=0;i=e;return s|0};case 15:{g[d>>2]=+g[a+108>>2];s=0;i=e;return s|0};case 32:{f=d;h=c[f>>2]|0;c[a+124>>2]=h;t=a+112|0;w=t;c[w>>2]=(h|0)!=0;cK(c[a+4>>2]|0,12,t)|0;if((c[w>>2]|0)==0){s=0;i=e;return s|0}c[j>>2]=10;w=c[f>>2]|0;f=j;t=k;while(1){cK(a,4,f)|0;cK(a,19,t)|0;h=c[j>>2]|0;if((c[k>>2]|0)<=(w|0)){A=h;break}u=h-1|0;c[j>>2]=u;if((h|0)<=0){A=u;break}}z=+(A|0);g[l>>2]=z<0.0?0.0:z;cK(a,14,l)|0;g[a+136>>2]=0.0;g[a+128>>2]=0.0;g[a+132>>2]=0.0;s=0;i=e;return s|0};case 33:{c[d>>2]=c[a+124>>2];s=0;i=e;return s|0};case 4:{l=c[d>>2]|0;A=(l|0)<0?0:l;l=(A|0)>10?10:A;A=c[a>>2]|0;j=c[(c[A>>2]|0)+112+(l<<2)>>2]|0;c[a+156>>2]=j;c[a+160>>2]=j;c[n>>2]=c[(c[A>>2]|0)+68+(l<<2)>>2];cK(c[a+4>>2]|0,6,n)|0;s=0;i=e;return s|0};case 16:{cK(c[a+4>>2]|0,16,d)|0;n=c[d>>2]|0;l=a+164|0;c[l>>2]=n;if((n|0)>=1){s=0;i=e;return s|0}c[l>>2]=1;s=0;i=e;return s|0};case 17:{c[d>>2]=c[a+164>>2];s=0;i=e;return s|0};case 18:{c[o>>2]=10;l=c[d>>2]|0;n=o;A=p;while(1){cK(a,4,n)|0;cK(a,19,A)|0;if((c[p>>2]|0)<=(l|0)){s=0;B=1735;break}j=c[o>>2]|0;c[o>>2]=j-1;if((j|0)<=0){s=0;B=1736;break}}if((B|0)==1735){i=e;return s|0}else if((B|0)==1736){i=e;return s|0}break};case 19:{cK(c[a+4>>2]|0,19,d)|0;B=c[(c[a+152>>2]|0)+(c[a+156>>2]<<2)>>2]|0;o=c[a+168>>2]|0;if((B|0)==0){l=d;c[l>>2]=(c[l>>2]|0)+((o<<2|0)/(c[a+8>>2]|0)|0);s=0;i=e;return s|0}else{l=_(c[B+52>>2]|0,o)|0;o=d;c[o>>2]=(c[o>>2]|0)+((l|0)/(c[a+8>>2]|0)|0);s=0;i=e;return s|0}break};case 24:{l=c[d>>2]|0;c[a+168>>2]=l;c[q>>2]=l>>1;cK(c[a+4>>2]|0,24,q)|0;s=0;i=e;return s|0};case 25:{c[d>>2]=c[a+168>>2];s=0;i=e;return s|0};case 26:{c[a+32>>2]=1;q=a+28|0;l=c[q>>2]|0;do{if((l|0)>0){o=a+72|0;B=0;p=l;while(1){A=B+1|0;g[(c[o>>2]|0)+(B<<2)>>2]=+(A|0)*3.1415927410125732/+(p+1|0);C=c[q>>2]|0;if((A|0)<(C|0)){B=A;p=C}else{break}}if((C|0)<=0){break}p=a+88|0;B=a+84|0;o=a+92|0;A=0;do{g[(c[p>>2]|0)+(A<<2)>>2]=0.0;g[(c[B>>2]|0)+(A<<2)>>2]=0.0;g[(c[o>>2]|0)+(A<<2)>>2]=0.0;A=A+1|0;}while((A|0)<(c[q>>2]|0))}}while(0);q=a+60|0;C=a+56|0;l=0;while(1){g[(c[q>>2]|0)+(l<<2)>>2]=0.0;g[(c[C>>2]|0)+(l<<2)>>2]=0.0;A=l+1|0;if((A|0)<64){l=A}else{s=0;break}}i=e;return s|0};case 36:{c[a+148>>2]=c[d>>2];cK(c[a+4>>2]|0,36,d)|0;s=0;i=e;return s|0};case 37:{c[d>>2]=c[a+148>>2];s=0;i=e;return s|0};case 39:{cK(c[a+4>>2]|0,39,d)|0;l=d;c[l>>2]=(c[l>>2]<<1)+63;s=0;i=e;return s|0};case 40:{cK(c[a+4>>2]|0,40,d)|0;s=0;i=e;return s|0};case 41:{cK(c[a+4>>2]|0,41,d)|0;s=0;i=e;return s|0};case 42:{l=c[d>>2]|0;c[a+116>>2]=l;do{if((l|0)>42199){c[a+120>>2]=17600;D=17600}else{if((l|0)>27799){c[a+120>>2]=9600;D=9600;break}C=a+120|0;if((l|0)>20600){c[C>>2]=5600;D=5600;break}else{c[C>>2]=1800;D=1800;break}}}while(0);if((c[a+16>>2]|0)==80){c[a+120>>2]=1800;E=1800}else{E=D}c[r>>2]=l-E;cK(c[a+4>>2]|0,42,r)|0;s=0;i=e;return s|0};case 43:{c[d>>2]=c[a+116>>2];s=0;i=e;return s|0};case 44:{cK(c[a+4>>2]|0,44,d)|0;s=0;i=e;return s|0};case 45:{cK(c[a+4>>2]|0,45,d)|0;s=0;i=e;return s|0};case 100:{r=d;E=a+20|0;if((c[E>>2]|0)<=0){s=0;i=e;return s|0}l=a+96|0;D=0;while(1){g[r+(D<<2)>>2]=+g[(c[l>>2]|0)+(D<<2)>>2];C=D+1|0;if((C|0)<(c[E>>2]|0)){D=C}else{s=0;break}}i=e;return s|0};case 29:{g[d>>2]=+g[a+144>>2];s=0;i=e;return s|0};case 105:{cK(c[a+4>>2]|0,105,d)|0;s=0;i=e;return s|0};default:{as(c[m>>2]|0,13552,(d=i,i=i+16|0,c[d>>2]=13768,c[d+8>>2]=b,d)|0)|0;i=d;s=-1;i=e;return s|0}}return 0}function cB(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0;e=i;i=i+16|0;f=e|0;h=e+8|0;switch(b|0){case 0:{cN(c[a+4>>2]|0,0,d)|0;c[a+36>>2]=c[d>>2];j=0;i=e;return j|0};case 8:{cN(c[a+4>>2]|0,8,d)|0;j=0;i=e;return j|0};case 26:{k=a+24|0;if((c[k>>2]<<1|0)>0){l=a+64|0;n=0;do{g[(c[l>>2]|0)+(n<<2)>>2]=0.0;n=n+1|0;}while((n|0)<(c[k>>2]<<1|0))}k=a+48|0;n=a+44|0;l=0;do{g[(c[k>>2]|0)+(l<<2)>>2]=0.0;g[(c[n>>2]|0)+(l<<2)>>2]=0.0;l=l+1|0;}while((l|0)<64);g[a+80>>2]=0.0;j=0;i=e;return j|0};case 101:{l=a+20|0;if((c[l>>2]|0)<=0){j=0;i=e;return j|0}n=a+72|0;k=d;o=0;while(1){g[k+(o<<2)>>2]=+g[(c[n>>2]|0)+(o<<2)>>2];p=o+1|0;if((p|0)<(c[l>>2]|0)){o=p}else{j=0;break}}i=e;return j|0};case 3:{c[d>>2]=c[a+8>>2];j=0;i=e;return j|0};case 10:{c[a+96>>2]=c[d>>2];j=0;i=e;return j|0};case 9:{cN(c[a+4>>2]|0,9,d)|0;j=0;i=e;return j|0};case 1:{c[d>>2]=c[a+36>>2];j=0;i=e;return j|0};case 6:case 4:{o=c[d>>2]|0;l=(o|0)<0?0:o;o=(l|0)>10?10:l;l=c[a>>2]|0;c[a+96>>2]=c[(c[l>>2]|0)+112+(o<<2)>>2];c[f>>2]=c[(c[l>>2]|0)+68+(o<<2)>>2];cN(c[a+4>>2]|0,6,f)|0;j=0;i=e;return j|0};case 19:{cN(c[a+4>>2]|0,19,d)|0;f=c[(c[a+92>>2]|0)+(c[a+96>>2]<<2)>>2]|0;o=c[a+32>>2]|0;if((f|0)==0){l=d;c[l>>2]=(c[l>>2]|0)+((o<<2|0)/(c[a+8>>2]|0)|0);j=0;i=e;return j|0}else{l=_(c[f+52>>2]|0,o)|0;o=d;c[o>>2]=(c[o>>2]|0)+((l|0)/(c[a+8>>2]|0)|0);j=0;i=e;return j|0}break};case 24:{l=c[d>>2]|0;c[a+32>>2]=l;c[h>>2]=l>>1;cN(c[a+4>>2]|0,24,h)|0;j=0;i=e;return j|0};case 25:{c[d>>2]=c[a+32>>2];j=0;i=e;return j|0};case 20:{cN(c[a+4>>2]|0,20,d)|0;j=0;i=e;return j|0};case 22:{cN(c[a+4>>2]|0,22,d)|0;j=0;i=e;return j|0};case 36:{c[a+88>>2]=c[d>>2];cN(c[a+4>>2]|0,36,d)|0;j=0;i=e;return j|0};case 37:{c[d>>2]=c[a+88>>2];j=0;i=e;return j|0};case 39:{cN(c[a+4>>2]|0,39,d)|0;h=d;c[h>>2]=c[h>>2]<<1;j=0;i=e;return j|0};case 44:{cN(c[a+4>>2]|0,44,d)|0;j=0;i=e;return j|0};case 45:{cN(c[a+4>>2]|0,45,d)|0;j=0;i=e;return j|0};case 47:{cN(c[a+4>>2]|0,47,d)|0;j=0;i=e;return j|0};case 100:{h=d;l=a+20|0;if((c[l>>2]|0)<=0){j=0;i=e;return j|0}o=a+68|0;f=0;while(1){g[h+(f<<2)>>2]=+g[(c[o>>2]|0)+(f<<2)>>2];n=f+1|0;if((n|0)<(c[l>>2]|0)){f=n}else{j=0;break}}i=e;return j|0};case 103:{cN(c[a+4>>2]|0,103,d)|0;j=0;i=e;return j|0};case 104:{c[a+76>>2]=d;j=0;i=e;return j|0};case 105:{cN(c[a+4>>2]|0,105,d)|0;j=0;i=e;return j|0};case 106:{c[d>>2]=c[a+40>>2];j=0;i=e;return j|0};default:{as(c[m>>2]|0,13552,(a=i,i=i+16|0,c[a>>2]=13768,c[a+8>>2]=b,a)|0)|0;i=a;j=-1;i=e;return j|0}}return 0}function cC(a){a=a|0;return aY[c[a+20>>2]&15](a)|0}function cD(a){a=a|0;return aY[c[a+32>>2]&15](a)|0}function cE(a){a=a|0;aV[c[(c[a>>2]|0)+24>>2]&15](a);return}function cF(a){a=a|0;aV[c[(c[a>>2]|0)+36>>2]&15](a);return}function cG(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+28>>2]&31](a,b,d)|0}function cH(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+40>>2]&31](a,b,d)|0}function cI(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+28>>2]&31](a,b,d)|0}function cJ(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0;f=i;i=i+2568|0;h=f|0;j=f+8|0;k=a;aX[c[(c[k>>2]|0)+44>>2]&31](a,3,h)|0;l=c[h>>2]|0;if((l|0)>0){h=0;do{g[j+(h<<2)>>2]=+(b[d+(h<<1)>>1]|0);h=h+1|0;}while((h|0)<(l|0))}l=aX[c[(c[k>>2]|0)+28>>2]&31](a,j,e)|0;i=f;return l|0}function cK(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+44>>2]&31](a,b,d)|0}function cL(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+40>>2]&31](a,b,d)|0}function cM(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0.0;f=i;i=i+2568|0;h=f|0;j=f+8|0;k=a;aX[c[(c[k>>2]|0)+48>>2]&31](a,3,h)|0;l=aX[c[(c[k>>2]|0)+40>>2]&31](a,d,j)|0;d=c[h>>2]|0;if((d|0)>0){m=0}else{i=f;return l|0}do{n=+g[j+(m<<2)>>2];do{if(n>32767.0){b[e+(m<<1)>>1]=32767}else{if(n<-32768.0){b[e+(m<<1)>>1]=-32768;break}else{b[e+(m<<1)>>1]=~~+M(n+.5);break}}}while(0);m=m+1|0;}while((m|0)<(d|0));i=f;return l|0}function cN(a,b,d){a=a|0;b=b|0;d=d|0;return aX[c[(c[a>>2]|0)+48>>2]&31](a,b,d)|0}function cO(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;do{if((b|0)==1){f=d;g=c[f>>2]|0;if((g|0)==0){c[f>>2]=5;h=0;break}j=c[a+32+(g<<2)>>2]|0;if((j|0)==0){c[f>>2]=-1;h=0;break}else{c[f>>2]=c[j+52>>2];h=0;break}}else if((b|0)==0){c[d>>2]=c[a>>2];h=0}else{as(c[m>>2]|0,13192,(j=i,i=i+16|0,c[j>>2]=12768,c[j+8>>2]=b,j)|0)|0;i=j;h=-1}}while(0);i=e;return h|0}function cP(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;switch(a|0){case 7:{c[b>>2]=14216;e=0;break};case 1:{c[b>>2]=1;e=0;break};case 3:{c[b>>2]=1;e=0;break};case 9:{c[b>>2]=13544;e=0;break};case 5:{c[b>>2]=16;e=0;break};default:{as(c[m>>2]|0,13192,(b=i,i=i+16|0,c[b>>2]=13320,c[b+8>>2]=a,b)|0)|0;i=b;e=-1}}i=d;return e|0}function cQ(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=bw(a,4)|0;f=c[b+(e*20|0)+4>>2]|0;if((f|0)!=0){g=aX[f&31](a,d,c[b+(e*20|0)+8>>2]|0)|0;return g|0}do{if((e|0)<2){h=1}else{if((e|0)<8){h=4;break}if((e|0)<10){h=8;break}if((e|0)<12){h=16;break}h=(e|0)<14?32:64}}while(0);bz(a,h);g=0;return g|0}function cR(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;b=i;i=i+8|0;e=b|0;c[e>>2]=bw(a,4)|0;cK(d,6,e)|0;i=b;return 0}function cS(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;b=i;i=i+8|0;e=b|0;c[e>>2]=bw(a,4)|0;cK(d,8,e)|0;i=b;return 0}function cT(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;b=i;i=i+8|0;e=b|0;c[e>>2]=bw(a,4)|0;cK(d,10,e)|0;i=b;return 0}function cU(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;b=i;i=i+8|0;e=b|0;c[e>>2]=bw(a,1)|0;cK(d,12,e)|0;i=b;return 0}function cV(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;b=i;i=i+8|0;e=b|0;c[e>>2]=bw(a,1)|0;cN(d,0,e)|0;i=b;return 0}function cW(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;b=i;i=i+8|0;d=b|0;g[d>>2]=+((bw(a,4)|0)>>>0>>>0);cK(c,14,d)|0;i=b;return 0}function cX(a,b,c){a=a|0;b=b|0;c=c|0;ax((bw(a,8)|0)&255|0,c|0)|0;return 0}function cY(a,b,c){a=a|0;b=b|0;c=c|0;bz(a,(bw(a,4)|0)<<3|5);return 0}function cZ(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0;g=i;a[b|0]=83;a[b+1|0]=112;a[b+2|0]=101;a[b+3|0]=101;a[b+4|0]=120;a[b+5|0]=32;a[b+6|0]=32;a[b+7|0]=32;a[b+8|0]=49;a[b+9|0]=46;a[b+10|0]=50;a[b+11|0]=114;a[b+12|0]=99;a[b+13|0]=49;dE(b+14|0,0,14);c[b+28>>2]=1;c[b+32>>2]=80;c[b+36>>2]=d;d=f+12|0;c[b+40>>2]=c[d>>2];c[b+44>>2]=c[f+16>>2];if((c[d>>2]|0)>=0){h=b+48|0;c[h>>2]=e;j=b+52|0;c[j>>2]=-1;k=b+56|0;l=k;n=cb(f,0,l)|0;o=b+60|0;p=o;dE(p|0,0,20);i=g;return}as(c[m>>2]|0,12848,(d=i,i=i+8|0,c[d>>2]=13672,d)|0)|0;i=d;h=b+48|0;c[h>>2]=e;j=b+52|0;c[j>>2]=-1;k=b+56|0;l=k;n=cb(f,0,l)|0;o=b+60|0;p=o;dE(p|0,0,20);i=g;return}function c_(a,b){a=a|0;b=b|0;var d=0,e=0;d=di(80,1)|0;e=a|0;dB(d|0,e|0,80)|0;c[b>>2]=80;return d|0}function c$(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;f=0;while(1){if((f|0)>=8){break}if((a[b+f|0]|0)==(a[14056+f|0]|0)){f=f+1|0}else{g=1893;break}}if((g|0)==1893){g=c[m>>2]|0;as(g|0,12920,(h=i,i=i+8|0,c[h>>2]=13440,h)|0)|0;i=h;j=0;i=e;return j|0}if((d|0)<80){d=c[m>>2]|0;as(d|0,12920,(h=i,i=i+8|0,c[h>>2]=13264,h)|0)|0;i=h;j=0;i=e;return j|0}d=di(80,1)|0;g=d;dB(d|0,b|0,80)|0;b=d+48|0;if((c[d+40>>2]|0)>>>0>2>>>0){f=c[m>>2]|0;as(f|0,12920,(h=i,i=i+8|0,c[h>>2]=13104,h)|0)|0;i=h;dh(d);j=0;i=e;return j|0}d=c[b>>2]|0;if((d|0)>2){c[b>>2]=2;j=g;i=e;return j|0}if((d|0)>=1){j=g;i=e;return j|0}c[b>>2]=1;j=g;i=e;return j|0}function c0(a){a=a|0;dh(a);return}function c1(){var a=0;a=di(24,1)|0;g[a>>2]=1.0;g[a+4>>2]=.5;g[a+8>>2]=1.0;g[a+12>>2]=1.0;c[a+16>>2]=0;c[a+20>>2]=0;return a|0}function c2(a){a=a|0;g[a>>2]=1.0;g[a+4>>2]=.5;g[a+8>>2]=1.0;g[a+12>>2]=1.0;c[a+16>>2]=0;c[a+20>>2]=0;return}function c3(a){a=a|0;dh(a);return}function c4(a,b,c){a=a|0;b=b|0;c=c|0;var d=0.0,e=0.0,f=0.0,h=0,i=0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0;if((b|0)>0){d=0.0;e=0.0;f=0.0;h=0;do{i=h<<1;j=+g[a+(i<<2)>>2];d=d+j*j;k=+g[a+((i|1)<<2)>>2];e=e+k*k;l=(j+k)*.5;g[a+(h<<2)>>2]=l;f=f+l*l;h=h+1|0;}while((h|0)<(b|0));m=d+1.0;n=e;o=f}else{m=1.0;n=0.0;o=0.0}bu(c,14,5);bu(c,9,4);f=+Y(m/(n+1.0))*4.0;if(f>0.0){bu(c,0,1)}else{bu(c,1,1)}e=+M(+N(+f)+.5);bu(c,e>30.0?31:~~e,5);bu(c,dc(o/(m+n),10688,4)|0,2);return}function c5(a,c,d){a=a|0;c=c|0;d=d|0;var e=0.0,f=0.0,g=0.0,h=0,i=0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0;bu(d,14,5);bu(d,9,4);do{if((c|0)>0){e=0.0;f=0.0;g=0.0;h=0;do{i=h<<1;j=+(b[a+(i<<1)>>1]|0);g=g+j*j;k=+(b[a+((i|1)<<1)>>1]|0);e=e+k*k;i=~~((j+k)*.5);b[a+(h<<1)>>1]=i;k=+(i<<16>>16|0);f=f+k*k;h=h+1|0;}while((h|0)<(c|0));k=f;if(g<=e){l=g;m=k;n=e;o=1924;break}bu(d,0,1);p=e;q=g;r=g;s=k;t=e}else{l=0.0;m=0.0;n=0.0;o=1924}}while(0);if((o|0)==1924){bu(d,1,1);p=l;q=n;r=l;s=m;t=n}o=~~+M(+N(+(+Y((q+1.0)/(p+1.0))*4.0))+.5);bu(d,(o|0)<31?o:31,5);bu(d,dc(s/(t+(r+1.0)),10688,4)|0,2);return}function c6(a,b,c){a=a|0;b=b|0;c=c|0;var d=0.0,e=0.0,f=0,h=0.0,i=0,j=0.0;d=+g[c>>2];e=1.0/+O(+g[c+4>>2]*(d+1.0));if((b|0)<=0){return}f=c+8|0;h=e*+O(d)*.019999999552965164;i=c+12|0;d=e*.019999999552965164;c=b;do{c=c-1|0;e=+g[a+(c<<2)>>2];j=h+ +g[f>>2]*.9800000190734863;g[f>>2]=j;g[i>>2]=d+ +g[i>>2]*.9800000190734863;b=c<<1;g[a+(b<<2)>>2]=e*j;g[a+((b|1)<<2)>>2]=e*+g[i>>2];}while((c|0)>0);return}function c7(a,c,d){a=a|0;c=c|0;d=d|0;var e=0.0,f=0.0,h=0,i=0.0,j=0,k=0.0;e=+g[d>>2];f=1.0/+O(+g[d+4>>2]*(e+1.0));if((c|0)<=0){return}h=d+8|0;i=f*+O(e)*.019999999552965164;j=d+12|0;e=f*.019999999552965164;d=c;do{d=d-1|0;c=b[a+(d<<1)>>1]|0;f=i+ +g[h>>2]*.9800000190734863;g[h>>2]=f;g[j>>2]=e+ +g[j>>2]*.9800000190734863;k=+(c<<16>>16|0);c=d<<1;b[a+(c<<1)>>1]=~~(k*f);b[a+((c|1)<<1)>>1]=~~(k*+g[j>>2]);}while((d|0)>0);return}function c8(a,b,c){a=a|0;b=b|0;c=c|0;b=(bw(a,1)|0)==0;g[c>>2]=+X((b?.25:-.25)*+((bw(a,5)|0)>>>0>>>0));g[c+4>>2]=+g[10704+((bw(a,2)|0)<<2)>>2];return 0}function c9(a){a=a|0;g[a+4>>2]=0.0;g[a+8>>2]=1.0;g[a+32>>2]=0.0;g[a>>2]=.10000000149011612;g[a+40>>2]=0.0;g[a+36>>2]=0.0;g[a+44>>2]=0.0;g[a+52>>2]=.6798535585403442;g[a+56>>2]=.05000000074505806;g[a+48>>2]=13.597070693969727;c[a+60>>2]=0;g[a+12>>2]=8.699514389038086;g[a+16>>2]=8.699514389038086;g[a+20>>2]=8.699514389038086;g[a+24>>2]=8.699514389038086;g[a+28>>2]=8.699514389038086;return}function da(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;var h=0.0,i=0,j=0.0,k=0.0,l=0,m=0.0,n=0.0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0,y=0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0,F=0.0,G=0.0,H=0.0,I=0.0,J=0,K=0.0,L=0.0,M=0.0,O=0.0,Q=0,R=0,S=0,T=0.0,U=0.0,V=0.0,W=0.0,X=0.0,Z=0.0,_=0.0,$=0,aa=0.0,ab=0,ac=0.0,ad=0.0;e=d>>1;if((e|0)>0){h=0.0;i=0;while(1){j=+g[b+(i<<2)>>2];k=h+j*j;l=i+1|0;if((l|0)<(e|0)){h=k;i=l}else{m=k;break}}}else{m=0.0}if((e|0)<(d|0)){h=0.0;i=e;while(1){k=+g[b+(i<<2)>>2];j=h+k*k;e=i+1|0;if((e|0)<(d|0)){h=j;i=e}else{n=j;break}}}else{n=0.0}h=m+n;j=+Y(h+6.0e3);i=a+12|0;k=+g[i>>2];o=j-k;d=a+16|0;p=+g[d>>2];q=j-p;b=a+20|0;r=+g[b>>2];s=j-r;e=a+24|0;t=+g[e>>2];u=j-t;l=a+28|0;v=j- +g[l>>2];w=(o*o+0.0+q*q+s*s+u*u+v*v)/150.0;v=w>1.0?1.0:w;w=f;u=w+-.4;s=u*3.0*+N(+u);q=+g[a>>2];x=a+4|0;o=h*q+(1.0-q)*+g[x>>2];g[x>>2]=o;x=a+52|0;q=+g[x>>2];y=a+56|0;z=+g[y>>2];A=q/z;g[a+48>>2]=A;B=h;C=+P(+B,+.3);D=z;E=h>6.0e3;if(D<.06&E){F=C*.05;g[x>>2]=F;G=F}else{G=q}q=s;do{if(q<.3){F=v;if(F<.2){H=C;I=A;if(H<I*1.2){J=1958;break}if(F<.05){K=H;L=I}else{J=1953;break}}else{if(F>=.05){J=1953;break}K=C;L=A}if(K<L*1.5){J=1958}else{J=1953}}else{J=1953}}while(0);L2700:do{if((J|0)==1953){do{if(q<.4){if(v>=.05){break}if(C<A*1.2){J=1958;break L2700}}}while(0);if(s<0.0){if(v<.05){J=1958;break}}c[a+60>>2]=0;M=G;O=z;Q=0}}while(0);do{if((J|0)==1958){R=a+60|0;S=(c[R>>2]|0)+1|0;c[R>>2]=S;v=A*3.0;if((S|0)<=3){M=G;O=z;Q=S;break}s=(C>v?v:C)*.05+G*.95;g[x>>2]=s;v=D*.95+.05;g[y>>2]=v;M=s;O=v;Q=S}}while(0);if(C<A&E){g[x>>2]=C*.05+M*.95;g[y>>2]=O*.95+.05}do{if(h<3.0e4){O=h<1.0e4?5.600000381469727:6.300000190734863;if(h>=3.0e3){T=O;break}T=O+-.7}else{O=h+1.0;M=+Y(O/(+g[a+8>>2]+1.0));C=+Y(O/(o+1.0));O=C<-5.0?-5.0:C;C=O>2.0?2.0:O;if(C>0.0){U=C*.6+7.0}else{U=7.0}if(C<0.0){V=C*.5+U}else{V=U}if(M>0.0){W=(M>5.0?2.5:M*.5)+V}else{W=V}if(n<=m*1.6){T=W;break}T=W+.5}}while(0);g[a+8>>2]=h;y=a+40|0;W=w*.4+ +g[y>>2]*.6;g[y>>2]=W;w=T+(u+(W+-.4))*2.2;y=a+44|0;W=+g[y>>2];if(w<W){X=W*.5+w*.5}else{X=w}w=X<4.0?4.0:X;x=(Q|0)>2;X=x?4.0:w>10.0?10.0:w;if((Q|0)==0){Z=X}else{Z=X-(+Y(+(Q|0)+3.0)+ -1.0986122886681098)}X=Z<0.0?0.0:Z;if(h>=6.0e4){_=X;$=_<-1.0;aa=$?-1.0:_;ab=a+36|0;g[ab>>2]=f;g[y>>2]=aa;g[l>>2]=t;g[e>>2]=r;g[b>>2]=p;g[d>>2]=k;g[i>>2]=j;return+aa}if(x){ac=X-(+Y(+(Q|0)+3.0)+ -1.0986122886681098)*.5}else{ac=X}if(h>=1.0e4|x^1){ad=ac}else{ad=ac-(+Y(+(Q|0)+3.0)+ -1.0986122886681098)*.5}ac=+Y(B/6.0e4+1.0e-4)*.3;_=(ad<0.0?0.0:ad)+ac;$=_<-1.0;aa=$?-1.0:_;ab=a+36|0;g[ab>>2]=f;g[y>>2]=aa;g[l>>2]=t;g[e>>2]=r;g[b>>2]=p;g[d>>2]=k;g[i>>2]=j;return+aa}function db(a){a=a|0;return}function dc(a,b,c){a=+a;b=b|0;c=c|0;var d=0,e=0,f=0,h=0;d=c-1|0;L2749:do{if((d|0)>0){c=b;e=0;while(1){if(+g[c>>2]>=a){f=e;break L2749}h=e+1|0;if((h|0)<(d|0)){c=c+4|0;e=h}else{f=h;break}}}else{f=0}}while(0);return f|0}function dd(a,b,c){a=+a;b=b|0;c=c|0;var d=0,e=0,f=0,h=0;d=c-1|0;L2755:do{if((d|0)>0){c=b;e=0;while(1){if(+g[c>>2]>=a){f=e;break L2755}h=e+1|0;if((h|0)<(d|0)){c=c+4|0;e=h}else{f=h;break}}}else{f=0}}while(0);return f|0}function de(a,b,d,e,f,h,i,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0.0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0.0,A=0.0,B=0,C=0;if((e|0)<=0){return}k=h-1|0;l=j+(k<<2)|0;m=(k|0)>0;if((d|0)>0){n=b;o=0;p=0}else{b=0;q=0;while(1){r=+g[f+(b<<2)>>2]*.5;if((b|0)<(h|0)){s=2010}else{if(r<+g[l>>2]){s=2010}else{t=q}}if((s|0)==2010){s=0;L2771:do{if(m){u=h;v=k;while(1){w=u-2|0;x=j+(w<<2)|0;if((v|0)<=(q|0)){if(r>=+g[x>>2]){y=v;break L2771}}g[j+(v<<2)>>2]=+g[x>>2];c[i+(v<<2)>>2]=c[i+(w<<2)>>2];w=v-1|0;if((w|0)>0){u=v;v=w}else{y=w;break}}}else{y=k}}while(0);g[j+(y<<2)>>2]=r;c[i+(y<<2)>>2]=b;t=q+1|0}v=b+1|0;if((v|0)<(e|0)){b=v;q=t}else{break}}return}while(1){t=n;q=0;z=0.0;while(1){A=z+ +g[a+(q<<2)>>2]*+g[t>>2];b=q+1|0;if((b|0)<(d|0)){t=t+4|0;q=b;z=A}else{break}}q=n+(d<<2)|0;z=+g[f+(o<<2)>>2]*.5-A;if((o|0)<(h|0)){s=2007}else{if(z<+g[l>>2]){s=2007}else{B=p}}if((s|0)==2007){s=0;L2789:do{if(m){t=h;b=k;while(1){y=t-2|0;v=j+(y<<2)|0;if((b|0)<=(p|0)){if(z>=+g[v>>2]){C=b;break L2789}}g[j+(b<<2)>>2]=+g[v>>2];c[i+(b<<2)>>2]=c[i+(y<<2)>>2];y=b-1|0;if((y|0)>0){t=b;b=y}else{C=y;break}}}else{C=k}}while(0);g[j+(C<<2)>>2]=z;c[i+(C<<2)>>2]=o;B=p+1|0}b=o+1|0;if((b|0)<(e|0)){n=q;o=b;p=B}else{break}}return}function df(a,b,d,e,f,h,i,j,k){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0,t=0.0,u=0,v=0.0,w=0,x=0,y=0,z=0,A=0,B=0;if((e|0)<=0){return}k=(d|0)>0;l=h-1|0;m=j+(l<<2)|0;n=(l|0)>0;o=b;b=0;p=0;while(1){do{if(k){q=o;r=0;s=0.0;while(1){t=s+ +g[a+(r<<2)>>2]*+g[q>>2];u=r+1|0;if((u|0)<(d|0)){q=q+4|0;r=u;s=t}else{break}}r=o+(d<<2)|0;if(t<=0.0){v=t;w=1;x=r;break}v=-0.0-t;w=0;x=r}else{v=0.0;w=1;x=o}}while(0);s=v+ +g[f+(b<<2)>>2]*.5;if((b|0)<(h|0)){y=2028}else{if(s<+g[m>>2]){y=2028}else{z=p}}do{if((y|0)==2028){y=0;L2814:do{if(n){r=h;q=l;while(1){u=r-2|0;A=j+(u<<2)|0;if((q|0)<=(p|0)){if(s>=+g[A>>2]){B=q;break L2814}}g[j+(q<<2)>>2]=+g[A>>2];c[i+(q<<2)>>2]=c[i+(u<<2)>>2];u=q-1|0;if((u|0)>0){r=q;q=u}else{B=u;break}}}else{B=l}}while(0);g[j+(B<<2)>>2]=s;q=i+(B<<2)|0;c[q>>2]=b;r=p+1|0;if((w|0)==0){z=r;break}c[q>>2]=b+e;z=r}}while(0);r=b+1|0;if((r|0)<(e|0)){o=x;b=r;p=z}else{break}}return}function dg(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aH=0,aI=0;do{if(a>>>0<245>>>0){if(a>>>0<11>>>0){b=16}else{b=a+11&-8}d=b>>>3;e=c[3556]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=14264+(h<<2)|0;j=14264+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[3556]=e&~(1<<g)}else{if(l>>>0<(c[3560]|0)>>>0){ar();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{ar();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(b>>>0<=(c[3558]|0)>>>0){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=14264+(p<<2)|0;m=14264+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[3556]=e&~(1<<r)}else{if(l>>>0<(c[3560]|0)>>>0){ar();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{ar();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[3558]|0;if((l|0)!=0){q=c[3561]|0;d=l>>>3;l=d<<1;f=14264+(l<<2)|0;k=c[3556]|0;h=1<<d;do{if((k&h|0)==0){c[3556]=k|h;s=f;t=14264+(l+2<<2)|0}else{d=14264+(l+2<<2)|0;g=c[d>>2]|0;if(g>>>0>=(c[3560]|0)>>>0){s=g;t=d;break}ar();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[3558]=m;c[3561]=e;n=i;return n|0}l=c[3557]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[14528+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[3560]|0;if(r>>>0<i>>>0){ar();return 0}e=r+b|0;m=e;if(r>>>0>=e>>>0){ar();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){ar();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){ar();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){ar();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{ar();return 0}}}while(0);L2902:do{if((e|0)!=0){f=d+28|0;i=14528+(c[f>>2]<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[3557]=c[3557]&~(1<<c[f>>2]);break L2902}else{if(e>>>0<(c[3560]|0)>>>0){ar();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break L2902}}}while(0);if(v>>>0<(c[3560]|0)>>>0){ar();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16>>>0){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[3558]|0;if((f|0)!=0){e=c[3561]|0;i=f>>>3;f=i<<1;q=14264+(f<<2)|0;k=c[3556]|0;g=1<<i;do{if((k&g|0)==0){c[3556]=k|g;y=q;z=14264+(f+2<<2)|0}else{i=14264+(f+2<<2)|0;l=c[i>>2]|0;if(l>>>0>=(c[3560]|0)>>>0){y=l;z=i;break}ar();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[3558]=p;c[3561]=m}f=d+8|0;if((f|0)==0){o=b;break}else{n=f}return n|0}else{if(a>>>0>4294967231>>>0){o=-1;break}f=a+11|0;g=f&-8;k=c[3557]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215>>>0){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[14528+(A<<2)>>2]|0;L2950:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break L2950}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[14528+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(J>>>0>=((c[3558]|0)-g|0)>>>0){o=g;break}q=K;m=c[3560]|0;if(q>>>0<m>>>0){ar();return 0}p=q+g|0;k=p;if(q>>>0>=p>>>0){ar();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){ar();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){ar();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){ar();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{ar();return 0}}}while(0);L3000:do{if((e|0)!=0){i=K+28|0;m=14528+(c[i>>2]<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[3557]=c[3557]&~(1<<c[i>>2]);break L3000}else{if(e>>>0<(c[3560]|0)>>>0){ar();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break L3000}}}while(0);if(L>>>0<(c[3560]|0)>>>0){ar();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);do{if(J>>>0<16>>>0){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256>>>0){e=i<<1;m=14264+(e<<2)|0;r=c[3556]|0;j=1<<i;do{if((r&j|0)==0){c[3556]=r|j;O=m;P=14264+(e+2<<2)|0}else{i=14264+(e+2<<2)|0;d=c[i>>2]|0;if(d>>>0>=(c[3560]|0)>>>0){O=d;P=i;break}ar();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215>>>0){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=14528+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[3557]|0;l=1<<Q;if((m&l|0)==0){c[3557]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}l=J<<R;m=c[j>>2]|0;while(1){if((c[m+4>>2]&-8|0)==(J|0)){break}S=m+16+(l>>>31<<2)|0;j=c[S>>2]|0;if((j|0)==0){T=2188;break}else{l=l<<1;m=j}}if((T|0)==2188){if(S>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[S>>2]=e;c[q+(g+24)>>2]=m;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}}l=m+8|0;j=c[l>>2]|0;i=c[3560]|0;if(m>>>0<i>>>0){ar();return 0}if(j>>>0<i>>>0){ar();return 0}else{c[j+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=j;c[q+(g+12)>>2]=m;c[q+(g+24)>>2]=0;break}}}while(0);q=K+8|0;if((q|0)==0){o=g;break}else{n=q}return n|0}}while(0);K=c[3558]|0;if(o>>>0<=K>>>0){S=K-o|0;J=c[3561]|0;if(S>>>0>15>>>0){R=J;c[3561]=R+o;c[3558]=S;c[R+(o+4)>>2]=S|1;c[R+K>>2]=S;c[J+4>>2]=o|3}else{c[3558]=0;c[3561]=0;c[J+4>>2]=K|3;S=J+(K+4)|0;c[S>>2]=c[S>>2]|1}n=J+8|0;return n|0}J=c[3559]|0;if(o>>>0<J>>>0){S=J-o|0;c[3559]=S;J=c[3562]|0;K=J;c[3562]=K+o;c[K+(o+4)>>2]=S|1;c[J+4>>2]=o|3;n=J+8|0;return n|0}do{if((c[3548]|0)==0){J=aG(30)|0;if((J-1&J|0)==0){c[3550]=J;c[3549]=J;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar();return 0}}}while(0);J=o+48|0;S=c[3550]|0;K=o+47|0;R=S+K|0;Q=-S|0;S=R&Q;if(S>>>0<=o>>>0){n=0;return n|0}O=c[3666]|0;do{if((O|0)!=0){P=c[3664]|0;L=P+S|0;if(L>>>0<=P>>>0|L>>>0>O>>>0){n=0}else{break}return n|0}}while(0);L3092:do{if((c[3667]&4|0)==0){O=c[3562]|0;L3094:do{if((O|0)==0){T=2218}else{L=O;P=14672;while(1){U=P|0;M=c[U>>2]|0;if(M>>>0<=L>>>0){V=P+4|0;if((M+(c[V>>2]|0)|0)>>>0>L>>>0){break}}M=c[P+8>>2]|0;if((M|0)==0){T=2218;break L3094}else{P=M}}if((P|0)==0){T=2218;break}L=R-(c[3559]|0)&Q;if(L>>>0>=2147483647>>>0){W=0;break}m=aM(L|0)|0;e=(m|0)==((c[U>>2]|0)+(c[V>>2]|0)|0);X=e?m:-1;Y=e?L:0;Z=m;_=L;T=2227}}while(0);do{if((T|0)==2218){O=aM(0)|0;if((O|0)==-1){W=0;break}g=O;L=c[3549]|0;m=L-1|0;if((m&g|0)==0){$=S}else{$=S-g+(m+g&-L)|0}L=c[3664]|0;g=L+$|0;if(!($>>>0>o>>>0&$>>>0<2147483647>>>0)){W=0;break}m=c[3666]|0;if((m|0)!=0){if(g>>>0<=L>>>0|g>>>0>m>>>0){W=0;break}}m=aM($|0)|0;g=(m|0)==(O|0);X=g?O:-1;Y=g?$:0;Z=m;_=$;T=2227}}while(0);L3114:do{if((T|0)==2227){m=-_|0;if((X|0)!=-1){aa=Y;ab=X;T=2238;break L3092}do{if((Z|0)!=-1&_>>>0<2147483647>>>0&_>>>0<J>>>0){g=c[3550]|0;O=K-_+g&-g;if(O>>>0>=2147483647>>>0){ac=_;break}if((aM(O|0)|0)==-1){aM(m|0)|0;W=Y;break L3114}else{ac=O+_|0;break}}else{ac=_}}while(0);if((Z|0)==-1){W=Y}else{aa=ac;ab=Z;T=2238;break L3092}}}while(0);c[3667]=c[3667]|4;ad=W;T=2235}else{ad=0;T=2235}}while(0);do{if((T|0)==2235){if(S>>>0>=2147483647>>>0){break}W=aM(S|0)|0;Z=aM(0)|0;if(!((Z|0)!=-1&(W|0)!=-1&W>>>0<Z>>>0)){break}ac=Z-W|0;Z=ac>>>0>(o+40|0)>>>0;Y=Z?W:-1;if((Y|0)!=-1){aa=Z?ac:ad;ab=Y;T=2238}}}while(0);do{if((T|0)==2238){ad=(c[3664]|0)+aa|0;c[3664]=ad;if(ad>>>0>(c[3665]|0)>>>0){c[3665]=ad}ad=c[3562]|0;L3134:do{if((ad|0)==0){S=c[3560]|0;if((S|0)==0|ab>>>0<S>>>0){c[3560]=ab}c[3668]=ab;c[3669]=aa;c[3671]=0;c[3565]=c[3548];c[3564]=-1;S=0;do{Y=S<<1;ac=14264+(Y<<2)|0;c[14264+(Y+3<<2)>>2]=ac;c[14264+(Y+2<<2)>>2]=ac;S=S+1|0;}while(S>>>0<32>>>0);S=ab+8|0;if((S&7|0)==0){ae=0}else{ae=-S&7}S=aa-40-ae|0;c[3562]=ab+ae;c[3559]=S;c[ab+(ae+4)>>2]=S|1;c[ab+(aa-36)>>2]=40;c[3563]=c[3552]}else{S=14672;while(1){af=c[S>>2]|0;ag=S+4|0;ah=c[ag>>2]|0;if((ab|0)==(af+ah|0)){T=2250;break}ac=c[S+8>>2]|0;if((ac|0)==0){break}else{S=ac}}do{if((T|0)==2250){if((c[S+12>>2]&8|0)!=0){break}ac=ad;if(!(ac>>>0>=af>>>0&ac>>>0<ab>>>0)){break}c[ag>>2]=ah+aa;ac=c[3562]|0;Y=(c[3559]|0)+aa|0;Z=ac;W=ac+8|0;if((W&7|0)==0){ai=0}else{ai=-W&7}W=Y-ai|0;c[3562]=Z+ai;c[3559]=W;c[Z+(ai+4)>>2]=W|1;c[Z+(Y+4)>>2]=40;c[3563]=c[3552];break L3134}}while(0);if(ab>>>0<(c[3560]|0)>>>0){c[3560]=ab}S=ab+aa|0;Y=14672;while(1){aj=Y|0;if((c[aj>>2]|0)==(S|0)){T=2260;break}Z=c[Y+8>>2]|0;if((Z|0)==0){break}else{Y=Z}}do{if((T|0)==2260){if((c[Y+12>>2]&8|0)!=0){break}c[aj>>2]=ab;S=Y+4|0;c[S>>2]=(c[S>>2]|0)+aa;S=ab+8|0;if((S&7|0)==0){ak=0}else{ak=-S&7}S=ab+(aa+8)|0;if((S&7|0)==0){al=0}else{al=-S&7}S=ab+(al+aa)|0;Z=S;W=ak+o|0;ac=ab+W|0;_=ac;K=S-(ab+ak)-o|0;c[ab+(ak+4)>>2]=o|3;do{if((Z|0)==(c[3562]|0)){J=(c[3559]|0)+K|0;c[3559]=J;c[3562]=_;c[ab+(W+4)>>2]=J|1}else{if((Z|0)==(c[3561]|0)){J=(c[3558]|0)+K|0;c[3558]=J;c[3561]=_;c[ab+(W+4)>>2]=J|1;c[ab+(J+W)>>2]=J;break}J=aa+4|0;X=c[ab+(J+al)>>2]|0;if((X&3|0)==1){$=X&-8;V=X>>>3;L3179:do{if(X>>>0<256>>>0){U=c[ab+((al|8)+aa)>>2]|0;Q=c[ab+(aa+12+al)>>2]|0;R=14264+(V<<1<<2)|0;do{if((U|0)!=(R|0)){if(U>>>0<(c[3560]|0)>>>0){ar();return 0}if((c[U+12>>2]|0)==(Z|0)){break}ar();return 0}}while(0);if((Q|0)==(U|0)){c[3556]=c[3556]&~(1<<V);break}do{if((Q|0)==(R|0)){am=Q+8|0}else{if(Q>>>0<(c[3560]|0)>>>0){ar();return 0}m=Q+8|0;if((c[m>>2]|0)==(Z|0)){am=m;break}ar();return 0}}while(0);c[U+12>>2]=Q;c[am>>2]=U}else{R=S;m=c[ab+((al|24)+aa)>>2]|0;P=c[ab+(aa+12+al)>>2]|0;do{if((P|0)==(R|0)){O=al|16;g=ab+(J+O)|0;L=c[g>>2]|0;if((L|0)==0){e=ab+(O+aa)|0;O=c[e>>2]|0;if((O|0)==0){an=0;break}else{ao=O;ap=e}}else{ao=L;ap=g}while(1){g=ao+20|0;L=c[g>>2]|0;if((L|0)!=0){ao=L;ap=g;continue}g=ao+16|0;L=c[g>>2]|0;if((L|0)==0){break}else{ao=L;ap=g}}if(ap>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[ap>>2]=0;an=ao;break}}else{g=c[ab+((al|8)+aa)>>2]|0;if(g>>>0<(c[3560]|0)>>>0){ar();return 0}L=g+12|0;if((c[L>>2]|0)!=(R|0)){ar();return 0}e=P+8|0;if((c[e>>2]|0)==(R|0)){c[L>>2]=P;c[e>>2]=g;an=P;break}else{ar();return 0}}}while(0);if((m|0)==0){break}P=ab+(aa+28+al)|0;U=14528+(c[P>>2]<<2)|0;do{if((R|0)==(c[U>>2]|0)){c[U>>2]=an;if((an|0)!=0){break}c[3557]=c[3557]&~(1<<c[P>>2]);break L3179}else{if(m>>>0<(c[3560]|0)>>>0){ar();return 0}Q=m+16|0;if((c[Q>>2]|0)==(R|0)){c[Q>>2]=an}else{c[m+20>>2]=an}if((an|0)==0){break L3179}}}while(0);if(an>>>0<(c[3560]|0)>>>0){ar();return 0}c[an+24>>2]=m;R=al|16;P=c[ab+(R+aa)>>2]|0;do{if((P|0)!=0){if(P>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[an+16>>2]=P;c[P+24>>2]=an;break}}}while(0);P=c[ab+(J+R)>>2]|0;if((P|0)==0){break}if(P>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[an+20>>2]=P;c[P+24>>2]=an;break}}}while(0);aq=ab+(($|al)+aa)|0;as=$+K|0}else{aq=Z;as=K}J=aq+4|0;c[J>>2]=c[J>>2]&-2;c[ab+(W+4)>>2]=as|1;c[ab+(as+W)>>2]=as;J=as>>>3;if(as>>>0<256>>>0){V=J<<1;X=14264+(V<<2)|0;P=c[3556]|0;m=1<<J;do{if((P&m|0)==0){c[3556]=P|m;at=X;au=14264+(V+2<<2)|0}else{J=14264+(V+2<<2)|0;U=c[J>>2]|0;if(U>>>0>=(c[3560]|0)>>>0){at=U;au=J;break}ar();return 0}}while(0);c[au>>2]=_;c[at+12>>2]=_;c[ab+(W+8)>>2]=at;c[ab+(W+12)>>2]=X;break}V=ac;m=as>>>8;do{if((m|0)==0){av=0}else{if(as>>>0>16777215>>>0){av=31;break}P=(m+1048320|0)>>>16&8;$=m<<P;J=($+520192|0)>>>16&4;U=$<<J;$=(U+245760|0)>>>16&2;Q=14-(J|P|$)+(U<<$>>>15)|0;av=as>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=14528+(av<<2)|0;c[ab+(W+28)>>2]=av;c[ab+(W+20)>>2]=0;c[ab+(W+16)>>2]=0;X=c[3557]|0;Q=1<<av;if((X&Q|0)==0){c[3557]=X|Q;c[m>>2]=V;c[ab+(W+24)>>2]=m;c[ab+(W+12)>>2]=V;c[ab+(W+8)>>2]=V;break}if((av|0)==31){aw=0}else{aw=25-(av>>>1)|0}Q=as<<aw;X=c[m>>2]|0;while(1){if((c[X+4>>2]&-8|0)==(as|0)){break}ax=X+16+(Q>>>31<<2)|0;m=c[ax>>2]|0;if((m|0)==0){T=2333;break}else{Q=Q<<1;X=m}}if((T|0)==2333){if(ax>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[ax>>2]=V;c[ab+(W+24)>>2]=X;c[ab+(W+12)>>2]=V;c[ab+(W+8)>>2]=V;break}}Q=X+8|0;m=c[Q>>2]|0;$=c[3560]|0;if(X>>>0<$>>>0){ar();return 0}if(m>>>0<$>>>0){ar();return 0}else{c[m+12>>2]=V;c[Q>>2]=V;c[ab+(W+8)>>2]=m;c[ab+(W+12)>>2]=X;c[ab+(W+24)>>2]=0;break}}}while(0);n=ab+(ak|8)|0;return n|0}}while(0);Y=ad;W=14672;while(1){ay=c[W>>2]|0;if(ay>>>0<=Y>>>0){az=c[W+4>>2]|0;aA=ay+az|0;if(aA>>>0>Y>>>0){break}}W=c[W+8>>2]|0}W=ay+(az-39)|0;if((W&7|0)==0){aB=0}else{aB=-W&7}W=ay+(az-47+aB)|0;ac=W>>>0<(ad+16|0)>>>0?Y:W;W=ac+8|0;_=ab+8|0;if((_&7|0)==0){aC=0}else{aC=-_&7}_=aa-40-aC|0;c[3562]=ab+aC;c[3559]=_;c[ab+(aC+4)>>2]=_|1;c[ab+(aa-36)>>2]=40;c[3563]=c[3552];c[ac+4>>2]=27;c[W>>2]=c[3668];c[W+4>>2]=c[3669];c[W+8>>2]=c[3670];c[W+12>>2]=c[3671];c[3668]=ab;c[3669]=aa;c[3671]=0;c[3670]=W;W=ac+28|0;c[W>>2]=7;if((ac+32|0)>>>0<aA>>>0){_=W;while(1){W=_+4|0;c[W>>2]=7;if((_+8|0)>>>0<aA>>>0){_=W}else{break}}}if((ac|0)==(Y|0)){break}_=ac-ad|0;W=Y+(_+4)|0;c[W>>2]=c[W>>2]&-2;c[ad+4>>2]=_|1;c[Y+_>>2]=_;W=_>>>3;if(_>>>0<256>>>0){K=W<<1;Z=14264+(K<<2)|0;S=c[3556]|0;m=1<<W;do{if((S&m|0)==0){c[3556]=S|m;aD=Z;aE=14264+(K+2<<2)|0}else{W=14264+(K+2<<2)|0;Q=c[W>>2]|0;if(Q>>>0>=(c[3560]|0)>>>0){aD=Q;aE=W;break}ar();return 0}}while(0);c[aE>>2]=ad;c[aD+12>>2]=ad;c[ad+8>>2]=aD;c[ad+12>>2]=Z;break}K=ad;m=_>>>8;do{if((m|0)==0){aF=0}else{if(_>>>0>16777215>>>0){aF=31;break}S=(m+1048320|0)>>>16&8;Y=m<<S;ac=(Y+520192|0)>>>16&4;W=Y<<ac;Y=(W+245760|0)>>>16&2;Q=14-(ac|S|Y)+(W<<Y>>>15)|0;aF=_>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=14528+(aF<<2)|0;c[ad+28>>2]=aF;c[ad+20>>2]=0;c[ad+16>>2]=0;Z=c[3557]|0;Q=1<<aF;if((Z&Q|0)==0){c[3557]=Z|Q;c[m>>2]=K;c[ad+24>>2]=m;c[ad+12>>2]=ad;c[ad+8>>2]=ad;break}if((aF|0)==31){aH=0}else{aH=25-(aF>>>1)|0}Q=_<<aH;Z=c[m>>2]|0;while(1){if((c[Z+4>>2]&-8|0)==(_|0)){break}aI=Z+16+(Q>>>31<<2)|0;m=c[aI>>2]|0;if((m|0)==0){T=2368;break}else{Q=Q<<1;Z=m}}if((T|0)==2368){if(aI>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[aI>>2]=K;c[ad+24>>2]=Z;c[ad+12>>2]=ad;c[ad+8>>2]=ad;break}}Q=Z+8|0;_=c[Q>>2]|0;m=c[3560]|0;if(Z>>>0<m>>>0){ar();return 0}if(_>>>0<m>>>0){ar();return 0}else{c[_+12>>2]=K;c[Q>>2]=K;c[ad+8>>2]=_;c[ad+12>>2]=Z;c[ad+24>>2]=0;break}}}while(0);ad=c[3559]|0;if(ad>>>0<=o>>>0){break}_=ad-o|0;c[3559]=_;ad=c[3562]|0;Q=ad;c[3562]=Q+o;c[Q+(o+4)>>2]=_|1;c[ad+4>>2]=o|3;n=ad+8|0;return n|0}}while(0);c[(aO()|0)>>2]=12;n=0;return n|0}function dh(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[3560]|0;if(b>>>0<e>>>0){ar()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){ar()}h=f&-8;i=a+(h-8)|0;j=i;L3351:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){ar()}if((n|0)==(c[3561]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[3558]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256>>>0){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=14264+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){ar()}if((c[k+12>>2]|0)==(n|0)){break}ar()}}while(0);if((s|0)==(k|0)){c[3556]=c[3556]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){ar()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}ar()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){ar()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){ar()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){ar()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{ar()}}}while(0);if((p|0)==0){q=n;r=o;break}v=a+(l+28)|0;m=14528+(c[v>>2]<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[3557]=c[3557]&~(1<<c[v>>2]);q=n;r=o;break L3351}else{if(p>>>0<(c[3560]|0)>>>0){ar()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break L3351}}}while(0);if(A>>>0<(c[3560]|0)>>>0){ar()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[3560]|0)>>>0){ar()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[3560]|0)>>>0){ar()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(d>>>0>=i>>>0){ar()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){ar()}do{if((e&2|0)==0){if((j|0)==(c[3562]|0)){B=(c[3559]|0)+r|0;c[3559]=B;c[3562]=q;c[q+4>>2]=B|1;if((q|0)!=(c[3561]|0)){return}c[3561]=0;c[3558]=0;return}if((j|0)==(c[3561]|0)){B=(c[3558]|0)+r|0;c[3558]=B;c[3561]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;L3453:do{if(e>>>0<256>>>0){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=14264+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[3560]|0)>>>0){ar()}if((c[u+12>>2]|0)==(j|0)){break}ar()}}while(0);if((g|0)==(u|0)){c[3556]=c[3556]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[3560]|0)>>>0){ar()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}ar()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[3560]|0)>>>0){ar()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[3560]|0)>>>0){ar()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){ar()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{ar()}}}while(0);if((f|0)==0){break}t=a+(h+20)|0;u=14528+(c[t>>2]<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[3557]=c[3557]&~(1<<c[t>>2]);break L3453}else{if(f>>>0<(c[3560]|0)>>>0){ar()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break L3453}}}while(0);if(E>>>0<(c[3560]|0)>>>0){ar()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[3560]|0)>>>0){ar()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[3560]|0)>>>0){ar()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[3561]|0)){H=B;break}c[3558]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256>>>0){d=r<<1;e=14264+(d<<2)|0;A=c[3556]|0;E=1<<r;do{if((A&E|0)==0){c[3556]=A|E;I=e;J=14264+(d+2<<2)|0}else{r=14264+(d+2<<2)|0;h=c[r>>2]|0;if(h>>>0>=(c[3560]|0)>>>0){I=h;J=r;break}ar()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215>>>0){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=14528+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[3557]|0;d=1<<K;do{if((r&d|0)==0){c[3557]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{if((K|0)==31){L=0}else{L=25-(K>>>1)|0}A=H<<L;J=c[I>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(H|0)){break}M=J+16+(A>>>31<<2)|0;E=c[M>>2]|0;if((E|0)==0){N=2545;break}else{A=A<<1;J=E}}if((N|0)==2545){if(M>>>0<(c[3560]|0)>>>0){ar()}else{c[M>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break}}A=J+8|0;B=c[A>>2]|0;E=c[3560]|0;if(J>>>0<E>>>0){ar()}if(B>>>0<E>>>0){ar()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=J;c[q+24>>2]=0;break}}}while(0);q=(c[3564]|0)-1|0;c[3564]=q;if((q|0)==0){O=14680}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[3564]=-1;return}function di(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((a|0)==0){d=0}else{e=_(b,a)|0;if((b|a)>>>0<=65535>>>0){d=e;break}d=((e>>>0)/(a>>>0)|0|0)==(b|0)?e:-1}}while(0);b=dg(d)|0;if((b|0)==0){return b|0}if((c[b-4>>2]&3|0)==0){return b|0}dE(b|0,0,d|0);return b|0}function dj(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==0){d=dg(b)|0;return d|0}if(b>>>0>4294967231>>>0){c[(aO()|0)>>2]=12;d=0;return d|0}if(b>>>0<11>>>0){e=16}else{e=b+11&-8}f=dk(a-8|0,e)|0;if((f|0)!=0){d=f+8|0;return d|0}f=dg(b)|0;if((f|0)==0){d=0;return d|0}e=c[a-4>>2]|0;g=(e&-8)-((e&3|0)==0?8:4)|0;e=g>>>0<b>>>0?g:b;dB(f|0,a|0,e)|0;dh(a);d=f;return d|0}function dk(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=a+4|0;e=c[d>>2]|0;f=e&-8;g=a;h=g+f|0;i=h;j=c[3560]|0;if(g>>>0<j>>>0){ar();return 0}k=e&3;if(!((k|0)!=1&g>>>0<h>>>0)){ar();return 0}l=g+(f|4)|0;m=c[l>>2]|0;if((m&1|0)==0){ar();return 0}if((k|0)==0){if(b>>>0<256>>>0){n=0;return n|0}do{if(f>>>0>=(b+4|0)>>>0){if((f-b|0)>>>0>c[3550]<<1>>>0){break}else{n=a}return n|0}}while(0);n=0;return n|0}if(f>>>0>=b>>>0){k=f-b|0;if(k>>>0<=15>>>0){n=a;return n|0}c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;dA(g+b|0,k);n=a;return n|0}if((i|0)==(c[3562]|0)){k=(c[3559]|0)+f|0;if(k>>>0<=b>>>0){n=0;return n|0}l=k-b|0;c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=l|1;c[3562]=g+b;c[3559]=l;n=a;return n|0}if((i|0)==(c[3561]|0)){l=(c[3558]|0)+f|0;if(l>>>0<b>>>0){n=0;return n|0}k=l-b|0;if(k>>>0>15>>>0){c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|1;c[g+l>>2]=k;o=g+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=g+b|0;q=k}else{c[d>>2]=e&1|l|2;e=g+(l+4)|0;c[e>>2]=c[e>>2]|1;p=0;q=0}c[3558]=q;c[3561]=p;n=a;return n|0}if((m&2|0)!=0){n=0;return n|0}p=(m&-8)+f|0;if(p>>>0<b>>>0){n=0;return n|0}q=p-b|0;e=m>>>3;L3652:do{if(m>>>0<256>>>0){l=c[g+(f+8)>>2]|0;k=c[g+(f+12)>>2]|0;o=14264+(e<<1<<2)|0;do{if((l|0)!=(o|0)){if(l>>>0<j>>>0){ar();return 0}if((c[l+12>>2]|0)==(i|0)){break}ar();return 0}}while(0);if((k|0)==(l|0)){c[3556]=c[3556]&~(1<<e);break}do{if((k|0)==(o|0)){r=k+8|0}else{if(k>>>0<j>>>0){ar();return 0}s=k+8|0;if((c[s>>2]|0)==(i|0)){r=s;break}ar();return 0}}while(0);c[l+12>>2]=k;c[r>>2]=l}else{o=h;s=c[g+(f+24)>>2]|0;t=c[g+(f+12)>>2]|0;do{if((t|0)==(o|0)){u=g+(f+20)|0;v=c[u>>2]|0;if((v|0)==0){w=g+(f+16)|0;x=c[w>>2]|0;if((x|0)==0){y=0;break}else{z=x;A=w}}else{z=v;A=u}while(1){u=z+20|0;v=c[u>>2]|0;if((v|0)!=0){z=v;A=u;continue}u=z+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{z=v;A=u}}if(A>>>0<j>>>0){ar();return 0}else{c[A>>2]=0;y=z;break}}else{u=c[g+(f+8)>>2]|0;if(u>>>0<j>>>0){ar();return 0}v=u+12|0;if((c[v>>2]|0)!=(o|0)){ar();return 0}w=t+8|0;if((c[w>>2]|0)==(o|0)){c[v>>2]=t;c[w>>2]=u;y=t;break}else{ar();return 0}}}while(0);if((s|0)==0){break}t=g+(f+28)|0;l=14528+(c[t>>2]<<2)|0;do{if((o|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[3557]=c[3557]&~(1<<c[t>>2]);break L3652}else{if(s>>>0<(c[3560]|0)>>>0){ar();return 0}k=s+16|0;if((c[k>>2]|0)==(o|0)){c[k>>2]=y}else{c[s+20>>2]=y}if((y|0)==0){break L3652}}}while(0);if(y>>>0<(c[3560]|0)>>>0){ar();return 0}c[y+24>>2]=s;o=c[g+(f+16)>>2]|0;do{if((o|0)!=0){if(o>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[y+16>>2]=o;c[o+24>>2]=y;break}}}while(0);o=c[g+(f+20)>>2]|0;if((o|0)==0){break}if(o>>>0<(c[3560]|0)>>>0){ar();return 0}else{c[y+20>>2]=o;c[o+24>>2]=y;break}}}while(0);if(q>>>0<16>>>0){c[d>>2]=p|c[d>>2]&1|2;y=g+(p|4)|0;c[y>>2]=c[y>>2]|1;n=a;return n|0}else{c[d>>2]=c[d>>2]&1|b|2;c[g+(b+4)>>2]=q|3;d=g+(p|4)|0;c[d>>2]=c[d>>2]|1;dA(g+b|0,q);n=a;return n|0}return 0}function dl(a,b){a=a|0;b=b|0;var c=0;if(a>>>0<9>>>0){c=dg(b)|0;return c|0}else{c=dm(a,b)|0;return c|0}return 0}function dm(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;d=a>>>0<16>>>0?16:a;if((d-1&d|0)==0){e=d}else{a=16;while(1){if(a>>>0<d>>>0){a=a<<1}else{e=a;break}}}if((-64-e|0)>>>0<=b>>>0){c[(aO()|0)>>2]=12;f=0;return f|0}if(b>>>0<11>>>0){g=16}else{g=b+11&-8}b=dg(e+12+g|0)|0;if((b|0)==0){f=0;return f|0}a=b-8|0;d=a;h=e-1|0;do{if((b&h|0)==0){i=d}else{j=b+h&-e;k=j-8|0;l=a;if((k-l|0)>>>0>15>>>0){m=k}else{m=j+(e-8)|0}j=m;k=m-l|0;l=b-4|0;n=c[l>>2]|0;o=(n&-8)-k|0;if((n&3|0)==0){c[m>>2]=(c[a>>2]|0)+k;c[m+4>>2]=o;i=j;break}else{n=m+4|0;c[n>>2]=o|c[n>>2]&1|2;n=m+(o+4)|0;c[n>>2]=c[n>>2]|1;c[l>>2]=k|c[l>>2]&1|2;l=b+(k-4)|0;c[l>>2]=c[l>>2]|1;dA(d,k);i=j;break}}}while(0);d=i+4|0;b=c[d>>2]|0;do{if((b&3|0)!=0){m=b&-8;if(m>>>0<=(g+16|0)>>>0){break}a=m-g|0;e=i;c[d>>2]=g|b&1|2;c[e+(g|4)>>2]=a|3;h=e+(m|4)|0;c[h>>2]=c[h>>2]|1;dA(e+g|0,a)}}while(0);f=i+8|0;return f|0}function dn(a){a=a|0;var b=0,d=0,e=0;if((c[3548]|0)!=0){b=c[3549]|0;d=dl(b,a)|0;return d|0}e=aG(30)|0;if((e-1&e|0)!=0){ar();return 0}c[3550]=e;c[3549]=e;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;b=c[3549]|0;d=dl(b,a)|0;return d|0}function dp(a){a=a|0;var b=0;do{if((c[3548]|0)==0){b=aG(30)|0;if((b-1&b|0)==0){c[3550]=b;c[3549]=b;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar();return 0}}}while(0);b=c[3549]|0;return dl(b,a-1+b&-b)|0}function dq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;i=i+8|0;f=e|0;c[f>>2]=b;b=dr(a,f,3,d)|0;i=e;return b|0}function dr(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;do{if((c[3548]|0)==0){f=aG(30)|0;if((f-1&f|0)==0){c[3550]=f;c[3549]=f;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar();return 0}}}while(0);f=(a|0)==0;do{if((e|0)==0){if(f){g=dg(0)|0;return g|0}else{h=a<<2;if(h>>>0<11>>>0){i=0;j=16;break}i=0;j=h+11&-8;break}}else{if(f){g=e}else{i=e;j=0;break}return g|0}}while(0);do{if((d&1|0)==0){if(f){k=0;l=0;break}else{m=0;n=0}while(1){e=c[b+(n<<2)>>2]|0;if(e>>>0<11>>>0){o=16}else{o=e+11&-8}e=o+m|0;h=n+1|0;if((h|0)==(a|0)){k=0;l=e;break}else{m=e;n=h}}}else{h=c[b>>2]|0;if(h>>>0<11>>>0){p=16}else{p=h+11&-8}k=p;l=_(p,a)|0}}while(0);p=dg(j-4+l|0)|0;if((p|0)==0){g=0;return g|0}n=p-8|0;m=c[p-4>>2]&-8;if((d&2|0)!=0){dE(p|0,0,-4-j+m|0)}if((i|0)==0){c[p+(l-4)>>2]=m-l|3;q=p+l|0;r=l}else{q=i;r=m}c[q>>2]=p;p=a-1|0;L3816:do{if((p|0)==0){s=n;t=r}else{if((k|0)==0){u=n;v=r;w=0}else{a=n;m=r;i=0;while(1){l=m-k|0;c[a+4>>2]=k|3;j=a+k|0;d=i+1|0;c[q+(d<<2)>>2]=a+(k+8);if((d|0)==(p|0)){s=j;t=l;break L3816}else{a=j;m=l;i=d}}}while(1){i=c[b+(w<<2)>>2]|0;if(i>>>0<11>>>0){x=16}else{x=i+11&-8}i=v-x|0;c[u+4>>2]=x|3;m=u+x|0;a=w+1|0;c[q+(a<<2)>>2]=u+(x+8);if((a|0)==(p|0)){s=m;t=i;break}else{u=m;v=i;w=a}}}}while(0);c[s+4>>2]=t|3;g=q;return g|0}function ds(a,b,c){a=a|0;b=b|0;c=c|0;return dr(a,b,0,c)|0}function dt(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;do{if((c[3548]|0)==0){b=aG(30)|0;if((b-1&b|0)==0){c[3550]=b;c[3549]=b;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar();return 0}}}while(0);if(a>>>0>=4294967232>>>0){d=0;return d|0}b=c[3562]|0;if((b|0)==0){d=0;return d|0}e=c[3559]|0;do{if(e>>>0>(a+40|0)>>>0){f=c[3550]|0;g=_((((-41-a+e+f|0)>>>0)/(f>>>0)|0)-1|0,f)|0;h=b;i=14672;while(1){j=c[i>>2]|0;if(j>>>0<=h>>>0){if((j+(c[i+4>>2]|0)|0)>>>0>h>>>0){k=i;break}}j=c[i+8>>2]|0;if((j|0)==0){k=0;break}else{i=j}}if((c[k+12>>2]&8|0)!=0){break}i=aM(0)|0;h=k+4|0;if((i|0)!=((c[k>>2]|0)+(c[h>>2]|0)|0)){break}j=aM(-(g>>>0>2147483646>>>0?-2147483648-f|0:g)|0)|0;l=aM(0)|0;if(!((j|0)!=-1&l>>>0<i>>>0)){break}j=i-l|0;if((i|0)==(l|0)){break}c[h>>2]=(c[h>>2]|0)-j;c[3664]=(c[3664]|0)-j;h=c[3562]|0;l=(c[3559]|0)-j|0;j=h;i=h+8|0;if((i&7|0)==0){m=0}else{m=-i&7}i=l-m|0;c[3562]=j+m;c[3559]=i;c[j+(m+4)>>2]=i|1;c[j+(l+4)>>2]=40;c[3563]=c[3552];d=1;return d|0}}while(0);if((c[3559]|0)>>>0<=(c[3563]|0)>>>0){d=0;return d|0}c[3563]=-1;d=0;return d|0}function du(){return c[3664]|0}function dv(){return c[3665]|0}function dw(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;do{if((c[3548]|0)==0){b=aG(30)|0;if((b-1&b|0)==0){c[3550]=b;c[3549]=b;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar()}}}while(0);b=c[3562]|0;if((b|0)==0){d=0;e=0;f=0;g=0;h=0;i=0;j=0}else{k=c[3559]|0;l=k+40|0;m=1;n=l;o=l;l=14672;while(1){p=c[l>>2]|0;q=p+8|0;if((q&7|0)==0){r=0}else{r=-q&7}q=p+(c[l+4>>2]|0)|0;s=m;t=n;u=o;v=p+r|0;while(1){if(v>>>0>=q>>>0|(v|0)==(b|0)){w=s;x=t;y=u;break}z=c[v+4>>2]|0;if((z|0)==7){w=s;x=t;y=u;break}A=z&-8;B=A+u|0;if((z&3|0)==1){C=A+t|0;D=s+1|0}else{C=t;D=s}z=v+A|0;if(z>>>0<p>>>0){w=D;x=C;y=B;break}else{s=D;t=C;u=B;v=z}}v=c[l+8>>2]|0;if((v|0)==0){break}else{m=w;n=x;o=y;l=v}}l=c[3664]|0;d=k;e=y;f=w;g=l-y|0;h=c[3665]|0;i=l-x|0;j=x}c[a>>2]=e;c[a+4>>2]=f;f=a+8|0;c[f>>2]=0;c[f+4>>2]=0;c[a+16>>2]=g;c[a+20>>2]=h;c[a+24>>2]=0;c[a+28>>2]=i;c[a+32>>2]=j;c[a+36>>2]=d;return}function dx(){var a=0,b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;a=i;do{if((c[3548]|0)==0){b=aG(30)|0;if((b-1&b|0)==0){c[3550]=b;c[3549]=b;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar()}}}while(0);b=c[3562]|0;if((b|0)==0){d=0;e=0;f=0}else{g=c[3665]|0;h=c[3664]|0;j=h-40-(c[3559]|0)|0;k=14672;while(1){l=c[k>>2]|0;n=l+8|0;if((n&7|0)==0){o=0}else{o=-n&7}n=l+(c[k+4>>2]|0)|0;p=j;q=l+o|0;while(1){if(q>>>0>=n>>>0|(q|0)==(b|0)){r=p;break}s=c[q+4>>2]|0;if((s|0)==7){r=p;break}t=s&-8;u=p-((s&3|0)==1?t:0)|0;s=q+t|0;if(s>>>0<l>>>0){r=u;break}else{p=u;q=s}}q=c[k+8>>2]|0;if((q|0)==0){d=r;e=h;f=g;break}else{j=r;k=q}}}k=c[m>>2]|0;as(k|0,13872,(r=i,i=i+8|0,c[r>>2]=f,r)|0)|0;i=r;as(k|0,13920,(r=i,i=i+8|0,c[r>>2]=e,r)|0)|0;i=r;as(k|0,13608,(r=i,i=i+8|0,c[r>>2]=d,r)|0)|0;i=r;i=a;return}function dy(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((c[3548]|0)==0){d=aG(30)|0;if((d-1&d|0)==0){c[3550]=d;c[3549]=d;c[3551]=-1;c[3552]=-1;c[3553]=0;c[3667]=0;c[3548]=(aQ(0)|0)&-16^1431655768;break}else{ar();return 0}}}while(0);if((a|0)==(-3|0)){c[3551]=b;e=1;return e|0}else if((a|0)==(-1|0)){c[3552]=b;e=1;return e|0}else if((a|0)==(-2|0)){if((c[3549]|0)>>>0>b>>>0){e=0;return e|0}if((b-1&b|0)!=0){e=0;return e|0}c[3550]=b;e=1;return e|0}else{e=0;return e|0}return 0}function dz(a){a=a|0;var b=0,d=0,e=0;do{if((a|0)==0){b=0}else{d=c[a-4>>2]|0;e=d&3;if((e|0)==1){b=0;break}b=(d&-8)-((e|0)==0?8:4)|0}}while(0);return b|0}function dA(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;d=a;e=d+b|0;f=e;g=c[a+4>>2]|0;L3936:do{if((g&1|0)==0){h=c[a>>2]|0;if((g&3|0)==0){return}i=d+(-h|0)|0;j=i;k=h+b|0;l=c[3560]|0;if(i>>>0<l>>>0){ar()}if((j|0)==(c[3561]|0)){m=d+(b+4)|0;if((c[m>>2]&3|0)!=3){n=j;o=k;break}c[3558]=k;c[m>>2]=c[m>>2]&-2;c[d+(4-h)>>2]=k|1;c[e>>2]=k;return}m=h>>>3;if(h>>>0<256>>>0){p=c[d+(8-h)>>2]|0;q=c[d+(12-h)>>2]|0;r=14264+(m<<1<<2)|0;do{if((p|0)!=(r|0)){if(p>>>0<l>>>0){ar()}if((c[p+12>>2]|0)==(j|0)){break}ar()}}while(0);if((q|0)==(p|0)){c[3556]=c[3556]&~(1<<m);n=j;o=k;break}do{if((q|0)==(r|0)){s=q+8|0}else{if(q>>>0<l>>>0){ar()}t=q+8|0;if((c[t>>2]|0)==(j|0)){s=t;break}ar()}}while(0);c[p+12>>2]=q;c[s>>2]=p;n=j;o=k;break}r=i;m=c[d+(24-h)>>2]|0;t=c[d+(12-h)>>2]|0;do{if((t|0)==(r|0)){u=16-h|0;v=d+(u+4)|0;w=c[v>>2]|0;if((w|0)==0){x=d+u|0;u=c[x>>2]|0;if((u|0)==0){y=0;break}else{z=u;A=x}}else{z=w;A=v}while(1){v=z+20|0;w=c[v>>2]|0;if((w|0)!=0){z=w;A=v;continue}v=z+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{z=w;A=v}}if(A>>>0<l>>>0){ar()}else{c[A>>2]=0;y=z;break}}else{v=c[d+(8-h)>>2]|0;if(v>>>0<l>>>0){ar()}w=v+12|0;if((c[w>>2]|0)!=(r|0)){ar()}x=t+8|0;if((c[x>>2]|0)==(r|0)){c[w>>2]=t;c[x>>2]=v;y=t;break}else{ar()}}}while(0);if((m|0)==0){n=j;o=k;break}t=d+(28-h)|0;l=14528+(c[t>>2]<<2)|0;do{if((r|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[3557]=c[3557]&~(1<<c[t>>2]);n=j;o=k;break L3936}else{if(m>>>0<(c[3560]|0)>>>0){ar()}i=m+16|0;if((c[i>>2]|0)==(r|0)){c[i>>2]=y}else{c[m+20>>2]=y}if((y|0)==0){n=j;o=k;break L3936}}}while(0);if(y>>>0<(c[3560]|0)>>>0){ar()}c[y+24>>2]=m;r=16-h|0;t=c[d+r>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[3560]|0)>>>0){ar()}else{c[y+16>>2]=t;c[t+24>>2]=y;break}}}while(0);t=c[d+(r+4)>>2]|0;if((t|0)==0){n=j;o=k;break}if(t>>>0<(c[3560]|0)>>>0){ar()}else{c[y+20>>2]=t;c[t+24>>2]=y;n=j;o=k;break}}else{n=a;o=b}}while(0);a=c[3560]|0;if(e>>>0<a>>>0){ar()}y=d+(b+4)|0;z=c[y>>2]|0;do{if((z&2|0)==0){if((f|0)==(c[3562]|0)){A=(c[3559]|0)+o|0;c[3559]=A;c[3562]=n;c[n+4>>2]=A|1;if((n|0)!=(c[3561]|0)){return}c[3561]=0;c[3558]=0;return}if((f|0)==(c[3561]|0)){A=(c[3558]|0)+o|0;c[3558]=A;c[3561]=n;c[n+4>>2]=A|1;c[n+A>>2]=A;return}A=(z&-8)+o|0;s=z>>>3;L4035:do{if(z>>>0<256>>>0){g=c[d+(b+8)>>2]|0;t=c[d+(b+12)>>2]|0;h=14264+(s<<1<<2)|0;do{if((g|0)!=(h|0)){if(g>>>0<a>>>0){ar()}if((c[g+12>>2]|0)==(f|0)){break}ar()}}while(0);if((t|0)==(g|0)){c[3556]=c[3556]&~(1<<s);break}do{if((t|0)==(h|0)){B=t+8|0}else{if(t>>>0<a>>>0){ar()}m=t+8|0;if((c[m>>2]|0)==(f|0)){B=m;break}ar()}}while(0);c[g+12>>2]=t;c[B>>2]=g}else{h=e;m=c[d+(b+24)>>2]|0;l=c[d+(b+12)>>2]|0;do{if((l|0)==(h|0)){i=d+(b+20)|0;p=c[i>>2]|0;if((p|0)==0){q=d+(b+16)|0;v=c[q>>2]|0;if((v|0)==0){C=0;break}else{D=v;E=q}}else{D=p;E=i}while(1){i=D+20|0;p=c[i>>2]|0;if((p|0)!=0){D=p;E=i;continue}i=D+16|0;p=c[i>>2]|0;if((p|0)==0){break}else{D=p;E=i}}if(E>>>0<a>>>0){ar()}else{c[E>>2]=0;C=D;break}}else{i=c[d+(b+8)>>2]|0;if(i>>>0<a>>>0){ar()}p=i+12|0;if((c[p>>2]|0)!=(h|0)){ar()}q=l+8|0;if((c[q>>2]|0)==(h|0)){c[p>>2]=l;c[q>>2]=i;C=l;break}else{ar()}}}while(0);if((m|0)==0){break}l=d+(b+28)|0;g=14528+(c[l>>2]<<2)|0;do{if((h|0)==(c[g>>2]|0)){c[g>>2]=C;if((C|0)!=0){break}c[3557]=c[3557]&~(1<<c[l>>2]);break L4035}else{if(m>>>0<(c[3560]|0)>>>0){ar()}t=m+16|0;if((c[t>>2]|0)==(h|0)){c[t>>2]=C}else{c[m+20>>2]=C}if((C|0)==0){break L4035}}}while(0);if(C>>>0<(c[3560]|0)>>>0){ar()}c[C+24>>2]=m;h=c[d+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[3560]|0)>>>0){ar()}else{c[C+16>>2]=h;c[h+24>>2]=C;break}}}while(0);h=c[d+(b+20)>>2]|0;if((h|0)==0){break}if(h>>>0<(c[3560]|0)>>>0){ar()}else{c[C+20>>2]=h;c[h+24>>2]=C;break}}}while(0);c[n+4>>2]=A|1;c[n+A>>2]=A;if((n|0)!=(c[3561]|0)){F=A;break}c[3558]=A;return}else{c[y>>2]=z&-2;c[n+4>>2]=o|1;c[n+o>>2]=o;F=o}}while(0);o=F>>>3;if(F>>>0<256>>>0){z=o<<1;y=14264+(z<<2)|0;C=c[3556]|0;b=1<<o;do{if((C&b|0)==0){c[3556]=C|b;G=y;H=14264+(z+2<<2)|0}else{o=14264+(z+2<<2)|0;d=c[o>>2]|0;if(d>>>0>=(c[3560]|0)>>>0){G=d;H=o;break}ar()}}while(0);c[H>>2]=n;c[G+12>>2]=n;c[n+8>>2]=G;c[n+12>>2]=y;return}y=n;G=F>>>8;do{if((G|0)==0){I=0}else{if(F>>>0>16777215>>>0){I=31;break}H=(G+1048320|0)>>>16&8;z=G<<H;b=(z+520192|0)>>>16&4;C=z<<b;z=(C+245760|0)>>>16&2;o=14-(b|H|z)+(C<<z>>>15)|0;I=F>>>((o+7|0)>>>0)&1|o<<1}}while(0);G=14528+(I<<2)|0;c[n+28>>2]=I;c[n+20>>2]=0;c[n+16>>2]=0;o=c[3557]|0;z=1<<I;if((o&z|0)==0){c[3557]=o|z;c[G>>2]=y;c[n+24>>2]=G;c[n+12>>2]=n;c[n+8>>2]=n;return}if((I|0)==31){J=0}else{J=25-(I>>>1)|0}I=F<<J;J=c[G>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(F|0)){break}K=J+16+(I>>>31<<2)|0;G=c[K>>2]|0;if((G|0)==0){L=2991;break}else{I=I<<1;J=G}}if((L|0)==2991){if(K>>>0<(c[3560]|0)>>>0){ar()}c[K>>2]=y;c[n+24>>2]=J;c[n+12>>2]=n;c[n+8>>2]=n;return}K=J+8|0;L=c[K>>2]|0;I=c[3560]|0;if(J>>>0<I>>>0){ar()}if(L>>>0<I>>>0){ar()}c[L+12>>2]=y;c[K>>2]=y;c[n+8>>2]=L;c[n+12>>2]=J;c[n+24>>2]=0;return}function dB(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function dC(b,c,d){b=b|0;c=c|0;d=d|0;if((c|0)<(b|0)&(b|0)<(c+d|0)){c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}}else{dB(b,c,d)|0}}function dD(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function dE(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=b+e|0;if((e|0)>=20){d=d&255;e=b&3;g=d|d<<8|d<<16|d<<24;h=f&~3;if(e){e=b+4-e|0;while((b|0)<(e|0)){a[b]=d;b=b+1|0}}while((b|0)<(h|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}}function dF(a,b,c,d,e,f,g,h,i,j,k,l,m,n){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;aT[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0,k|0,l|0,m|0,n|0)}function dG(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;aU[a&7](b|0,c|0,d|0,e|0,f|0,g|0)}function dH(a,b){a=a|0;b=b|0;aV[a&15](b|0)}function dI(a){a=a|0;aW[a&1]()}function dJ(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return aX[a&31](b|0,c|0,d|0)|0}function dK(a,b){a=a|0;b=b|0;return aY[a&15](b|0)|0}function dL(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;aZ[a&7](b|0,c|0,d|0)}function dM(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=+k;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;return a_[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0,j|0,+k,l|0,m|0,n|0,o|0,p|0,q|0,r|0,s|0,t|0,u|0)|0}function dN(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=+f;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=+o;p=p|0;a$[a&7](b|0,c|0,d|0,e|0,+f,g|0,h|0,i|0,j|0,k|0,l|0,m|0,n|0,+o,p|0)}function dO(a,b,c){a=a|0;b=b|0;c=c|0;return a0[a&1](b|0,c|0)|0}function dP(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;a1[a&7](b|0,c|0,d|0,e|0)}function dQ(a,b,c,d,e,f,g,h,i,j,k,l,m){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;$(0)}function dR(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;$(1)}function dS(a){a=a|0;$(2)}function dT(){$(3)}function dU(a,b,c){a=a|0;b=b|0;c=c|0;$(4);return 0}function dV(a){a=a|0;$(5);return 0}function dW(a,b,c){a=a|0;b=b|0;c=c|0;$(6)}function dX(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=+j;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;$(7);return 0}function dY(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o){a=a|0;b=b|0;c=c|0;d=d|0;e=+e;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=+n;o=o|0;$(8)}function dZ(a,b){a=a|0;b=b|0;$(9);return 0}function d_(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;$(10)}
// EMSCRIPTEN_END_FUNCS
var aT=[dQ,dQ,bC,dQ,bG,dQ,dQ,dQ];var aU=[dR,dR,bF,dR,bH,dR,dR,dR];var aV=[dS,dS,cj,dS,cu,dS,cx,dS,cf,dS,dS,dS,dS,dS,dS,dS];var aW=[dT,dT];var aX=[dU,dU,cO,dU,ck,dU,cv,dU,cB,dU,cl,dU,cg,dU,cm,dU,cc,dU,cA,dU,cy,dU,cY,dU,dU,dU,dU,dU,dU,dU,dU,dU];var aY=[dV,dV,ci,dV,cw,dV,ct,dV,ce,dV,dV,dV,dV,dV,dV,dV];var aZ=[dW,dW,co,dW,cs,dW,cq,dW];var a_=[dX,dX,b9,dX,b6,dX,dX,dX];var a$=[dY,dY,ca,dY,b8,dY,dY,dY];var a0=[dZ,dZ];var a1=[d_,d_,cp,d_,cr,d_,cn,d_];return{_strlen:dD,_speex_bits_destroy:bn,_speex_bits_set_bit_buffer:bm,_speex_bits_write:br,_nb_decoder_ctl:cm,_pvalloc:dp,_nb_decoder_destroy:cj,_sb_encode:cv,_lsp_enforce_margin:b1,_pitch_xcorr:b4,_compute_rms16:bO,_speex_bits_write_whole_bytes:bt,_vbr_init:c9,_memcpy:dB,_speex_bits_unpack_unsigned:bw,_lsp_quant_high:cr,_malloc_trim:dt,_speex_decode_int:cM,_speex_bits_reset:bk,_lsp_unquant_high:cs,_speex_bits_unpack_signed:bv,_malloc_usable_size:dz,_lsp_quant_nb:cn,_bw_lpc:bI,_wb_mode_query:cc,_sb_encoder_init:ct,_lsp_interpolate:b2,_sb_decode_lost:cz,_free:dh,_speex_bits_pack:bu,_sb_decode:cy,_speex_bits_insert_terminator:bs,_memalign:dl,_speex_bits_rewind:bo,_speex_std_mode_request_handler:cR,__speex_fatal:ch,_speex_stereo_state_init:c1,_independent_calloc:dq,_lpc_to_lsp:b$,_lsp_to_lpc:b0,_speex_encode:cI,_speex_bits_remaining:bA,_speex_std_enh_request_handler:cV,_speex_bits_peek_unsigned:bx,_inner_prod:b3,_speex_std_vbr_quality_request_handler:cW,_speex_bits_nbytes:bB,_speex_encoder_ctl:cK,_vbr_destroy:db,_forced_pitch_quant:b9,_speex_encoder_init:cC,_speex_decode_stereo_int:c7,_vbr_analysis:da,_speex_lib_ctl:cP,_speex_std_low_mode_request_handler:cS,_vq_nbest:de,_lsp_quant_lbr:cp,_sb_decoder_destroy:cx,__spx_lpc:bZ,_speex_packet_to_header:c$,_split_cb_shape_sign_unquant:bF,_speex_bits_peek:by,_signal_mul:bL,_residue_percep_zero16:bT,_pitch_search_3tap:b6,_sb_encoder_ctl:cA,_scal_quant:dc,_highpass:bK,_speex_encode_int:cJ,_compute_weighted_codebook:bE,_noise_codebook_quant:bG,_independent_comalloc:ds,_speex_mode_query:cb,_ialloc:dr,_split_cb_search_shape_sign:bC,_nb_decode:ck,_speex_lib_get_mode:cd,_speex_decoder_init:cD,_sb_decoder_ctl:cB,_memset:dE,_speex_bits_advance:bz,_speex_stereo_state_destroy:c3,_nb_encoder_ctl:cl,_speex_default_user_handler:cY,_filter_mem16:bP,_nb_mode_query:cO,_internal_memalign:dm,_speex_header_free:c0,_mallopt:dy,_speex_encode_stereo:c4,_speex_std_stereo_request_handler:c8,_speex_decode:cL,_lsp_unquant_lbr:cq,_fir_mem16:bR,_syn_percep_zero16:bS,_noise_codebook_unquant:bH,_nb_encoder_init:ce,_speex_decode_native:cH,__spx_autocorr:b_,_malloc:dg,_malloc_max_footprint:dv,_speex_std_char_handler:cX,_speex_bits_read_from:bp,_valloc:dn,_malloc_footprint:du,_speex_decoder_destroy:cF,_multicomb:bY,_qmf_synth:bW,_scal_quant32:dd,_signal_div:bM,_speex_bits_init_buffer:bl,_lsp_unquant_nb:co,_calloc:di,_forced_pitch_unquant:ca,_split_cb_search_shape_sign_N1:bD,_qmf_decomp:bV,_speex_stereo_state_reset:c2,_sb_encoder_destroy:cu,_nb_decoder_init:ci,_mallinfo:dw,_speex_std_high_mode_request_handler:cT,_malloc_stats:dx,_speex_header_to_packet:c_,_speex_init_header:cZ,_sb_decoder_init:cw,_speex_encode_native:cG,_speex_inband_handler:cQ,_realloc:dj,_nb_encode:cg,_speex_bits_init:bj,_vq_nbest_sign:df,_sanitize_values32:bJ,_interp_pitch:bX,_speex_std_vbr_request_handler:cU,_compute_impulse_response:bU,_iir_mem16:bQ,_pitch_gain_search_3tap:b7,_nb_encoder_destroy:cf,_speex_encoder_destroy:cE,_open_loop_nbest_pitch:b5,_memmove:dC,_pitch_unquant_3tap:b8,_speex_decode_stereo:c6,_speex_bits_read_whole_bytes:bq,_speex_encode_stereo_int:c5,_compute_rms:bN,_speex_decoder_ctl:cN,runPostSets:bi,stackAlloc:a2,stackSave:a3,stackRestore:a4,setThrew:a5,setTempRet0:a8,setTempRet1:a9,setTempRet2:ba,setTempRet3:bb,setTempRet4:bc,setTempRet5:bd,setTempRet6:be,setTempRet7:bf,setTempRet8:bg,setTempRet9:bh,dynCall_viiiiiiiiiiiii:dF,dynCall_viiiiii:dG,dynCall_vi:dH,dynCall_v:dI,dynCall_iiii:dJ,dynCall_ii:dK,dynCall_viii:dL,dynCall_iiiiiiiiiifiiiiiiiiii:dM,dynCall_viiiifiiiiiiiifi:dN,dynCall_iii:dO,dynCall_viiii:dP}})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_viiiiiiiiiiiii": invoke_viiiiiiiiiiiii, "invoke_viiiiii": invoke_viiiiii, "invoke_vi": invoke_vi, "invoke_v": invoke_v, "invoke_iiii": invoke_iiii, "invoke_ii": invoke_ii, "invoke_viii": invoke_viii, "invoke_iiiiiiiiiifiiiiiiiiii": invoke_iiiiiiiiiifiiiiiiiiii, "invoke_viiiifiiiiiiiifi": invoke_viiiifiiiiiiiifi, "invoke_iii": invoke_iii, "invoke_viiii": invoke_viiii, "_fabsf": _fabsf, "_floorf": _floorf, "_abort": _abort, "_fprintf": _fprintf, "_sqrt": _sqrt, "_fflush": _fflush, "__reallyNegative": __reallyNegative, "_sqrtf": _sqrtf, "_fputc": _fputc, "_log": _log, "_fabs": _fabs, "_floor": _floor, "___setErrNo": ___setErrNo, "_fwrite": _fwrite, "_send": _send, "_write": _write, "_exit": _exit, "_sysconf": _sysconf, "__exit": __exit, "__formatString": __formatString, "_llvm_stackrestore": _llvm_stackrestore, "_pwrite": _pwrite, "_llvm_pow_f64": _llvm_pow_f64, "_sbrk": _sbrk, "_llvm_stacksave": _llvm_stacksave, "___errno_location": ___errno_location, "_exp": _exp, "_time": _time, "_acos": _acos, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity, "_stderr": _stderr }, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _speex_bits_destroy = Module["_speex_bits_destroy"] = asm["_speex_bits_destroy"];
var _speex_bits_set_bit_buffer = Module["_speex_bits_set_bit_buffer"] = asm["_speex_bits_set_bit_buffer"];
var _speex_bits_write = Module["_speex_bits_write"] = asm["_speex_bits_write"];
var _nb_decoder_ctl = Module["_nb_decoder_ctl"] = asm["_nb_decoder_ctl"];
var _pvalloc = Module["_pvalloc"] = asm["_pvalloc"];
var _nb_decoder_destroy = Module["_nb_decoder_destroy"] = asm["_nb_decoder_destroy"];
var _sb_encode = Module["_sb_encode"] = asm["_sb_encode"];
var _lsp_enforce_margin = Module["_lsp_enforce_margin"] = asm["_lsp_enforce_margin"];
var _pitch_xcorr = Module["_pitch_xcorr"] = asm["_pitch_xcorr"];
var _compute_rms16 = Module["_compute_rms16"] = asm["_compute_rms16"];
var _speex_bits_write_whole_bytes = Module["_speex_bits_write_whole_bytes"] = asm["_speex_bits_write_whole_bytes"];
var _vbr_init = Module["_vbr_init"] = asm["_vbr_init"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _speex_bits_unpack_unsigned = Module["_speex_bits_unpack_unsigned"] = asm["_speex_bits_unpack_unsigned"];
var _lsp_quant_high = Module["_lsp_quant_high"] = asm["_lsp_quant_high"];
var _malloc_trim = Module["_malloc_trim"] = asm["_malloc_trim"];
var _speex_decode_int = Module["_speex_decode_int"] = asm["_speex_decode_int"];
var _speex_bits_reset = Module["_speex_bits_reset"] = asm["_speex_bits_reset"];
var _lsp_unquant_high = Module["_lsp_unquant_high"] = asm["_lsp_unquant_high"];
var _speex_bits_unpack_signed = Module["_speex_bits_unpack_signed"] = asm["_speex_bits_unpack_signed"];
var _malloc_usable_size = Module["_malloc_usable_size"] = asm["_malloc_usable_size"];
var _lsp_quant_nb = Module["_lsp_quant_nb"] = asm["_lsp_quant_nb"];
var _bw_lpc = Module["_bw_lpc"] = asm["_bw_lpc"];
var _wb_mode_query = Module["_wb_mode_query"] = asm["_wb_mode_query"];
var _sb_encoder_init = Module["_sb_encoder_init"] = asm["_sb_encoder_init"];
var _lsp_interpolate = Module["_lsp_interpolate"] = asm["_lsp_interpolate"];
var _sb_decode_lost = Module["_sb_decode_lost"] = asm["_sb_decode_lost"];
var _free = Module["_free"] = asm["_free"];
var _speex_bits_pack = Module["_speex_bits_pack"] = asm["_speex_bits_pack"];
var _sb_decode = Module["_sb_decode"] = asm["_sb_decode"];
var _speex_bits_insert_terminator = Module["_speex_bits_insert_terminator"] = asm["_speex_bits_insert_terminator"];
var _memalign = Module["_memalign"] = asm["_memalign"];
var _speex_bits_rewind = Module["_speex_bits_rewind"] = asm["_speex_bits_rewind"];
var _speex_std_mode_request_handler = Module["_speex_std_mode_request_handler"] = asm["_speex_std_mode_request_handler"];
var __speex_fatal = Module["__speex_fatal"] = asm["__speex_fatal"];
var _speex_stereo_state_init = Module["_speex_stereo_state_init"] = asm["_speex_stereo_state_init"];
var _independent_calloc = Module["_independent_calloc"] = asm["_independent_calloc"];
var _lpc_to_lsp = Module["_lpc_to_lsp"] = asm["_lpc_to_lsp"];
var _lsp_to_lpc = Module["_lsp_to_lpc"] = asm["_lsp_to_lpc"];
var _speex_encode = Module["_speex_encode"] = asm["_speex_encode"];
var _speex_bits_remaining = Module["_speex_bits_remaining"] = asm["_speex_bits_remaining"];
var _speex_std_enh_request_handler = Module["_speex_std_enh_request_handler"] = asm["_speex_std_enh_request_handler"];
var _speex_bits_peek_unsigned = Module["_speex_bits_peek_unsigned"] = asm["_speex_bits_peek_unsigned"];
var _inner_prod = Module["_inner_prod"] = asm["_inner_prod"];
var _speex_std_vbr_quality_request_handler = Module["_speex_std_vbr_quality_request_handler"] = asm["_speex_std_vbr_quality_request_handler"];
var _speex_bits_nbytes = Module["_speex_bits_nbytes"] = asm["_speex_bits_nbytes"];
var _speex_encoder_ctl = Module["_speex_encoder_ctl"] = asm["_speex_encoder_ctl"];
var _vbr_destroy = Module["_vbr_destroy"] = asm["_vbr_destroy"];
var _forced_pitch_quant = Module["_forced_pitch_quant"] = asm["_forced_pitch_quant"];
var _speex_encoder_init = Module["_speex_encoder_init"] = asm["_speex_encoder_init"];
var _speex_decode_stereo_int = Module["_speex_decode_stereo_int"] = asm["_speex_decode_stereo_int"];
var _vbr_analysis = Module["_vbr_analysis"] = asm["_vbr_analysis"];
var _speex_lib_ctl = Module["_speex_lib_ctl"] = asm["_speex_lib_ctl"];
var _speex_std_low_mode_request_handler = Module["_speex_std_low_mode_request_handler"] = asm["_speex_std_low_mode_request_handler"];
var _vq_nbest = Module["_vq_nbest"] = asm["_vq_nbest"];
var _lsp_quant_lbr = Module["_lsp_quant_lbr"] = asm["_lsp_quant_lbr"];
var _sb_decoder_destroy = Module["_sb_decoder_destroy"] = asm["_sb_decoder_destroy"];
var __spx_lpc = Module["__spx_lpc"] = asm["__spx_lpc"];
var _speex_packet_to_header = Module["_speex_packet_to_header"] = asm["_speex_packet_to_header"];
var _split_cb_shape_sign_unquant = Module["_split_cb_shape_sign_unquant"] = asm["_split_cb_shape_sign_unquant"];
var _speex_bits_peek = Module["_speex_bits_peek"] = asm["_speex_bits_peek"];
var _signal_mul = Module["_signal_mul"] = asm["_signal_mul"];
var _residue_percep_zero16 = Module["_residue_percep_zero16"] = asm["_residue_percep_zero16"];
var _pitch_search_3tap = Module["_pitch_search_3tap"] = asm["_pitch_search_3tap"];
var _sb_encoder_ctl = Module["_sb_encoder_ctl"] = asm["_sb_encoder_ctl"];
var _scal_quant = Module["_scal_quant"] = asm["_scal_quant"];
var _highpass = Module["_highpass"] = asm["_highpass"];
var _speex_encode_int = Module["_speex_encode_int"] = asm["_speex_encode_int"];
var _compute_weighted_codebook = Module["_compute_weighted_codebook"] = asm["_compute_weighted_codebook"];
var _noise_codebook_quant = Module["_noise_codebook_quant"] = asm["_noise_codebook_quant"];
var _independent_comalloc = Module["_independent_comalloc"] = asm["_independent_comalloc"];
var _speex_mode_query = Module["_speex_mode_query"] = asm["_speex_mode_query"];
var _ialloc = Module["_ialloc"] = asm["_ialloc"];
var _split_cb_search_shape_sign = Module["_split_cb_search_shape_sign"] = asm["_split_cb_search_shape_sign"];
var _nb_decode = Module["_nb_decode"] = asm["_nb_decode"];
var _speex_lib_get_mode = Module["_speex_lib_get_mode"] = asm["_speex_lib_get_mode"];
var _speex_decoder_init = Module["_speex_decoder_init"] = asm["_speex_decoder_init"];
var _sb_decoder_ctl = Module["_sb_decoder_ctl"] = asm["_sb_decoder_ctl"];
var _memset = Module["_memset"] = asm["_memset"];
var _speex_bits_advance = Module["_speex_bits_advance"] = asm["_speex_bits_advance"];
var _speex_stereo_state_destroy = Module["_speex_stereo_state_destroy"] = asm["_speex_stereo_state_destroy"];
var _nb_encoder_ctl = Module["_nb_encoder_ctl"] = asm["_nb_encoder_ctl"];
var _speex_default_user_handler = Module["_speex_default_user_handler"] = asm["_speex_default_user_handler"];
var _filter_mem16 = Module["_filter_mem16"] = asm["_filter_mem16"];
var _nb_mode_query = Module["_nb_mode_query"] = asm["_nb_mode_query"];
var _internal_memalign = Module["_internal_memalign"] = asm["_internal_memalign"];
var _speex_header_free = Module["_speex_header_free"] = asm["_speex_header_free"];
var _mallopt = Module["_mallopt"] = asm["_mallopt"];
var _speex_encode_stereo = Module["_speex_encode_stereo"] = asm["_speex_encode_stereo"];
var _speex_std_stereo_request_handler = Module["_speex_std_stereo_request_handler"] = asm["_speex_std_stereo_request_handler"];
var _speex_decode = Module["_speex_decode"] = asm["_speex_decode"];
var _lsp_unquant_lbr = Module["_lsp_unquant_lbr"] = asm["_lsp_unquant_lbr"];
var _fir_mem16 = Module["_fir_mem16"] = asm["_fir_mem16"];
var _syn_percep_zero16 = Module["_syn_percep_zero16"] = asm["_syn_percep_zero16"];
var _noise_codebook_unquant = Module["_noise_codebook_unquant"] = asm["_noise_codebook_unquant"];
var _nb_encoder_init = Module["_nb_encoder_init"] = asm["_nb_encoder_init"];
var _speex_decode_native = Module["_speex_decode_native"] = asm["_speex_decode_native"];
var __spx_autocorr = Module["__spx_autocorr"] = asm["__spx_autocorr"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _malloc_max_footprint = Module["_malloc_max_footprint"] = asm["_malloc_max_footprint"];
var _speex_std_char_handler = Module["_speex_std_char_handler"] = asm["_speex_std_char_handler"];
var _speex_bits_read_from = Module["_speex_bits_read_from"] = asm["_speex_bits_read_from"];
var _valloc = Module["_valloc"] = asm["_valloc"];
var _malloc_footprint = Module["_malloc_footprint"] = asm["_malloc_footprint"];
var _speex_decoder_destroy = Module["_speex_decoder_destroy"] = asm["_speex_decoder_destroy"];
var _multicomb = Module["_multicomb"] = asm["_multicomb"];
var _qmf_synth = Module["_qmf_synth"] = asm["_qmf_synth"];
var _scal_quant32 = Module["_scal_quant32"] = asm["_scal_quant32"];
var _signal_div = Module["_signal_div"] = asm["_signal_div"];
var _speex_bits_init_buffer = Module["_speex_bits_init_buffer"] = asm["_speex_bits_init_buffer"];
var _lsp_unquant_nb = Module["_lsp_unquant_nb"] = asm["_lsp_unquant_nb"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _forced_pitch_unquant = Module["_forced_pitch_unquant"] = asm["_forced_pitch_unquant"];
var _split_cb_search_shape_sign_N1 = Module["_split_cb_search_shape_sign_N1"] = asm["_split_cb_search_shape_sign_N1"];
var _qmf_decomp = Module["_qmf_decomp"] = asm["_qmf_decomp"];
var _speex_stereo_state_reset = Module["_speex_stereo_state_reset"] = asm["_speex_stereo_state_reset"];
var _sb_encoder_destroy = Module["_sb_encoder_destroy"] = asm["_sb_encoder_destroy"];
var _nb_decoder_init = Module["_nb_decoder_init"] = asm["_nb_decoder_init"];
var _mallinfo = Module["_mallinfo"] = asm["_mallinfo"];
var _speex_std_high_mode_request_handler = Module["_speex_std_high_mode_request_handler"] = asm["_speex_std_high_mode_request_handler"];
var _malloc_stats = Module["_malloc_stats"] = asm["_malloc_stats"];
var _speex_header_to_packet = Module["_speex_header_to_packet"] = asm["_speex_header_to_packet"];
var _speex_init_header = Module["_speex_init_header"] = asm["_speex_init_header"];
var _sb_decoder_init = Module["_sb_decoder_init"] = asm["_sb_decoder_init"];
var _speex_encode_native = Module["_speex_encode_native"] = asm["_speex_encode_native"];
var _speex_inband_handler = Module["_speex_inband_handler"] = asm["_speex_inband_handler"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _nb_encode = Module["_nb_encode"] = asm["_nb_encode"];
var _speex_bits_init = Module["_speex_bits_init"] = asm["_speex_bits_init"];
var _vq_nbest_sign = Module["_vq_nbest_sign"] = asm["_vq_nbest_sign"];
var _sanitize_values32 = Module["_sanitize_values32"] = asm["_sanitize_values32"];
var _interp_pitch = Module["_interp_pitch"] = asm["_interp_pitch"];
var _speex_std_vbr_request_handler = Module["_speex_std_vbr_request_handler"] = asm["_speex_std_vbr_request_handler"];
var _compute_impulse_response = Module["_compute_impulse_response"] = asm["_compute_impulse_response"];
var _iir_mem16 = Module["_iir_mem16"] = asm["_iir_mem16"];
var _pitch_gain_search_3tap = Module["_pitch_gain_search_3tap"] = asm["_pitch_gain_search_3tap"];
var _nb_encoder_destroy = Module["_nb_encoder_destroy"] = asm["_nb_encoder_destroy"];
var _speex_encoder_destroy = Module["_speex_encoder_destroy"] = asm["_speex_encoder_destroy"];
var _open_loop_nbest_pitch = Module["_open_loop_nbest_pitch"] = asm["_open_loop_nbest_pitch"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _pitch_unquant_3tap = Module["_pitch_unquant_3tap"] = asm["_pitch_unquant_3tap"];
var _speex_decode_stereo = Module["_speex_decode_stereo"] = asm["_speex_decode_stereo"];
var _speex_bits_read_whole_bytes = Module["_speex_bits_read_whole_bytes"] = asm["_speex_bits_read_whole_bytes"];
var _speex_encode_stereo_int = Module["_speex_encode_stereo_int"] = asm["_speex_encode_stereo_int"];
var _compute_rms = Module["_compute_rms"] = asm["_compute_rms"];
var _speex_decoder_ctl = Module["_speex_decoder_ctl"] = asm["_speex_decoder_ctl"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_viiiiiiiiiiiii = Module["dynCall_viiiiiiiiiiiii"] = asm["dynCall_viiiiiiiiiiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_iiiiiiiiiifiiiiiiiiii = Module["dynCall_iiiiiiiiiifiiiiiiiiii"] = asm["dynCall_iiiiiiiiiifiiiiiiiiii"];
var dynCall_viiiifiiiiiiiifi = Module["dynCall_viiiifiiiiiiiifi"] = asm["dynCall_viiiifiiiiiiiifi"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}
Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  try {
    var ret = Module['_main'](argc, argv, 0);
    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || Module['arguments'];
  if (preloadStartTime === null) preloadStartTime = Date.now();
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }
  preRun();
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    Module['calledRun'] = true;
    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }
    postRun();
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;
function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  // exit the runtime
  exitRuntime();
  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371
  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;
function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }
  ABORT = true;
  EXITSTATUS = 1;
  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
run();
// {{POST_RUN_ADDITIONS}}
// {{MODULE_ADDITIONS}}
(function (global) {
	global.util = {
		toString: function (data, fn) {
			var BlobBuilder = global["WebKitBlobBuilder"] || global["MozBlobBuilder"] || global["BlobBuilder"];

			var bb = new BlobBuilder();
			bb.append(data.buffer);
			buffer = null;
			var reader = new FileReader();
			reader.onload = function (e) {
				fn(e.target.result);
			};
			reader.readAsBinaryString(bb.getBlob());	
		}

	  , parseInt: function (chr) {
	  		return Binary.toUint8(chr);
	  	}

	  , mozPlay: function (floats) {
		  	var audio, pos = 0, size;
		  	if ((audio = new Audio())["mozSetup"]) {
		  		audio.mozSetup(1, 8000);

		  		while (pos < floats.length) {
		  			size = (floats.length - pos > 800) ? 800 : floats.length - pos;
		  			audio.mozWriteAudio(floats.subarray(pos, pos+size));
		  			pos += size;
		  		}  		
		  	}
		}

	  , play: function (floats, sampleRate) {
		  	var waveData = PCMData.encode({
				sampleRate: sampleRate || 8000,
				channelCount:   1,
				bytesPerSample: 2,
				data: floats
			});
			
			var element = new Audio();
			element.src = "data:audio/wav;base64,"+btoa(waveData);
			element.play();	
		}

		/**
		  * @author LearnBoost
		  */
	  , merge: function (target, additional, deep, lastseen) {
			var seen = lastseen || []
			  , depth = typeof deep == 'undefined' ? 2 : deep
			  , prop;

			for (prop in additional) {
			  if (additional.hasOwnProperty(prop) && seen.indexOf(prop) < 0) {
			    if (typeof target[prop] !== 'object' || !depth) {
			      target[prop] = additional[prop];
			      seen.push(additional[prop]);
			    } else {
			      merge(target[prop], additional[prop], depth - 1, seen);
			    }
			  }
			}

			return target;
		}

		/**
		  * @author LearnBoost
		  */
	  , inherit: function (ctor, ctor2) {
	    	function f() {};
	    	f.prototype = ctor2.prototype;
	    	ctor.prototype = new f;
	  	}

	  , str2ab: function (str) {
			var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  			var bufView = new Uint8Array(buf);
  			for (var i=0, strLen=str.length; i<strLen; i++) {
    			bufView[i] = str.charCodeAt(i);
  			}
  			return buf;
		}
  	}
}(this));(function (global) {

global.libspeex = Module || s;
global.libspeex.generateStructInfo = libspeex.generateStructInfo || Runtime.generateStructInfo;

global.types = {
	
	SPEEX_NB_MODES: 3,
	
	SPEEX_SET_ENH: 0,
	SPEEX_GET_ENH: 1,
	
	SPEEX_GET_FRAME_SIZE: 3,
	
	SPEEX_SET_QUALITY: 4,
	SPEEX_GET_QUALITY: 5, // Not used
	
	SPEEX_SET_VBR: 12,
	SPEEX_GET_VBR: 13,
	
	SPEEX_SET_VBR_QUALITY: 14,
	SPEEX_GET_VBR_QUALITY: 15,

	SPEEX_SET_COMPLEXITY: 16,
	SPEEX_GET_COMPLEXITY: 17,	
	
	SPEEX_SET_SAMPLING_RATE: 24,
	SPEEX_GET_SAMPLING_RATE: 25,
	
	SPEEX_SET_VAD: 30,
	SPEEX_GET_VAD: 31,
	
	SPEEX_SET_ABR: 32,
	SPEEX_GET_ABR: 33,
	
	SPEEX_SET_DTX: 34,
	SPEEX_GET_DTX: 35,
	
	types: {

		/**

		Bit-packing data structure representing (part of) a bit-stream.
		
		typedef struct SpeexBits {
		   char *chars;   	//< "raw" data
		   int   nbBits;  	//< Total number of bits stored in the stream
		   int   charPtr; 	//< Position of the byte "cursor" 
		   int   bitPtr;  	//< Position of the bit "cursor" within the current char 
		   int   owner;   	//< Does the struct "own" the "raw" buffer (member "chars") 
		   int   overflow;	//< Set to one if we try to read past the valid data 
		   int   buf_size;	//< Allocated size for buffer 
		   int   reserved1; //< Reserved for future use 
		   void *reserved2; //< Reserved for future use 
		} SpeexBits;
		*/
		SpeexBits: libspeex.generateStructInfo([
			["i1*", 'chars'],
			["i32", 'nbBits'],
			["i32", 'charPtr'],
			["i32", 'bitPtr'],
			["i32", 'owner'],
			["i32", 'overflow'],
			["i32", 'buf_size'],
			["i32", 'reserved1'],
			["i8*", 'reserved2']
		]),

		/**
		  * Speex header info for file-based formats
		  		
		typedef struct SpeexHeader {
		   char speex_string[SPEEX_HEADER_STRING_LENGTH];
		   char speex_version[SPEEX_HEADER_VERSION_LENGTH];
		   spx_int32_t speex_version_id;
		   spx_int32_t header_size;
		   spx_int32_t rate;
		   spx_int32_t mode;
		   spx_int32_t mode_bitstream_version;
		   spx_int32_t nb_channels;
		   spx_int32_t bitrate;
		   spx_int32_t frame_size;
		   spx_int32_t vbr;
		   spx_int32_t frames_per_packet;
		   spx_int32_t extra_headers;
		   spx_int32_t reserved1;
		   spx_int32_t reserved2;
		} SpeexHeader;
		*/		
		SpeexHeader: libspeex.generateStructInfo([
			["i32", 'speex_version_id'],
			["i32", 'header_size'],
			["i32", 'rate'],
			["i32", 'mode'],
			["i32", 'mode_bitstream_version'],
			["i32", 'nb_channels'],
			["i32", 'bitrate'],
			["i32", 'frame_size'],
			["i32", 'vbr'],
			["i32", 'frames_per_packet'],
			["i32", 'extra_headers'],
			["i32", 'reserved1'],
			["i32", 'reserved2']
		]),

		/**

		Preprocessor internal state
		
		typedef struct SpeexPreprocessState {
		} SpeexPreprocessState;
		*/
		SpeexPreprocessState: libspeex.generateStructInfo([
		]),

		/**

		Echo canceller state
		
		typedef struct SpeexEchoState {
		} SpeexEchoState;
		*/
		SpeexEchoState: libspeex.generateStructInfo([
		])
	}
}

}(this));
"use strict";

(function (global) {

if (typeof importScripts === 'function') {
	self.console = {
		log: function () {}
	  , debug: function () {}
	  , warn: function () {}
	  , error: function () {}
	}
}

function SpeexComment(cmt) {
	this.bitstr = new BitString(
		"vendor_length:4,"+
		"vendor_string:vendor_length/char,"+
		"user_comment_list_length:4,"+
		"user_comments:_")

	if (typeof cmt == "string") {
		this.raw = cmt;
		this.data = this.bitstr.unpack(cmt);
		this.data.vendor_string = String.fromCharCode.apply(null,
			this.data.vendor_string);
		return;
	}

	this.data = cmt;
	this.data.vendor_string = new Uint8Array(Speex.util.str2ab(
		cmt.vendor_string));
	this.raw = this.bitstr.pack(this.data);
}

function SpeexHeader(hdr) {
	this.bitstr = new BitString(
		 "speex_string:8/char,"
		+"speex_version_string:20/char,"
		+"speex_version_id/int,"
		+"header_size/int,"
		+"rate/int,"
		+"mode/int,"
		+"mode_bitstream_version/int,"
		+"nb_channels/int,"
		+"bitrate/int,"
		+"frame_size/int,"
		+"vbr/int,"
		+"frames_per_packet/int,"
		+"extra_headers/int,"
		+"reserved1/int,"
		+"reserved2/int", {
			bytes: true
	  	  , bigEndian: false
	});

	if (typeof hdr == "string") {
		this.raw = hdr;
		// pretty print
		this.data = this.bitstr.unpack(hdr);
		this.data.speex_string = String.fromCharCode.apply(null,
			this.data.speex_string);
		this.data.speex_version_string = String.fromCharCode.apply(null,
			this.data.speex_version_string)
		return;
	}
	this.data = hdr;
	this.data.speex_string = new Uint8Array(Speex.util.str2ab(
		hdr.speex_string));
	this.data.speex_version_string = new Uint8Array(Speex.util.str2ab(
		hdr.speex_version_string));
	this.raw = this.bitstr.pack(this.data);
}

SpeexHeader.prototype.toString = function () {
	return (this.raw = this.bitstr.pack(this.unpacked));
}

function Speex(params) {
	!params.mode && (params.mode = 0);

	this.params = params;

	this.frame_size = 320 || params.frame_size;

	this.ring_size = 2304 || params.ring_size;

    this.linoffset = 0;

    this.ringoffset = 0;

    this.modoffset = 0;

    this.linbuf = new Int16Array(this.frame_size);

    this.ring = new Int16Array(this.ring_size * 2);

    this.modframes = new Int16Array(this.frame_size);

    this.spxbuf = [];

	this.header = null;
	this.encoder = new SpeexEncoder(params);
	this.decoder = new SpeexDecoder(params);

	// bootstrap
	this.init();
}

Speex.util = global.util;

Speex.onerror = function (err) {
	console.error("decoding error: ", err.message);
}

/*
 * Parses speex headers
 */
Speex.parseHeader = function (b) {
	this.header = new SpeexHeader(b);
	return this.header.data;
}

/*
 * Uses libspeex calls to parse the header
 * and merges it with the types description
 */
Speex.pkt2hdr = function (buffer, onerror) {
	var arr = libspeex.allocate(libspeex.intArrayFromString(buffer), 'i8', libspeex.ALLOC_STACK)
	  , err = onerror || Speex.onerror
	  , header_addr;

	header_addr = libspeex._speex_packet_to_header(arr, buffer.length);
	if (!header_addr) {
		err(new Error("cannot read header from bitstream"));
		return;
	}

	var typename = Speex.types.SpeexHeader
	  , header = {}
	  , i = 0, offset;

	header.speex_string = libspeex.Pointer_stringify(header_addr);
	header.speex_version_string = libspeex.Pointer_stringify(header_addr+8);

	for (var field in typename) {
		if (field === "__size__") continue;
		offset = 28 + typename[field];
		header[field] = libspeex.getValue(header_addr+offset, 'i32');
		i+=1;
	}

	if (header.mode >= Speex.SPEEX_NB_MODES || header.mode<0) {
		err(new Error("Mode number "+header.mode+" does not (yet/any longer) exist in this version"));
	}

	if (header.speex_version_id > 1) {
		err(new Error("Version "+header.speex_version_string+" is not supported"));
	}

	return header;
}

Speex.prototype.set = function (name, value) {
	this.options[name] = value;
}

Speex.prototype.enable = function (option) {
	this.set(option, true);
}

Speex.prototype.disable = function (option) {
	this.set(option, false);
}

/**
  * Initialize the codec
  */
Speex.prototype.init = function () {
	this.encoder.init();
	this.decoder.init();
}

/**
  * Closes the codec
  */
Speex.prototype.close = function () {
	//this.encoder.close();
	this.decoder.close();
}

/**
  * @argument pcmdata Float32Array|Int16Array
  * @returns String|Uint8Array
  */
Speex.prototype.encode = function (data, isFile) {
	isFile = !!isFile;

	if (isFile) {
		return this.encoder.process(data);
	}

	// ring spin
    for (var i=-1, j=this.ringoffset; ++i < data.length; ++j) {
        this.ring[j] = data[i];
    }

    this.ringoffset += data.length;

    // has enough to decode
    if ((this.ringoffset > this.linoffset)
    	&& (this.ringoffset - this.linoffset < this.frame_size)) {

        return;
    }

    // buffer fill
    for (var i=-1; ++i < this.linbuf.length;) {
        this.linbuf[i] = this.ring[this.linoffset + i];
    }

    this.linoffset += this.linbuf.length;
    this.spxbuf = this.encoder.process(this.linbuf);

    if (this.ringoffset > this.ring_size) {
        this.modoffset = this.ringoffset % this.ring_size;

		//console.log("ignoring %d samples", this.modoffset);
        this.ringoffset = 0;
    }

    if (this.linoffset > this.ring_size) {
        this.linoffset = 0;
    }

    return this.spxbuf;
}

/**
  * @argument encoded String|Uint8Array
  * @returns Float32Array
  */
Speex.prototype.decode = function (spxdata, _segments) {
	var samples, segments = undefined;

	if (_segments) {
		segments = [].concat.apply([], _segments);
	}

	return this.decoder.process(spxdata, segments);
}

util.merge(Speex, global.types);

global["Speex"] = Speex;
global["SpeexHeader"] = SpeexHeader;
global["SpeexComment"] = SpeexComment;

}(this));
function CodecProcessor (params) {
  // read the speex profile (narrow, wideband, ultra wideband)
  this.mode = libspeex._speex_lib_get_mode(params.mode || 0);

  this.params = params;

  this.opt_basename = "SPEEX_SET_";

  this.ctl_func = libspeex["_speex_encoder_ctl"];
  
  this.options = {};
}

CodecProcessor.prototype.set = function (name, value) {    
  if (typeof(value) === "undefined" || value === null) {
    return;
  }

  this.options[name] = value;
  
  var ptr = libspeex.allocate(1, 'i32', ALLOC_STACK), conv;  
  
  if (value.constructor == Number.prototype.constructor) {
    conv = parseInt(value);
  }

  if (value.constructor == Boolean.prototype.constructor) {
    conv = (!!value ? 1 : 0);
  }

  setValue(ptr, conv || 0, 'i32');
  flag = this.opt_basename + name.toUpperCase().replace(" ", "_");

  console.log("%s: %d", flag, conv);  
  this[flag] && this.ctl_func(this.state, this[flag], ptr);

  if (name == "quality") {
    this.bits_size = SpeexEncoder.quality_bits[conv];
  }
}

CodecProcessor.prototype.enable = function (name) {
  this.set(name, 1);
}

CodecProcessor.prototype.disable = function (name) {
  this.set(name, 0);
}

/**
  * Temporary buffers
  */
CodecProcessor.prototype.buffer = null;

/**
  * Input buffers
  */
CodecProcessor.prototype.input = null;

/**
  * Encoded/Decoded audio frames
  */
CodecProcessor.prototype.output = null;

/**
  * libspeex internal state
  */
CodecProcessor.prototype.state = null;

/**
  * SpeexBits for use in the libspeex routines
  */
CodecProcessor.prototype.bits = null;
(function (global) {

var util = global.util;

function SpeexDecoder (params) {
	CodecProcessor.apply(this, arguments);

	this.floating_point = !params.lpcm && true;

	this.ctl_func = libspeex["_speex_decoder_ctl"];

	this.params = params;

	this.enh = params.enh || 1;

	// samples buffer size in shorts
	this.frame_size = params.frame_size || 160;

	// encoded speex packet in bytes (38 [quality=8] by default)
	this.bits_size = params.bits_size !== undefined ? params.bits_size :
		SpeexEncoder.quality_bits[params.quality || 8];
}

util.inherit(SpeexDecoder, CodecProcessor);

SpeexDecoder.prototype.init = function () {
	var bits_addr = libspeex.allocate(SpeexDecoder.types.SpeexBits.__size__, 'i8', libspeex.ALLOC_STACK);
	libspeex._speex_bits_init(bits_addr);

	var i32ptr = libspeex.allocate(1, 'i32', libspeex.ALLOC_STACK)
	  , state = libspeex._speex_decoder_init(this.mode)
	  , sample_rate;

	libspeex.setValue(i32ptr, this.enh, "i32");
	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_SET_ENH, i32ptr);

	libspeex.setValue(i32ptr, this.params.sample_rate, "i32");
	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_SET_SAMPLING_RATE, i32ptr);

	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_GET_FRAME_SIZE, i32ptr);
	this.frame_size = libspeex.getValue(i32ptr, "i32");

	this.state = state;
	this.bits = bits_addr;
	this.buffer = libspeex.allocate(this.frame_size,
	 	'i16', libspeex.ALLOC_NORMAL);

	this.output = new Float32Array(1);
}

/**
  * Copy the samples to the input buffer
  */
SpeexDecoder.prototype.read = function (offset, nb, data) {
	var input_addr = this.input
	  , len = offset + nb > data.length ? data.length - offset : nb
	  , isStrIn = data.constructor == String.prototype.constructor;

	!input_addr && (input_addr = libspeex.allocate(this.bits_size, 'i8', libspeex.ALLOC_NORMAL));

	for (var m=offset-1, k=0; ++m < offset+len; k+=1){
		libspeex.setValue(input_addr+k, !isStrIn ? data[m] : util.parseInt(data[m]), 'i8');
	}

	/* Read the buffer */
	libspeex._speex_bits_read_from(this.bits, input_addr, len);

	this.input = input_addr;

	return len;
}

SpeexDecoder.prototype.process = function (spxdata, segments) {
		//console.time('decode');
	var output_offset = 0, offset = 0, segidx = 0;
	var bits_size = this.bits_size, len;

	// Varies from quality
	var total_packets = Math.ceil(spxdata.length / bits_size)
	  , estimated_size = this.frame_size * total_packets

	  // fixed-point or floating-point is decided at compile time
	  , decoder_func = libspeex._speex_decode_int
	  , benchmark = !!this.params.benchmark;

	// Buffer to store the audio samples
	if (!this.buffer) {
		this.buffer =  libspeex.allocate(this.frame_size, 'i16', libspeex.ALLOC_STACK)
	}

	var bits_addr = this.bits
	  , input_addr = this.input
	  , buffer_addr = this.buffer
	  , state_addr = this.state;

	if (this.output.length < estimated_size) {
		this.output = this.floating_point ?
			new Float32Array(estimated_size) : new Int16Array(estimated_size);
	}

	while (offset < spxdata.length) {
		/* Benchmarking */
		benchmark && console.time('decode_packet_offset_' + offset);

		if (segments && segments.length > 0)
			bits_size = segments[segidx];
		else
			bits_size = this.bits_size;

		/* Read bits */
		len = this.read(offset, bits_size, spxdata);

  		/* Decode the data */
  		ret = decoder_func(state_addr, bits_addr, buffer_addr);

  		if (ret < 0) {
  			return ret;
  		}

  		/* Write the samples to the output buffer */
  		this.write(output_offset, this.frame_size, buffer_addr);

  		benchmark && console.timeEnd('decode_packet_offset_' + offset);

  		offset += len;
		output_offset += this.frame_size;
		segidx++;
  	}

  	return this.output.subarray(0, output_offset);
}

SpeexDecoder.prototype.close = function () {
	if (!!this.state) {
		libspeex._speex_bits_destroy(this.bits);
		libspeex._speex_decoder_destroy(this.state);
	}
}


/**
  * Copy to the output buffer
  */
SpeexDecoder.prototype.write = function (offset, nframes, addr) {
	var sample;

  	for (var m=0, k=offset-1; ++k<offset+nframes; m+=2) {
  		sample = libspeex.getValue(addr+m, "i16");
  		this.output[k] =  this.floating_point ? sample / 32768 : sample;
  	}
}

util.merge(SpeexDecoder, global.types);

global["SpeexDecoder"] = SpeexDecoder;

}(this));
(function (global) {

var util = Speex.util;

function SpeexEncoder (params) {
	CodecProcessor.apply(this, arguments);

	this.quality = params.quality || 8;

	this.enh = params.enh || 1;

	this.buffer_size = params.buffer_size || 200;

	this.floating_point = !!params.floating_point;

	// samples buffer size in shorts
	this.frame_size = params.frame_size || 160;

	// encoded speex packet in bytes (38 [quality=8] by default)
	this.bits_size = params.bits_size || SpeexEncoder.quality_bits[this.quality];
}

util.inherit(SpeexEncoder, CodecProcessor);

// TO DO - number of bytes to be written (and read by the decoder)
//         must be done automatically
SpeexEncoder.quality_bits = {
	1: 10
  , 2: 15
  , 3: 20
  , 4: 20
  , 5: 28
  , 6: 28
  , 7: 38
  , 8: 38
  , 9: 46
  , 10: 46
}

SpeexEncoder.prototype.init = function () {
	var i32ptr = libspeex.allocate(1, 'i32', libspeex.ALLOC_STACK)
	  , bits_addr = libspeex.allocate(Speex.types.SpeexBits.__size__, 'i8', libspeex.ALLOC_STACK)
	  , state;

	libspeex._speex_bits_init(bits_addr);

	state = libspeex._speex_encoder_init(this.mode);

	libspeex._speex_encoder_ctl(state, Speex.SPEEX_GET_FRAME_SIZE, i32ptr);
	this.frame_size = libspeex.getValue(i32ptr, 'i32');

	this.buffer_size = this.buffer_size;

	libspeex.setValue(i32ptr, this.quality, 'i32');
	libspeex._speex_encoder_ctl(state, Speex.SPEEX_SET_QUALITY, i32ptr);

	this.state = state;
	this.bits = bits_addr;
	this.input = libspeex.allocate(this.frame_size, 'i16', libspeex.ALLOC_NORMAL);
	this.buffer = libspeex.allocate(this.buffer_size, 'i8', libspeex.ALLOC_NORMAL);
}

/**
  * Copy the samples to the input buffer
  */
SpeexEncoder.prototype.read = function (offset, length, data) {
	var input_addr = this.input
	  , len = offset + length > data.length ? data.length - offset : length;

	for (var m=offset-1, k=0; ++m < offset+len; k+=2){
		libspeex.setValue(input_addr+k, data[m], 'i16');
	}

	return len;
}

/* Copy to the output buffer */
SpeexEncoder.prototype.write = function (offset, nb, addr) {
  	for (var m=0, k=offset-1; ++k<offset+nb; m+=1) {
  		this.output[k] = libspeex.getValue(addr+m, "i8");
  	}
}

SpeexEncoder.prototype.process = function (pcmdata) {
	var output_offset = 0, offset = 0, len, nb, err, tm_str, segments = []

	  , encode_func = this.floating_point ?
		  	libspeex._speex_encode : libspeex._speex_encode_int

      , benchmark = !!this.params.benchmark

	  // Varies from quality
	  , total_packets = Math.ceil(pcmdata.length / this.frame_size)
	  , estimated_size = this.bits_size * total_packets;

	if (!this.output || this.output.length < estimated_size) {
		this.output = new Uint8Array(estimated_size);
	}

	var bits_addr = this.bits
	  , input_addr = this.input
	  , buffer_addr = this.buffer
	  , state_addr = this.state
	  , output_addr = this.output

	while (offset < pcmdata.length) {
		benchmark && console.time('encode_packet_offset_'+offset);

		libspeex._speex_bits_reset(bits_addr);
		/* Frames to the input buffer */
		len = this.read(offset, this.frame_size, pcmdata);

    	/* Encode the frame */
    	err = encode_func(state_addr, input_addr, bits_addr);

    	/* Copy the bits to an array of char that can be written */
    	nb = libspeex._speex_bits_write(bits_addr, buffer_addr, this.buffer_size);

    	this.write(output_offset, nb, buffer_addr);

    	benchmark && console.timeEnd('encode_packet_offset_'+offset);

    	output_offset += nb;
    	offset += len;
		segments.push(nb);
	}

	return [this.output.subarray(0, output_offset), segments];
}


SpeexEncoder.prototype.close = function () {
	/* 'XXX' ABORT Error */
	if (!!this.state) {
		libspeex._speex_bits_destroy(this.bits);
		libspeex._speex_encoder_destroy(this.state);
	}
}

util.merge(SpeexEncoder, global.types);

global["SpeexEncoder"] = SpeexEncoder;

}(this));
/* Based on Xiph libogg checksum calculation */
function crc32(str) {
	var crc_reg;
	var crc_lookup = crc32.table;

	for (var i=0; i<str.length; i++)
		crc_reg = (crc_reg<<8)^crc_lookup[((crc_reg >> 24)&0xff)^str.charCodeAt(i)]

	return crc_reg;
}

crc32.table = [
	0x00000000,0x04c11db7,0x09823b6e,0x0d4326d9,
	0x130476dc,0x17c56b6b,0x1a864db2,0x1e475005,
	0x2608edb8,0x22c9f00f,0x2f8ad6d6,0x2b4bcb61,
	0x350c9b64,0x31cd86d3,0x3c8ea00a,0x384fbdbd,
	0x4c11db70,0x48d0c6c7,0x4593e01e,0x4152fda9,
	0x5f15adac,0x5bd4b01b,0x569796c2,0x52568b75,
	0x6a1936c8,0x6ed82b7f,0x639b0da6,0x675a1011,
	0x791d4014,0x7ddc5da3,0x709f7b7a,0x745e66cd,
	0x9823b6e0,0x9ce2ab57,0x91a18d8e,0x95609039,
	0x8b27c03c,0x8fe6dd8b,0x82a5fb52,0x8664e6e5,
	0xbe2b5b58,0xbaea46ef,0xb7a96036,0xb3687d81,
	0xad2f2d84,0xa9ee3033,0xa4ad16ea,0xa06c0b5d,
	0xd4326d90,0xd0f37027,0xddb056fe,0xd9714b49,
	0xc7361b4c,0xc3f706fb,0xceb42022,0xca753d95,
	0xf23a8028,0xf6fb9d9f,0xfbb8bb46,0xff79a6f1,
	0xe13ef6f4,0xe5ffeb43,0xe8bccd9a,0xec7dd02d,
	0x34867077,0x30476dc0,0x3d044b19,0x39c556ae,
	0x278206ab,0x23431b1c,0x2e003dc5,0x2ac12072,
	0x128e9dcf,0x164f8078,0x1b0ca6a1,0x1fcdbb16,
	0x018aeb13,0x054bf6a4,0x0808d07d,0x0cc9cdca,
	0x7897ab07,0x7c56b6b0,0x71159069,0x75d48dde,
	0x6b93dddb,0x6f52c06c,0x6211e6b5,0x66d0fb02,
	0x5e9f46bf,0x5a5e5b08,0x571d7dd1,0x53dc6066,
	0x4d9b3063,0x495a2dd4,0x44190b0d,0x40d816ba,
	0xaca5c697,0xa864db20,0xa527fdf9,0xa1e6e04e,
	0xbfa1b04b,0xbb60adfc,0xb6238b25,0xb2e29692,
	0x8aad2b2f,0x8e6c3698,0x832f1041,0x87ee0df6,
	0x99a95df3,0x9d684044,0x902b669d,0x94ea7b2a,
	0xe0b41de7,0xe4750050,0xe9362689,0xedf73b3e,
	0xf3b06b3b,0xf771768c,0xfa325055,0xfef34de2,
	0xc6bcf05f,0xc27dede8,0xcf3ecb31,0xcbffd686,
	0xd5b88683,0xd1799b34,0xdc3abded,0xd8fba05a,
	0x690ce0ee,0x6dcdfd59,0x608edb80,0x644fc637,
	0x7a089632,0x7ec98b85,0x738aad5c,0x774bb0eb,
	0x4f040d56,0x4bc510e1,0x46863638,0x42472b8f,
	0x5c007b8a,0x58c1663d,0x558240e4,0x51435d53,
	0x251d3b9e,0x21dc2629,0x2c9f00f0,0x285e1d47,
	0x36194d42,0x32d850f5,0x3f9b762c,0x3b5a6b9b,
	0x0315d626,0x07d4cb91,0x0a97ed48,0x0e56f0ff,
	0x1011a0fa,0x14d0bd4d,0x19939b94,0x1d528623,
	0xf12f560e,0xf5ee4bb9,0xf8ad6d60,0xfc6c70d7,
	0xe22b20d2,0xe6ea3d65,0xeba91bbc,0xef68060b,
	0xd727bbb6,0xd3e6a601,0xdea580d8,0xda649d6f,
	0xc423cd6a,0xc0e2d0dd,0xcda1f604,0xc960ebb3,
	0xbd3e8d7e,0xb9ff90c9,0xb4bcb610,0xb07daba7,
	0xae3afba2,0xaafbe615,0xa7b8c0cc,0xa379dd7b,
	0x9b3660c6,0x9ff77d71,0x92b45ba8,0x9675461f,
	0x8832161a,0x8cf30bad,0x81b02d74,0x857130c3,
	0x5d8a9099,0x594b8d2e,0x5408abf7,0x50c9b640,
	0x4e8ee645,0x4a4ffbf2,0x470cdd2b,0x43cdc09c,
	0x7b827d21,0x7f436096,0x7200464f,0x76c15bf8,
	0x68860bfd,0x6c47164a,0x61043093,0x65c52d24,
	0x119b4be9,0x155a565e,0x18197087,0x1cd86d30,
	0x029f3d35,0x065e2082,0x0b1d065b,0x0fdc1bec,
	0x3793a651,0x3352bbe6,0x3e119d3f,0x3ad08088,
	0x2497d08d,0x2056cd3a,0x2d15ebe3,0x29d4f654,
	0xc5a92679,0xc1683bce,0xcc2b1d17,0xc8ea00a0,
	0xd6ad50a5,0xd26c4d12,0xdf2f6bcb,0xdbee767c,
	0xe3a1cbc1,0xe760d676,0xea23f0af,0xeee2ed18,
	0xf0a5bd1d,0xf464a0aa,0xf9278673,0xfde69bc4,
	0x89b8fd09,0x8d79e0be,0x803ac667,0x84fbdbd0,
	0x9abc8bd5,0x9e7d9662,0x933eb0bb,0x97ffad0c,
	0xafb010b1,0xab710d06,0xa6322bdf,0xa2f33668,
	0xbcb4666d,0xb8757bda,0xb5365d03,0xb1f740b4
];

function Ogg(stream, options) {
	var opts = options || {};
	this.stream = stream;
	this.pageExpr = new BitString(
	 "capturePattern:4/char,"
	+"version:1,"
	+"headerType:1,"
	+"granulePos:8,"
	+"serial:4,"
	+"sequence:4,"
	+"checksum:4,"
	+"pageSegments:1,"
	+"segments:pageSegments/char,"
	+"frames:_,", {
		bytes: true
	  , bigEndian: false
	});

	this.rawPages = [];
	this.pages = [];
	this.pageIdx = 0;

	this.frames = [];
	this.data = null;
	this.segments = [];

	this.unpacked = false;
	this.file = !!opts.file;
	this.error = (options||{}).error || function (e) {};
}

Ogg.CAPTURE_PATTERN = 0x4f676753; // "OggS"
Ogg.INVALID_CAPTURE_PATTERN = 1;

Ogg.prototype.magic = function (c) {
	var magic;

	magic |= (c[0] << 24);
	magic |= (c[1] << 16);
	magic |= (c[2] << 8);
	magic |= c[3];

	return magic;
}

Ogg.prototype.createPage = function (data) {
	return this.pageExpr.pack(data);
}

Ogg.prototype.parsePage = function (binStr) {
	var page = this.pageExpr.unpack(binStr),
		seg = page.segments;

	if (this.magic(page.capturePattern) != Ogg.CAPTURE_PATTERN) {
		this.error( { code: Ogg.INVALID_CAPTURE_PATTERN });
		return;
	}

	this.rawPages.push(binStr);

	page.bos = function () {
		return (this.header == 2);
	}

	page.cont = function () {
		return (this.header == 0);
	}

	page.eos = function () {
		return (this.header == 4);
	}

	// Pushes the ogg parsed paged
	this.pages.push(page);

	// Pushes the page frames
	this.frames.push(page.frames);
}

Ogg.prototype.pageOut = function () {
	return this.pages[this.pageIdx], (this.pageIdx += 1);
}

Ogg.prototype.pages = function () {
	return this.pages;
}

Ogg.prototype.demux = function () {
	if (this.unpacked) return;

	var begin, next = 0, str, frameIdx = 0;

	while(next >= 0) {

		// Fetches OGG Page begin/end
		var begin = this.stream.indexOf("OggS", next), tmp;
		next = this.stream.indexOf("OggS", begin + 4);

		// Fetch Ogg Raw Page
		str = this.stream.substring(begin, next != -1 ? next : undefined)

		// Parse and store the page
		this.parsePage(str);
	}

	// Fetch headers
	if (this.file) {
		frameIdx = 2;
		this.headers = this.frames.slice(0, frameIdx);
	}

	// Fetch Data
	this.data = this.frames.slice(frameIdx);
	for (var i = frameIdx; i<this.pages.length; ++i) {
		this.segments.push(this.pages[i].segments);
	}

	this.unpacked = true;
	return this.pages;
}

Ogg.prototype.mux = function (d, o) {
	function OggPageHeader(type, length, checksum) {
		return page = {
			capturePattern: [0x4f, 0x67, 0x67, 0x53]
		  , version: 0
		  , headerType: type
		  , granulePos: 0 // TODO
		  , serial: 406
		  , sequence: 0
		  , checksum: checksum || 0
		  , pageSegments: 1
		  , segments: [ length || 0 ]
		  , frames: ""
		};
	}

	function OggPageData(segments) {
		var p = OggPageHeader(0);
		p.pageSegments = segments.length;
		p.segments = segments;
		return p;
	}

	function chksum(str, c) {
		var buf = new ArrayBuffer(str.length);
		var bufView = new Uint8Array(buf);
		for (var i=0, len=str.length; i<len; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		dv = new DataView(buf);
		dv.setUint32(22, c, true);

		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}

	function hdrup(hdr, content) {
		var csum, str;
		csum = crc32(hdr + content);
		str = chksum(hdr, csum) + content;
		return str;
	}

	function frames(segments) {
		var sum = 0;
		for (var i=0; i<segments.length; ++i) {
			sum += segments[i];
		}
		return sum;
	}

	o=o||{};

	var str = "";
	var p = "";
	var hdr = d[0];
	// header page
	p = this.createPage(OggPageHeader(2,
			o.length || hdr.length, o.checksum))
	str = hdrup(p, hdr);
	if (d.length == 1)
		return str;

	var comments = d[1];
	// comments page
	p = this.createPage(OggPageHeader(0,
			o.length || comments.length, o.checksum));
	str += hdrup(p, comments);
	if (d.length == 2)
		return str;


	// data page
	var data = d[2];
	var segments = data[1].chunk(100)
	  , stream = String.fromCharCode.apply(null,
	  		new Uint8Array(data[0].buffer))
	  , a = 0
	  , b = 0
	  , len = segments.length;

	for (var i = 0; i < len; ++i) {
		var segchunk = segments[i];
		b += frames(segchunk);

		p = this.createPage(OggPageData(segchunk));
		str += hdrup(p, stream.substring(a, b));

		a = b;
	}
	return str;
}

Ogg.prototype.bitstream = function () {
	if (!this.unpacked)	return null;
	return this.data.join("");
};