define('mdict-parseXml', function() {
  return function (str) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }
});

require(['jquery', 'mdict-parser', 'mdict-renderer'], function($, MParser, MRenderer) {
  
  var $input = $('#dictfile').on('change', accept);

  function accept(e) {
    var fileList = $(e.target).prop('files');

    $('#btnLookup').attr('disabled', true);

    if (fileList.length > 0) {
        $('#word').on('keyup', function(e) { e.which === 13 && $('#btnLookup').click(); });

        MParser(fileList).then(function(resources) {
          var mdict = MRenderer(resources);
          
          mdict.adjoin('mind').then(function(list) {
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
            });
        });
    } else {
      $('#btnLookup').attr('disabled', false);
    }
    
    // jump to word with link started with "entry://"
    $('#definition').on('click', 'a', function(e) {
      var href = $(e.target).attr('href');
      if (href.substring(0, 8) === 'entry://') {
        $('#word').val(href.substring(8));
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