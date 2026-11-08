import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { SchoolStructureStore } from './school-structure.store';

describe('SchoolStructureStore', () => {
  let store: SchoolStructureStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    store = TestBed.inject(SchoolStructureStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts with 4 classes per grade until the setup loads', () => {
    expect(store.grades().map(g => g.sections.length)).toEqual([4, 4, 4]);
  });

  it("builds each grade's classes and capacity from the saved setup", () => {
    store.ensureLoaded();
    http.expectOne(req => req.url.endsWith('/classes/structure')).flush({
      data: { grades: [{ grade: 1, sections: 3, capacity: 50 }, { grade: 2, sections: 4, capacity: 45 }, { grade: 3, sections: 2, capacity: 38 }] }
    });

    expect(store.grades()[0].sections).toEqual(['1/1', '1/2', '1/3']);
    expect(store.allSections()).toEqual(['1/1', '1/2', '1/3', '2/1', '2/2', '2/3', '2/4', '3/1', '3/2']);
    expect(store.capacityOf('1/2')).toBe(50);
    expect(store.capacityOf('3/1')).toBe(38);
  });

  it('saves a new setup and uses what the server returns', () => {
    const setup = [{ grade: 1, sections: 5, capacity: 40 }, { grade: 2, sections: 4, capacity: 40 }, { grade: 3, sections: 4, capacity: 40 }];
    store.save(setup).subscribe();

    const req = http.expectOne(r => r.url.endsWith('/classes/structure'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ grades: setup });
    req.flush({ data: { grades: setup } });

    expect(store.grades()[0].sections.length).toBe(5);
  });
});
