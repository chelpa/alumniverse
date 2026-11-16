"use client";
import { useActionState } from "react";
import { savePost, saveArea, type ActionState } from "../actions";

function Status({ state, pending, label }: { state: ActionState; pending: boolean; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <button disabled={pending} className="btn-primary">{pending ? "Saving…" : label}</button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">✓ {state.ok}</p>}
    </div>
  );
}

export function PostForm({ post }: { post?: { id: string; title: string; excerpt: string | null; body: string; published: boolean } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePost, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div><label className="label">Title</label><input name="title" required defaultValue={post?.title} className="input" /></div>
      <div><label className="label">Excerpt <span className="font-normal text-slate-400">(optional)</span></label><input name="excerpt" defaultValue={post?.excerpt ?? ""} className="input" /></div>
      <div>
        <label className="label">Body</label>
        <textarea name="body" required rows={16} defaultValue={post?.body} className="input font-mono text-sm" />
        <p className="mt-1 text-xs text-slate-500">Formatting: “## Heading”, “- list item”, **bold**, [link](https://…). Blank line between paragraphs.</p>
      </div>
      <div><label className="label">Cover image</label><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={post?.published ?? true} /> Published</label>
      <Status state={state} pending={pending} label="Save post" />
    </form>
  );
}

export function AreaForm({ area }: { area?: { id: string; name: string; description: string; highlights: string[] } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveArea, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      {area && <input type="hidden" name="id" value={area.id} />}
      <div><label className="label">Neighborhood name</label><input name="name" required defaultValue={area?.name} className="input" placeholder="Must match the neighborhood used on your listings" /></div>
      <div><label className="label">Guide</label><textarea name="description" required rows={12} defaultValue={area?.description} className="input" placeholder="What it's like to live here, typical prices, schools, transport, lifestyle…" /></div>
      <div><label className="label">Highlights (one per line)</label><textarea name="highlights" rows={4} defaultValue={area?.highlights.join("\n")} className="input" /></div>
      <div><label className="label">Cover image</label><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" /></div>
      <Status state={state} pending={pending} label="Save area page" />
    </form>
  );
}
