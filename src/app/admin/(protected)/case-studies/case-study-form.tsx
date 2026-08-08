import { saveCaseStudy, deleteCaseStudy } from "./actions";

type CaseStudy = {
  id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  approach: string | null;
  outcome: string | null;
  stack: string | null;
  project_url: string | null;
  published: boolean;
};

export function CaseStudyForm({ caseStudy }: { caseStudy?: CaseStudy }) {
  return (
    <form action={saveCaseStudy} className="flex flex-col gap-4">
      {caseStudy && <input type="hidden" name="id" value={caseStudy.id} />}
      <label className="flex flex-col gap-1.5 text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={caseStudy?.title}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Summary (shown on the Case studies index)
        <input
          name="summary"
          defaultValue={caseStudy?.summary ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Problem
        <textarea
          name="problem"
          rows={4}
          defaultValue={caseStudy?.problem ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Approach
        <textarea
          name="approach"
          rows={4}
          defaultValue={caseStudy?.approach ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Outcome
        <textarea
          name="outcome"
          rows={4}
          defaultValue={caseStudy?.outcome ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Stack (comma-separated)
        <input
          name="stack"
          defaultValue={caseStudy?.stack ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Project link (optional — leave blank if there&apos;s nothing public to link to)
        <input
          name="project_url"
          type="url"
          placeholder="https://…"
          defaultValue={caseStudy?.project_url ?? ""}
          className="rounded-sm border border-line bg-surface px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={caseStudy?.published} />
        Published
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-sm bg-teal px-4 py-2 text-sm font-semibold text-bg"
        >
          Save
        </button>
        {caseStudy && (
          <button
            formAction={deleteCaseStudy}
            className="rounded-sm border border-rust px-4 py-2 text-sm text-rust"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
