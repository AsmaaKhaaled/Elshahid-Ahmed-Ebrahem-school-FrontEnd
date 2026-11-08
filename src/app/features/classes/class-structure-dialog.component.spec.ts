import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { GradeSetup } from '../../core/academic/school-structure.store';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { ClassStructureDialogComponent } from './class-structure-dialog.component';

const SETUP: GradeSetup[] = [
  { grade: 1, sections: 4, capacity: 45 },
  { grade: 2, sections: 4, capacity: 45 },
  { grade: 3, sections: 4, capacity: 45 }
];

function validForm(): NgForm {
  return { invalid: false, control: { markAllAsTouched: () => {} } } as unknown as NgForm;
}

describe('ClassStructureDialogComponent', () => {
  let component: ClassStructureDialogComponent;
  let fixture: ComponentFixture<ClassStructureDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassStructureDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    fixture = TestBed.createComponent(ClassStructureDialogComponent);
    fixture.componentRef.setInput('setup', SETUP);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows which classes a smaller grade will lose', () => {
    component.draft[0].sections = 3;
    expect(component.sectionsPreview(component.draft[0])).toBe('1/1، 1/2، 1/3');
    expect(component.removed(component.draft[0])).toEqual(['1/4']);
    expect(component.removed(component.draft[1])).toEqual([]);
  });

  it('emits the new setup as numbers, without changing the original', () => {
    const results: GradeSetup[][] = [];
    component.saved.subscribe(setup => results.push(setup));

    component.draft[2] = { grade: 3, sections: '3' as unknown as number, capacity: '50' as unknown as number };
    component.save(validForm());

    expect(results[0][2]).toEqual({ grade: 3, sections: 3, capacity: 50 });
    expect(SETUP[2]).toEqual({ grade: 3, sections: 4, capacity: 45 });
  });

  it('does not save past the 50 students limit', () => {
    component.draft[0].capacity = 51;
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      const results: GradeSetup[][] = [];
      component.saved.subscribe(setup => results.push(setup));
      document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      expect(results).toEqual([]);
    });
  });
});
