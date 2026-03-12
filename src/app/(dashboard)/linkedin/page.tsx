import { redirect } from "next/navigation";

// The old LinkedIn page is replaced by the new Content Studio at /studio
export default function LinkedInPage() {
  redirect("/studio");
}
