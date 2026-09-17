import { Link } from "react-router";
import { ArrowRight, Bot, CheckCircle2, Mic, Store } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">About MarketVerse</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">One marketplace for everyday discovery.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">MarketVerse is a multi-vendor e-commerce platform where customers can browse products from independent sellers across categories, compare choices, and place orders through a single shopping experience.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          [<Store className="h-6 w-6" />, "Multi-vendor marketplace", "Sellers can create stores and offer products across fashion, electronics, home, sports, and other categories."],
          [<Bot className="h-6 w-6" />, "AI-assisted discovery", "AI recommendations and the Clevora shopping assistant help customers explore products and make informed choices."],
          [<Mic className="h-6 w-6" />, "Accessible shopping", "Voice navigation and voice checkout features are designed to make browsing more accessible, including for blind and visually impaired users."],
        ].map(([icon, title, description]) => (
          <article key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{icon}</div>
            <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">MarketVerse supports online payment through SSLCommerz and Cash on Delivery where available at checkout.</p></div>
      </div>
      <Link to="/products" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Explore products <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
