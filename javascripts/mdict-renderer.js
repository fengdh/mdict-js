/*
 * A basic html renderer companioned with mdict-render.js to retrieve word's definition from a MDict dictionary.
 * By Feng Dihai <fengdh@gmail.com>, 2015/07/01
 * 
 * To my wife, my kids and my family.
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
    define(['jquery', 'bluebird'], factory);
  } else {
    // Browser globals
    factory(jQuery, Promise);
  }

}(this, function ($, Promise) {

  return function createRenderer(resources) {
    
    // TODO: LRU cache
    function replaceImage(index, img) {
      var $img = $(img);
      resources['mdd'].then(function (lookup) {
        lookup($img.attr('src')).then(function (data) {
          var blob = new Blob([data], {type: 'image'});
          blob.name = "MBC";
          var url = URL.createObjectURL(blob);
          // TODO: need to call window.URL.revokeObjectURL() to release memory
          //       or use LRU cache
          $img.attr('src', url);
        });
      });
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
