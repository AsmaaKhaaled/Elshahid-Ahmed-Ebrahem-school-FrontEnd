import { Teacher, TeacherDto } from '../app/features/teachers/teacher.model';

/** A teacher as the app holds it (ids are short for readable tests). */
export function makeTeacher(id: string, name: string, change: Partial<Teacher> = {}): Teacher {
  return {
    id,
    name,
    nationalId: `2850101${id.padStart(7, '0')}`.slice(0, 14),
    title: 'معلم',
    specialization: 'الرياضيات',
    email: '',
    phone: '01012345678',
    subjects: ['الرياضيات'],
    classes: [],
    status: 'على رأس العمل',
    account: { status: 'ACTIVE', mustChangePassword: false },
    ...change
  };
}

/** The same teacher as GET /teachers returns it. */
export function teacherDto(teacher: Teacher): TeacherDto {
  return {
    id: teacher.id,
    fullName: teacher.name,
    nationalId: teacher.nationalId,
    phone: teacher.phone,
    email: teacher.email,
    jobTitle: teacher.title,
    specialization: teacher.specialization,
    subjects: teacher.subjects,
    classes: teacher.classes,
    status: teacher.status === 'على رأس العمل' ? 'ON_DUTY' : teacher.status === 'منتدب' ? 'SECONDED' : 'ON_LEAVE',
    account: teacher.account
  };
}
