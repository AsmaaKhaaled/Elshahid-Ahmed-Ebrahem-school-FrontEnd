import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { AssignmentsStore } from '../assignments/assignments.store';
import { TeachingScope } from '../teaching/teaching-scope.service';
import { StudentDashboardComponent } from './student-dashboard.component';

describe('StudentDashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs('STUDENT');
  });

  it('lists what is due for the class, soonest first, and drops it once handed in', () => {
    const fixture = TestBed.createComponent(StudentDashboardComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(AssignmentsStore).assignments.set([{
      id: 'a-1', title: 'واجب', description: '', subject: 'الرياضيات', teacherId: 't-1', section: '3/2',
      publishedAt: new Date().toISOString(), dueDate: new Date(Date.now() + 86400000).toISOString(),
      attachments: [], maxScore: 10, requiresSubmission: true, totalSubmissions: 0, ungradedSubmissions: 0, totalStudents: 40
    }]);

    const due = component.dueItems();
    expect(due.length).toBeGreaterThan(0);
    expect(due.map(i => i.due)).toEqual([...due.map(i => i.due)].sort());

    const assignment = due.find(i => i.kind === 'واجب')!;
    const scope = TestBed.inject(TeachingScope);
    TestBed.inject(AssignmentsStore).submissions.set([{
      id: 'mine', assignmentId: assignment.id, studentId: scope.studentId(), studentName: scope.studentName(),
      files: [], note: 'تم', submittedAt: new Date().toISOString(), score: null, feedback: ''
    }]);
    expect(component.dueItems().some(i => i.id === assignment.id)).toBeFalse();
  });

  it('shows no average before anything is graded', () => {
    const fixture = TestBed.createComponent(StudentDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.averageMark()).toBeNull();
  });
});
