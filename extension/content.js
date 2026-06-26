let prevHash = '';
let wasPlaying = false;

function formatTime(seconds) {
  seconds = Math.floor(seconds || 0);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

function getTrackInfo() {
  const info = {
    title: '',
    artist: '',
    channelUrl: '',
    artUrl: '',
    isPlaying: false,
    currentTime: '0:00',
    totalTime: '0:00',
    trackUrl: location.href
  };

  if (!location.pathname.startsWith('/watch')) {
    return info;
  }

  const video = document.querySelector('video');

  if (!video) {
    return info;
  }

  const titleElement =
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
    document.querySelector('h1.title');

  if (titleElement) {
    info.title = titleElement.textContent.trim();
  }

  const channelElement =
    document.querySelector('#owner #channel-name a') ||
    document.querySelector('ytd-channel-name a');

  if (channelElement) {
    info.artist = channelElement.textContent.trim();
    info.channelUrl = channelElement.href;
  }

  const videoId = new URLSearchParams(location.search).get('v');

  if (videoId) {
    info.artUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  info.isPlaying = !video.paused;
  info.currentTime = formatTime(video.currentTime);
  info.totalTime = formatTime(video.duration);

  return info;
}

function getHash(info) {
  return [
    info.title,
    info.artist,
    info.currentTime,
    info.isPlaying
  ].join('|');
}

function tick() {
  const info = getTrackInfo();
  const hash = getHash(info);

  if (info.isPlaying && hash !== prevHash && info.title) {
    prevHash = hash;
    wasPlaying = true;

    chrome.runtime.sendMessage({
      type: 'TRACK_UPDATE',
      data: info
    }).catch(() => {});
  } else if (wasPlaying && !info.isPlaying) {
    wasPlaying = false;
    prevHash = '';

    chrome.runtime.sendMessage({
      type: 'TRACK_UPDATE',
      data: null
    }).catch(() => {});
  } else if (!location.pathname.startsWith('/watch')) {
    wasPlaying = false;
  }
}

setInterval(tick, 2000);
setTimeout(tick, 500);
