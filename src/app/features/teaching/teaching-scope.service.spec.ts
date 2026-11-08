import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { makeTeacher } from '../../../testing/teacher-fixtures';
import { TeachersStore } from '../teachers/teachers.store';
import { TeachingScope } from './teaching-scope.service';

describe('TeachingScope', () => {
  let scope: TeachingScope;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    loginAs('TEACHER');
    // An Arabic & religion teacher: Arabic to 1/1 & 2/1, religion to 1/1 only
    TestBed.inject(TeachersStore).teachers.set([
      makeTeacher('test-TEACHER', 'أحمد علي', {
        subjects: ['اللغة العربية', 'التربية الدينية'],
        classes: ['1/1', '2/1'],
        assignments: [
          { subject: 'اللغة العربية', classes: ['1/1', '2/1'] },
          { subject: 'التربية الدينية', classes: ['1/1'] }
        ]
      })
    ]);
    scope = TestBed.inject(TeachingScope);
  });

  it('gives each subject only the classes the admin assigned to it', () => {
    expect(scope.sectionsFor('اللغة العربية')).toEqual(['1/1', '2/1']);
    expect(scope.sectionsFor('التربية الدينية')).toEqual(['1/1']);
  });

  it('gives each class only the subjects taught to it', () => {
    expect(scope.subjectsFor('1/1')).toEqual(['اللغة العربية', 'التربية الدينية']);
    expect(scope.subjectsFor('2/1')).toEqual(['اللغة العربية']);
  });

  it('drops picked classes the new subject is not taught to', () => {
    expect(scope.keepSections('التربية الدينية', ['1/1', '2/1'])).toEqual(['1/1']);
  });
});
