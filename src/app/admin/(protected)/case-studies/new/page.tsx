import { CaseStudyForm } from "../case-study-form";

export default function NewCaseStudyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">New case study</h1>
      <div className="mt-6">
        <CaseStudyForm />
      </div>
    </div>
  );
}
