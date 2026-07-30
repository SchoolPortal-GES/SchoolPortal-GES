import { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNav } from '@/lib/nav-context';
import { AppShell, PageHeader } from './AppShell';
import { Alert, Button, Modal, Spinner } from './ui';
import { CLASS_ORDER } from '@/lib/constants';
import {
  fetchClasses, buildClassSet, saveClasses, toggleDoubleStream,
  type ClassRow,
} from '@/lib/data';

export function ClassRegistration() {
  const { user } = useAuth();
  const { refresh } = useNav();
  const [existing, setExisting] = useState<ClassRow[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [doubleStream, setDoubleStream] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmMergeRow, setConfirmMergeRow] = useState<ClassRow | null>(null);

  useEffect(() => {
    if (!user?.school_id) return;
    const schoolId = user.school_id;
    (async () => {
      try {
        const rows = await fetchClasses(schoolId);
        setExisting(rows);
        const en = new Set<string>();
        const ds = new Set<string>();
        rows.forEach((r) => {
          en.add(r.name);
          if (r.double_stream) ds.add(r.name);
        });
        setEnabled(en);
        setDoubleStream(ds);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load classes.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.school_id]);

  async function handleSave() {
    if (!user?.school_id) return;
    const schoolId = user.school_id;
    setSaving(true);
    setError(null);
    try {
      const rows = buildClassSet(existing, enabled, doubleStream);
      await saveClasses(schoolId, rows);
      const fresh = await fetchClasses(schoolId);
      setExisting(fresh);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save classes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStream(row: ClassRow) {
    if (!user?.school_id) return;
    const schoolId = user.school_id;
    if (row.double_stream) {
      setConfirmMergeRow(row);
      return;
    }
    try {
      setError(null);
      await toggleDoubleStream(row.id, true);
      const fresh = await fetchClasses(schoolId);
      setExisting(fresh);
      setDoubleStream((prev) => new Set([...prev, row.name]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not toggle stream.');
    }
  }

  async function doMerge() {
    if (!confirmMergeRow || !user?.school_id) return;
    const schoolId = user.school_id;
    try {
      await toggleDoubleStream(confirmMergeRow.id, false);
      const fresh = await fetchClasses(schoolId);
      setExisting(fresh);
      setDoubleStream((prev) => {
        const n = new Set(prev);
        n.delete(confirmMergeRow.name);
        return n;
      });
      setConfirmMergeRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not merge streams.');
    }
  }

  if (loading) {
    return (
      <AppShell title="Class Registration">
        <div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Class Registration">
      <PageHeader
        title="Class Registration"
        action={<Button onClick={handleSave} loading={saving}>Save Classes</Button>}
      />
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">Classes saved.</Alert></div>}

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Tick the classes for your school. Toggle double stream to split a class into A and B. The order shown is enforced everywhere in the app.
      </p>

      <div className="space-y-2">
        {CLASS_ORDER.map((name) => {
          const isEnabled = enabled.has(name);
          const isDS = doubleStream.has(name);
          return (
            <div key={name} className={`card flex items-center justify-between p-3 ${!isEnabled ? 'opacity-60' : ''}`}>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => {
                    const n = new Set(enabled);
                    if (e.target.checked) n.add(name);
                    else {
                      n.delete(name);
                      const ds = new Set(doubleStream);
                      ds.delete(name);
                      setDoubleStream(ds);
                    }
                    setEnabled(n);
                  }}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
                {isDS && (
                  <span className="flex gap-1">
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">A</span>
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">B</span>
                  </span>
                )}
              </label>
              {isEnabled && (
                <button
                  onClick={() => {
                    const row = existing.find((r) => r.name === name && (isDS ? r.stream === 'A' : r.stream === null));
                    if (row) handleToggleStream(row);
                    else {
                      const ds = new Set(doubleStream);
                      if (ds.has(name)) ds.delete(name); else ds.add(name);
                      setDoubleStream(ds);
                    }
                  }}
                  className={`flex items-center gap-1 text-xs font-medium ${
                    isDS ? 'text-green-700 dark:text-green-300' : 'text-gray-500'
                  }`}
                >
                  {isDS ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  Double Stream {isDS ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={!!confirmMergeRow} onClose={() => setConfirmMergeRow(null)} title="Merge streams?">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will permanently merge both streams and all records for <strong>{confirmMergeRow?.name}</strong>. This cannot be undone. Are you sure?
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmMergeRow(null)}>Cancel</Button>
          <Button variant="danger" onClick={doMerge}>Confirm Merge</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
