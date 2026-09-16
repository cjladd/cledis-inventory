import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-emerald-500">404</p>
      <h1 className="mt-3 text-xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        That page does not exist. It may have been renamed or removed.
      </p>

      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl
                   hover:bg-emerald-600 active:scale-95 transition-all"
      >
        Back to home
      </Link>
    </div>
  );
}
