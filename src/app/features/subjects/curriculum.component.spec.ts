import { ComponentFixture, TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { Curriculum } from './curriculum.model';
import { CurriculumStore } from './curriculum.store';
import { CurriculumComponent } from './curriculum.component';

describe('CurriculumComponent', () => {
  let component: CurriculumComponent;
  let fixture: ComponentFixture<CurriculumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurriculumComponent],
      providers: provideTestDefaults()
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(CurriculumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function curriculum(overrides: Partial<Curriculum>): Curriculum {
    return {
      id: 'c', teacherId: 'x', subject: 'الرياضيات', gradeId: 'G3', sections: ['3/2'], description: '',
      units: [{ id: 'u', title: 'الوحدة', lessons: [{ id: 'l', title: 'درس', week: 1, doneAt: null }] }],
      files: [], updatedAt: new Date().toISOString(), ...overrides
    };
  }

  it('should create', () => {
    create();
    expect(component).toBeTruthy();
  });

  it('shows a teacher only their own curricula and offers to start the missing subjects', () => {
    loginAs('TEACHER');
    create();
    const teacherId = component.scope.teacherId();
    expect(component.curricula().every(c => c.teacherId === teacherId)).toBeTrue();
    expect(component.subjectsWithoutCurriculum()).toEqual(component.scope.subjects());

    TestBed.inject(CurriculumStore).save(curriculum({ id: 'mine', teacherId, subject: component.scope.subjects()[0] }));
    expect(component.curricula().map(c => c.id)).toEqual(['mine']);
    expect(component.subjectsWithoutCurriculum()).not.toContain(component.scope.subjects()[0]);
  });

  it('marks a lesson as taught', () => {
    loginAs('TEACHER');
    const store = TestBed.inject(CurriculumStore);
    create();
    store.save(curriculum({ id: 'mine', teacherId: component.scope.teacherId() }));
    component.open('mine');
    component.toggleLesson('l');
    expect(component.progressOf(component.selected()!).percent).toBe(100);
  });

  it('shows a student their class curricula without the teacher-only files', () => {
    loginAs('STUDENT');
    const store = TestBed.inject(CurriculumStore);
    create();
    const section = component.scope.studentSection();
    const file = { name: 'f.pdf', size: 1, url: '' };
    store.save(curriculum({
      id: 'ours', sections: [section],
      files: [
        { id: 'book', kind: 'book', title: 'الكتاب', file, forStudents: true, uploadedAt: '' },
        { id: 'guide', kind: 'guide', title: 'دليل المعلم', file, forStudents: false, uploadedAt: '' }
      ]
    }));
    store.save(curriculum({ id: 'other', sections: ['1/1'] }));

    expect(component.curricula().every(c => c.sections.includes(section))).toBeTrue();
    expect(component.curricula().find(c => c.id === 'ours')!.files.map(f => f.id)).toEqual(['book']);
    expect(component.subjectsWithoutCurriculum()).toEqual([]);
  });
});
