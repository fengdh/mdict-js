define('mdict-parseXml', function() {
  return function (str) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }
});

require(['jquery', 'mdict-common', 'mdict-parser', 'mdict-renderer', 'selectize'], function($, MCommon, MParser, MRenderer, Selectize) {
  
  $('#word').selectize({maxItems: 1});
  
  var $input = $('#dictfile').on('change', accept);
  
  function accept(e) {
    var fileList = $(e.target).prop('files');

    $('#btnLookup').attr('disabled', true);

    if (fileList.length > 0) {
        $('#btnLookup').addClass('stripes');
        $('#word').on('keyup', function(e) { e.which === 13 && $('#btnLookup').click(); });

        MParser(fileList).then(function(resources) {
          var mdict = MRenderer(resources);
          
          function doSearch(phrase, offset) {
              console.log(phrase + '');
              mdict.lookup(phrase, offset).then(function($content) {
                $('#definition').empty().append($content.contents());
                console.log('--');
              });
          }
          
          
          $('#dict-title').html((resources['mdx'] || resources['mdd']).value().description || '** no description **');
          mdict.render($('#dict-title'));
          
          $('#btnLookup')
            .attr('disabled', false)
            .off('.#mdict')
            .on('click.#mdict', function() {
              doSearch($('#word').val());
            }).click();
          
            $('#word')[0].selectize.destroy();
          
            $('#word').selectize({
              plugins: ['restore_on_backspace'],
              maxItems: 1,
              maxOptions: 1 << 20,
              valueField: 'value',
              labelField: 'word',
              searchField: 'word',
              delimiter: '~~',
              loadThrottle: 10,
              create: function(v, callback) {
                return callback({word: v, value: v});
              },
              createOnBlur: true,
              closeAfterSelect: true,
              allowEmptyOption: true,
              score: function(search) {
						var score = this.getScoreFunction(search);
						return function(item) {
							return 1;
						};
					},
              load: function(query, callback) {
                var self = this;
                if (!query.length) {
                  this.clearOptions();
                  this.refreshOptions();
                  return;
                };
                
                mdict.search({phrase: query, max: 5000}).then(function(list) {
//                  console.log(list.join(', '));
                  // TODO: filter candidate keyword starting with "_"
                  list = list.map(function(v) {
                    return {word: v, value: v.offset};
                  });
                  self.clearOptions();
                  callback(list);
                });
              },
              onChange: function(value) {
                var item = this.options[value];
                if (item) {
                  var value = item.word;
                  doSearch(value, value.offset);
                  $('#word').val(value);
                } else {
                  $('#definition').empty();
                }
              },
            });
        });
    } else {
      $('#btnLookup').attr('disabled', false);
    }
    
    // jump to word with link started with "entry://"
    // TODO: have to ignore in-page jump
    $('#definition').on('click', 'a', function(e) {
      var href = $(this).attr('href');
      if (href && href.substring(0, 8) === 'entry://') {
        var word = href.substring(8);
        // TODO: remove '#' to get jump target
        if (word.charAt(0) !== '#') {
          word = word.replace(/(^[/\\])|([/]$)/, '');

          $('#word').val(word);
          $('#btnLookup').click();
        } else {
          var currentUrl = location.href;
          location.href = word;                       //Go to the target element.
          history.replaceState(null,null,currentUrl); //Don't like hashes. Changing it back.        
        }
        return false;
      }
    });
  }


});

  
  
    /**
     * Save array buffer data as a download file. 
     */
    var saveData = (function() {
      return function(data, fileName, type) {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        var blob = new Blob([data], { type: type || "octet/stream" });
        a.href = window.URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        setTimeout(function() {
          window.URL.revokeObjectURL(a.href);
          document.body.removeChild(a);
        }, 500);
      };
    }());
