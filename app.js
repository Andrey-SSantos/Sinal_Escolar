const STORAGE_KEY = "sinal-escolar-config-v2";
const FIXED_BELL = {
  name: "Entrada",
  start: "08:00",
  duration: 60,
  folder: "sounds/sinal"
};
const DAY_LABELS = {
  segunda: "Segunda",
  terca: "Terca",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta"
};

const defaultConfig = {
  musicWindow: {
    start: "13:00",
    end: "13:30"
  },
  folderGroups: {
    segundaQuarta: "sounds/musicas/Segunda-Quarta",
    tercaQuinta: "sounds/musicas/Terca-Quinta",
    sexta: "sounds/musicas/Sexta"
  }
};

const config = loadConfig();
let schedulerRunning = true;
let timerId = null;
const triggeredBellToday = new Set();
let lastPlayedTrack = "";
let bellPlaying = false;
let bellTimeoutId = null;

const musicAudio = document.getElementById("musicAudio");
const bellAudio = document.getElementById("bellAudio");
const dayTracksCache = {};
let signalTrackCache = "";

const nowTime = document.getElementById("nowTime");
const musicState = document.getElementById("musicState");
const bellState = document.getElementById("bellState");
const signalFileInfo = document.getElementById("signalFileInfo");

const musicDayGrid = document.getElementById("musicDayGrid");

document.getElementById("testMusicToday").addEventListener("click", testMusicToday);
document.getElementById("testBell").addEventListener("click", testBellNow);
document.getElementById("stopAll").addEventListener("click", stopAllAudio);

renderMusicByDay();
renderClock();
refreshMusicState();
refreshSignalFileInfo();
timerId = setInterval(tickScheduler, 1000);
tickScheduler();
setInterval(renderClock, 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function loadConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultConfig);
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      ...structuredClone(defaultConfig),
      ...parsed,
      musicWindow: { ...defaultConfig.musicWindow },
      folderGroups: { ...defaultConfig.folderGroups }
    };
  } catch {
    return structuredClone(defaultConfig);
  }
}

function getFolderForDay(dayKey) {
  if (dayKey === "segunda" || dayKey === "quarta") {
    return config.folderGroups.segundaQuarta;
  }

  if (dayKey === "terca" || dayKey === "quinta") {
    return config.folderGroups.tercaQuinta;
  }

  if (dayKey === "sexta") {
    return config.folderGroups.sexta;
  }

  return "";
}

function saveConfig(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeFolderPath(value) {
  return value.trim().replace(/\\/g, "/").replace(/\/$/, "");
}

function clearDayTracksCache() {
  Object.keys(dayTracksCache).forEach((key) => {
    delete dayTracksCache[key];
  });
}

async function getTracksForDay(dayKey) {
  const folder = getFolderForDay(dayKey);
  if (!dayKey || !folder) {
    return [];
  }

  if (dayTracksCache[dayKey]) {
    return dayTracksCache[dayKey];
  }

  const indexPath = `${folder}/tracks.json`;

  try {
    const response = await fetch(indexPath, { cache: "no-cache" });
    if (!response.ok) {
      dayTracksCache[dayKey] = [];
      return [];
    }

    const fileNames = await response.json();
    if (!Array.isArray(fileNames)) {
      dayTracksCache[dayKey] = [];
      return [];
    }

    const tracks = fileNames
      .map((name) => String(name).trim())
      .filter(Boolean)
      .map((name) => `${folder}/${encodeURIComponent(name)}`);

    dayTracksCache[dayKey] = tracks;
    return tracks;
  } catch {
    dayTracksCache[dayKey] = [];
    return [];
  }
}

async function getSignalTrack() {
  if (signalTrackCache) {
    return signalTrackCache;
  }

  const indexPath = `${FIXED_BELL.folder}/tracks.json`;
  try {
    const response = await fetch(indexPath, { cache: "no-cache" });
    if (response.ok) {
      const fileNames = await response.json();
      if (Array.isArray(fileNames) && fileNames.length > 0) {
        const first = String(fileNames[0]).trim();
        if (first) {
          signalTrackCache = `${FIXED_BELL.folder}/${encodeURIComponent(first)}`;
          return signalTrackCache;
        }
      }
    }
  } catch {
    // Usa fallback abaixo
  }

  signalTrackCache = `${FIXED_BELL.folder}/Sinal escolar.mp3`;
  return signalTrackCache;
}

function refreshSignalFileInfo() {
  getSignalTrack().then((track) => {
    if (signalFileInfo) {
      signalFileInfo.textContent = track;
    }
  }).catch(() => {
    if (signalFileInfo) {
      signalFileInfo.textContent = `${FIXED_BELL.folder}/tracks.json`;
    }
  });
}

async function renderMusicByDay() {
  const todayKey = getDayKey(new Date().getDay());

  musicDayGrid.innerHTML = "";

  if (todayKey) {
    const todayCount = (await getTracksForDay(todayKey)).length;
    const todayItem = document.createElement("article");
    todayItem.className = "playlist-item playlist-item-today";
    todayItem.innerHTML = `
      <p>Hoje: ${DAY_LABELS[todayKey]}</p>
      <a href="#">${todayCount} musica(s) configurada(s)</a>
    `;
    musicDayGrid.appendChild(todayItem);
  }

  for (const day of ["segunda", "terca", "quarta", "quinta", "sexta"]) {
    const tracks = await getTracksForDay(day);
    const item = document.createElement("article");
    item.className = "playlist-item";
    item.innerHTML = `
      <p>${DAY_LABELS[day]}</p>
      <a href="#">${tracks.length} musica(s) em ${getFolderForDay(day)}</a>
    `;
    musicDayGrid.appendChild(item);
  }
}

function renderClock() {
  const now = new Date();
  nowTime.textContent = now.toLocaleTimeString("pt-BR");
}

function tickScheduler() {
  const now = new Date();
  const hhmm = formatHHMM(now);
  const dayKey = getDayKey(now.getDay());

  handleMusicPlayback(hhmm, dayKey).catch(() => {});

  const fixedBellKey = `${currentDateKey(now)}-fixed-bell-${FIXED_BELL.start}`;
  if (hhmm === FIXED_BELL.start && !triggeredBellToday.has(fixedBellKey)) {
    triggeredBellToday.add(fixedBellKey);
    getSignalTrack().then((file) => {
      playBell(file, FIXED_BELL.duration);
    }).catch(() => {
      bellState.textContent = "Erro ao carregar sinal";
    });
  }

  if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 1) {
    triggeredBellToday.clear();
  }
}

async function handleMusicPlayback(hhmm, dayKey) {
  const isInsideWindow = isTimeWithinRange(hhmm, config.musicWindow.start, config.musicWindow.end);
  const todayTracks = dayKey ? await getTracksForDay(dayKey) : [];

  if (!dayKey) {
    musicState.textContent = "Final de semana (sem musica)";
    stopMusicOnly();
    return;
  }

  if (!schedulerRunning) {
    musicState.textContent = `Hoje: ${DAY_LABELS[dayKey]} (agendador pausado)`;
    return;
  }

  if (bellPlaying) {
    stopMusicOnly();
    musicState.textContent = "Pausada durante o sinal";
    return;
  }

  if (!isInsideWindow) {
    musicState.textContent = `Fora do horario (${DAY_LABELS[dayKey]})`;
    stopMusicOnly();
    return;
  }

  if (todayTracks.length === 0) {
    musicState.textContent = `Sem musicas em ${DAY_LABELS[dayKey]} (verifique tracks.json)`;
    stopMusicOnly();
    return;
  }

  musicState.textContent = `Tocando (${DAY_LABELS[dayKey]})`;
  if (musicAudio.paused) {
    playRandomMusic(todayTracks, dayKey);
  }
}

function formatHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function isTimeWithinRange(current, start, end) {
  return current >= start && current < end;
}

function getDayKey(dayIndex) {
  switch (dayIndex) {
    case 1:
      return "segunda";
    case 2:
      return "terca";
    case 3:
      return "quarta";
    case 4:
      return "quinta";
    case 5:
      return "sexta";
    default:
      return null;
  }
}

function currentDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function refreshMusicState() {
  const now = new Date();
  const hhmm = formatHHMM(now);
  const dayKey = getDayKey(now.getDay());
  handleMusicPlayback(hhmm, dayKey).catch(() => {
    musicState.textContent = "Erro ao carregar musicas do dia";
  });
}

function pickRandomTrack(tracks) {
  if (tracks.length === 1) {
    return tracks[0];
  }

  const options = tracks.filter((track) => track !== lastPlayedTrack);
  const pool = options.length > 0 ? options : tracks;
  return pool[Math.floor(Math.random() * pool.length)];
}

function playRandomMusic(tracks, dayKey) {
  if (!tracks.length) {
    return;
  }

  const next = pickRandomTrack(tracks);
  lastPlayedTrack = next;
  musicAudio.src = next;
  musicAudio.loop = false;
  musicAudio.play().catch(() => {
    musicState.textContent = "Bloqueado (clique para liberar audio)";
  });

  musicAudio.onended = () => {
    if (schedulerRunning) {
      const now = new Date();
      const currentDayKey = getDayKey(now.getDay());
      const hhmm = formatHHMM(now);

      if (bellPlaying || !currentDayKey || !isTimeWithinRange(hhmm, config.musicWindow.start, config.musicWindow.end)) {
        stopMusicOnly();
        musicState.textContent = "Fora do horario";
        return;
      }

      getTracksForDay(currentDayKey).then((list) => {
        if (list.length > 0) {
          playRandomMusic(list, currentDayKey);
        }
      }).catch(() => {});
    }
  };
}

function testMusicToday() {
  const dayKey = getDayKey(new Date().getDay());
  getTracksForDay(dayKey).then((list) => {
    if (!dayKey || list.length === 0) {
      alert("Nao ha musicas configuradas para hoje. Crie tracks.json na pasta do dia.");
      return;
    }
    playRandomMusic(list, dayKey);
    musicState.textContent = `Teste manual (${DAY_LABELS[dayKey]})`;
  }).catch(() => {
    alert("Nao foi possivel carregar as musicas do dia.");
  });
}

function testBellNow() {
  getSignalTrack().then((file) => {
    playBell(file, FIXED_BELL.duration);
  }).catch(() => {
    alert("Nao foi possivel carregar o arquivo de sinal.");
  });
}

function playBell(file, duration) {
  stopMusicOnly();
  bellPlaying = true;
  bellAudio.src = file;
  bellAudio.loop = true;
  bellAudio.play().then(() => {
    bellState.textContent = "Tocando";
  }).catch(() => {
    bellState.textContent = "Bloqueado (clique para liberar audio)";
  });

  if (bellTimeoutId) {
    clearTimeout(bellTimeoutId);
  }

  bellTimeoutId = setTimeout(() => {
    bellAudio.pause();
    bellAudio.currentTime = 0;
    bellAudio.loop = false;
    bellPlaying = false;
    bellTimeoutId = null;
    bellState.textContent = "Parado";
  }, duration * 1000);
}

function stopMusicOnly() {
  musicAudio.pause();
  musicAudio.currentTime = 0;
}

function stopAllAudio() {
  stopMusicOnly();
  if (bellTimeoutId) {
    clearTimeout(bellTimeoutId);
    bellTimeoutId = null;
  }
  bellAudio.pause();
  bellAudio.currentTime = 0;
  bellPlaying = false;
  bellState.textContent = "Parado";
  if (!schedulerRunning) {
    const dayKey = getDayKey(new Date().getDay());
    if (dayKey) {
      musicState.textContent = `Hoje: ${DAY_LABELS[dayKey]} (agendador pausado)`;
    } else {
      musicState.textContent = "Final de semana (sem musica)";
    }
  }
}
