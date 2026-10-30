import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { Announcement, AnnouncementsStore, audienceLabel, isExpired } from './announcements.store';

function announcement(overrides: Partial<Announcement>): Announcement {
  return {
    id: crypto.randomUUID(),
    title: 'إعلان',
    content: 'نص',
    category: 'إداري',
    audiences: ['TEACHER', 'STUDENT', 'PARENT'],
    author: 'إدارة المدرسة',
    publishedAt: new Date().toISOString(),
    pinned: false,
    ...overrides
  };
}

describe('AnnouncementsStore', () => {
  let store: AnnouncementsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    store = TestBed.inject(AnnouncementsStore);
    store.announcements.set([]);
  });

  it('shows each role only the announcements addressed to it', () => {
    store.announcements.set([
      announcement({ id: 'teachers', audiences: ['TEACHER'] }),
      announcement({ id: 'students', audiences: ['STUDENT'] })
    ]);

    loginAs('TEACHER');
    expect(store.visible().map(a => a.id)).toEqual(['teachers']);

    loginAs('STUDENT');
    expect(store.visible().map(a => a.id)).toEqual(['students']);
  });

  it('hides expired announcements from everyone except the admin', () => {
    store.announcements.set([announcement({ id: 'old', expiresAt: '2000-01-01' })]);

    loginAs('TEACHER');
    expect(store.visible().length).toBe(0);

    loginAs('ADMIN');
    expect(store.visible().length).toBe(1);
  });

  it('lists pinned announcements first, then the newest', () => {
    store.announcements.set([
      announcement({ id: 'old', publishedAt: '2026-01-01T00:00:00Z' }),
      announcement({ id: 'new', publishedAt: '2026-06-01T00:00:00Z' }),
      announcement({ id: 'pinned', publishedAt: '2025-01-01T00:00:00Z', pinned: true })
    ]);

    loginAs('ADMIN');
    expect(store.visible().map(a => a.id)).toEqual(['pinned', 'new', 'old']);
  });

  it('adds, updates, pins and deletes announcements', () => {
    const item = announcement({ id: 'a1', title: 'قبل' });
    store.save(item);
    store.save({ ...item, title: 'بعد' });
    store.togglePinned('a1');

    expect(store.announcements().length).toBe(1);
    expect(store.announcements()[0].title).toBe('بعد');
    expect(store.announcements()[0].pinned).toBeTrue();

    store.delete('a1');
    expect(store.announcements().length).toBe(0);
  });

  it('describes the audience in Arabic', () => {
    expect(audienceLabel(['TEACHER', 'STUDENT', 'PARENT'])).toBe('الجميع');
    expect(audienceLabel(['TEACHER', 'PARENT'])).toBe('المعلمون وأولياء الأمور');
  });

  it('treats announcements without an end date as never expiring', () => {
    expect(isExpired(announcement({}))).toBeFalse();
  });
});
