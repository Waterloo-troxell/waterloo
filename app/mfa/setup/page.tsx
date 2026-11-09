import type { Metadata } from "next";
import { AuthShell } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { SetupFlow } from "./setup-flow";

export const metadata: Metadata = { title: "Set up 2FA" };

export default async function MfaSetupPage() {
  await requireStage("needs-2fa-setup");
  return (
    <AuthShell
      title="Set up 2FA"
      lead="2FA is required. Waterloo shows nothing until it is on. You will need an authenticator app on your phone, such as Google Authenticator or Ente Auth."
    >
      <SetupFlow />
    </AuthShell>
  );
}
