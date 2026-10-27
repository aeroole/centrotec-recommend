(function () {
  var API_BASE = window.WIX_CHAT_PROXY_URL;
  if (!API_BASE) return;

  var KEY = 'wx_landing_notified';
  try {
    if (sessionStorage.getItem(KEY)) return;
  } catch (e) {}

  function mark() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function send() {
    fetch(API_BASE + '?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.conversationId) throw new Error('no conversationId');
        var text = '👀 มีผู้เข้าชมหน้า: ' + document.title + ' (' + location.href + ')';
        return fetch(API_BASE + '?action=send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: data.conversationId, text: text }),
        });
      })
      .then(mark)
      .catch(function () {});
  }

  if (document.readyState === 'complete') {
    send();
  } else {
    window.addEventListener('load', send);
  }
})();
