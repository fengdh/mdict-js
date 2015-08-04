var require = {
  baseUrl: './javascripts',
  waitSeconds: 0,

  paths: {
    'jquery'        : 'jquery-1.11.3.min',
    'pako'          : 'pako_inflate.min',
    'lzo'           : 'minilzo-decompress2.min',
/*    
    'lzo'           : 'lzo-wrapper',
    'lzo1x'         : 'lzo1x', 
    'lzo-wrapper'   : 'lzo-wrapper', 
//*/    
    
    'bluebird'      : 'bluebird.min',
    'selectize'     : 'selectize.min',
    
    'speex'         : 'speex.min',
    'pcmdata'       : 'pcmdata.min',
    'bitstring'     : 'bitstring.min',

    'murmurhash3'   : 'murmurhash3.min',
    'ripemd128'     : 'ripemd128.min',

    'mdict-core'    : 'mdict-core',
    'mdict-renderer': 'mdict-renderer',
  },
  
  map: {
    '*': {}
  },

  shim: {
    'selectize'	    : {deps: ['jquery']},
//    'lzo-wrapper'   : {deps: ['lzo1x']},
  }
};
