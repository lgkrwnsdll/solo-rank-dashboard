import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-3">Solo Rank Dashboard</h1>
        <p className="text-muted mb-8 text-lg">
          솔로랭크 내기 점수를 실시간으로 집계하고
          <br />
          송출용 오버레이를 제공합니다.
        </p>
        <LoginButton />
      </div>
    </main>
  );
}
