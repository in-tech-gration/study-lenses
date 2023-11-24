Prism.plugins.toolbar.registerButton('copy', function (env) {

  const copyButton = document.createElement('button');
  copyButton.textContent = 'copy';
  copyButton.setAttribute("type", "button");
  copyButton.addEventListener('click', () => copy(env.code));

  return copyButton;

  function copy(code) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(code);
      return;
    }
    navigator.clipboard.writeText(code).then(function () {
      // console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
      // console.error('Async: Could not copy text: ', err);
      fallbackCopyTextToClipboard(code);
    });

    function fallbackCopyTextToClipboard(text) {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      // textArea.focus();
      textArea.select();
      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        // console.log('Fallback: Copying text command was ' + msg);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }

      document.body.removeChild(textArea);
      // window.scrollTo(0, 0);
    };

    alert("copied code to clipboard");
  }

});
