import { TestBed } from '@angular/core/testing';
import { loginAs, provideTestDefaults } from '../../../testing/test-helpers';
import { QuizAttempt } from '../teaching/teaching.model';
import { TeachingStore } from '../teaching/teaching.store';
import { QuizTakeDialogComponent } from './quiz-take-dialog.component';

describe('QuizTakeDialogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTakeDialogComponent],
      providers: provideTestDefaults()
    }).compileComponents();
    loginAs('STUDENT');
  });

  function open() {
    const quiz = TestBed.inject(TeachingStore).quizzes().find(q => q.id === 'q-1')!;
    const fixture = TestBed.createComponent(QuizTakeDialogComponent);
    fixture.componentRef.setInput('quiz', quiz);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, quiz };
  }

  it('switches to the full-screen exam view once started, one question at a time', () => {
    const { fixture, component, quiz } = open();
    expect(component.examMode()).toBeFalse();

    component.start();
    fixture.detectChanges();
    expect(component.examMode()).toBeTrue();
    expect(component.question()).toBe(quiz.questions[0]);

    component.goTo(99);
    expect(component.current()).toBe(quiz.questions.length - 1);
    component.goTo(-1);
    expect(component.current()).toBe(0);
  });

  it('tracks answered and flagged questions for the map and the summary', () => {
    const { component, quiz } = open();
    component.start();

    component.answer(quiz.questions[0].id, '7');
    component.toggleFlag(quiz.questions[1].id);
    expect(component.answeredCount()).toBe(1);
    expect(component.unansweredCount()).toBe(quiz.questions.length - 1);
    expect(component.flagged().has(quiz.questions[1].id)).toBeTrue();

    component.toggleFlag(quiz.questions[1].id);
    expect(component.flagged().size).toBe(0);
  });

  it('hands in with unanswered questions scored zero', () => {
    const { component, quiz } = open();
    let handedIn: QuizAttempt | undefined;
    component.submitted.subscribe(a => (handedIn = a));
    component.start();

    component.answer(quiz.questions[0].id, '7');
    component.submit();

    expect(handedIn).toBeDefined();
    expect(handedIn!.score).toBe(quiz.questions[0].points);
    expect(Object.keys(handedIn!.answers)).toEqual([quiz.questions[0].id]);
  });
});
