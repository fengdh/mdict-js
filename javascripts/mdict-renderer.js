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
    define(['jquery', 'bluebird', 'speex', 'pcmdata', 'bitstring'], factory);
  } else {
    // Browser globals
    factory(jQuery, Promise);
  }

}(this, function ($, Promise, SpeexLib, PCMDataLib) {
  var MIME = {
    'css': 'text/css',
    'img': 'image',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'spx': 'audio/x-speex',
    'wav': 'audio/wav',
    'mp3': 'audio/mp3',
    'js' : 'text/javascript'
  };
  
  function getExtension(filename, defaultExt) {
    return /(?:\.([^.]+))?$/.exec(filename)[1] || defaultExt;
  }
  
  // TODO: revoke unused resource, LRU
  // TODO: support for word variation
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
    
    function loadData(mime, data) {
      var blob = new Blob([data], {type: mime});
      return URL.createObjectURL(blob);      
    }
  
    function loadAudio(ext, data) {
      if (ext === 'spx') {
        var blob = decodeSpeex(String.fromCharCode.apply(null, data));
        return URL.createObjectURL(blob);
      } else {  // 'spx'
        return loadData(MIME[ext] || 'audio', data);
      }
    }
    
    // TODO: LRU cache: remove oldest one only after rendering.
    function replaceImage(index, img) {
      var $img = $(img);
      var src = $img.attr('src'), m = /^file:\/\/(.*)/.exec(src);
      if (m) { src = m[1]; }
      cache.get(src, loadData.bind(null, MIME['img']))
           .then(function(url) {
              $img.attr({src: url, src_: src});
            });
    }
    
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
      return false;
    }
    
    function replaceCss(index, link) {
      var $link = $(link);
      var href = $link.attr('href');
      cache.get(href, loadData.bind(null, MIME['css']))
           .then(function(url) {
              // $link.attr({href: url, href_: href});
              // TODO: Limit scope of embedded styles provide by mdd file
              // TODO: use shadow dom for Chrome
              // TODO: use scoped style for Firefox
              $link.replaceWith($('<style scoped>', {src_: href}).text('@import url("' + url + '")'));
            });
    }
    
    function injectJS(index, el) {
      var $el = $(el);
      var src = $el.attr('src');
      cache.get(src, loadData.bind(null, MIME['js']))
           .then(function(url) {
              $el.remove();
              $.ajax({url: url, dataType: 'script', cache: true});
            });
    }    
    
    function decodeSpeex(file) {
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
          data: spx.decode(ogg.bitstream(), ogg.segments)
        });

      return new Blob([Speex.util.str2ab(waveData)], {type: "audio/wav"});
    }

    function render($content) {
      if (resources['mdd']) {
        $content.find('img[src]').each(replaceImage);
        
        $content.find('link[rel=stylesheet]').each(replaceCss);
        
        $content.find('script[src]').each(injectJS);
        
        $content.find('a[href^="sound://"]').on('click', renderAudio);
        
        setTimeout(function() { $('#definition *').trigger('resize'); });
      }
      
// resolve entry:// link dynamically in mdict.js      
//      // rewrite in-page link
//      $content.find('a[href^="entry://"]').each(function() { 
//        var $el = $(this), href = $el.attr('href');
//        if (href.match('#')) {
//          $el.attr('href', href.substring(8));
//        }
//      });
      
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
