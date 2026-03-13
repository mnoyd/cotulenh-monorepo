import { SubjectCard } from './subject-card';

type SubjectData = {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  completedLessons?: number;
};

type SubjectGridProps = {
  subjects: SubjectData[];
};

export function SubjectGrid({ subjects }: SubjectGridProps) {
  return (
    <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          id={subject.id}
          title={subject.title}
          description={subject.description}
          lessonCount={subject.lessonCount}
          completedLessons={subject.completedLessons}
        />
      ))}
    </div>
  );
}
