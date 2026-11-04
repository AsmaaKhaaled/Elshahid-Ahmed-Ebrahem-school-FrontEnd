// ---- Content a teacher publishes to their own classes (materials, quizzes & exams) ----

export interface TeachingFile {
  name: string;
  size: number;
  // Object URL of the picked file (valid for this session only, until the backend stores files).
  // Empty for the demo data and for files kept on the server (downloaded through the API).
  url: string;
  // The picked file itself, for pages that upload it to the server
  blob?: File;
}

export const MAX_FILE_MB = 20;
// No video / audio uploads yet: the server can't store & stream them (see "فيديوهات الشرح" - قريباً).
// Teachers share a video link (YouTube, Drive) instead.
export const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip';
const MEDIA_FILE = /\.(mp4|mov|avi|mkv|webm|wmv|m4v|mp3|wav|m4a|ogg)$/i;
export const VIDEO_UPLOAD_SOON = 'رفع الفيديو على المنصة قريباً، حالياً حط لينك الفيديو (يوتيوب أو درايف)';

/** Reads the files picked in an <input type="file">; files over MAX_FILE_MB and videos are refused. */
export function readPickedFiles(event: Event): { files: TeachingFile[]; error: string } {
  const input = event.target as HTMLInputElement;
  const picked = Array.from(input.files ?? []);
  // Picking the same file again should fire (change) again
  input.value = '';
  const media = picked.filter(file => MEDIA_FILE.test(file.name) || /^(video|audio)\//.test(file.type));
  const tooBig = picked.filter(file => !media.includes(file) && file.size > MAX_FILE_MB * 1024 * 1024);
  const files = picked
    .filter(file => !media.includes(file) && !tooBig.includes(file))
    .map(file => ({ name: file.name, size: file.size, url: URL.createObjectURL(file), blob: file }));
  const errors = [
    media.length ? `${VIDEO_UPLOAD_SOON}: ${media.map(f => f.name).join('، ')}` : '',
    tooBig.length ? `حجم الملف أكبر من ${MAX_FILE_MB} ميجا: ${tooBig.map(f => f.name).join('، ')}` : ''
  ];
  return { files, error: errors.filter(Boolean).join(' — ') };
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

/** Lesson material: files (PDF, slides, video...) and / or a link, published to one or more classes. */
export interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  sections: string[];
  files: TeachingFile[];
  link?: string;
  publishedAt: string;
}

// ---- Quizzes & exams ----

export type AssessmentKind = 'كويز' | 'اختبار';
export const ASSESSMENT_KINDS: AssessmentKind[] = ['كويز', 'اختبار'];

// online = solved on the platform & auto-graded; file = the teacher uploads the paper, students upload their answers
export type AssessmentMode = 'online' | 'file';

export type QuestionType = 'mcq' | 'truefalse' | 'short';
export const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'mcq', label: 'اختيار من متعدد' },
  { id: 'truefalse', label: 'صح أو خطأ' },
  { id: 'short', label: 'إجابة قصيرة' }
];
export const TRUE_FALSE = ['صح', 'خطأ'];

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  // mcq only
  options: string[];
  // The correct option's text (mcq / truefalse) or the expected answer (short)
  answer: string;
  points: number;
}

export interface Quiz {
  id: string;
  kind: AssessmentKind;
  mode: AssessmentMode;
  title: string;
  instructions: string;
  subject: string;
  teacherId: string;
  sections: string[];
  publishedAt: string;
  closesAt: string;
  // Online only; null = no time limit
  durationMinutes: number | null;
  questions: QuizQuestion[];
  // File mode: the question paper
  file?: TeachingFile;
  totalMarks: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  section: string;
  submittedAt: string;
  // questionId -> the student's answer (online)
  answers: Record<string, string>;
  // File mode: the student's answer sheet
  file?: TeachingFile;
  // null = waiting for the teacher to grade it (file mode)
  score: number | null;
}

export function isClosed(quiz: Quiz): boolean {
  return new Date(quiz.closesAt).getTime() < Date.now();
}

export function questionsTotal(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

// Short answers are compared loosely: spaces, case and the common hamza / taa marbuta spellings
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/** Auto-grades an online quiz. */
export function gradeAnswers(quiz: Quiz, answers: Record<string, string>): number {
  return quiz.questions.reduce(
    (sum, q) => sum + (answers[q.id] && normalize(answers[q.id]) === normalize(q.answer) ? q.points : 0),
    0
  );
}

/** e.g. "3/2، 3/3" */
export function sectionsLabel(sections: string[]): string {
  return sections.join('، ');
}
