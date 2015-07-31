(function(global, define) {

  // define module and also export to global
  define(function (require, exports, module) {
      require('lzo1x.js');
    
      var wrapper = {
        decompress: function(s, bufInitSize, bufBlockSize) {
          var state = {
            inputBuffer: new Uint8Array(s)
          };
          var ret = lzo1x.decompress(state);
          console.log(ret, state.outputBuffer.byteLength, state.outputBuffer.length);
          return state.outputBuffer;
        }
      }
      return wrapper;
  });  
  
  var wrapper = {};
  
  
}( this, // refers to global
   // Help Node out by setting up define.
   typeof module === 'object' && typeof define !== 'function'
     ? function (factory) { module.exports = factory(require, exports, module); } 
     : define
));