var require = {
  baseUrl: './javascripts',
  waitSeconds: 0,

  paths: {
    'jquery'        : 'jquery-1.11.3.min',
    'pako'          : 'pako_inflate.min',
    'lzo'           : 'minilzo-decompress.min',
    
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
  }
};
