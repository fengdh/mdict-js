require(['jquery','lzo1x', 'lzo-lvar', 'lzo-decomp', 'bluebird'], 
        function ($,lzo1x_mod, lzo_lvar_mod, lzo_decomp, Promise) {

  // Value of undefined.
  var UNDEFINED = void 0;
  
  /**
   * Wrap value as a resolved promise.
   */
  function resolve(value) { return Promise.resolve(value); }
  
  /**
   * Wrap value as a rejected promise.
   */
  function reject(reason) { return Promise.reject(reason); }
    
  /**
   * For sliceThen(..).exec(proc, ..), mark what proc function returns is multiple values 
   * to be used by further Promise#spread(..) call. 
   */
  function spreadus() {
    var args = Array.prototype.slice.apply(arguments);
    args._spreadus_ = true;
    return args;
  }
    
  function sliceThen(file, offset, len) {
    var p = new Promise(function(_resolve) {
      var reader = new FileReader();
      reader.onload = function() { _resolve(reader.result); }
//      console.log('slice: ', offset, ' + ', len);
      if (arguments.length === 3 ) {
        reader.readAsArrayBuffer(file.slice(offset, offset + len)); // It's an asynchronous call!
      } else {
        reader.readAsArrayBuffer(file);
      }
    });

    /**
     * Call proc with specified arguments prepending with sliced file/blob data (ArrayBuffer) been read.
     * @param first argument is a function to be executed
     * @param other optional arguments to be passed to function following auto supplied input ArrayBuffer
     * @return a promise object which can be chained with further process through spread() method
     */
    p.exec = function(proc /*, args... */) {
      var args = Array.prototype.slice.call(arguments, 1);
      return p.then(function(data) {
          args.unshift(data);
          var ret = proc.apply(null, args);
          return resolve(ret !== UNDEFINED && ret._spreadus_ ? ret : [ret]);
      });
    };
        
    return p;
  }
  
  var COUNT = 20;
  function compress(input) {
    console.log('start to compress...')
    var t = performance.now();
    var state = {inputBuffer: new Uint8Array(input)};
    switch (lzo1x.compress(state)) {
      case 0:
        console.log('compression speed(Mb/s): ', 1000 * input.byteLength / (performance.now() - t) / 1024 /1024);
        return spreadus(input, state.outputBuffer);
      default:
        throw "Failed to compress";
    }
  }
  
  function t1(origin, comp) {
//*    
    var t = performance.now();
    for (var i = 0; i < COUNT; i++) {
        var state = {inputBuffer: comp};  
        lzo1x.decompress(state);
    }
    
    t = (performance.now() - t) * 1024 * 1024 / 1000 / COUNT;
    console.log('t1 speed(Mb/s): ', comp.byteLength / t);
    console.log('t1 speed(Mb/s): ', origin.byteLength / t);
    console.log(origin.byteLength, comp.byteLength, state.outputBuffer.length);
//*/    
    return spreadus(origin, comp);
  }
  
  function t2(origin, comp) {
    var t = performance.now();
    for (var i = 0; i < COUNT; i++) {
        var state = {inputBuffer: comp};  
        lzo1x_lvar.decompress(state);
    }
    
    t = (performance.now() - t) * 1024 * 1024 / 1000 / COUNT;
    console.log('t2 speed(Mb/s): ', comp.byteLength / t);
    console.log('t2 speed(Mb/s): ', origin.byteLength / t);
    console.log(origin.byteLength, comp.byteLength, state.outputBuffer.length);
    return spreadus(origin, comp);
  }
  
  function t3(origin, comp) {
//*    
//      var flex = lzo_decomp.createFlexBuffer(origin.byteLength, 4096 * 32);
      var options = {blockSize: 4096 * 32};
      var t = performance.now();
      for (var i = 0; i < COUNT; i++) {
          var state = {inputBuffer: comp};  
          var decomp = lzo_decomp.decompress(comp, options);
      }

      t = (performance.now() - t) * 1024 * 1024 / 1000 / COUNT;
      console.log('t3 speed(Mb/s): ', comp.byteLength / t);
      console.log('t3 speed(Mb/s): ', origin.byteLength / t);
      console.log(origin.byteLength, comp.byteLength, decomp.length);
//*/  
    return spreadus(origin, comp);
  }
  
  $(function() {
    $('#fileset').on('change', function(e) {
      var fileList = $(e.target).prop('files');
      console.log(fileList);
      for (var i = 0; i < fileList.length; i++) {
        var f = fileList[i];
        sliceThen(f)
          .exec(compress)
          .spread(function(input, output) {
            console.log(input.byteLength + ' -> ' + output.length);
            return spreadus(input, output);
          })
/*/        
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
          .spread(t1)
          .spread(t3)
//*/        
          .spread(t1)
          .spread(t3)
        ;
      }
    });
  }); 
});

