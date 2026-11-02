import { Quiz, gradeAnswers, questionsTotal } from './teaching.model';

const quiz: Quiz = {
  id: 'q', kind: 'كويز', mode: 'online', title: 'كويز', instructions: '', subject: 'الرياضيات', teacherId: '1',
  sections: ['3/2'], publishedAt: '', closesAt: '', durationMinutes: null, totalMarks: 5,
  questions: [
    { id: 'a', type: 'mcq', text: '2 + 5', options: ['5', '7'], answer: '7', points: 2 },
    { id: 'b', type: 'truefalse', text: '1 > 0', options: [], answer: 'صح', points: 1 },
    { id: 'c', type: 'short', text: 'عاصمة مصر', options: [], answer: 'القاهرة', points: 2 }
  ]
};

describe('teaching model', () => {
  it('totals the question points', () => {
    expect(questionsTotal(quiz.questions)).toBe(5);
  });

  it('auto-grades an online quiz', () => {
    expect(gradeAnswers(quiz, { a: '7', b: 'صح', c: 'القاهرة' })).toBe(5);
    expect(gradeAnswers(quiz, { a: '5', b: 'صح' })).toBe(1);
  });

  it('compares short answers loosely (spaces, hamza, taa marbuta)', () => {
    expect(gradeAnswers(quiz, { c: '  القاهره ' })).toBe(2);
  });
});
