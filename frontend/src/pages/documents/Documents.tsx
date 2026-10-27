import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createDocument,
  deleteDocument,
  listDocuments,
  updateDocument,
} from "../../api/DocumentApi";
import { loadVaultMeta, lock, getKey, openDocument, sealDocument, setupVault, subscribe, unlock } from "../../lib/vault";
import type { VaultMeta } from "../../api/VaultApi";
import LockIcon from "../../icons/LockIcon";
import EyeIcon from "../../icons/EyeIcon";
import EyeOffIcon from "../../icons/EyeOffIcon";
import { maskSensitive } from "../../lib/mask";
import { FAMILY } from "../../lib/family";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import PencilIcon from "../../icons/PencilIcon";
import PlusIcon from "../../icons/PlusIcon";
import TrashIcon from "../../icons/TrashIcon";

// How long revealed values stay visible before hiding again.
const REVEAL_MS = 20_000;

const TITLE_MAX = 120;
const CONTENT_MAX = 3000;

/** A document after decryption. `broken` marks one that could not be decrypted. */
type DocumentRecord = { id: number; member: string; title: string; content: string; broken?: boolean };

async function loadDocuments(): Promise<DocumentRecord[]> {
  const stored = await listDocuments();
  return Promise.all(
    stored.map(async (d): Promise<DocumentRecord> => {
      try {
        return { id: d.id, member: d.member, ...(await openDocument(d.data, d.member)) };
      } catch {
        return { id: d.id, member: d.member, title: "Can't decrypt this document", content: "", broken: true };
      }
    }),
  );
}

// id === null means a new document that hasn't been saved yet.
type Form = { id: number | null; member: string; title: string; content: string };

const inputClass =
  "w-full rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-2 text-base text-white focus:border-orange focus:outline-none";

/** Read-only view of one document; sensitive values stay masked until revealed, then re-hide on their own. */
function DocumentDetail({
  document: doc,
  onBack,
  onEdit,
}: {
  document: DocumentRecord;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const hide = () => setRevealed(false);
    const timer = window.setTimeout(hide, REVEAL_MS);
    const onVisibility = () => {
      if (window.document.hidden) hide();
    };
    window.document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      window.document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [revealed]);

  const person = FAMILY.find((p) => p.id === doc.member);

  return (
    <section className="animate-arrive" aria-labelledby="document-title">
      <header className="flex h-16 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-label="Back to documents"
            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
            onClick={onBack}
            type="button"
          >
            <ChevronLeftIcon />
          </button>
          <h1 id="document-title" className="truncate text-2xl font-semibold">
            {doc.title}
          </h1>
        </div>
        <div className="-mr-2 flex items-center">
          <button
            aria-label={revealed ? "Hide sensitive values" : "Reveal sensitive values"}
            aria-pressed={revealed}
            className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
            onClick={() => setRevealed((value) => !value)}
            type="button"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            aria-label={`Edit ${doc.title}`}
            className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
            onClick={onEdit}
            type="button"
          >
            <PencilIcon />
          </button>
        </div>
      </header>

      {person && <p className="mb-3 text-sm text-graphite-300">{person.label}</p>}

      {doc.content ? (
        <p className="whitespace-pre-wrap break-words rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3 text-base">
          {revealed ? doc.content : maskSensitive(doc.content)}
        </p>
      ) : (
        <p className="text-graphite-300">No content</p>
      )}
      {doc.content && !revealed && maskSensitive(doc.content) !== doc.content && (
        <p className="mt-2 text-xs text-graphite-300">Numbers are hidden. Tap the eye to reveal for {REVEAL_MS / 1000} seconds.</p>
      )}
    </section>
  );
}

function DocumentsView() {
  // null until the first fetch completes.
  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  // Accordions that are expanded; all start collapsed.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const [viewing, setViewing] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    loadDocuments()
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
      const input = { member: form.member, data: await sealDocument(form, form.member) };
      if (form.id === null) await createDocument(input);
      else await updateDocument(form.id, input);
      setDocuments(await loadDocuments());
      // Make sure the document just saved is visible.
      setOpen((set) => new Set(set).add(form.member));
      setForm(null);
    });

  const confirmDelete = () =>
    pendingDelete &&
    run(async () => {
      await deleteDocument(pendingDelete.id);
      setDocuments((list) => list?.filter((d) => d.id !== pendingDelete.id) ?? null);
      setPendingDelete(null);
    });

  if (viewing && !form) {
    return (
      <DocumentDetail
        document={viewing}
        onBack={() => setViewing(null)}
        onEdit={() => {
          setError("");
          setForm({ id: viewing.id, member: viewing.member, title: viewing.title, content: viewing.content });
          setViewing(null);
        }}
      />
    );
  }

  return (
    <section className="animate-arrive" aria-labelledby="documents-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="documents-title" className="text-2xl font-semibold">
          {form ? (form.id === null ? "New document" : "Edit document") : "Documents"}
        </h1>
        <div className="-mr-2 flex items-center">
          {!form && (
            <button
              aria-label="Lock documents"
              className="flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
              onClick={lock}
              type="button"
            >
              <LockIcon />
            </button>
          )}
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
                setForm({ id: null, member: [...open][0] ?? FAMILY[0].id, title: "", content: "" });
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
          <select
            aria-label="Family member"
            className={inputClass}
            onChange={(e) => setForm({ ...form, member: e.target.value })}
            value={form.member}
          >
            {FAMILY.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
                {"note" in person ? ` (${person.note})` : ""}
              </option>
            ))}
          </select>
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
        <ul className="flex flex-col gap-3">
          {FAMILY.map((person) => {
            const items = documents?.filter((d) => d.member === person.id) ?? [];
            const expanded = open.has(person.id);
            return (
              <li className="rounded-xl border border-graphite-700 bg-graphite-900" key={person.id}>
                <button
                  aria-controls={`docs-${person.id}`}
                  aria-expanded={expanded}
                  className="flex h-14 w-full items-center gap-3 px-4 text-left"
                  onClick={() =>
                    setOpen((set) => {
                      const next = new Set(set);
                      if (!next.delete(person.id)) next.add(person.id);
                      return next;
                    })
                  }
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {person.label}
                    {"note" in person && <span className="font-normal text-graphite-300"> · {person.note}</span>}
                  </span>
                  {documents && <span className="font-mono text-xs text-graphite-300">{items.length}</span>}
                  <ChevronLeftIcon
                    className={"size-5 text-graphite-300 transition " + (expanded ? "-rotate-90" : "rotate-180")}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-graphite-700 px-4 py-2" id={`docs-${person.id}`}>
                    {items.length === 0 && <p className="py-3 text-sm text-graphite-300">No document</p>}
                    <ul className="divide-y divide-graphite-700">
                      {items.map((document) => (
                        <li className="flex items-center gap-3 py-2" key={document.id}>
                          {/* Titles only: content (and its numbers) is shown, masked, in the detail view. */}
                          <button
                            className="min-w-0 flex-1 truncate py-2 text-left text-base font-semibold disabled:opacity-60"
                            disabled={document.broken}
                            onClick={() => setViewing(document)}
                            type="button"
                          >
                            {document.title}
                          </button>
                          {!document.broken && (
                          <button
                            aria-label={`Edit ${document.title}`}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full text-orange transition active:scale-95"
                            onClick={() => {
                              setError("");
                              setForm({
                                id: document.id,
                                member: document.member,
                                title: document.title,
                                content: document.content,
                              });
                            }}
                            type="button"
                          >
                            <PencilIcon />
                          </button>
                          )}
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
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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

const gateInput =
  "h-12 w-full rounded-xl border border-graphite-700 bg-graphite-900 px-4 text-base text-white focus:border-orange focus:outline-none";

/** Asks for the vault passphrase (or creates the vault the first time). */
function VaultGate({ meta, onCreated }: { meta: VaultMeta | null; onCreated: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creating = meta === null;
  const valid = creating ? passphrase.length >= 12 && passphrase === repeat : passphrase.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      if (creating) {
        await setupVault(passphrase);
        onCreated();
      } else {
        await unlock(passphrase, meta);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <section className="animate-arrive" aria-labelledby="documents-title">
      <header className="flex h-16 items-center">
        <h1 id="documents-title" className="text-2xl font-semibold">
          Documents
        </h1>
      </header>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-graphite-300">
          {creating
            ? "Documents are encrypted on this device before they are saved, so the server can never read them. Choose a vault passphrase that you and your partner will both use. If it is lost, the documents cannot be recovered, so write it down and keep it somewhere safe."
            : "Enter the vault passphrase to open your documents."}
        </p>
        <input
          aria-label="Vault passphrase"
          autoComplete="off"
          autoFocus
          className={gateInput}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder={creating ? "New vault passphrase (12+ characters)" : "Vault passphrase"}
          type="password"
          value={passphrase}
        />
        {creating && (
          <input
            aria-label="Repeat passphrase"
            autoComplete="off"
            className={gateInput}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="Repeat passphrase"
            type="password"
            value={repeat}
          />
        )}
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <button
          className="h-12 w-full rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          disabled={!valid || busy}
          type="submit"
        >
          {busy ? (creating ? "Creating…" : "Unlocking…") : creating ? "Create vault" : "Unlock"}
        </button>
      </form>
    </section>
  );
}

function Documents() {
  const unlocked = useSyncExternalStore(subscribe, getKey) !== null;
  // undefined while loading, null when no vault exists yet.
  const [meta, setMeta] = useState<VaultMeta | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const fetchMeta = () =>
    loadVaultMeta()
      .then(setMeta)
      .catch((e: Error) => setLoadError(e.message));

  useEffect(() => {
    void fetchMeta();
  }, []);

  if (unlocked) return <DocumentsView />;
  if (loadError) return <p className="pt-6 text-sm text-bad">{loadError}</p>;
  if (meta === undefined) return null;
  return <VaultGate meta={meta} onCreated={fetchMeta} />;
}

export default Documents;
