import { useEffect, useRef, useState, useCallback } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, X, FolderOpen, Trash2, FileAudio } from 'lucide-react';

interface LoadedTrack {
  name: string;
  url: string;
  size: number;
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
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const track = tracks[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

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
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const audioFiles = Array.from(files).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(f.name));
    if (audioFiles.length === 0) return;
    const newTracks = audioFiles.map((f) => {
      const url = URL.createObjectURL(f);
      objectUrlsRef.current.push(url);
      return { name: f.name.replace(/\.[^.]+$/, ''), url, size: f.size };
    });
    setTracks((prev) => {
      const wasEmpty = prev.length === 0;
      const combined = [...prev, ...newTracks];
      if (wasEmpty && combined.length > 0) {
        setPlaying(true);
      }
      return combined;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }, []);

  const handleEnded = useCallback(() => {
    if (repeat) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }
    if (tracks.length <= 1) {
      setPlaying(false);
      setProgress(0);
      return;
    }
    if (shuffle) {
      let next = Math.floor(Math.random() * tracks.length);
      if (next === trackIndex) next = (next + 1) % tracks.length;
      setTrackIndex(next);
    } else {
      setTrackIndex((i) => (i + 1) % tracks.length);
    }
  }, [repeat, shuffle, tracks.length, trackIndex]);

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
    if (shuffle) {
      let next = Math.floor(Math.random() * tracks.length);
      if (next === trackIndex) next = (next + 1) % tracks.length;
      setTrackIndex(next);
    } else {
      setTrackIndex((i) => (i + 1) % tracks.length);
    }
  }

  function prevTrack() {
    if (tracks.length === 0) return;
    setProgress(0);
    setTrackIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }

  function selectTrack(index: number) {
    setProgress(0);
    setTrackIndex(index);
    setPlaying(true);
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
  function onPointerUp() {
    dragRef.current = null;
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const panelLeft = Math.min(pos.x - 230, window.innerWidth - 300);
  const panelTop = Math.max(10, pos.y - 210);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm"
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
        onLoadedMetadata={handleTimeUpdate}
      />

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => setOpen((v) => !v)}
        className="fixed z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
        style={{ left: pos.x, top: pos.y, background: 'var(--color-primary)', touchAction: 'none' }}
        aria-label="Music player"
      >
        <Music size={20} className={playing ? 'animate-pulse-ring' : ''} />
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
                <button onClick={() => setShuffle((v) => !v)} className="transition-colors" style={shuffle ? { color: 'var(--color-primary)' } : { color: '#9ca3af' }} title="Shuffle">
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
                    i === trackIndex
                      ? 'font-medium'
                      : 'text-gray-600 dark:text-gray-400'
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
            </p>
          )}
        </div>
      )}
    </>
  );
}
