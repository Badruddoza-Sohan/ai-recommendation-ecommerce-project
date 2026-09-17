import { FormEvent, useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";

export default function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`MarketVerse support request from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:support@marketverse.com.bd?subject=${subject}&body=${body}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Contact MarketVerse</p><h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">We are here to help.</h1><p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">For shopping, order, seller, or platform questions, contact the MarketVerse support team using the details below.</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <a href="tel:01711654706" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"><Phone className="h-6 w-6 text-indigo-600" /><h2 className="mt-4 font-bold text-slate-900 dark:text-white">Phone</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">01711654706</p></a>
        <a href="mailto:support@marketverse.com.bd" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"><Mail className="h-6 w-6 text-indigo-600" /><h2 className="mt-4 font-bold text-slate-900 dark:text-white">Email</h2><p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-400">support@marketverse.com.bd</p></a>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"><MapPin className="h-6 w-6 text-indigo-600" /><h2 className="mt-4 font-bold text-slate-900 dark:text-white">Address</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">200/2/A, West Kafrul, Taltola, Agragaon, Dhaka-1207</p></div>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <h2 className="font-bold text-slate-900 dark:text-white">Send a message</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">This opens your email app with the message addressed to MarketVerse support.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950" />
          <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Your email" className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <textarea required rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="How can we help?" className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950" />
        <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"><Send className="h-4 w-4" />Open email</button>
      </form>
    </div>
  );
}
