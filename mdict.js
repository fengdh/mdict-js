define('mdict-parseXml', function() {
  return function (str) {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }
});

require(['jquery', 'mdict-core', 'mdict-render'], function($, MDict, MRenderer) {
  
  var $input = $('#dictfile').on('change', accept);

  function accept(e) {
    var $src = $(e.target);
    var fileList = $src.prop('files');

    $('#btnLookup').attr('disabled', true);

    if (fileList.length > 0) {
        $('#word').on('keyup', function(e) { e.which === 13 && $('#btnLookup').click(); });

        MDict(fileList).done(function(mdict) {
          $('#dict-title').html(mdict.description);

          $('#btnLookup')
            .attr('disabled', false)
            .off('.#mdict')
            .on('click.#mdict', function() {
              var result = mdict.lookup($('#word').val()).done(function($content) {
                $('#definition').empty().append($content.contents());
              });
              $('#definition').html(result);
            });
        });
    } else {
      $('#btnLookup').attr('disabled', false);
    }
    
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