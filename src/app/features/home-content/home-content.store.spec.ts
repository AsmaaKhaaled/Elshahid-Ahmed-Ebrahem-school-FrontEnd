import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideTestDefaults } from '../../../testing/test-helpers';
import { GallerySlide, toParagraphs } from './home-content.model';
import { HomeContentStore } from './home-content.store';

const API = 'http://localhost:5000/api/v1/home-content';
// Where the store keeps a copy for when the server can't be reached
const STORAGE_KEYS = ['school_home_principal_word_v1', 'school_home_slides_v1'];

describe('HomeContentStore', () => {
  let store: HomeContentStore;
  let http: HttpTestingController;

  const slide: GallerySlide = { id: '', src: 'data:image/jpeg;base64,x', title: 'رحلة الأقصر', caption: 'رحلة الصف الثالث', hidden: false };

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    store = TestBed.inject(HomeContentStore);
    http = TestBed.inject(HttpTestingController);
    // Nothing on the server yet: the store keeps its default principal word & photos
    http.expectOne(`${API}/principal`).flush({ status: 'success', data: null });
    http.expectOne(req => req.url === `${API}/gallery` && req.method === 'GET').flush({ status: 'success', data: [] });
  });

  afterEach(() => {
    http.verify();
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('adds, updates and removes a carousel photo on the server', () => {
    store.saveSlide(slide);
    // Shown right away, before the server answers
    expect(store.visibleSlides().at(-1)?.title).toBe('رحلة الأقصر');
    const create = http.expectOne(req => req.url === `${API}/gallery` && req.method === 'POST');
    expect(create.request.body.title).toBe('رحلة الأقصر');
    create.flush({ status: 'success', data: { ...slide, id: 'srv-1' } });
    expect(store.slides().at(-1)?.id).toBe('srv-1');

    store.saveSlide({ ...slide, id: 'srv-1', caption: 'رحلة الصف الثاني' });
    expect(store.slides().find(s => s.id === 'srv-1')?.caption).toBe('رحلة الصف الثاني');
    http.expectOne(`${API}/gallery/srv-1`).flush({ status: 'success', data: { ...slide, id: 'srv-1', caption: 'رحلة الصف الثاني' } });

    store.deleteSlide('srv-1');
    expect(store.slides().some(s => s.id === 'srv-1')).toBeFalse();
    const remove = http.expectOne(`${API}/gallery/srv-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ status: 'success', message: 'ok', data: { id: 'srv-1' } });
  });

  it('keeps a hidden photo off the home page without deleting it', () => {
    const id = store.slides()[0].id;
    store.toggleHidden(id);
    expect(store.slides().some(s => s.id === id)).toBeTrue();
    expect(store.visibleSlides().some(s => s.id === id)).toBeFalse();
    http.expectOne(`${API}/gallery/${id}/toggle-hidden`).flush({ status: 'success', data: { id, hidden: true } });
  });

  it('moves a photo earlier or later, but not past the ends', () => {
    const [first, second] = store.slides().map(s => s.id);
    store.moveSlide(second, -1);
    expect(store.slides().slice(0, 2).map(s => s.id)).toEqual([second, first]);
    const reorder = http.expectOne(`${API}/gallery/reorder`);
    expect(reorder.request.body.slideIds.slice(0, 2)).toEqual([second, first]);
    reorder.flush({ status: 'success', message: 'ok' });

    // Already first: nothing moves and nothing is sent
    store.moveSlide(second, -1);
    expect(store.slides()[0].id).toBe(second);
  });

  it('splits the principal word into paragraphs at the blank lines', () => {
    expect(toParagraphs('أهلاً بكم\nفي مدرستنا\n\n\nنتمنى لكم عاماً موفقاً\n')).toEqual(['أهلاً بكم في مدرستنا', 'نتمنى لكم عاماً موفقاً']);
  });
});
