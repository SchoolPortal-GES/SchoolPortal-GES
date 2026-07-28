import { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, X, Folder } from 'lucide-react';

interface Track {
  title: string;
  artist: string;
  url: string;
}

const TRACKS: Track[] = [
  { title: 'Ambient Study', artist: 'Sample Audio', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3' },
  { title: 'Relaxation Bell', artist: 'Sample Audio', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
  { title: 'Notification Chime', artist: 'Sample Audio', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-06.mp3' },
];

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 56, y: window.innerHeight - 120 });
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = TRACKS[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, trackIndex]);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }

  function handleEnded() {
    if (repeat) {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      return;
    }
    if (shuffle) {
      setTrackIndex(Math.floor(Math.random() * TRACKS.length));
    } else {
      setTrackIndex((i) => (i + 1) % TRACKS.length);
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setProgress(audio.currentTime);
  }

  function formatTime(s: number): string {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function nextTrack() {
    setProgress(0);
    if (shuffle) {
      setTrackIndex(Math.floor(Math.random() * TRACKS.length));
    } else {
      setTrackIndex((i) => (i + 1) % TRACKS.length);
    }
  }

  function prevTrack() {
    setProgress(0);
    setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
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

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        crossOrigin="anonymous"
      />

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => setOpen((v) => !v)}
        className="fixed z-40 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
        style={{ left: pos.x, top: pos.y, background: 'var(--color-primary)', touchAction: 'none' }}
        aria-label="Music player"
      >
        <Music size={20} className={playing ? 'animate-pulse-ring' : ''} />
      </button>

      {open && (
        <div
          className="fixed z-40 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
          style={{ left: Math.min(pos.x - 230, window.innerWidth - 290), top: Math.max(10, pos.y - 200) }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{track.title}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{track.artist}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
          </div>

          <div className="mb-1 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" onClick={handleSeek}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
          </div>
          <div className="mb-2 flex justify-between text-[10px] text-gray-400">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShuffle((v) => !v)} className={shuffle ? 'text-primary-600' : 'text-gray-400'} style={shuffle ? { color: 'var(--color-primary)' } : undefined}><Shuffle size={18} /></button>
            <button onClick={prevTrack} className="text-gray-600 dark:text-gray-300"><SkipBack size={22} /></button>
            <button onClick={() => setPlaying((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: 'var(--color-primary)' }}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={nextTrack} className="text-gray-600 dark:text-gray-300"><SkipForward size={22} /></button>
            <button onClick={() => setRepeat((v) => !v)} className={repeat ? 'text-primary-600' : 'text-gray-400'} style={repeat ? { color: 'var(--color-primary)' } : undefined}><Repeat size={18} /></button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Volume2 size={16} className="text-gray-400" />
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="flex-1" />
          </div>
          <button onClick={nextTrack} className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-gray-500">
            <Folder size={14} /> Next Track
          </button>
        </div>
      )}
    </>
  );
}
