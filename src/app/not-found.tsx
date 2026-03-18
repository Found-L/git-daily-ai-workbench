import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-wrap">
      <div className="panel rounded-[2rem] p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">404</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em]">页面不存在</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          可能是项目或报告已经被删除，或者你还没有生成对应的数据。
        </p>
        <Link
          className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
          href="/"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
