(function () {
  // Point this at wherever wix-chat-proxy.php ends up being hosted.
  var API_BASE = window.WIX_CHAT_PROXY_URL || 'https://REPLACE-WITH-YOUR-DOMAIN/wix-chat-proxy.php';
  var lang = document.documentElement.lang === 'en' ? 'en' : 'th';
  var T = lang === 'en'
    ? { bubble: 'Chat with us', title: 'Centrotec', namePlaceholder: 'Your name', start: 'Start chat', msgPlaceholder: 'Type a message…', send: 'Send', connecting: 'Connecting…', sent: 'Message sent. Our team will reply here shortly.' }
    : { bubble: 'แชทกับเรา', title: 'Centrotec', namePlaceholder: 'ชื่อของคุณ', start: 'เริ่มแชท', msgPlaceholder: 'พิมพ์ข้อความ…', send: 'ส่ง', connecting: 'กำลังเชื่อมต่อ…', sent: 'ส่งข้อความแล้ว ทีมงานจะตอบกลับที่นี่' };

  var state = { conversationId: null, pollTimer: null, lastSeen: null };

  var css = '\
#wx-chat-bubble{position:fixed;bottom:22px;right:22px;z-index:9999;width:58px;height:58px;border-radius:50%;background:#3368AF;box-shadow:0 8px 24px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;}\
#wx-chat-bubble svg{width:26px;height:26px;}\
#wx-chat-panel{position:fixed;bottom:92px;right:22px;z-index:9999;width:320px;max-width:calc(100vw - 32px);height:440px;max-height:70vh;background:#fff;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.3);display:none;flex-direction:column;overflow:hidden;font-family:Sarabun,Inter,sans-serif;}\
#wx-chat-panel.open{display:flex;}\
#wx-chat-head{background:#3368AF;color:#fff;padding:14px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;}\
#wx-chat-head button{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;}\
#wx-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#F3F6F9;}\
.wx-msg{max-width:80%;padding:8px 12px;border-radius:10px;font-size:14px;line-height:1.5;}\
.wx-msg.me{align-self:flex-end;background:#3368AF;color:#fff;}\
.wx-msg.them{align-self:flex-start;background:#fff;border:1px solid #E2E8EF;color:#16212E;}\
#wx-chat-start{padding:16px;display:flex;flex-direction:column;gap:10px;}\
#wx-chat-start input{padding:10px 12px;border:1px solid #E2E8EF;border-radius:8px;font-size:14px;}\
#wx-chat-start button{padding:10px;border:none;border-radius:8px;background:#D6452F;color:#fff;font-weight:700;cursor:pointer;}\
#wx-chat-foot{display:flex;border-top:1px solid #E2E8EF;}\
#wx-chat-input{flex:1;border:none;padding:12px;font-size:14px;outline:none;}\
#wx-chat-send{border:none;background:#fff;color:#D6452F;font-weight:700;padding:0 16px;cursor:pointer;}\
';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var bubble = document.createElement('button');
  bubble.id = 'wx-chat-bubble';
  bubble.setAttribute('aria-label', T.bubble);
  bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'wx-chat-panel';
  panel.innerHTML =
    '<div id="wx-chat-head"><span>' + T.title + '</span><button id="wx-chat-close" aria-label="Close">✕</button></div>' +
    '<div id="wx-chat-start">' +
      '<input id="wx-chat-name" type="text" placeholder="' + T.namePlaceholder + '">' +
      '<button id="wx-chat-start-btn">' + T.start + '</button>' +
    '</div>' +
    '<div id="wx-chat-body" style="display:none;"></div>' +
    '<div id="wx-chat-foot" style="display:none;">' +
      '<input id="wx-chat-input" type="text" placeholder="' + T.msgPlaceholder + '">' +
      '<button id="wx-chat-send">' + T.send + '</button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  bubble.onclick = function () { panel.classList.toggle('open'); };
  panel.querySelector('#wx-chat-close').onclick = function () { panel.classList.remove('open'); };

  function addMsg(text, mine) {
    var body = panel.querySelector('#wx-chat-body');
    var div = document.createElement('div');
    div.className = 'wx-msg ' + (mine ? 'me' : 'them');
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function startChat() {
    var name = panel.querySelector('#wx-chat-name').value.trim() || 'Website Visitor';
    panel.querySelector('#wx-chat-start').innerHTML = '<p style="font-size:13px;color:#4A5A6A;text-align:center;margin:0;">' + T.connecting + '</p>';
    fetch(API_BASE + '?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.conversationId) throw new Error('no conversationId');
        state.conversationId = data.conversationId;
        panel.querySelector('#wx-chat-start').style.display = 'none';
        panel.querySelector('#wx-chat-body').style.display = 'flex';
        panel.querySelector('#wx-chat-foot').style.display = 'flex';
        startPolling();
      })
      .catch(function () {
        panel.querySelector('#wx-chat-start').innerHTML = '<p style="font-size:13px;color:#D6452F;text-align:center;">Connection failed. Please try again later.</p>';
      });
  }
  panel.querySelector('#wx-chat-start-btn').onclick = startChat;

  function sendMsg() {
    var input = panel.querySelector('#wx-chat-input');
    var text = input.value.trim();
    if (!text || !state.conversationId) return;
    addMsg(text, true);
    input.value = '';
    fetch(API_BASE + '?action=send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: state.conversationId, text: text }),
    });
  }
  panel.querySelector('#wx-chat-send').onclick = sendMsg;
  panel.querySelector('#wx-chat-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMsg();
  });

  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () {
      fetch(API_BASE + '?action=poll&conversationId=' + encodeURIComponent(state.conversationId))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          (data.messages || []).forEach(function (m) {
            var ts = m.createdDate;
            if (state.lastSeen && ts <= state.lastSeen) return;
            if (m.direction === 'BUSINESS_TO_PARTICIPANT') {
              addMsg((m.content && m.content.preview && m.content.preview.text) || '', false);
            }
            state.lastSeen = ts;
          });
        })
        .catch(function () {});
    }, 5000);
  }
})();
