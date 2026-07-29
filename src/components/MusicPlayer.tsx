import { useEffect, useRef, useState, useCallback } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, X, FolderOpen, Trash2, FileAudio, AlertCircle } from 'lucide-react';

interface LoadedTrack {
  name: string;
  url: string;
  size: number;
  fileName: string;
}

interface SavedSession {
  trackIndex: number;
  position: number;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
  trackNames: string[];
  hasPrevious: boolean;
}

const STORAGE_KEY = 'music_player_session';
const FOLDER_KEY = 'music_player_folder_name';

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

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSession;
  } catch { return null; }
}

function saveSession(data: SavedSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 56, y: window.innerHeight - 120 });
  const [tracks, setTracks] = useState<LoadedTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [missingFile, setMissingFile] = useState<string | null>(null);
  const [hasResumeSession, setHasResumeSession] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const playedHistoryRef = useRef<number[]>([]);
  const savingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumePositionRef = useRef<number>(0);
  const shouldResumeRef = useRef<boolean>(false);

  const track = tracks[trackIndex];

  // Load saved session on mount
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setShuffle(saved.shuffle);
      setRepeat(saved.repeat);
      setVolume(saved.volume);
      resumePositionRef.current = saved.position;
      shouldResumeRef.current = true;
      setHasResumeSession(true);
    }
  }, []);

  // Auto-load: try to reload from remembered folder on desktop
  useEffect(() => {
    if (autoLoaded) return;
    setAutoLoaded(true);
    const saved = loadSession();
    const savedFolder = localStorage.getItem(FOLDER_KEY);
    if (savedFolder && saved) {
      // On desktop browsers that support showDirectoryPicker, we can try to re-open
      // But permissions don't persist across sessions for security reasons.
      // We show the resume indicator and let the user tap to re-select the folder.
      // The file names are remembered so we can match them.
      setHasResumeSession(true);
    }
  }, [autoLoaded]);

  // Volume control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

  // Play/pause control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, trackIndex, track]);

  // Save session periodically while playing
  useEffect(() => {
    if (savingTimerRef.current) clearInterval(savingTimerRef.current);
    if (playing && track) {
      savingTimerRef.current = setInterval(() => {
        const audio = audioRef.current;
        saveSession({
          trackIndex,
          position: audio?.currentTime ?? 0,
          shuffle,
          repeat,
          volume,
          trackNames: tracks.map((t) => t.fileName),
          hasPrevious: true,
        });
      }, 3000);
    }
    return () => { if (savingTimerRef.current) clearInterval(savingTimerRef.current); };
  }, [playing, track, trackIndex, shuffle, repeat, volume, tracks]);

  // Save session on unmount/page unload
  useEffect(() => {
    function handleUnload() {
      const audio = audioRef.current;
      if (track) {
        saveSession({
          trackIndex,
          position: audio?.currentTime ?? 0,
          shuffle,
          repeat,
          volume,
          trackNames: tracks.map((t) => t.fileName),
          hasPrevious: true,
        });
      }
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [track, trackIndex, shuffle, repeat, volume, tracks]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|webm|opus)$/i.test(f.name),
    );
    if (audioFiles.length === 0) return;

    const saved = loadSession();
    const savedNames = saved?.trackNames ?? [];

    const newTracks = audioFiles.map((f) => {
      const url = URL.createObjectURL(f);
      objectUrlsRef.current.push(url);
      return {
        name: f.name.replace(/\.[^.]+$/, ''),
        fileName: f.name,
        url,
        size: f.size,
      };
    });

    setTracks((prev) => {
      const combined = [...prev, ...newTracks];
      const wasEmpty = prev.length === 0;

      // Try to resume from saved session
      if (wasEmpty && shouldResumeRef.current && saved && savedNames.length > 0) {
        const matchIdx = combined.findIndex((t) => t.fileName === savedNames[saved.trackIndex]);
        if (matchIdx >= 0) {
          setTrackIndex(matchIdx);
          setProgress(saved.position);
          playedHistoryRef.current = [matchIdx];
          shouldResumeRef.current = false;
        } else {
          // Saved track not found — skip to next available
          setMissingFile(savedNames[saved.trackIndex] ?? null);
          setTrackIndex(0);
          shouldResumeRef.current = false;
        }
      } else if (wasEmpty) {
        setTrackIndex(0);
        playedHistoryRef.current = [0];
        setPlaying(true);
      }
      return combined;
    });
  }, []);

  // Auto-play when track changes and we have a resume position
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (shouldResumeRef.current === false && resumePositionRef.current > 0 && progress === 0) {
      audio.currentTime = resumePositionRef.current;
      setProgress(resumePositionRef.current);
      resumePositionRef.current = 0;
    }
  }, [track, progress]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }, []);

  const pickNextTrack = useCallback((): number => {
    if (tracks.length === 0) return 0;
    if (tracks.length === 1) return 0;

    if (shuffle) {
      // Pick random unplayed track
      const unplayed = tracks.map((_, i) => i).filter((i) => !playedHistoryRef.current.includes(i));
      if (unplayed.length === 0) {
        // All played — reshuffle
        playedHistoryRef.current = [trackIndex];
        const candidates = tracks.map((_, i) => i).filter((i) => i !== trackIndex);
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      return unplayed[Math.floor(Math.random() * unplayed.length)];
    } else {
      return (trackIndex + 1) % tracks.length;
    }
  }, [tracks.length, trackIndex, shuffle]);

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
    // Ensure playback continues
    setPlaying(true);
  }, [repeat, tracks.length, pickNextTrack]);

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
  }

  function prevTrack() {
    if (tracks.length === 0) return;
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
        // Shuffle ON: randomize remaining unplayed tracks
        playedHistoryRef.current = playedHistoryRef.current.filter((h) => h !== trackIndex);
      } else {
        // Shuffle OFF: resume sequential from current
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
    setHasResumeSession(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const x = Math.max(0, Math.min(window.innerWidth - 44, e.clientX - dragRef.current.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 44, e.clientY - dragRef.current.dy));
    setPos({ x, y });
  }
  function onPointerUp() { dragRef.current = null; }

  function handleResumeClick() {
    if (hasResumeSession && tracks.length === 0) {
      // Need to re-select folder
      fileInputRef.current?.click();
    } else if (hasResumeSession && tracks.length > 0) {
      setPlaying(true);
    } else {
      setOpen((v) => !v);
    }
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const panelLeft = Math.min(pos.x - 230, window.innerWidth - 300);
  const panelTop = Math.max(10, pos.y - 210);
  const showResumeIndicator = hasResumeSession && !playing;

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
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a non-standard attribute
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
          if (e.target.files && e.target.files.length > 0) {
            const folder = (e.target.files[0] as any).webkitRelativePath?.split('/')[0];
            if (folder) localStorage.setItem(FOLDER_KEY, folder);
          }
        }}
      />
      <audio
        ref={audioRef}
        src={track?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        onError={() => {
          if (track) {
            setMissingFile(track.fileName);
            // Skip to next track automatically
            if (tracks.length > 1) {
              const next = pickNextTrack();
              playedHistoryRef.current = [...playedHistoryRef.current, next];
              setTrackIndex(next);
              setProgress(0);
            } else {
              setPlaying(false);
            }
          }
        }}
      />

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleResumeClick}
        className="fixed z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ left: pos.x, top: pos.y, background: 'var(--color-primary)', touchAction: 'none' }}
        aria-label="Music player"
      >
        <div className="relative">
          <Music size={20} className={playing ? 'animate-pulse-ring' : ''} />
          {showResumeIndicator && (
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          )}
        </div>
      </button>

      {open && (
        <div
          className="fixed z-40 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
          style={{ left: panelLeft, top: panelTop }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileAudio size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Music Player</span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={16} />
            </button>
          </div>

          {missingFile && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>Previous song "{missingFile}" not found. Playing next available track.</span>
            </div>
          )}

          {track ? (
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
            </>
          ) : hasResumeSession ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FolderOpen size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Resume your last session</p>
              <p className="text-xs text-gray-400">Select your music folder to restore your playlist and continue from where you left off.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FolderOpen size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No music loaded yet.</p>
              <p className="text-xs text-gray-400">Click below to browse your device.</p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <FolderOpen size={14} /> Load Music
            </button>
            <button
              onClick={() => dirInputRef.current?.click()}
              className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              title="Select entire folder"
            >
              <FileAudio size={14} /> Folder
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

          {tracks.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
              {tracks.map((t, i) => (
                <div
                  key={`${t.url}-${i}`}
                  className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                    i === trackIndex ? 'font-medium' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  style={i === trackIndex ? { background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' } : undefined}
                >
                  <button onClick={() => selectTrack(i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {i === trackIndex && playing ? (
                      <Pause size={12} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
                    ) : (
                      <Play size={12} className="shrink-0 text-gray-400" />
                    )}
                    <span className="truncate">{t.name}</span>
                  </button>
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
              {tracks.length} track{tracks.length !== 1 ? 's' : ''} loaded
              {shuffle ? ' · Shuffle ON' : ''}
              {repeat ? ' · Repeat ON' : ''}
            </p>
          )}
        </div>
      )}
    </>
  );
}
