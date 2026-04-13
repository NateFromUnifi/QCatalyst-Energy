"use client";

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
        {lastUpdated && (
          <div className="text-right text-sm text-gray-500">
            <span>Last updated</span>
            <br />
            <span className="text-gray-400">{lastUpdated}</span>
          </div>
        )}
      </div>
    </header>
  );
}
