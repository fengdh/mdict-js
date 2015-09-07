# mdict-js
A pure Javascript implementation of MDict Parser (mdx/mdd).

-- NOW UNDER DEVELOPMENT --

View online demo at http://fengdh.github.io/mdict-js/

### Features
 * Pure JavaScript implementation, no dependence on native module.
 * Parse both mdx/mdd file in local, no data being passed to server, no need for server processing.
 * Limited support for data compression & encryption:
   * Data block compressed in GZip/LZO format.
   * Keyword index block encrypted with RIPEMD128.
 * Look up single word or search candidate word list with wild card (\*?, i.e. *a**ly).
 * Fast and very fast for human ineraction:
   * Parsing mdx/mdd header only, e.g. <200ms in total for a pair of mdx(80M, >180k entries) and mdd(1Gb, >150k entries) file.
   * Each querying completed in no more than serveral 10ms.
 * Low memory usage:
   * Parsing mdx/mdd header ahead, although loading only block index into memory that demanding for <2M in most case besides full keyword list.
   * Loading Word definition or resource on demand by slicing part of mdx/mdd file instead of whole one.
 * Providing asynchornous API powered by bluebird (support for Promises A+, https://github.com/petkaantonov/bluebird).
 * Sample renderer with support for embeded resource (image/audio/css/javascript etc.), currently working on Chrome(pc & mobile)/FireFox.
 
### Issues & TODOs:
 * Not support 64-bit number (>4G) used for data offset or length due to number format in ECMAScript 5 standard.
 * Not support encrypted keyword header that requires external or embedded regkey.
 * Audio support for plain wave (*.wav) and speex (*.spx) format. Currently *.mp3 or WavMP3 processed *.wav file is not supported by FireFox, though Chrome is OK. 
 * TODO: convert to node.js module.
 * TODO: stylesheet (text pattern) substitution.
 * TODO: load and relase emebeded resource with LRU based cache.
 * TODO: scoped CSS stylesheet for FireFox, or shadow DOM to confine css rules for Chrome.
 * TODO: support look-up word variation using Porter 2 stemmar.
 * TODO: support old IE (>9.0) without TextDecoder.
 * TODO: CSS stylesheet overriden and plugin to combine multiple dictionaries.
 * TODO: Chrome extension or app aimed for vocabulary building or read-assit with local dictionaries.
 * TODO: WordNet visiualization.
