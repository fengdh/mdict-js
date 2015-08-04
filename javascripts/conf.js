var require = {
  // waitSeconds: 0,
  baseUrl: './javascripts',
  waitSeconds: 0,

  paths: {
    'jquery':         'jquery-1.11.1',
    'pako':           'pako_inflate',
    'lzo':            'minilzo-decompress2',
    'murmurhash3':    'murmurhash3',
    'bluebird':       'bluebird.min',
    'selectize':      'selectize',
    
    'mdict-core':   'mdict-core',
    'mdict-renderer': 'mdict-renderer',
    
  },
  
  map: {
    '*': {}
  },

  shim: {
    'selectize'	       : {deps: ['jquery']},
  }
};
