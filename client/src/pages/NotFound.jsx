
import { Link } from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[65vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <FileQuestion size={30} />
        </div>
        <p className="mt-6 text-sm font-bold text-violet-600">404 ERROR</p>
        <h1 className="mt-2 text-3xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This page doesn't exist or may have moved. Let's get you back to your workspace.
        </p>
        <Link to="/" className="btn-primary mt-6">
          <ArrowLeft size={17} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
