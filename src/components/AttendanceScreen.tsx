import { useEffect, useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNav } from '@/lib/nav-context';
import { AppShell, PageHeader } from './AppShell';
import { Alert, Button, EmptyState, Spinner } from './ui';
import { fetchClasses, fetchPupils, fetchAttendance, markAttendance, classLabel, type ClassRow, type PupilRow } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export function AttendanceScreen() {
  const { user } = useAuth();
  const { refreshKey } = useNav();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [pupils, setPupils] = useState<PupilRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [yearId, setYearId] = useState<string>('');
  const [term, setTerm] = useState(1);

  useEffect(() => {
    if (!user?.school_id) return;
    const schoolId = user.school_id;
    (async () => {
      try {
        const cls = await fetchClasses(schoolId);
        let myClassIds: string[] | null = null;
        if (user.role === 'staff') {
          const { data } = await supabase
            .from('staff_appointments')
            .select('class_id')
            .eq('staff_id', user.id)
            .eq('appointment_type', 'class_teacher')
            .eq('deleted', false);
          myClassIds = (data as { class_id: string }[] | null)?.map((r) => r.class_id) ?? [];
        }
        const visible = myClassIds ? cls.filter((c) => myClassIds!.includes(c.id)) : cls;
        setClasses(visible);
        const { data: ay } = await supabase
          .from('academic_years')
          .select('id, current_term')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .eq('deleted', false)
          .maybeSingle();
        if (ay) { setYearId(ay.id); setTerm(ay.current_term ?? 1); }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.school_id, user?.id, user?.role, refreshKey]);

  useEffect(() => {
    if (!selectedClass || !user?.school_id) return;
    const schoolId = user.school_id;
    (async () => {
      const p = await fetchPupils(schoolId, selectedClass);
      setPupils(p.filter((x) => x.is_active));
      const existing = await fetchAttendance(selectedClass, date);
      setMarks(existing);
    })();
  }, [selectedClass, date, user?.school_id]);

  const isPast = date < new Date().toISOString().slice(0, 10);

  function setMark(pupilId: string, status: string) {
    if (isPast) return;
    setMarks((m) => ({ ...m, [pupilId]: status }));
  }

  async function handleSave() {
    if (!selectedClass || !yearId) { setError('Select a class and ensure an academic year is active.'); return; }
    setSaving(true);
    setError(null);
    try {
      const records = pupils.map((p) => ({ pupil_id: p.id, status: marks[p.id] ?? 'present' }));
      await markAttendance(selectedClass, date, yearId, term, records);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AppShell title="Attendance"><div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div></AppShell>;
  }

  return (
    <AppShell title="Attendance">
      <PageHeader title="Mark Attendance" />
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">Attendance saved.</Alert></div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select className="input sm:w-56" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
        </select>
        <input type="date" className="input sm:w-48" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
      </div>

      {isPast && (
        <div className="mb-4"><Alert type="warning">Past attendance records cannot be edited after the day has passed.</Alert></div>
      )}

      {selectedClass && pupils.length === 0 && (
        <EmptyState title="No pupils" message="No active pupils in this class." />
      )}

      {pupils.length > 0 && (
        <div className="space-y-2">
          {pupils.map((p) => (
            <div key={p.id} className="card flex items-center justify-between p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">{p.full_name}</p>
                <p className="text-xs text-gray-500">{p.admission_number ?? '—'}</p>
              </div>
              <div className="flex gap-1">
                {(['present', 'absent', 'late'] as const).map((st) => {
                  const active = (marks[p.id] ?? 'present') === st;
                  const color = st === 'present' ? 'green' : st === 'absent' ? 'red' : 'amber';
                  return (
                    <button
                      key={st}
                      onClick={() => setMark(p.id, st)}
                      disabled={isPast}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                        active
                          ? color === 'green' ? 'bg-green-600 text-white' : color === 'red' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                          : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {st === 'present' && <Check size={14} />}
                      {st === 'absent' && <X size={14} />}
                      {st === 'late' && <Clock size={14} />}
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Button onClick={handleSave} loading={saving} disabled={isPast} className="w-full">Save Attendance</Button>
        </div>
      )}
    </AppShell>
  );
}
