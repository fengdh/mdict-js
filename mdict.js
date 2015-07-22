define('mdict-parseXml', function() {
  return function (str) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }
});

require(['jquery', 'mdict-parser', 'mdict-renderer', 'selectize'], function($, MParser, MRenderer, Selectize) {
  $('#word').selectize({maxItems: 1});
  
  var $input = $('#dictfile').on('change', accept);
  var REGEXP_STRIPKEY = /[,. '-]/g;

  function adaptKey(key) { 
    return key.toLowerCase().replace(REGEXP_STRIPKEY, ''); 
  }
  
  function accept(e) {
    var fileList = $(e.target).prop('files');

    $('#btnLookup').attr('disabled', true);

    if (fileList.length > 0) {
        $('#word').on('keyup', function(e) { e.which === 13 && $('#btnLookup').click(); });

        MParser(fileList).then(function(resources) {
          var mdict = MRenderer(resources);
          
//          mdict.search('mind').then(function(list) {
//            console.log(list);
//          });

          mdict.search("o'clock").then(function(list) {
            console.log(list);
          });
          
          $('#dict-title').html((resources['mdx'] || resources['mdd']).value().description || '** no description **');

          $('#btnLookup')
            .attr('disabled', false)
            .off('.#mdict')
            .on('click.#mdict', function() {
              var result = mdict.lookup($('#word').val()).then(function($content) {
                $('#definition').empty().append($content.contents());
              });
              $('#definition').html(result);
            }).click();
          
            $('#word')[0].selectize.destroy();
          
            $('#word').selectize({
              maxItems: 1,
              valueField: 'word',
              labelField: 'word',
              searchField: 'word',
              sortField: 'key',
              options: [],
              delimiter: '~~',
              create: function(v, callback) {
                return ({word: v, key: adaptKey(v)});
              },
              createOnBlur: true,
              persist: true,
              closeAfterSelect: true,
              allowEmptyOption: true,
              addPrecedence: 'New...',
              load: function(query, callback) {
                console.log(this);
                var self = this;
                if (!query.length) {
                  this.clearOptions();
                  this.refreshOptions();
                  return;
                };
                mdict.search(query).then(function(list) { 
                  list = list.map(function(v) {
                    return {word: v, key: adaptKey(v)};
                  });
                  self.clearOptions();
                  callback(list);
                });
              },
              onChange: function() { $('#btnLookup').click();},
            });
        });
    } else {
      $('#btnLookup').attr('disabled', false);
    }
    
    // jump to word with link started with "entry://"
    $('#definition').on('click', 'a', function(e) {
      var href = $(this).attr('href');
      if (href && href.substring(0, 8) === 'entry://') {
        var word = href.substring(8).replace(/(^[/\\])|([/]$)/, '');
        
        $('#word').val(word);
        $('#btnLookup').click();
      }
    });

  }

  
  
    /**
     * Save array buffer data as a download file. 
     */
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
});