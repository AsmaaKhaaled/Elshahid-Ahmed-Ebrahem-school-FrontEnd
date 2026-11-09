import { ComponentFixture, TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { TeachingStore } from '../teaching/teaching.store';
import { MaterialsComponent } from './materials.component';

describe('MaterialsComponent', () => {
  let component: MaterialsComponent;
  let fixture: ComponentFixture<MaterialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialsComponent],
      providers: provideTestDefaults()
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(MaterialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    create();
    expect(component).toBeTruthy();
  });

  it('shows a teacher only their own materials', () => {
    loginAs('TEACHER');
    create();
    const teacherId = component.scope.teacherId();
    expect(component.filteredMaterials().every(m => m.teacherId === teacherId)).toBeTrue();
  });

  it('shows a student only the materials of their class', () => {
    loginAs('STUDENT');
    const store = TestBed.inject(TeachingStore);
    create();
    const section = component.scope.studentSection();
    store.saveMaterial({
      id: 'other', title: 'لفصل آخر', description: '', subject: 'العلوم', teacherId: '1',
      sections: ['1/1'], files: [], link: 'https://example.com', publishedAt: new Date().toISOString()
    });
    expect(component.filteredMaterials().length).toBeGreaterThan(0);
    expect(component.filteredMaterials().every(m => m.sections.includes(section))).toBeTrue();
  });
});
