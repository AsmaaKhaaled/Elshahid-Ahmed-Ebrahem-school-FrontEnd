import { GalleryPhoto } from '../home/school-gallery.component';

/** كلمة مدير المدرسة on the home page. */
export interface PrincipalWord {
  name: string;
  title: string;
  photoUrl: string;
  // One entry per paragraph
  message: string[];
}

/** A photo of the home page carousel (من حياة المدرسة). */
export interface GallerySlide extends GalleryPhoto {
  id: string;
  // Kept but not shown on the home page (e.g. an event that's over)
  hidden: boolean;
}

/** The text typed in a textarea, one paragraph per block separated by a blank line. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}
