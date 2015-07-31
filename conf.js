var require = {
  // waitSeconds: 0,
  // baseUrl: '.',
  waitSeconds: 0,

  paths: {
    'jquery'        : 'jquery-1.11.1',
    'pako'          : 'pako_inflate',
    'lzo'           : 'minilzo-decompress2',
//    'lzo'           : 'lzo-wrapper',
//    'lzo1x'         : 'lzo1x', 
//    'lzo-wrapper'   : 'lzo-wrapper', 
    'murmurhash3'   : 'murmurhash3',
    'bluebird'      : 'bluebird.min',
    'selectize'     : 'selectize',

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