const WS_URL = 'ws://localhost:8965';

let ws = null;
let reconnectTimer = null;
let port = null;

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[SW] Connected');
    updatePopup();
    clearTimeout(reconnectTimer);
  };

  ws.onclose = () => {
    console.log('[SW] Disconnected');

    ws = null;
    updatePopup();

    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'TRACK_UPDATE',
        data
      })
    );
  }
}

function updatePopup() {
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    data: {
      wsConnected: ws?.readyState === WebSocket.OPEN
    }
  }).catch(() => { });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRACK_UPDATE') {
    send(msg.data);
    updatePopup();
  }

  if (msg.type === 'GET_STATUS') {
    sendResponse({
      wsConnected: ws?.readyState === WebSocket.OPEN
    });
  }
});

chrome.runtime.onConnect.addListener((p) => {
  port = p;

  port.onDisconnect.addListener(() => {
    port = null;
  });
});

connect();