'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    router.push(`/character/${name.toLowerCase()}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-xl space-y-12 text-center">
        {/* Logo/Brand */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-zinc-900 dark:bg-zinc-100 p-4 rounded-2xl shadow-xl rotate-3">
               <h1 className="text-4xl font-black text-white dark:text-zinc-900 tracking-tighter uppercase">BRAZUG</h1>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            World of Warcraft Armory
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Search for characters to see their equipment, professions, and lore.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-2 text-left">
            <label htmlFor="name" className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Character Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. GGmax"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Search Armory
          </button>
        </form>

        {/* Quick Links / Footer */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-center gap-8 text-sm font-medium text-zinc-400 uppercase tracking-widest">
           <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">Guild Roster</a>
           <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">Hall of Fame</a>
           <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">Hardcore Deaths</a>
        </div>
      </div>
    </div>
  );
}
