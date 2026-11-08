import { TestBed } from '@angular/core/testing';
import { GallerySlide, toParagraphs } from './home-content.model';
import { HomeContentStore } from './home-content.store';

describe('HomeContentStore', () => {
  let store: HomeContentStore;

  const slide: GallerySlide = { id: 'slide-test', src: 'data:image/jpeg;base64,x', title: 'رحلة الأقصر', caption: 'رحلة الصف الثالث', hidden: false };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(HomeContentStore);
  });

  it('adds, updates and removes a carousel photo', () => {
    store.saveSlide(slide);
    expect(store.visibleSlides().at(-1)).toEqual(slide);

    store.saveSlide({ ...slide, caption: 'رحلة الصف الثاني' });
    expect(store.slides().find(s => s.id === slide.id)?.caption).toBe('رحلة الصف الثاني');

    store.deleteSlide(slide.id);
    expect(store.slides().some(s => s.id === slide.id)).toBeFalse();
  });

  it('keeps a hidden photo off the home page without deleting it', () => {
    store.saveSlide(slide);
    store.toggleHidden(slide.id);
    expect(store.slides().some(s => s.id === slide.id)).toBeTrue();
    expect(store.visibleSlides().some(s => s.id === slide.id)).toBeFalse();
  });

  it('moves a photo earlier or later, but not past the ends', () => {
    const [first, second] = store.slides().map(s => s.id);
    store.moveSlide(second, -1);
    expect(store.slides().slice(0, 2).map(s => s.id)).toEqual([second, first]);

    store.moveSlide(second, -1);
    expect(store.slides()[0].id).toBe(second);
  });

  it('splits the principal word into paragraphs at the blank lines', () => {
    expect(toParagraphs('أهلاً بكم\nفي مدرستنا\n\n\nنتمنى لكم عاماً موفقاً\n')).toEqual(['أهلاً بكم في مدرستنا', 'نتمنى لكم عاماً موفقاً']);
  });
});
