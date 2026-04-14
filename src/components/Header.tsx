"use client";

import Link from "next/link";

interface HeaderProps {
  lastUpdated: string | null;
}

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            QCatalyst Energy
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Quantitative correlation dashboard for crude oil markets
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/about"
            className="text-sm text-gray-500 hover:text-gray-200 transition-colors"
          >
            About
          </Link>
          {lastUpdated && (
            <div className="text-right text-sm text-gray-500">
              <span>Data as of</span>
              <br />
              <span className="text-gray-400">{lastUpdated}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
