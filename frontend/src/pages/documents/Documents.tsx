import { useEffect, useState } from "react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  updateDocument,
  type DocumentRecord,
} from "../../api/DocumentApi";
import PencilIcon from "../../icons/PencilIcon";
import PlusIcon from "../../icons/PlusIcon";
import TrashIcon from "../../icons/TrashIcon";

const TITLE_MAX = 120;
const CONTENT_MAX = 3000;

// id === null means a new document that hasn't been saved yet.
type Form = { id: number | null; title: string; content: string };

const inputClass =
  "w-full rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-2 text-base text-white focus:border-orange focus:outline-none";

function Documents() {
  // null until the first fetch completes.
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      // A failed first load just shows the empty state instead of an error.
      .catch(() => setDocuments([]));
  }, []);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    form &&
    run(async () => {
      const input = { title: form.title, content: form.content };
      if (form.id === null) await createDocument(input);
      else await updateDocument(form.id, input);
      setDocuments(await listDocuments());
      setForm(null);
    });

  const confirmDelete = () =>
    pendingDelete &&
    run(async () => {
      await deleteDocument(pendingDelete.id);
      setDocuments((list) => list?.filter((d) => d.id !== pendingDelete.id) ?? null);
      setPendingDelete(null);
    });

  return (
    <section className="animate-arrive" aria-labelledby="documents-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="documents-title" className="text-2xl font-semibold">
          {form ? (form.id === null ? "New document" : "Edit document") : "Documents"}
        </h1>
        <div className="-mr-2 flex items-center">
          {form ? (
            <>
              <button
                className="h-10 rounded-full px-3 text-sm font-semibold text-graphite-300 transition active:scale-95"
                disabled={busy}
                onClick={() => setForm(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-full px-3 text-sm font-semibold text-orange transition active:scale-95 disabled:opacity-40"
                disabled={busy || !form.title.trim()}
                onClick={save}
                type="button"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              aria-label="New document"
              className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95 disabled:opacity-40"
              disabled={!documents}
              onClick={() => {
                setError("");
                setForm({ id: null, title: "", content: "" });
              }}
              type="button"
            >
              <PlusIcon />
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {form ? (
        <div className="flex flex-col gap-3">
          <input
            aria-label="Title"
            autoFocus
            className={inputClass}
            maxLength={TITLE_MAX}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            type="text"
            value={form.title}
          />
          <textarea
            aria-label="Content"
            className={inputClass + " min-h-[50dvh] resize-none"}
            maxLength={CONTENT_MAX}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write something…"
            value={form.content}
          />
        </div>
      ) : (
        <>
          {documents && documents.length === 0 && (
            <div className="flex min-h-[60dvh] items-center justify-center">
              <p className="text-graphite-300">No document</p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {documents?.map((document) => (
              <li
                className="flex items-center gap-3 rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3"
                key={document.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{document.title}</p>
                  {document.content && (
                    <p className="truncate text-sm text-graphite-300">{document.content}</p>
                  )}
                </div>
                <button
                  aria-label={`Edit ${document.title}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-orange transition active:scale-95"
                  onClick={() => {
                    setError("");
                    setForm({ id: document.id, title: document.title, content: document.content });
                  }}
                  type="button"
                >
                  <PencilIcon />
                </button>
                <button
                  aria-label={`Delete ${document.title}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-bad transition active:scale-95"
                  onClick={() => setPendingDelete(document)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setPendingDelete(null)}
        >
          <div
            aria-describedby="delete-document-message"
            aria-labelledby="delete-document-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-graphite-700 bg-graphite-900 p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <h2 id="delete-document-title" className="text-lg font-semibold">
              Delete document?
            </h2>
            <p id="delete-document-message" className="mt-2 text-sm text-graphite-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{pendingDelete.title}</span>? This can't be
              undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                autoFocus
                className="h-12 flex-1 rounded-xl border border-graphite-700 text-sm font-semibold text-graphite-300 transition active:scale-95"
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-12 flex-1 rounded-xl bg-bad text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
                disabled={busy}
                onClick={confirmDelete}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Documents;
