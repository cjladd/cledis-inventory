import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="tnum text-[64px] font-extrabold leading-none tracking-tight text-rule-strong">
        404
      </p>
      <h1 className="mt-4 text-xl font-bold text-ink">No such screen</h1>
      <p className="mt-2 text-[15px] text-ink-2 max-w-xs">
        That page does not exist. It may have been renamed or removed.
      </p>

      <Link
        href="/"
        className="mt-6 px-6 py-3.5 rounded-control bg-ink text-white font-bold text-[15px]
                   active:bg-ink/90 transition-colors"
      >
        Back to today
      </Link>
    </div>
  );
}
