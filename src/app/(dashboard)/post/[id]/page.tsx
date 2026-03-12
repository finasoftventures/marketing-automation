import { redirect } from "next/navigation";

// post/[id] detail view removed — use Studio for post management
export default function PostDetailPage() {
  redirect("/studio");
}
