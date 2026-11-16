import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "../../../ui";
import { PostForm } from "../../ContentForms";
import { deleteContent } from "../../../actions";
import { ConfirmButton } from "../../../ConfirmButton";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const broker = await requireBroker();
  const { id } = await params;
  const post = id === "new" ? null : await db.post.findFirst({ where: { id, brokerId: broker.id } });
  if (id !== "new" && !post) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/content" className="text-sm text-brand">← Back</Link>
      <PageHeader title={post ? "Edit post" : "New post"} actions={post ? <a className="btn-ghost" target="_blank" href={`/s/${broker.slug}/blog/${post.slug}`}>View ↗</a> : undefined} />
      <PostForm post={post ?? undefined} />
      {post && (
        <form action={deleteContent} className="mt-6"><input type="hidden" name="id" value={post.id} /><input type="hidden" name="kind" value="post" /><ConfirmButton message="Delete this post?" className="btn-danger">Delete post</ConfirmButton></form>
      )}
    </div>
  );
}
