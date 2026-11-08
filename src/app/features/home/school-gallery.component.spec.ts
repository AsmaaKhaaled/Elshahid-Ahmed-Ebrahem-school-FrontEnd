import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GalleryPhoto, SchoolGalleryComponent } from './school-gallery.component';

const PHOTOS: GalleryPhoto[] = [
  { src: 'a.svg', title: 'الأنشطة', caption: '' },
  { src: 'b.svg', title: 'الرياضة', caption: '' },
  { src: 'c.svg', title: 'المعامل', caption: '' }
];

describe('SchoolGalleryComponent', () => {
  let component: SchoolGalleryComponent;
  let fixture: ComponentFixture<SchoolGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SchoolGalleryComponent] }).compileComponents();
    fixture = TestBed.createComponent(SchoolGalleryComponent);
    fixture.componentRef.setInput('photos', PHOTOS);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('goes round the photos both ways', () => {
    component.previous();
    expect(component.index()).toBe(2);
    component.next();
    expect(component.index()).toBe(0);
    component.go(1);
    component.next();
    expect(component.index()).toBe(2);
  });

  it('shows only the current photo, with a dot per photo', () => {
    component.go(1);
    fixture.detectChanges();
    const slides: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('figure'));
    expect(slides.map(s => s.classList.contains('opacity-100'))).toEqual([false, true, false]);
    expect(fixture.nativeElement.querySelectorAll('[aria-current="true"]').length).toBe(1);
  });

  it('changes the photo with a swipe (right = next, in RTL)', () => {
    const touch = (x: number) => ({ changedTouches: [{ clientX: x }] }) as unknown as TouchEvent;
    component.touchStart(touch(100));
    component.touchEnd(touch(200));
    expect(component.index()).toBe(1);
    component.touchStart(touch(200));
    component.touchEnd(touch(100));
    expect(component.index()).toBe(0);
  });
});
