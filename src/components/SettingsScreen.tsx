import { useState } from 'react';
import { Check, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAppearance, type ThemeColor, type FontSize, type AppMode, type Language } from '@/lib/appearance-context';
import { useNav } from '@/lib/nav-context';
import { AppShell, PageHeader } from './AppShell';
import { Alert, Button } from './ui';
import { supabase } from '@/lib/supabase';

const THEMES: { id: ThemeColor; label: string; color: string }[] = [
  { id: 'green', label: 'Green', color: '#15803d' },
  { id: 'blue', label: 'Blue', color: '#1d4ed8' },
  { id: 'purple', label: 'Purple', color: '#6d28d9' },
  { id: 'orange', label: 'Orange', color: '#c2410c' },
  { id: 'red', label: 'Red', color: '#b91c1c' },
];

const FONT_SIZES: { id: FontSize; label: string; px: number }[] = [
  { id: 'xs', label: 'Extra Small', px: 14 },
  { id: 'sm', label: 'Small', px: 15 },
  { id: 'md', label: 'Medium', px: 16 },
  { id: 'lg', label: 'Large', px: 18 },
  { id: 'xl', label: 'Extra Large', px: 20 },
];

const MODES: { id: AppMode; label: string }[] = [
  { id: 'light', label: 'Light Mode' },
  { id: 'dark', label: 'Dark Mode' },
  { id: 'system', label: 'System Default' },
];

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'tw', label: 'Twi (Akan)', flag: '🇬🇭' },
];

export function SettingsScreen() {
  const { appearance, setAppearance, save } = useAppearance();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await save();
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
  }

  return (
    <AppShell title="Settings">
      <PageHeader title="Settings" action={<Button onClick={handleSave}>Save</Button>} />
      {saved && (
        <div className="mb-4">
          <Alert type="success">Your settings have been saved.</Alert>
        </div>
      )}

      <div className="space-y-6">
        <section className="card p-4">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Theme</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => setAppearance({ theme: th.id })}
                className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition ${
                  appearance.theme === th.id ? 'border-primary-500' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="h-8 w-8 rounded-full" style={{ background: th.color }} />
                <span className="text-xs text-gray-700 dark:text-gray-300">{th.label}</span>
                {appearance.theme === th.id && <Check className="absolute right-1 top-1 text-primary-600" size={14} />}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Display Mode</h3>
          <div className="flex flex-wrap gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setAppearance({ mode: m.id })}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  appearance.mode === m.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Font Size</h3>
          <div className="space-y-2">
            {FONT_SIZES.map((f) => (
              <button
                key={f.id}
                onClick={() => setAppearance({ fontSize: f.id })}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition ${
                  appearance.fontSize === f.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: `${f.px}px` }}>
                  {f.label}
                </span>
                {appearance.fontSize === f.id && <Check className="text-primary-600" size={18} />}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Live preview: The quick brown fox jumps over the lazy dog. 0123456789
          </p>
        </section>

        <FontLanguageLinks />
      </div>
    </AppShell>
  );
}

function FontLanguageLinks() {
  const { navigate } = useNav();
  const { user } = useAuth();
  return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {user?.role === 'headteacher' && (
          <button
            onClick={() => navigate('district-data-sharing')}
            className="card flex items-center justify-between p-4 text-left transition hover:border-primary-400"
          >
            <span className="font-medium text-gray-900 dark:text-gray-100">District Data Sharing</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Manage ›</span>
          </button>
        )}
        <button
        onClick={() => navigate('wallpaper')}
        className="card flex items-center justify-between p-4 text-left transition hover:border-primary-400"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">Wallpaper</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Customize ›</span>
      </button>
      <button
        onClick={() => navigate('language')}
        className="card flex items-center justify-between p-4 text-left transition hover:border-primary-400"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">Language</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Switch ›</span>
      </button>
      <button
        onClick={() => navigate('profile')}
        className="card flex items-center justify-between p-4 text-left transition hover:border-primary-400"
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">Profile Picture</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Change ›</span>
      </button>
    </div>
  );
}

export function WallpaperScreen() {
  const { appearance, setAppearance, save, wallpaperOptions } = useAppearance();
  const [saved, setSaved] = useState(false);

  return (
    <AppShell title="Wallpaper">
      <PageHeader
        title="Wallpaper"
        action={
          <Button
            onClick={async () => {
              await save();
              setSaved(true);
              setTimeout(() => setSaved(false), 5000);
            }}
          >
            Save
          </Button>
        }
      />
      {saved && <Alert type="success">Wallpaper saved.</Alert>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {wallpaperOptions.map((w) => (
          <button
            key={w.id}
            onClick={() => setAppearance({ wallpaper: w.id })}
            className={`relative overflow-hidden rounded-xl border-2 p-4 transition ${
              appearance.wallpaper === w.id ? 'border-primary-500' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div
              className="mb-2 h-16 rounded-lg"
              style={{
                background:
                  w.id === 'default' ? '#f8fafc' : getWallpaperPreview(w.id),
              }}
            />
            <p className="text-left text-xs capitalize text-gray-700 dark:text-gray-300">
              {w.label}
            </p>
            {appearance.wallpaper === w.id && <Check className="absolute right-2 top-2 text-primary-600" size={16} />}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        An automatic opacity overlay keeps all text readable regardless of the wallpaper you choose.
      </p>
    </AppShell>
  );
}

function getWallpaperPreview(id: string): string {
  const map: Record<string, string> = {
    solid_slate: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    solid_green: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    solid_blue: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    gradient_emerald: 'linear-gradient(135deg, #10b981, #059669)',
    gradient_sky: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    gradient_sunset: 'linear-gradient(135deg, #f97316, #db2777)',
    pattern_dots: 'radial-gradient(#cbd5e1 1px, transparent 1px) 0 0/10px 10px, #f8fafc',
    pattern_grid: 'repeating-linear-gradient(0deg,#e2e8f0 0 1px,transparent 1px 12px),repeating-linear-gradient(90deg,#e2e8f0 0 1px,transparent 1px 12px),#f8fafc',
    nature_forest: 'linear-gradient(135deg, #166534, #14532d)',
    abstract_wave: 'linear-gradient(135deg, #1e293b, #0f172a)',
  };
  return map[id] ?? '#f8fafc';
}

export function LanguageScreen() {
  const { appearance, setAppearance, save } = useAppearance();
  const [saved, setSaved] = useState(false);
  return (
    <AppShell title="Language">
      <PageHeader title="Language" />
      <div className="space-y-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            onClick={async () => {
              setAppearance({ language: l.id });
              await save();
              setSaved(true);
              setTimeout(() => setSaved(false), 5000);
            }}
            className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition ${
              appearance.language === l.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="flex items-center gap-3 font-medium text-gray-900 dark:text-gray-100">
              <span className="text-2xl">{l.flag}</span>
              {l.label}
              {l.id === 'en' && <span className="text-xs text-gray-400">(Default)</span>}
            </span>
            {appearance.language === l.id && <Check className="text-primary-600" size={20} />}
          </button>
        ))}
        <p className="mt-4 rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          More languages coming soon.
        </p>
        {saved && <Alert type="success">Language switched instantly.</Alert>}
      </div>
    </AppShell>
  );
}

export function ProfileScreen() {
  const { user, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function uploadFile(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw new Error('Could not upload image.');
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);
      await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (!user) return;
    setAvatarUrl('');
    await supabase.from('users').update({ avatar_url: null }).eq('id', user.id);
    await refresh();
  }

  const initial = (user?.full_name || '?').charAt(0).toUpperCase();

  return (
    <AppShell title="Profile Picture">
      <PageHeader title="Profile Picture" />
      {saved && <Alert type="success">Profile picture updated.</Alert>}
      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-32 w-32 rounded-full object-cover ring-4 ring-primary-200" />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full text-5xl font-bold text-white ring-4 ring-primary-200"
              style={{ background: 'var(--color-primary)' }}
            >
              {initial}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-800">
            <Camera size={18} className="text-gray-700 dark:text-gray-200" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <label className="btn-secondary cursor-pointer">
            <Camera size={16} /> Take/Choose Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
              }}
            />
          </label>
          <Button variant="secondary" onClick={removePhoto} disabled={!avatarUrl || uploading}>
            <Trash2 size={16} /> Remove Photo
          </Button>
        </div>
        {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
      </div>
    </AppShell>
  );
}
