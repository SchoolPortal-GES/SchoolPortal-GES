import { useEffect, useState } from 'react';
import { Save, Send, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNav } from '@/lib/nav-context';
import { AppShell, PageHeader } from './AppShell';
import { Alert, Button, EmptyState, Field, Modal, Spinner } from './ui';
import { fetchClasses, fetchPupils, upsertScore, upsertReportCard, setReportCardStatus, classLabel, type ClassRow, type PupilRow } from '@/lib/data';
import { supabase } from '@/lib/supabase';

interface SubjectRow { id: string; name: string; }
interface ScoreRow { class_score: number | null; exam_score: number | null; }
interface ReportCardRow { id: string; status: string; class_position: number | null; total_aggregate: number | null; average_score: number | null; }

const GHANA_GRADES = [
  { min: 80, grade: 'A', remark: 'Excellent' },
  { min: 70, grade: 'B', remark: 'Very Good' },
  { min: 60, grade: 'C', remark: 'Good' },
  { min: 50, grade: 'D', remark: 'Credit' },
  { min: 40, grade: 'E', remark: 'Pass' },
  { min: 0, grade: 'F', remark: 'Fail' },
];

function gradeFor(total: number) {
  return GHANA_GRADES.find((g) => total >= g.min) ?? GHANA_GRADES[GHANA_GRADES.length - 1];
}

export function AcademicRecordsScreen() {
  const { user } = useAuth();
  const { refreshKey } = useNav();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [pupils, setPupils] = useState<PupilRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [yearId, setYearId] = useState('');
  const [term, setTerm] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<PupilRow | null>(null);

  useEffect(() => {
    if (!user?.school_id) return;
    const schoolId = user.school_id;
    (async () => {
      try {
        const cls = await fetchClasses(schoolId);
        setClasses(cls);
        const { data: subs } = await supabase.from('subjects').select('id, name').eq('school_id', schoolId).eq('deleted', false);
        setSubjects((subs as SubjectRow[]) ?? []);
        const { data: ay } = await supabase.from('academic_years').select('id, current_term').eq('school_id', schoolId).eq('is_active', true).maybeSingle();
        if (ay) { setYearId(ay.id); setTerm(ay.current_term ?? 1); }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.school_id, refreshKey]);

  useEffect(() => {
    if (!selectedClass || !user?.school_id) return;
    const schoolId = user.school_id;
    (async () => {
      const p = await fetchPupils(schoolId, selectedClass);
      setPupils(p.filter((x) => x.is_active));
    })();
  }, [selectedClass, user?.school_id]);

  if (loading) return <AppShell title="Academic Records"><div className="flex justify-center py-12"><Spinner className="text-primary-600" /></div></AppShell>;

  return (
    <AppShell title="Academic Records">
      <PageHeader title="Academic Records" />
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="mb-4">
        <Field label="Class (primary filter)">
          <select className="input sm:w-72" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Select class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
          </select>
        </Field>
      </div>

      {!selectedClass && <EmptyState title="Select a class" message="Choose a class to view and enter academic records." />}

      {selectedClass && (
        <ScoreEntryTable pupils={pupils} subjects={subjects} classId={selectedClass} yearId={yearId} term={term} onReportCard={(p) => setReportModal(p)} />
      )}

      {reportModal && (
        <ReportCardModal
          pupil={reportModal}
          classId={selectedClass}
          yearId={yearId}
          term={term}
          onClose={() => setReportModal(null)}
        />
      )}
    </AppShell>
  );
}

function ScoreEntryTable({ pupils, subjects, classId, yearId, term, onReportCard }: {
  pupils: PupilRow[]; subjects: SubjectRow[]; classId: string; yearId: string; term: number; onReportCard: (p: PupilRow) => void;
}) {
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = (pid: string, sid: string) => `${pid}:${sid}`;

  useEffect(() => {
    if (!yearId) return;
    (async () => {
      const { data } = await supabase
        .from('scores')
        .select('pupil_id, subject_id, class_score, exam_score')
        .eq('class_id', classId)
        .eq('academic_year_id', yearId)
        .eq('term', term)
        .eq('deleted', false);
      const map: Record<string, ScoreRow> = {};
      (data as { pupil_id: string; subject_id: string; class_score: number | null; exam_score: number | null }[] | null)?.forEach((r) => {
        map[key(r.pupil_id, r.subject_id)] = { class_score: r.class_score, exam_score: r.exam_score };
      });
      setScores(map);
    })();
  }, [classId, yearId, term]);

  function setScore(pid: string, sid: string, field: 'class_score' | 'exam_score', val: string) {
    const num = val === '' ? null : Math.max(0, Math.min(field === 'class_score' ? 50 : 50, parseInt(val, 10) || 0));
    setScores((s) => ({ ...s, [key(pid, sid)]: { ...s[key(pid, sid) ?? ''], [field]: num } }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      for (const p of pupils) {
        for (const sub of subjects) {
          const sc = scores[key(p.id, sub.id)];
          if (sc && (sc.class_score !== null || sc.exam_score !== null)) {
            await upsertScore({ pupilId: p.id, subjectId: sub.id, classId, yearId, term, classScore: sc.class_score, examScore: sc.exam_score });
          }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save scores.');
    } finally {
      setSaving(false);
    }
  }

  if (subjects.length === 0) return <EmptyState title="No subjects" message="Ask the Headteacher to set up subjects for this school." />;
  if (pupils.length === 0) return <EmptyState title="No pupils" message="No active pupils in this class." />;

  return (
    <div>
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      {saved && <div className="mb-3"><Alert type="success">Scores saved.</Alert></div>}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">Enter class scores (out of 50) and exam scores (out of 50).</p>
        <Button onClick={handleSave} loading={saving}><Save size={16} /> Save Scores</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">Pupil</th>
              {subjects.map((s) => (
                <th key={s.id} className="px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                  {s.name}
                  <div className="text-xs font-normal text-gray-400">Class / Exam</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-300">Report Card</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pupils.map((p) => (
              <tr key={p.id}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900 dark:bg-gray-900 dark:text-gray-100">{p.full_name}</td>
                {subjects.map((s) => {
                  const sc = scores[key(p.id, s.id)];
                  return (
                    <td key={s.id} className="px-1 py-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="number" inputMode="numeric" min={0} max={50} placeholder="50"
                          className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-xs dark:border-gray-700 dark:bg-gray-800"
                          value={sc?.class_score ?? ''} onChange={(e) => setScore(p.id, s.id, 'class_score', e.target.value)}
                        />
                        <input
                          type="number" inputMode="numeric" min={0} max={50} placeholder="50"
                          className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-xs dark:border-gray-700 dark:bg-gray-800"
                          value={sc?.exam_score ?? ''} onChange={(e) => setScore(p.id, s.id, 'exam_score', e.target.value)}
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  <Button variant="secondary" className="text-xs" onClick={() => onReportCard(p)}><FileText size={14} /> Card</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportCardModal({ pupil, classId, yearId, term, onClose }: { pupil: PupilRow; classId: string; yearId: string; term: number; onClose: () => void }) {
  const { user } = useAuth();
  const [conduct, setConduct] = useState('');
  const [interests, setInterests] = useState('');
  const [ctRemarks, setCtRemarks] = useState('');
  const [card, setCard] = useState<ReportCardRow | null>(null);
  const [scores, setScores] = useState<{ subject_id: string; subject_name: string; class_score: number | null; exam_score: number | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sub } = await supabase.from('subjects').select('id, name').eq('deleted', false);
      const { data: sc } = await supabase.from('scores').select('subject_id, class_score, exam_score').eq('pupil_id', pupil.id).eq('academic_year_id', yearId).eq('term', term).eq('deleted', false);
      const scMap = new Map((sc as { subject_id: string; class_score: number | null; exam_score: number | null }[] | null)?.map((r) => [r.subject_id, r]) ?? []);
      setScores((sub as { id: string; name: string }[] | null)?.map((s) => ({
        subject_id: s.id, subject_name: s.name,
        class_score: scMap.get(s.id)?.class_score ?? null,
        exam_score: scMap.get(s.id)?.exam_score ?? null,
      })) ?? []);
      const { data: rc } = await supabase.from('report_cards').select('id, status, class_position, total_aggregate, average_score').eq('pupil_id', pupil.id).eq('academic_year_id', yearId).eq('term', term).maybeSingle();
      if (rc) setCard(rc as ReportCardRow);
    })();
  }, [pupil.id, yearId, term]);

  const totals = scores.map((s) => {
    const total = (s.class_score ?? 0) + (s.exam_score ?? 0);
    return { ...s, total, grade: gradeFor(total) };
  });
  const aggregate = totals.reduce((a, b) => a + b.total, 0);
  const avg = totals.length ? Math.round((aggregate / totals.length) * 10) / 10 : 0;

  const isAdmin = user?.role === 'super_admin' || user?.role === 'headteacher' || user?.role === 'assistant_headteacher';

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await upsertReportCard({ pupilId: pupil.id, classId, yearId, term, conduct, interests, ctRemarks, ctName: user?.full_name ?? '', ctContact: user?.phone ?? '' });
      setSuccess('Report card saved as draft.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!card) return;
    setSaving(true);
    try {
      if (status === 'sent_to_parents' && isAdmin) {
        await setReportCardStatus(card.id, status, undefined, '', user?.full_name ?? '', user?.phone ?? '');
      } else {
        await setReportCardStatus(card.id, status);
      }
      setSuccess(`Status changed to ${status}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Report Card — ${pupil.full_name}`}>
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      {success && <div className="mb-3"><Alert type="success">{success}</Alert></div>}
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-2 py-1.5 text-left">Subject</th>
                <th className="px-2 py-1.5 text-center">Class</th>
                <th className="px-2 py-1.5 text-center">Exam</th>
                <th className="px-2 py-1.5 text-center">Total</th>
                <th className="px-2 py-1.5 text-center">Grade</th>
                <th className="px-2 py-1.5 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {totals.map((t) => (
                <tr key={t.subject_id}>
                  <td className="px-2 py-1.5 font-medium text-gray-900 dark:text-gray-100">{t.subject_name}</td>
                  <td className="px-2 py-1.5 text-center">{t.class_score ?? '—'}</td>
                  <td className="px-2 py-1.5 text-center">{t.exam_score ?? '—'}</td>
                  <td className="px-2 py-1.5 text-center font-semibold">{t.total}</td>
                  <td className="px-2 py-1.5 text-center">{t.grade.grade}</td>
                  <td className="px-2 py-1.5 text-xs text-gray-500">{t.grade.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800"><p className="text-xs text-gray-500">Aggregate</p><p className="font-bold">{aggregate}</p></div>
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800"><p className="text-xs text-gray-500">Average</p><p className="font-bold">{avg.toFixed(1)}</p></div>
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800"><p className="text-xs text-gray-500">Position</p><p className="font-bold">{card?.class_position ?? '—'}</p></div>
        </div>
        <Field label="Conduct">
          <select className="input" value={conduct} onChange={(e) => setConduct(e.target.value)}>
            <option value="">Select…</option>
            {['Disciplined','Loyal','Cooperative','Hardworking','Recalcitrant','Punctual','Respectful','Excellent','Very Good','Good','Fair','Poor'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Interests">
          <select className="input" value={interests} onChange={(e) => setInterests(e.target.value)}>
            <option value="">Select…</option>
            {['Games','Reading and Writing','Arts','Science','Music','Sports'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Class Teacher's Remarks"><textarea className="input" rows={2} value={ctRemarks} onChange={(e) => setCtRemarks(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={handleSave} loading={saving}>Save Draft</Button>
        {card && card.status === 'draft' && <Button onClick={() => handleStatusChange('submitted')} loading={saving}><Send size={16} /> Submit</Button>}
        {card && card.status === 'submitted' && isAdmin && <Button onClick={() => handleStatusChange('approved')} loading={saving}><CheckCircle2 size={16} /> Approve</Button>}
        {card && card.status === 'approved' && isAdmin && <Button onClick={() => handleStatusChange('sent_to_parents')} loading={saving}><Send size={16} /> Send to Parents</Button>}
        {card && card.status === 'submitted' && isAdmin && <Button variant="danger" onClick={() => handleStatusChange('returned')} loading={saving}>Return</Button>}
      </div>
      {card && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Status: <span className="font-medium capitalize">{card.status.replace(/_/g, ' ')}</span>
          {card.status === 'sent_to_parents' && ' — permanently locked'}
        </p>
      )}
    </Modal>
  );
}
