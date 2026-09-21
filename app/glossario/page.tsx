import { permanentRedirect } from "next/navigation";

export default function GlossaryPage() {
  permanentRedirect("/atlas?tab=conceitos");
}
