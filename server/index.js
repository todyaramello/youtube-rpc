const DiscordRPC = require('discord-rpc');
const WebSocket = require('ws');

const CLIENT_ID = '1520811342926315560';
const WS_PORT = 8965;

let rpc;
let reconnectTimer;
let currentActivity = null;

DiscordRPC.register(CLIENT_ID);

async function initRPC() {
  try {
    rpc = new DiscordRPC.Client({
      transport: 'ipc'
    });

    rpc.on('ready', () => {
      console.log('[RPC] Connected');

      if (currentActivity) {
        setActivity(currentActivity);
      }
    });

    rpc.on('disconnected', () => {
      console.log('[RPC] Disconnected');

      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(initRPC, 5000);
    });

    await rpc.login({
      clientId: CLIENT_ID
    });

  } catch (err) {
    console.error('[RPC]', err.message);

    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(initRPC, 5000);
  }
}

function parseTime(time) {
  if (!time) return 0;

  const parts = time.split(':').map(Number);

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return (
      parts[0] * 3600 +
      parts[1] * 60 +
      parts[2]
    );
  }

  return 0;
}

function setActivity(data) {
  if (!rpc || !rpc.user) {
    return;
  }

  currentActivity = data;

  if (!data || !data.title) {
    rpc.clearActivity();
    return;
  }

  const elapsed = parseTime(data.currentTime);
  const total = parseTime(data.totalTime);

  const now = Math.floor(Date.now() / 1000);

  const activity = {
    details: data.title.substring(0, 128),

    state: (data.artist || 'Unknown')
      .substring(0, 128),

    type: 3,

    largeImageKey: 'youtube',
    largeImageText: 'YouTube',

    smallImageKey: data.isPlaying
      ? 'playing'
      : 'paused',

    smallImageText: data.isPlaying
      ? 'Watching'
      : 'Paused',

    instance: false
  };

  if (data.isPlaying && total > 0) {
    activity.startTimestamp = now - elapsed;
    activity.endTimestamp = now + (total - elapsed);
  }

  if (data.trackUrl) {
    activity.buttons = [
      {
        label: 'Watch on YouTube',
        url: data.trackUrl
      }
    ];
  }

  rpc.setActivity(activity).catch(console.error);
}

const wss = new WebSocket.Server({
  port: WS_PORT
}, () => {
  console.log(
    `[Server] ws://localhost:${WS_PORT}`
  );
});

wss.on('connection', (ws) => {
  console.log('[Server] Extension connected');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'TRACK_UPDATE') {
        setActivity(msg.data);
      }

    } catch (err) {
      console.error(err);
    }
  });

  ws.on('close', () => {
    console.log('[Server] Extension disconnected');
  });
});

initRPC();
