import { BuildLogForm } from "../build-log-form";

export default function NewBuildLogEntryPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">New build log entry</h1>
      <div className="mt-6">
        <BuildLogForm />
      </div>
    </div>
  );
}
