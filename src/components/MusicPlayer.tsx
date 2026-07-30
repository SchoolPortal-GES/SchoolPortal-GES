import { useEffect, useRef, useState, useCallback } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, X, FolderOpen, Trash2, FileAudio, AlertCircle, ListMusic } from 'lucide-react';

interface LoadedTrack {
  name: string;
  url: string;
  size: number;
  fileName: string;
  lastModified: number;
  duration: number;
}

interface SavedTrackMeta {
  fileName: string;
  fileSize: number;
  lastModified: number;
}

const STORAGE_KEYS = {
  playlist: 'schoolportal_music_playlist',
  currentTrack: 'schoolportal_music_current_track',
  position: 'schoolportal_music_position',
  shuffle: 'schoolportal_music_shuffle',
  repeat: 'schoolportal_music_repeat',
  volume: 'schoolportal_music_volume',
};

function lsAvailable(): boolean {
  try {
    const t = '__sp_test__';
    localStorage.setItem(t, t);
    localStorage.removeItem(t);
    return true;
  } catch { return false; }
}

const HAS_LS = lsAvailable();

function lsGet<T>(key: string, fallback: T): T {
  if (!HAS_LS) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  if (!HAS_LS) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tracks, setTracks] = useState<LoadedTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const v = lsGet<number>(STORAGE_KEYS.volume, 70);
    return typeof v === 'number' ? v : 70;
  });
  const [shuffle, setShuffle] = useState(() => lsGet<boolean>(STORAGE_KEYS.shuffle, false));
  const [repeat, setRepeat] = useState(() => lsGet<boolean>(STORAGE_KEYS.repeat, false));
  const [needsReselect, setNeedsReselect] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const playedHistoryRef = useRef<number[]>([]);
  const positionSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumePositionRef = useRef<number>(0);
  const shouldResumeRef = useRef<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const track = tracks[trackIndex];

  useEffect(() => {
    const savedPlaylist = lsGet<SavedTrackMeta[]>(STORAGE_KEYS.playlist, []);
    const savedTrackIdx = lsGet<number>(STORAGE_KEYS.currentTrack, 0);
    const savedPosition = lsGet<number>(STORAGE_KEYS.position, 0);
    const savedShuffle = lsGet<boolean>(STORAGE_KEYS.shuffle, false);
    const savedRepeat = lsGet<boolean>(STORAGE_KEYS.repeat, false);
    const savedVolume = lsGet<number>(STORAGE_KEYS.volume, 70);

    setShuffle(savedShuffle);
    setRepeat(savedRepeat);
    if (typeof savedVolume === 'number') setVolume(savedVolume);

    if (savedPlaylist.length > 0) {
      setNeedsReselect(true);
      resumePositionRef.current = savedPosition;
      shouldResumeRef.current = true;
      setTrackIndex(savedTrackIdx);
      if (!HAS_LS) {
        setNotice('Your playlist will not be saved between sessions on this browser.');
      }
    }
  }, []);

  useEffect(() => { lsSet(STORAGE_KEYS.shuffle, shuffle); }, [shuffle]);
  useEffect(() => { lsSet(STORAGE_KEYS.repeat, repeat); }, [repeat]);
  useEffect(() => { lsSet(STORAGE_KEYS.volume, volume); }, [volume]);
  useEffect(() => {
    lsSet(STORAGE_KEYS.currentTrack, trackIndex);
  }, [trackIndex]);

  useEffect(() => {
    if (tracks.length > 0) {
      lsSet(STORAGE_KEYS.playlist, tracks.map((t) => ({
        fileName: t.fileName,
        fileSize: t.size,
        lastModified: t.lastModified,
      })));
    } else {
      if (HAS_LS) localStorage.removeItem(STORAGE_KEYS.playlist);
    }
  }, [tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (positionSaveRef.current) { clearInterval(positionSaveRef.current); positionSaveRef.current = null; }
    if (playing && track) {
      positionSaveRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio) lsSet(STORAGE_KEYS.position, audio.currentTime);
      }, 5000);
    }
    return () => { if (positionSaveRef.current) { clearInterval(positionSaveRef.current); positionSaveRef.current = null; } };
  }, [playing, track]);

  useEffect(() => {
    function handleUnload() {
      const audio = audioRef.current;
      if (audio) lsSet(STORAGE_KEYS.position, audio.currentTime);
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: 'SchoolPortal-GES Player',
      });
    }
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
  }, [track]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, trackIndex, track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (shouldResumeRef.current === false && resumePositionRef.current > 0 && progress === 0) {
      const handler = () => {
        audio.currentTime = resumePositionRef.current;
        setProgress(resumePositionRef.current);
        resumePositionRef.current = 0;
        audio.removeEventListener('loadedmetadata', handler);
      };
      audio.addEventListener('loadedmetadata', handler);
      return () => audio.removeEventListener('loadedmetadata', handler);
    }
  }, [track, progress]);

  useEffect(() => {
    if (!track || tracks.length < 2) return;
    const nextIdx = pickNextTrackStatic();
    const nextTrack = tracks[nextIdx];
    if (nextTrack && nextTrack.url !== track.url) {
      if (preloadRef.current) {
        preloadRef.current.src = nextTrack.url;
        preloadRef.current.preload = 'auto';
        preloadRef.current.load();
      }
    }
  }, [track, trackIndex, tracks, shuffle]);

  function pickNextTrackStatic(): number {
    if (tracks.length === 0) return 0;
    if (tracks.length === 1) return 0;
    if (shuffle) {
      const unplayed = tracks.map((_, i) => i).filter((i) => !playedHistoryRef.current.includes(i));
      if (unplayed.length === 0) {
        const candidates = tracks.map((_, i) => i).filter((i) => i !== trackIndex);
        return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
      }
      return unplayed[Math.floor(Math.random() * unplayed.length)] ?? 0;
    }
    return (trackIndex + 1) % tracks.length;
  }

  const pickNextTrack = useCallback((): number => {
    return pickNextTrackStatic();
  }, [tracks.length, trackIndex, shuffle]);

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const audioFiles = fileArray.filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|webm|opus)$/i.test(f.name),
    );
    if (audioFiles.length === 0) return;

    const savedPlaylist = lsGet<SavedTrackMeta[]>(STORAGE_KEYS.playlist, []);

    const newTracks: LoadedTrack[] = audioFiles.map((f) => {
      const url = URL.createObjectURL(f);
      objectUrlsRef.current.push(url);
      return {
        name: stripExt(f.name),
        fileName: f.name,
        url,
        size: f.size,
        lastModified: f.lastModified,
        duration: 0,
      };
    });

    setTracks((prev) => {
      const wasEmpty = prev.length === 0;
      const combined = [...prev, ...newTracks];

      if (wasEmpty && shouldResumeRef.current && savedPlaylist.length > 0) {
        const reordered: LoadedTrack[] = [];
        const used = new Set<number>();
        for (const meta of savedPlaylist) {
          const matchIdx = combined.findIndex((t, i) =>
            !used.has(i) && t.fileName === meta.fileName && t.size === meta.fileSize
          );
          if (matchIdx >= 0) {
            reordered.push(combined[matchIdx]);
            used.add(matchIdx);
          }
        }
        combined.forEach((t, i) => { if (!used.has(i)) reordered.push(t); });

        const savedIdx = lsGet<number>(STORAGE_KEYS.currentTrack, 0);
        setTrackIndex(Math.min(savedIdx, reordered.length - 1));
        playedHistoryRef.current = [Math.min(savedIdx, reordered.length - 1)];
        shouldResumeRef.current = false;
        setNeedsReselect(false);
        return reordered;
      }

      if (wasEmpty) {
        setTrackIndex(0);
        playedHistoryRef.current = [0];
        setPlaying(true);
        setNeedsReselect(false);
      }
      return combined;
    });
  }, []);

  async function openFilePicker() {
    if ('showOpenFilePicker' in window) {
      try {
        const files = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [{
            description: 'Audio Files',
            accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'] },
          }],
        });
        const fileObjs: File[] = [];
        for (const handle of files) {
          try {
            const f = await handle.getFile();
            fileObjs.push(f);
          } catch { /* skip */ }
        }
        if (fileObjs.length > 0) handleFiles(fileObjs);
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    fileInputRef.current?.click();
  }

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }, []);

  const handleLoadedMeta = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
    setTracks((prev) => {
      if (prev[trackIndex]) {
        const updated = [...prev];
        updated[trackIndex] = { ...updated[trackIndex], duration: audio.duration || 0 };
        return updated;
      }
      return prev;
    });
  }, [trackIndex]);

  const handleEnded = useCallback(() => {
    if (repeat) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }
    if (tracks.length === 0) return;

    const nextIdx = pickNextTrack();
    playedHistoryRef.current = [...playedHistoryRef.current, nextIdx];
    setProgress(0);
    setTrackIndex(nextIdx);
    setPlaying(true);

    setTimeout(() => {
      const audio = audioRef.current;
      if (audio && playing) {
        audio.play().catch(() => {});
      }
    }, 100);
  }, [repeat, tracks.length, pickNextTrack, playing]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setProgress(audio.currentTime);
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    setProgress(0);
    const next = pickNextTrack();
    playedHistoryRef.current = [...playedHistoryRef.current, next];
    setTrackIndex(next);
    setPlaying(true);
  }

  function prevTrack() {
    if (tracks.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    setProgress(0);
    setTrackIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }

  function selectTrack(index: number) {
    setProgress(0);
    playedHistoryRef.current = [...playedHistoryRef.current, index];
    setTrackIndex(index);
    setPlaying(true);
  }

  function toggleShuffle() {
    setShuffle((prev) => {
      const newVal = !prev;
      if (newVal) {
        playedHistoryRef.current = playedHistoryRef.current.filter((h) => h !== trackIndex);
      } else {
        playedHistoryRef.current = [trackIndex];
      }
      return newVal;
    });
  }

  function removeTrack(index: number) {
    const url = tracks[index]?.url;
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
    }
    setTracks((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length === 0) {
        setPlaying(false);
        setProgress(0);
        setTrackIndex(0);
        setNeedsReselect(false);
        if (HAS_LS) {
          localStorage.removeItem(STORAGE_KEYS.playlist);
          localStorage.removeItem(STORAGE_KEYS.currentTrack);
          localStorage.removeItem(STORAGE_KEYS.position);
        }
      } else if (index === trackIndex) {
        setTrackIndex(Math.min(index, filtered.length - 1));
        setProgress(0);
      } else if (index < trackIndex) {
        setTrackIndex((i) => i - 1);
      }
      return filtered;
    });
  }

  function clearAll() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setTracks([]);
    setPlaying(false);
    setProgress(0);
    setTrackIndex(0);
    playedHistoryRef.current = [];
    setNeedsReselect(false);
    setShowPlaylist(false);
    if (HAS_LS) {
      localStorage.removeItem(STORAGE_KEYS.playlist);
      localStorage.removeItem(STORAGE_KEYS.currentTrack);
      localStorage.removeItem(STORAGE_KEYS.position);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        const btn = document.getElementById('music-float-btn');
        if (btn && btn.contains(target)) return;
        setOpen(false);
        setShowPlaylist(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,.opus"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <audio
        ref={audioRef}
        src={track?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMeta}
        preload="auto"
        onError={() => {
          if (track && tracks.length > 1) {
            const next = pickNextTrack();
            playedHistoryRef.current = [...playedHistoryRef.current, next];
            setTrackIndex(next);
            setProgress(0);
          } else {
            setPlaying(false);
          }
        }}
      />
      <audio ref={preloadRef} preload="auto" className="hidden" />

      <button
        id="music-float-btn"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg transition-opacity hover:opacity-100"
        style={{
          background: 'var(--color-primary)',
          opacity: open ? 1 : 0.6,
        }}
        aria-label="Music player"
      >
        <div className="relative">
          <Music size={18} />
          {playing && (
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
          )}
        </div>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-16 right-4 z-40 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Music Player</span>
            </div>
            <button onClick={() => { setOpen(false); setShowPlaylist(false); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={16} />
            </button>
          </div>

          {notice && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {needsReselect && tracks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FolderOpen size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Your playlist is ready. Tap Play to resume.</p>
              <p className="text-xs text-gray-400">Select your music folder again to restore your playlist and continue from where you left off.</p>
              <button
                onClick={openFilePicker}
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <Play size={14} /> Reselect Music
              </button>
            </div>
          ) : track ? (
            <>
              <div className="mb-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{track.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(track.size)}</p>
              </div>

              <div className="mb-1 mt-2 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" onClick={handleSeek}>
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
              </div>
              <div className="mb-3 flex justify-between text-[10px] text-gray-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button onClick={toggleShuffle} className="transition-colors" style={shuffle ? { color: 'var(--color-primary)' } : { color: '#9ca3af' }} title="Shuffle">
                  <Shuffle size={18} />
                </button>
                <button onClick={prevTrack} className="text-gray-600 dark:text-gray-300" title="Previous">
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={() => setPlaying((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                  style={{ background: 'var(--color-primary)' }}
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button onClick={nextTrack} className="text-gray-600 dark:text-gray-300" title="Next">
                  <SkipForward size={22} />
                </button>
                <button onClick={() => setRepeat((v) => !v)} className="transition-colors" style={repeat ? { color: 'var(--color-primary)' } : { color: '#9ca3af' }} title="Repeat">
                  <Repeat size={18} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Volume2 size={16} className="shrink-0 text-gray-400" />
                <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="flex-1 accent-current" style={{ color: 'var(--color-primary)' }} />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowPlaylist((v) => !v)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="Playlist"
                >
                  <ListMusic size={14} /> Playlist
                </button>
                <button
                  onClick={openFilePicker}
                  className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="Add more music"
                >
                  <FolderOpen size={14} /> Folder
                </button>
                {tracks.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    title="Clear all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {showPlaylist && tracks.length > 0 && (
                <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
                  {tracks.map((t, i) => (
                    <div
                      key={`${t.url}-${i}`}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                        i === trackIndex ? 'font-medium' : 'text-gray-600 dark:text-gray-400'
                      }`}
                      style={i === trackIndex ? { background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' } : undefined}
                    >
                      <button onClick={() => selectTrack(i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="w-4 shrink-0 text-right text-gray-400">{i + 1}</span>
                        {i === trackIndex && playing ? (
                          <Pause size={12} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                        ) : (
                          <Play size={12} className="shrink-0 text-gray-400" />
                        )}
                        <span className="truncate">{t.name}</span>
                      </button>
                      <span className="shrink-0 text-[10px] text-gray-400">{formatTime(t.duration)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTrack(i); }}
                        className="shrink-0 text-gray-300 hover:text-red-500 dark:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tracks.length > 0 && (
                <p className="mt-2 text-center text-[10px] text-gray-400">
                  {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  {shuffle ? ' · Shuffle ON' : ''}
                  {repeat ? ' · Repeat ON' : ''}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FolderOpen size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No music loaded yet.</p>
              <p className="text-xs text-gray-400">Click below to browse your device.</p>
              <button
                onClick={openFilePicker}
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >
                <FolderOpen size={14} /> Load Music
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
