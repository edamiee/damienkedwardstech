import { createClient } from "@/lib/supabase/server";
import { saveService, deleteService } from "./actions";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("home_services")
    .select("id, title, body, sort_order, visible")
    .order("sort_order", { ascending: true });

  const nextOrder = (services?.length ?? 0) * 10;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl">&quot;What I do&quot; cards</h1>
      <p className="mt-1 text-sm text-muted">
        The three cards on the homepage, in order.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(services ?? []).map((service) => (
          <form
            key={service.id}
            action={saveService}
            className="flex flex-col gap-2 rounded-sm border border-line bg-surface p-3"
          >
            <input type="hidden" name="id" value={service.id} />
            <div className="flex flex-wrap items-center gap-3">
              <input
                name="title"
                defaultValue={service.title}
                className="w-48 rounded-sm border border-line bg-bg px-2 py-1.5 text-sm"
              />
              <input
                name="sort_order"
                type="number"
                defaultValue={service.sort_order}
                className="w-20 rounded-sm border border-line bg-bg px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="visible" defaultChecked={service.visible} />
                Visible
              </label>
            </div>
            <textarea
              name="body"
              rows={2}
              defaultValue={service.body}
              className="rounded-sm border border-line bg-bg px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-sm bg-teal px-3 py-1.5 text-sm font-semibold text-bg"
              >
                Save
              </button>
              <button formAction={deleteService} className="text-sm text-rust">
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>

      <form
        action={saveService}
        className="mt-6 flex flex-col gap-2 rounded-sm border border-dashed border-line p-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            name="title"
            placeholder="Title"
            required
            className="w-48 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
          />
          <input
            name="sort_order"
            type="number"
            defaultValue={nextOrder}
            className="w-20 rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="visible" defaultChecked />
            Visible
          </label>
        </div>
        <textarea
          name="body"
          rows={2}
          placeholder="One or two sentences"
          required
          className="rounded-sm border border-line bg-surface px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="self-start rounded-sm border border-teal px-3 py-1.5 text-sm font-semibold text-teal"
        >
          Add card
        </button>
      </form>
    </div>
  );
}
