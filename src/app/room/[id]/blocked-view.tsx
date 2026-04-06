import Link from "next/link";

export function BlockedView() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg mb-4">초대된 사용자만 참여할 수 있습니다.</p>
        <Link
          href="/dashboard"
          className="text-primary hover:underline"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </main>
  );
}
