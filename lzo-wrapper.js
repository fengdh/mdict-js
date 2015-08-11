(function(global, define) {
  // define module and also export to global
  define(function (require, exports, module) {
      require(['lzo1x'], function() {
          if (!global.lzo1x) {
            global.lzo1x = lzo1x_lvar;
          }
      });
      return {
        decompress: function(buf /*, bufInitSize, bufBlockSize */) {
          var state = { inputBuffer: new Uint8Array(buf) };
          var ret = lzo1x.decompress(state);
          return state.outputBuffer;
        }
      }
  });  
  
}( this, // refers to global
   // Help Node out by setting up define.
   typeof module === 'object' && typeof define !== 'function'
     ? function (factory) { module.exports = factory(require, exports, module); } 
     : define
));