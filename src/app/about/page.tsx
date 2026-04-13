import Link from "next/link";

export const metadata = {
  title: "About | QCatalyst Energy",
  description: "How QCatalyst Energy collects data, scores sentiment, and computes correlations.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-100 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function SourceRow({ name, source, frequency, description }: {
  name: string; source: string; frequency: string; description: string;
}) {
  return (
    <tr className="border-b border-gray-800">
      <td className="py-2 pr-4 font-medium text-gray-200">{name}</td>
      <td className="py-2 pr-4 text-gray-400">{source}</td>
      <td className="py-2 pr-4 text-gray-400">{frequency}</td>
      <td className="py-2 text-gray-400">{description}</td>
    </tr>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight hover:text-blue-400 transition-colors">
            QCatalyst Energy
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2">About This Project</h1>
        <p className="text-gray-400 mb-8">
          QCatalyst Energy is a quantitative dashboard that ingests public energy market data,
          scores daily news sentiment with an LLM, and plots derived indicators against crude oil
          price action to identify leading correlations.
        </p>

        <Section title="How Data Is Collected">
          <p className="text-gray-400 mb-4">
            An automated Python pipeline runs every weekday at 4:30 PM ET via GitHub Actions.
            It executes five steps in sequence:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-400 ml-2">
            <li>
              <span className="text-gray-200 font-medium">Fetch benchmark prices</span> — WTI, Brent, and WCS
              spot prices are pulled from OilPriceAPI, ensuring all three benchmarks land on the same
              date with no lag difference.
            </li>
            <li>
              <span className="text-gray-200 font-medium">Fetch USD index</span> — The DXY (US Dollar Index)
              is pulled from the FRED API (Federal Reserve Economic Data) as a macro indicator.
            </li>
            <li>
              <span className="text-gray-200 font-medium">Fetch fundamentals</span> — Weekly petroleum data
              (crude inventories, production, imports, Cushing stocks) is pulled from the EIA API
              (US Energy Information Administration). This data publishes every Wednesday.
            </li>
            <li>
              <span className="text-gray-200 font-medium">Score sentiment</span> — Headlines from energy news
              RSS feeds (OilPrice.com, Rigzone, EIA Today in Energy) are parsed and sent to an LLM
              (Llama 3.3 70B via Groq) with a calibrated prompt that scores macroeconomic sentiment
              from 1 (extreme bearish) to 10 (extreme bullish). Each headline is scored individually,
              then averaged.
            </li>
            <li>
              <span className="text-gray-200 font-medium">Compute correlations</span> — Pearson R correlation
              coefficients are calculated between each indicator and price changes across rolling
              windows (30, 60, 90 days) and time lags (0 to 5 days).
            </li>
          </ol>
        </Section>

        <Section title="Data Sources">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Source</th>
                  <th className="text-left py-2 pr-4">Frequency</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <SourceRow name="WTI Spot" source="OilPriceAPI" frequency="Daily" description="West Texas Intermediate crude oil spot price (USD/bbl)" />
                <SourceRow name="Brent Spot" source="OilPriceAPI" frequency="Daily" description="Brent crude oil spot price (USD/bbl)" />
                <SourceRow name="WCS Spot" source="OilPriceAPI" frequency="Daily" description="Western Canadian Select heavy crude spot price (USD/bbl)" />
                <SourceRow name="DXY" source="FRED API" frequency="Daily" description="Trade-weighted US Dollar Index" />
                <SourceRow name="Crude Inventories" source="EIA API" frequency="Weekly (Wed)" description="US commercial crude oil stocks excl. SPR (thousand bbl)" />
                <SourceRow name="Crude Production" source="EIA API" frequency="Weekly (Wed)" description="US crude oil field production (thousand bbl/day)" />
                <SourceRow name="News Sentiment" source="RSS + Groq" frequency="Daily" description="LLM-scored sentiment from energy news headlines (1-10 scale)" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Architecture">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-5 font-mono text-xs text-gray-400 leading-relaxed whitespace-pre">{
`GitHub Actions (Cron, weekdays 4:30 PM ET)
  |
  |-- OilPriceAPI ------> WTI, Brent, WCS prices
  |-- FRED API ----------> DXY (USD index)
  |-- EIA API -----------> Inventories, production (weekly)
  |-- RSS Feeds ---------> Headlines
  |     |
  |     '-- Groq LLM ----> Sentiment score (1-10)
  |
  '-- Correlation Engine -> Pearson R, rolling windows, lag analysis
          |
          v
      Supabase (PostgreSQL)
          |
          v
      Next.js on Vercel (this dashboard)`
          }</div>
        </Section>

        <Section title="Hypotheses">
          <p className="text-gray-400 mb-4">
            The dashboard tests four quantitative hypotheses about what drives oil prices:
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-200">H1: Inventory-Price</h3>
              <p className="text-sm text-gray-400">
                Tests whether EIA weekly inventory changes (draws/builds) inversely correlate
                with WTI price changes. Inventory builds signal oversupply and should push prices
                down; draws signal tightening and should push prices up.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-200">H2: Sentiment-Price Lead</h3>
              <p className="text-sm text-gray-400">
                Tests whether daily LLM-scored news sentiment leads WTI price direction by 1-2
                trading days. If sentiment today predicts price tomorrow, the market is slow to
                process public information.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-200">H3: Dollar-Oil Inverse</h3>
              <p className="text-sm text-gray-400">
                Tests whether weekly DXY (US Dollar Index) changes negatively correlate with WTI
                price changes. A stronger dollar makes oil more expensive for non-USD buyers,
                suppressing global demand.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-200">H4: WCS Spread Dynamics</h3>
              <p className="text-sm text-gray-400">
                Tests whether the WCS-WTI price differential correlates with US inventory levels
                and Canadian pipeline throughput constraints. The WCS discount widens when
                infrastructure is bottlenecked.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Tech Stack">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "Next.js", role: "Frontend framework" },
              { name: "Vercel", role: "Hosting" },
              { name: "Supabase", role: "PostgreSQL database" },
              { name: "GitHub Actions", role: "Pipeline automation" },
              { name: "Python", role: "Data pipeline" },
              { name: "Recharts", role: "Chart visualization" },
              { name: "Groq + Llama 3.3", role: "Sentiment scoring" },
              { name: "Tailwind CSS", role: "Styling" },
              { name: "TypeScript", role: "Type safety" },
            ].map((t) => (
              <div key={t.name} className="bg-gray-800/30 rounded-lg p-3 border border-gray-800">
                <div className="text-sm font-medium text-gray-200">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Cost">
          <p className="text-gray-400">
            The entire project runs on free tiers. OilPriceAPI (50 req/month), FRED API,
            EIA API, Groq (1,000 req/day), Supabase (500MB), Vercel, and GitHub Actions
            are all free. Total cost: <span className="text-gray-200 font-medium">$0/month</span>.
          </p>
        </Section>

        <footer className="border-t border-gray-800 pt-6 mt-10 pb-8">
          <p className="text-xs text-gray-600">
            Built as a quantitative finance learning project. Not financial advice.
            Data is sourced from public APIs and may be delayed. Correlations do not imply causation.
          </p>
        </footer>
      </main>
    </div>
  );
}
