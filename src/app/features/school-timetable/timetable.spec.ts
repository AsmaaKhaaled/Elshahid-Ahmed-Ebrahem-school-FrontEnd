import { Teacher, slotKey } from '../teachers/teacher.model';
import { WEEKLY_SLOTS, buildSchoolTimetable, findConflicts, sectionCoverage } from './timetable';

const teacher = (id: string, name: string): Teacher => ({
  id, name, nationalId: '', title: '', specialization: '', email: '', phone: '', subjects: [], classes: [], assignments: [], status: 'على رأس العمل', active: true
});

const SECTIONS = ['1/1', '3/1', '3/2'];

describe('school timetable', () => {
  const teachers = [teacher('1', 'محمود الشناوي'), teacher('2', 'نادية الشربيني')];

  it('turns the teachers’ schedules into one timetable per class', () => {
    const timetable = buildSchoolTimetable(teachers, {
      '1': { [slotKey(0, 0)]: { subject: 'الرياضيات', section: '3/1' }, [slotKey(0, 1)]: { subject: 'الرياضيات', section: '3/2' } },
      '2': { [slotKey(0, 1)]: { subject: 'اللغة الإنجليزية', section: '3/1' } }
    }, SECTIONS);

    expect(Object.keys(timetable)).toEqual(SECTIONS);
    expect(timetable['3/1'][slotKey(0, 0)]).toEqual([{ teacherId: '1', teacherName: 'أ. محمود الشناوي', subject: 'الرياضيات' }]);
    expect(timetable['3/1'][slotKey(0, 1)][0].subject).toBe('اللغة الإنجليزية');
    expect(timetable['3/2'][slotKey(0, 1)][0].teacherId).toBe('1');
    expect(findConflicts(timetable)).toEqual([]);
  });

  it('reports two teachers in the same class and period as a conflict', () => {
    const timetable = buildSchoolTimetable(teachers, {
      '1': { [slotKey(2, 3)]: { subject: 'الرياضيات', section: '1/1' } },
      '2': { [slotKey(2, 3)]: { subject: 'اللغة الإنجليزية', section: '1/1' } }
    }, SECTIONS);

    const [conflict, ...rest] = findConflicts(timetable);
    expect(rest).toEqual([]);
    expect(conflict.section).toBe('1/1');
    expect(conflict.day).toBe(2);
    expect(conflict.period).toBe(3);
    expect(conflict.lessons.map(l => l.teacherId)).toEqual(['1', '2']);
  });

  it('counts the free periods of each class', () => {
    const timetable = buildSchoolTimetable(teachers, {
      '1': { [slotKey(0, 0)]: { subject: 'الرياضيات', section: '2/2' }, [slotKey(1, 0)]: { subject: 'الرياضيات', section: '2/2' } },
      // A conflicting slot still counts once
      '2': { [slotKey(0, 0)]: { subject: 'اللغة الإنجليزية', section: '2/2' } }
    }, SECTIONS);

    const coverage = sectionCoverage(timetable).find(c => c.section === '2/2')!;
    expect(coverage).toEqual({ section: '2/2', filled: 2, free: WEEKLY_SLOTS - 2 });
    expect(sectionCoverage(timetable).find(c => c.section === '1/1')!.free).toBe(WEEKLY_SLOTS);
  });
});
