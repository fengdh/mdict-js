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
<<<<<<< HEAD
    define(['jquery', 'bluebird', 'speex', 'pcmdata', 'bitstring'], factory);
=======
    define(['jquery', 'bluebird', 'speex', 'pcmdata.min', 'bitstring'], factory);
>>>>>>> origin/gh-pages
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
  };
  

  
  function getExtension(filename, defaultExt) {
    return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
  }
  
  return function createRenderer(resources) {

    var cache = (function createCache(mdd) {
    var repo = {};
    
      function get(id, load) {
        var entry = repo[id];
        if (!entry) {
          repo[id] = entry = new Promise(function(resolve) {
          var will = mdd.then(function(lookup) {
            console.log('lookup: ' + id);
            return lookup(id);
          }).then(load)
            .then(function(url) { resolve(url); });
          });
        }
        return entry;
      }
      
      return {get: get};
    })(resources['mdd']);
    
    function loadImage(data) {
      var blob = new Blob([data], {type: 'image'});
      return URL.createObjectURL(blob);      
    }

    function loadCss(data) {
      var blob = new Blob([data], {type: 'text/css'});
      return URL.createObjectURL(blob);      
    }
    
    function loadAudio(ext, data) {
      var blob;
      if (ext === 'wav') {
        blob = new Blob([data], {type: MIME[ext]});
      } else {  // 'spx'
        blob = decodeFile(String.fromCharCode.apply(null, data));
      }
      return URL.createObjectURL(blob);
    }
    
    // TODO: LRU cache: remove oldest one only after rendering.
    function replaceImage(index, img) {
      var $img = $(img);
      var src = $img.attr('src');
      cache.get(src, loadImage).then(function(url) {
        $img.attr({src: url, src_: src});
      });
    }
    
<<<<<<< HEAD
    function playAudio(e, $a) {
      ($a || $(this)).find('audio')[0].play();
    }
    
    function renderAudio() {
      var $a = $(this);
      if ($a.attr('href_')) {
        playAudio($a);
      } else {
        var href = $a.attr('href'), res = href.substring(8);
        var ext = getExtension(res, 'wav');
        cache.get(res, loadAudio.bind(null, ext))
             .then(function(url) {
                $a.append($('<audio>').attr({src: url, src_: href})).on('click', playAudio);
                setTimeout(playAudio.bind($a));
             });
      }
    }
    
    function replaceCss(index, link) {
      var $link = $(link);
      var href = $link.attr('href');
      cache.get(href, loadCss)
           .then(function(url) {
              $link.attr({href: url, href_: href});
            });
=======
    function playAudio() {
      $(this).find('audio')[0].play();
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
        $a.append($('<audio>').attr({src: url, src_: href})).on('click', playAudio);
      });
>>>>>>> origin/gh-pages
    }
    
    function decodeFile(file) {
      var ogg = new Ogg(file, {file: true});
      ogg.demux();

      var header = Speex.parseHeader(ogg.frames[0]);
      console.log(header);

      var comment = new SpeexComment(ogg.frames[1]);
      console.log(comment.data);

      var spx = new Speex({
        quality: 8,
        mode: header.mode,
        rate: header.rate
      });
      
      var waveData = PCMData.encode({
          sampleRate: header.rate,
          channelCount: header.nb_channels,
          bytesPerSample: 2,
<<<<<<< HEAD
          data: spx.decode(ogg.bitstream(), ogg.segments)
        });
=======
          data: samples
        }),
        waveDataBuf;

      waveDataBuf = Speex.util.str2ab(waveData);

      var blob = new Blob([waveDataBuf], {type: "audio/wav"});
      return blob;
>>>>>>> origin/gh-pages

      return new Blob([Speex.util.str2ab(waveData)], {type: "audio/wav"});
    }

    function render($content) {
      if (resources['mdd']) {
        $content.find('img[src]').each(replaceImage);
        
<<<<<<< HEAD
        $content.find('link[rel=stylesheet]').each(replaceCss);
        
        $content.find('a[href^="sound://"]').on('click', renderAudio);
=======
        $content.find('a[href^="sound://"]').each(replaceAudio);
>>>>>>> origin/gh-pages
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
