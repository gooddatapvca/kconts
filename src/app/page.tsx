import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-4">kconts</h1>
      <p className="text-zinc-400 mb-6">일반 서비스 (준비 중)</p>
      <Link
        href="/admin"
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800/80"
      >
        관리자
      </Link>
    </div>
  );
}
