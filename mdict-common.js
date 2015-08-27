!(function (root, factory) {
  "use strict";
  
  if (typeof define === 'function') {
    if  (define.amd) {
      // AMD. Register as an anonymous module.
      define([], factory);
    } else {
      // TODO: For Node
      /*
      define(function(require, exports, module)) {
        exports = factory();       
      });
      */
    }
  }

}(this, function() {
  return {
    /**
     * Get file extension.
     */
    getExtension: function (filename, defaultExt) {
      return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
    },
    
     /**
      * Regular expression to strip key if dictionary's "StripKey" attribute is true. 
      */
    REGEXP_STRIPKEY: {
      'mdx' : /[()., '/\\@_-]()/g,
      'mdd' : /([.][^.]*$)|[()., '/\\@_-]/g        // strip '.' before file extension that is keeping the last period
    },

    log: function() {
      console.log.apply(console, [].slice.apply(arguments));
    }
  };
}));