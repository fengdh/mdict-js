/*
 * A basic html renderer companioned with mdict-render.js to retrieve word's definition from a MDict dictionary.
 * By Feng Dihai <fengdh@gmail.com>, 2015/07/01
 * 
 * For my wife, my kids and family to whom I'm in love with life.
 *
 * This is free software released under terms of the MIT License.
 * You can get a copy on http://opensource.org/licenses/MIT.
 *
 *
 * MDict software and its file format is developed by Rayman Zhang(张文伟),
 * read more on http://www.mdict.cn/ or http://www.octopus-studio.com/.
 */

/**
 * Usage:
 *   var fileList = ...; // FileList object
 *   var word = ...;     // word for lookup
 *   require(['mdict-parser', 'mdict-renderer'], function(MParser, MRenderer) {
 *      MParser(fileList).then(function(resources) {
 *         var mdict = MRenderer(resources),
 *             dict_desc = resources.description.mdx;
 *         mdict.lookup(word).then(function($content) {
 *            // use $content to display result
 *         });
 *      });
 *    });
 */
(function (root, factory) {
  "use strict";

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'bluebird', 'speex.js', 'pcmdata.min', 'bitstring'], factory);
  } else {
    // Browser globals
    factory(jQuery, Promise);
  }

}(this, function ($, Promise, SpeexLib, PCMDataLib) {
  var MIME = {
    'wav': 'audio/wav',
    'spx': 'audio/x-speex',
    'jpg': 'image/jpeg',
    'png': 'image/png'
  }
  
  function getExtension(filename, defaultExt) {
    return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
  }
  
  var saveData = (function() {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  return function(data, fileName, type) {
    var blob = new Blob([data], { type: type || "octet/stream" });
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  };
}());
  
  return function createRenderer(resources) {
    
    // TODO: LRU cache: remove oldest one only after rendering.
    function replaceImage(index, img) {
      var $img = $(img);
      var src = $img.attr('src');
      resources['mdd'].then(function (lookup) {
        return lookup(src);
      }).then(function (data) {
          var blob = new Blob([data], {type: 'image'});
          blob.name = "MBC";
          var url = URL.createObjectURL(blob);
          // TODO: need to call window.URL.revokeObjectURL() to release memory
          //       or use LRU cache
          $img.attr('src', url);
          $img.attr('src_', src);
        
      });
    }
    
    function replaceAudio(index, a) {
      var $a = $(a);
      var href = $a.attr('href'), res = href.substring(8);
      resources['mdd'].then(function(lookup) {
        return lookup(res);
      }).then(function(data) {
        console.log('audio: ', href);
        var ext = getExtension(res, 'wav');
        var blob;
        if (ext === 'wav') {
          blob = new Blob([data], {type: MIME[ext]});
        } else {  // 'spx'
          blob = decodeFile(String.fromCharCode.apply(null, data));
        }
        var url = URL.createObjectURL(blob);
        console.log(url);
        var $audio = $('<audio controls>').attr({src: url, src_: href});
        $a.replaceWith($audio);
      });
    }
    
    function decodeFile(file) {
      var stream, samples, st;
      var ogg, header, err;

      ogg = new Ogg(file, {
        file: true
      });
      ogg.demux();
      stream = ogg.bitstream();

      header = Speex.parseHeader(ogg.frames[0]);
      console.log(header);

      comment = new SpeexComment(ogg.frames[1]);
      console.log(comment.data);

      st = new Speex({
        quality: 8,
        mode: header.mode,
        rate: header.rate
      });

      samples = st.decode(stream, ogg.segments);


      var waveData = PCMData.encode({
          sampleRate: header.rate,
          channelCount: header.nb_channels,
          bytesPerSample: 2,
          data: samples
        }),
        waveDataBuf;

      waveDataBuf = Speex.util.str2ab(waveData);

      var blob = new Blob([waveDataBuf], {
        type: "audio/wav"
      });
      return blob;

    }

    function render($content) {
      if (resources['mdd']) {
        $content.find('img[src]').each(replaceImage);
        
        $content.find('a[href^="sound://"]').each(replaceAudio);
      }
      return $content;
    }    
    
    function render($content) {
      if (resources['mdd']) {
        $content.find('img[src]').each(replaceImage);
      }
      return $content;
    }    
    
    return {
      lookup: function lookup(query) {
        return (resources['mdx'] || resources['mdd'])
          .then(function (lookup) {
            return lookup(query);
          }).then(function (definitions) {
            console.log('lookup done!');
            var html = definitions.reduce(function(prev, txt) { 
              return prev + '<p></p>' + txt;
            }, '<p>' + definitions.length + ' entry(ies) </p>');
            return Promise.resolve(render($('<div>').html(html)));
          });
      },
      
      search: function (query) {
        return resources['mdx'].then(function(lookup) {
          return lookup(query);
        });
      },
      
      render: render,
    };
  }

}));
