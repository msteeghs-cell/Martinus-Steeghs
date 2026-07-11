import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CalculationResult } from '../types';
import { 
  FileText, Copy, Printer, Check, TrendingDown, ShieldAlert, Award, Zap, HelpCircle, 
  BarChart3, LineChart as LineIcon, Landmark, Sparkles, ArrowRightLeft, Clock, PiggyBank,
  Sun, Battery, Flame, ArrowUpRight, TrendingUp, Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AdviceReportProps {
  calculation: CalculationResult;
  adviceMarkdown: string | null;
  loading: boolean;
}

export default function AdviceReport({ calculation, adviceMarkdown, loading }: AdviceReportProps) {
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'graph' | 'solar' | 'battery' | 'heatpump' | 'text'>('graph'); // Expanded tabs!

  const handleCopy = () => {
    if (adviceMarkdown) {
      navigator.clipboard.writeText(adviceMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-4" id="report-loading">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-2 animate-bounce">
          <Zap className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Energieplanner Rapportage Wordt Opgesteld</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Met de Energieplanner Peel en Maas analyseren we nu jouw verbruik en isolatiegegevens onder de NTA 8800 richtlijnen. We berekenen de subsidies (ISDE en NIP) en stellen een optimaal stappenplan op...
        </p>
        <div className="flex justify-center gap-1.5 pt-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping delay-75"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping delay-150"></span>
        </div>
      </div>
    );
  }

  // Prepara data for Recharts
  const chartData = calculation.measures.map(m => ({
    name: m.name.length > 25 ? m.name.substring(0, 25) + '...' : m.name,
    fullName: m.name,
    'Netto kosten': Math.round(m.netCosts),
    'ISDE subsidie': Math.round(m.isdeSubsidy),
    'NIP subsidie': Math.round(m.nipSubsidy),
    'Bruto kosten': Math.round(m.brutoCosts),
    'Jaarbesparing': Math.round(m.savingEuro),
    'Terugverdientijd': Number(m.tvt.toFixed(1)),
  }));

  // Cumulative breakdown over 15 years
  const totalNetCosts = Math.max(1, Math.round(calculation.totals.net));
  const annualSavings = Math.max(1, Math.round(calculation.totals.savingsEuro));
  const breakEvenTimeline = Array.from({ length: 16 }, (_, year) => {
    const netSavings = annualSavings * year;
    const balance = netSavings - totalNetCosts;
    return {
      year: `${year}j`,
      'Netto Resultaat': balance,
      'Gecumuleerde Besparing': netSavings,
      'Investering Line': -totalNetCosts
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find original long name if truncated
      const matched = chartData.find(d => d.name === label);
      const displayName = matched ? matched.fullName : label;
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-800 mb-1">{displayName}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-4">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name}:
              </span>
              <span className="font-semibold text-slate-800">
                {p.name.includes('Terugverdientijd') ? `${p.value} jaar` : `€ ${p.value.toLocaleString('nl-NL')}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const BreakEvenTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const balance = payload[0].value;
      const isPositive = balance >= 0;
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-800 mb-1">Na {label}aar:</p>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Netto Resultaat:</span>
            <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '+' : ''}€ {balance.toLocaleString('nl-NL')}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-[10px] text-slate-400">
            <span>Totale besparing:</span>
            <span>€ {payload[1]?.value.toLocaleString('nl-NL')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="advice-report-section">
      {/* Interactieve KPI Kaarten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gasbesparing</span>
            <span className="text-lg font-bold text-slate-800">
              {Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0))} m³
            </span>
            <span className="block text-[10px] text-emerald-600">/ jaar</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subsidies</span>
            <span className="text-lg font-bold text-slate-800">
              €{Math.round(calculation.totals.isde + calculation.totals.nip).toLocaleString('nl-NL')}
            </span>
            <span className="block text-[10px] text-blue-600">ISDE + NIP</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Eigen Bijdrage</span>
            <span className="text-lg font-bold text-slate-800">
              €{Math.round(calculation.totals.net).toLocaleString('nl-NL')}
            </span>
            <span className="block text-[10px] text-orange-600">Netto kosten</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Zonnestroom</span>
            <span className="text-lg font-bold text-slate-800">
              {Math.round(calculation.solar.annualYieldKwh)} kWh
            </span>
            <span className="block text-[10px] text-amber-600">Prognose / jr</span>
          </div>
        </div>
      </div>

      {/* NIP Subsidie alert panel */}
      {calculation.eligibleNip ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start">
          <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-emerald-800">NIP-Subsidie €2.900 Beschikbaar!</h4>
            <p className="text-xs text-emerald-700/90 mt-0.5">
              Fantastisch nieuws! Je voldoet aan de criteria voor het gemeentelijke Nationaal Isolatieprogramma (NIP). 
              De €2.900 is in de berekening hiernaast reeds in mindering gebracht op de netto eigen bijdrage.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-700">Geen NIP-Subsidie (€2.900) mogelijk</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {calculation.nipExplanation}
            </p>
          </div>
        </div>
      )}

      {/* Advies rapportage container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden print:border-0 print:shadow-none">
        
        {/* Navigation Tabs Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex flex-wrap bg-slate-200/60 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'graph' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>📊 Financiële Planner</span>
            </button>
            <button
              onClick={() => setActiveTab('solar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'solar' 
                  ? 'bg-white text-amber-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>☀️ Zonnepanelen & Saldering</span>
            </button>
            <button
              onClick={() => setActiveTab('battery')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'battery' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Battery className="w-3.5 h-3.5 text-blue-500" />
              <span>🔋 Thuisbatterij</span>
            </button>
            <button
              onClick={() => setActiveTab('heatpump')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'heatpump' 
                  ? 'bg-white text-orange-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>🔥 Warmtepomp</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'text' 
                  ? 'bg-white text-slate-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>📄 Advies Rapport (AI)</span>
            </button>
          </div>
          
          <div className="flex gap-2">
            {activeTab === 'text' && adviceMarkdown && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
                id="copy-report-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gekopieerd!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiëren</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
              id="print-report-btn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Afdrukken / PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Content 1: Graphical Overview */}
        {activeTab === 'graph' && (
          <div className="p-6 md:p-8 space-y-8 animate-fadeIn" id="graphical-dashboard">
            
            {/* Visual Intro explaining the financials */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 grid md:grid-cols-3 gap-6 items-center">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <h4>Hoe werkt jouw verduurzamings-rekening?</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Verduurzamen is een slimme investering. Jouw totale <strong>bruto kosten</strong> worden flink verlaagd door twee aantrekkelijke subsidies: de landelijke <strong>ISDE subsidie</strong> én (indien van toepassing) de extra gemeentelijke <strong>NIP subsidie</strong>. 
                  Het bedrag dat overblijft is jouw <strong>netto eigen bijdrage</strong>. Doordat je direct maandelijks bespaart op gas en elektriciteit, verdien je dit restbedrag razendsnel terug!
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Jouw break-even punt</span>
                <div className="text-center">
                  <span className="text-2xl font-extrabold text-emerald-600">
                    {calculation.totals.tvt > 0 ? `${calculation.totals.tvt.toFixed(1)} jaar` : '0 jaar'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Gemiddelde terugverdientijd</p>
                </div>
              </div>
            </div>

            {/* Section 1: Investering & Subsidies Stacked Bar Chart */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">1. Waar gaat het geld naartoe? (Bruto vs. Subsidie vs. Netto)</h4>
              </div>
              <p className="text-xs text-slate-500">
                Deze balken tonen de totale bruto kosten per gekozen isolatiemaatregel. De groene en blauwe delen laten zien welk deel je direct cadeau krijgt via subsidies. Alleen het oranje deel betaal je zelf!
              </p>
              
              {chartData.length > 0 ? (
                <div className="h-64 md:h-80 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `€${v}`} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconSize={10} 
                        fontSize={10} 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 10, fontSize: '11px' }}
                      />
                      <Bar dataKey="ISDE subsidie" stackId="a" fill="#10b981" name="ISDE Subsidie (Overheid)" />
                      <Bar dataKey="NIP subsidie" stackId="a" fill="#3b82f6" name="NIP Subsidie (Gemeente)" />
                      <Bar dataKey="Netto kosten" stackId="a" fill="#f97316" name="Netto Eigen Bijdrage (Jij betaalt)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                  Geen isolatiemaatregelen geselecteerd om grafisch weer te geven.
                </div>
              )}
            </div>

            {/* Section 2: Payback Time Comparison & Savings Info */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Payback bar chart */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-800">2. Terugverdientijd per Maatregel</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Hoe korter de balk, hoe sneller je de investering hebt terugverdiend via een lagere gasrekening.
                </p>

                {chartData.length > 0 ? (
                  <div className="h-56 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v} jr`} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="Terugverdientijd" 
                          fill="#f59e0b" 
                          name="Terugverdientijd in jaren" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                    Geen maatregelen beschikbaar.
                  </div>
                )}
              </div>

              {/* Annual Savings Chart or Info Card */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-800">3. Jaarlijkse Structurele Besparing</h4>
                </div>
                <p className="text-xs text-slate-500">
                  De jaarlijkse structurele besparing op je energierekening in euro's na installatie.
                </p>

                {chartData.length > 0 ? (
                  <div className="h-56 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `€${v}`} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="Jaarbesparing" 
                          fill="#10b981" 
                          name="Jaarlijkse besparing (€)" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                    Geen maatregelen beschikbaar.
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Break-Even Timeline Area Chart */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LineIcon className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">4. Jouw Saldo & Vermogensopbouw over 15 Jaar</h4>
              </div>
              <p className="text-xs text-slate-500">
                In het begin start je op een negatief saldo vanwege de netto eigen bijdrage. Ieder jaar verdampen je kosten door de structurele besparingen. Zodra de lijn boven de stippellijn (€0) uitkomt, heb je de maatregelen volledig terugverdiend en leveren ze pure, belastingvrije winst op!
              </p>

              <div className="h-64 md:h-72 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={breakEvenTimeline}
                    margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `€${v}`} />
                    <Tooltip content={<BreakEvenTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Break-even', fill: '#94a3b8', fontSize: 9, position: 'top' }} />
                    <defs>
                      <linearGradient id="colorResult" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="Netto Resultaat" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorResult)" 
                      name="Netto financieel resultaat"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 px-2">
                <span>Start: -€{totalNetCosts.toLocaleString('nl-NL')} (Investering)</span>
                <span className="font-semibold text-emerald-600">Jaar 15: +€{Math.round(breakEvenTimeline[15]['Netto Resultaat']).toLocaleString('nl-NL')} (Pure Winst)</span>
              </div>
            </div>

          </div>
        )}

        {/* Tab Content 2: Zonnepanelen & Saldering */}
        {activeTab === 'solar' && (
          <div className="p-6 md:p-8 space-y-8 animate-fadeIn" id="solar-dashboard">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                Zonnepanelen & Einde Salderingsregeling
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gepersonaliseerd advies gebaseerd op een jaaropbrengst van <strong>{Math.round(calculation.solar.annualYieldKwh)} kWh</strong> met <strong>{calculation.tech.aantalZonnepanelen} zonnepanelen</strong>.
              </p>
            </div>

            {/* Grid statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jaarlijkse zonnestroom</span>
                <span className="text-xl font-extrabold text-slate-800">{Math.round(calculation.solar.annualYieldKwh).toLocaleString('nl-NL')} kWh</span>
                <p className="text-xs text-slate-500">Zonne-energie opgewekt per jaar.</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct eigen verbruik</span>
                <span className="text-xl font-extrabold text-emerald-600">{Math.round(calculation.solar.selfConsumptionBase)}%</span>
                <p className="text-xs text-slate-500">Opgewekte stroom die je direct verbruikt.</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teruggeleverd stroom</span>
                <span className="text-xl font-extrabold text-blue-600">{Math.round(100 - calculation.solar.selfConsumptionBase)}%</span>
                <p className="text-xs text-slate-500">Stroom die je teruglevert aan het net.</p>
              </div>
            </div>

            {/* Allocation Chart */}
            <div className="grid md:grid-cols-2 gap-8 items-center bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  Jouw stroomverdeling zonder accu:
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Direct binnenshuis verbruikt:</span>
                    <span className="font-bold text-emerald-600">{Math.round(calculation.solar.absoluteSelfConsumptionBaseKwh).toLocaleString('nl-NL')} kWh</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${calculation.solar.selfConsumptionBase}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Teruggeleverd aan het elektriciteitsnet:</span>
                    <span className="font-bold text-blue-600">{Math.round(calculation.solar.gridFeedBaseKwh).toLocaleString('nl-NL')} kWh</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${100 - calculation.solar.selfConsumptionBase}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Pie Chart visual */}
              <div className="h-48 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Direct Eigen Verbruik', value: calculation.solar.absoluteSelfConsumptionBaseKwh },
                        { name: 'Teruggeleverd Net', value: calculation.solar.gridFeedBaseKwh }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip formatter={(value) => `${Math.round(Number(value))} kWh`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Explanatory impact box of End of Saldering */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 space-y-4">
              <div className="flex gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-800">Consequentie Einde Salderingsregeling (Vanaf 2027)</h4>
                  <p className="text-xs text-rose-700/90 leading-relaxed">
                    Als de salderingsregeling per 2027 stopt, mag je de stroom die je teruglevert aan het net niet meer 1:1 wegstrepen tegen de stroom die je op andere momenten afneemt. Voor de teruggeleverde stroom ontvang je dan slechts een minimale vergoeding (geschat op € 0,06 per kWh), terwijl je voor afgenomen stroom de volledige prijs van <strong>€ {calculation.house.elektraPrijs.toFixed(2)} per kWh</strong> betaalt.
                  </p>
                </div>
              </div>

              {/* Exact financial loss calculation based on data */}
              <div className="bg-white rounded-xl p-5 border border-rose-100 grid md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-rose-600 uppercase tracking-wide">Berekend verlies post-2027:</span>
                  <p className="text-xs text-slate-600">
                    Omdat je jaarlijks <strong>{Math.round(calculation.solar.gridFeedBaseKwh).toLocaleString('nl-NL')} kWh</strong> teruglevert, verlies je jaarlijks belastingvoordeel op deze kilowatturen.
                  </p>
                </div>
                <div className="text-right md:border-l md:border-slate-100 md:pl-5">
                  <span className="text-3xl font-extrabold text-rose-600">
                    € {Math.round(calculation.solar.gridFeedBaseKwh * (calculation.house.elektraPrijs - 0.06)).toLocaleString('nl-NL')}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">Extra kosten per jaar na afschaffing saldering</span>
                </div>
              </div>

              <div className="text-xs text-rose-700/90 bg-rose-100/50 p-3 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0" />
                <span><strong>Advies:</strong> Voorkom dit verlies door je direct verbruik te verhogen óf te kiezen voor een thuisbatterij waarmee je stroom opslaat in plaats van goedkoop weg te geven!</span>
              </div>
            </div>

            {/* Smart steps to optimize solar */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Hoe verhoog je zelf je directe verbruik (Zonder accu)?
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5 leading-relaxed">
                <li><strong>Slimme huishoudelijke apparaten:</strong> Programmeer de wasmachine, vaatwasser en droger om uitsluitend te draaien tussen 11:00 en 15:00 uur, wanneer de zon maximaal schijnt.</li>
                <li><strong>Warmtepomp sturing:</strong> Laat je warmtepomp overdag de boiler opwarmen tot een hogere temperatuur (thermische opslag), zodat de warmtepomp 's avonds en 's nachts minder hard hoeft te werken.</li>
                <li><strong>Elektrische auto (EV):</strong> Laad je auto overdag thuis op met een laadpaal die kan sturen op overtollige zonnestroom (solar-only modus).</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Content 3: Thuisbatterij */}
        {activeTab === 'battery' && (
          <div className="p-6 md:p-8 space-y-8 animate-fadeIn" id="battery-dashboard">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Battery className="w-5 h-5 text-blue-500" />
                Thuisbatterij &amp; Slimme Sturing
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gedetailleerde analyse van de financiële en technische haalbaarheid voor een <strong>5 kWh</strong>, <strong>10 kWh</strong> of <strong>15 kWh</strong> thuisaccu op basis van je jaarlijkse zonneopbrengst van <strong>{Math.round(calculation.solar.annualYieldKwh)} kWh</strong>.
              </p>
            </div>

            {/* Current Config Status Alert */}
            {calculation.tech.capaciteitAccu === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start text-xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" id="battery-not-configured-alert" />
                <div>
                  <span className="font-bold text-amber-800 block">Geen actieve thuisaccu ingesteld</span>
                  <p className="text-[11px] text-amber-700/90 mt-0.5 leading-relaxed">
                    Je hebt links bij de installatiegegevens momenteel 0 kWh ingesteld. Hieronder vind je de vergelijkingstabel en analyse van de verschillende capaciteiten, zodat je kunt zien welke optie het beste bij jouw woning in Peel en Maas past. Je kunt links altijd een capaciteit invullen om je hoofdrapport direct te updaten!
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-start text-xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" id="battery-configured-alert" />
                <div>
                  <span className="font-bold text-emerald-800 block">Thuisaccu geconfigureerd: {calculation.tech.capaciteitAccu} kWh</span>
                  <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-relaxed">
                    Je hebt een actieve accucapaciteit van {calculation.tech.capaciteitAccu} kWh ingesteld met een {calculation.tech.typeContract} contract. Hieronder zie je hoe deze zich verhoudt tot de standaard marktopties.
                  </p>
                </div>
              </div>
            )}

            {/* Visual self-consumption increase comparison bar */}
            {calculation.tech.capaciteitAccu > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  Stijging van Direct Verbruik door jouw geconfigureerde Thuisbatterij
                </h4>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Zonder Thuisbatterij (Basis):</span>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div className="bg-slate-400 h-3 rounded-full" style={{ width: `${calculation.solar.selfConsumptionBase}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-[40px]">{Math.round(calculation.solar.selfConsumptionBase)}%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-emerald-700">Met jouw Thuisbatterij ({calculation.tech.capaciteitAccu} kWh):</span>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-emerald-100 rounded-full h-3">
                          <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${calculation.solar.selfConsumptionWithBattery}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 min-w-[40px]">{Math.round(calculation.solar.selfConsumptionWithBattery)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block">Efficiëntie toename:</span>
                    <span className="text-3xl font-extrabold text-emerald-600">+{Math.round(calculation.battery.efficiencyIncrease)}%</span>
                    <p className="text-[10px] text-slate-500 mt-1">Meer gratis direct verbruik van eigen zonnestroom.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Three Option Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {calculation.battery.options?.map((opt) => {
                return (
                  <div 
                    key={opt.capacityKwh} 
                    className={`relative border rounded-3xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between ${
                      opt.bestSuited 
                        ? 'bg-gradient-to-br from-blue-50/20 via-white to-emerald-50/10 border-blue-200 shadow-blue-50/20 ring-1 ring-blue-100'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {opt.bestSuited && (
                      <div className="absolute -top-3 right-6 bg-gradient-to-r from-blue-600 to-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                        ⭐ Best Geadviseerd
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Option Header */}
                      <div className="border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{opt.capacityKwh} kWh capaciteit</span>
                        <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                          <Battery className={`w-4 h-4 ${opt.bestSuited ? 'text-blue-500' : 'text-slate-400'}`} />
                          {opt.label}
                        </h4>
                      </div>

                      {/* Investments */}
                      <div className="grid grid-cols-2 gap-2 py-1">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Netto Investering</span>
                          <span className="text-xl font-black text-slate-800">€ {Math.round(opt.netInvestment).toLocaleString('nl-NL')}</span>
                          <span className="text-[9px] text-slate-400 block">Btw teruggevraagd</span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Bruto Kosten</span>
                          <span className="text-base font-bold text-slate-600">€ {Math.round(opt.brutoInvestment).toLocaleString('nl-NL')}</span>
                          <span className="text-[9px] text-emerald-600 font-semibold block">Btw terug: €{Math.round(opt.btwRefund).toLocaleString('nl-NL')}</span>
                        </div>
                      </div>

                      {/* Payback period and annual savings */}
                      <div className="bg-slate-50/70 rounded-2xl p-3.5 space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-500 font-medium">Jaarbespar. (Vast contract):</span>
                            <span className="font-bold text-slate-700">€ {Math.round(opt.annualSavingsVastPost2027).toLocaleString('nl-NL')} / jr</span>
                          </div>
                          <div className="flex justify-between items-baseline text-xs">
                            <span className="text-slate-500 font-bold">Jaarbespar. (Dynamisch):</span>
                            <span className="font-extrabold text-emerald-600">€ {Math.round(opt.annualSavingsDynamisch).toLocaleString('nl-NL')} / jr</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200/50 pt-2 space-y-1 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">TVT (Vast contract):</span>
                            <span className="font-bold text-slate-700">{opt.annualSavingsVastPost2027 > 0 ? `${opt.tvtPost2027.toFixed(1)} jaar` : 'Geen'}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-700">TVT (Dynamisch + Trading):</span>
                            <span className="text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">{opt.annualSavingsDynamisch > 0 ? `${opt.tvtDynamisch.toFixed(1)} jaar` : 'Geen'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Technical Yield */}
                      <div className="text-[11px] space-y-1 bg-blue-50/20 p-2.5 rounded-xl border border-blue-50">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Eigen verbruik verhoging:</span>
                          <span className="font-bold text-blue-600">+{Math.round(opt.efficiencyIncrease)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nieuw direct verbruik:</span>
                          <span className="font-bold text-slate-700">{Math.round(opt.selfConsumptionWithBattery)}%</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal mt-4 border-t border-slate-100 pt-2.5">
                      {opt.recommendation}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Complete Battery Comparison Table */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Gedetailleerde Vergelijkingstabel Thuisbatterijen
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/30">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-500">Financiële &amp; Technische Posten</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 bg-blue-50/10">Klein (5 kWh)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 bg-emerald-50/10">Middel (10 kWh)</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 bg-indigo-50/10">Groot (15 kWh)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Gemiddelde Bruto Kosten (Incl. installatie)</td>
                      <td className="px-5 py-3 text-right text-slate-800">€ {Math.round(calculation.battery.options[0].brutoInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-800">€ {Math.round(calculation.battery.options[1].brutoInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-800">€ {Math.round(calculation.battery.options[2].brutoInvestment).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Btw-teruggave (21% via Belastingdienst voor handelssturing)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-€ {Math.round(calculation.battery.options[0].btwRefund).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-€ {Math.round(calculation.battery.options[1].btwRefund).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-€ {Math.round(calculation.battery.options[2].btwRefund).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr className="bg-slate-50/30 font-bold">
                      <td className="px-5 py-3 text-slate-800">Netto Investering</td>
                      <td className="px-5 py-3 text-right text-slate-900">€ {Math.round(calculation.battery.options[0].netInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-900">€ {Math.round(calculation.battery.options[1].netInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-900">€ {Math.round(calculation.battery.options[2].netInvestment).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Stijging direct verbruik (Zonne-energie)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">+{Math.round(calculation.battery.options[0].efficiencyIncrease)}%</td>
                      <td className="px-5 py-3 text-right text-emerald-600">+{Math.round(calculation.battery.options[1].efficiencyIncrease)}%</td>
                      <td className="px-5 py-3 text-right text-emerald-600">+{Math.round(calculation.battery.options[2].efficiencyIncrease)}%</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Jaarbesparing Vast contract (Pre-2027)</td>
                      <td className="px-5 py-3 text-right text-slate-500">€ {Math.round(calculation.battery.options[0].annualSavingsVastPre2027).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-500">€ {Math.round(calculation.battery.options[1].annualSavingsVastPre2027).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-500">€ {Math.round(calculation.battery.options[2].annualSavingsVastPre2027).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Jaarbesparing Vast contract (Vanaf 2027 / Post-saldering)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[0].annualSavingsVastPost2027).toLocaleString('nl-NL')} / jr</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[1].annualSavingsVastPost2027).toLocaleString('nl-NL')} / jr</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[2].annualSavingsVastPost2027).toLocaleString('nl-NL')} / jr</td>
                    </tr>
                    <tr className="bg-emerald-50/10 font-bold">
                      <td className="px-5 py-3 text-slate-600 font-medium">Jaarbesparing Dynamisch contract (Met smart-trading)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[0].annualSavingsDynamisch).toLocaleString('nl-NL')} / jr</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[1].annualSavingsDynamisch).toLocaleString('nl-NL')} / jr</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.battery.options[2].annualSavingsDynamisch).toLocaleString('nl-NL')} / jr</td>
                    </tr>
                    <tr className="bg-slate-50/50 font-bold">
                      <td className="px-5 py-3 text-slate-700">Terugverdientijd (TVT) Vast contract (Vanaf 2027)</td>
                      <td className="px-5 py-3 text-right text-slate-800">{calculation.battery.options[0].annualSavingsVastPost2027 > 0 ? `${calculation.battery.options[0].tvtPost2027.toFixed(1)} jr` : 'Geen'}</td>
                      <td className="px-5 py-3 text-right text-slate-800">{calculation.battery.options[1].annualSavingsVastPost2027 > 0 ? `${calculation.battery.options[1].tvtPost2027.toFixed(1)} jr` : 'Geen'}</td>
                      <td className="px-5 py-3 text-right text-slate-800">{calculation.battery.options[2].annualSavingsVastPost2027 > 0 ? `${calculation.battery.options[2].tvtPost2027.toFixed(1)} jr` : 'Geen'}</td>
                    </tr>
                    <tr className="bg-blue-50/10 font-black text-slate-900">
                      <td className="px-5 py-3 text-slate-800">Terugverdientijd (TVT) Dynamisch contract + Arbitrage</td>
                      <td className="px-5 py-3 text-right text-blue-700">{calculation.battery.options[0].annualSavingsDynamisch > 0 ? `${calculation.battery.options[0].tvtDynamisch.toFixed(1)} jr` : 'Geen'}</td>
                      <td className="px-5 py-3 text-right text-blue-700">{calculation.battery.options[1].annualSavingsDynamisch > 0 ? `${calculation.battery.options[1].tvtDynamisch.toFixed(1)} jr` : 'Geen'}</td>
                      <td className="px-5 py-3 text-right text-blue-700">{calculation.battery.options[2].annualSavingsDynamisch > 0 ? `${calculation.battery.options[2].tvtDynamisch.toFixed(1)} jr` : 'Geen'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advice Box */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 md:p-6 space-y-3">
              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Slimme Sturing &amp; Arbitrage Toelichting
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Een thuisaccu is in Nederland financieel pas écht interessant als deze slim wordt aangestuurd. In Peel en Maas zien we dat veel bewoners kiezen voor een <strong>dynamisch energiecontract</strong> in combinatie met slimme software (zoals Bliq, Home Assistant, of de app van de accufabrikant zelf). 
              </p>
              <div className="text-[11px] text-slate-500 pt-1.5 leading-relaxed border-t border-blue-100/60">
                <p className="font-semibold text-slate-700">Hoe werkt dit in de praktijk?</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li><strong>Zomer/Lente:</strong> De accu laadt overdag op met overtollige, gratis zonnestroom en levert deze stroom 's avonds terug wanneer de stroomprijzen op het net het hoogst zijn.</li>
                  <li><strong>Winter/Herfst:</strong> Zelfs als er weinig zon is, kan de accu 's nachts stroom inkopen wanneer de tarieven (vaak extreem) laag of negatief zijn door windenergie, en deze overdag inzetten tijdens de dure piekuren (arbitrage). Hiermee verdubbel je de bruikbaarheid van je batterij over het hele jaar!</li>
                  <li><strong>Btw-teruggave:</strong> Bij actieve sturing op dynamische tarieven ziet de Belastingdienst je als energie-ondernemer. Hierdoor kun je de volledige 21% btw op aanschaf en installatie terugvragen, wat de terugverdientijd direct met ruim 2 jaar verkort!</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 4: Warmtepomp */}
        {activeTab === 'heatpump' && (
          <div className="p-6 md:p-8 space-y-8 animate-fadeIn" id="heatpump-dashboard">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Warmtepomp Vergelijking &amp; Financieel Advies
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gedetailleerde analyse van de financiële en technische haalbaarheid voor een <strong>Hybride</strong> of <strong>All-Electric</strong> warmtepomp op basis van je resterende gasverbruik van <strong>{Math.round(calculation.heatpump.remainingGasM3)} m³</strong>.
              </p>
            </div>

            {/* General Suitability Banner */}
            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Algemene Isolatiediagnose</span>
                  {calculation.heatpump.isInsulatedSufficiently ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-3 items-start h-full">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide block">Woning is warmtepomp-ready!</span>
                        <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                          De isolatie van je woning (dak, gevel, vloer, HR++ glas) is momenteel voldoende om efficiënt te verwarmen met een warmtepomp. Je kunt met een gerust hart de stap zetten naar een hybride of volledig elektrisch systeem!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex gap-3 items-start h-full">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wide block">Isolatie nog onvoldoende</span>
                        <p className="text-xs text-rose-700/90 mt-1 leading-relaxed">
                          De huidige thermische schil is nog te matig om direct over te stappen. We raden dringend aan eerst de aanbevolen isolatiemaatregelen (zoals spouw- of vloerisolatie en HR++ glas) uit te voeren om warmteverlies te beperken.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-center space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resterende gasbehoefte</span>
                <p className="text-2xl font-extrabold text-slate-800">{Math.round(calculation.heatpump.remainingGasM3)} m³ / jr</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  {calculation.house.verbruikM3 > 0 ? (
                    `Gereduceerd van ${calculation.house.verbruikM3} m³ (-${Math.round(100 * (calculation.house.verbruikM3 - calculation.heatpump.remainingGasM3) / calculation.house.verbruikM3)}% door isolatie)`
                  ) : (
                    'Geen gasbesparing berekend'
                  )}
                </p>
              </div>
            </div>

            {/* Detailed Cards Comparing the Two options */}
            <div className="grid md:grid-cols-2 gap-8">
              {calculation.heatpump.options?.map((opt) => {
                const isAE = opt.type === 'All-Electric';
                return (
                  <div 
                    key={opt.type} 
                    className={`relative border rounded-3xl p-6 shadow-sm transition-all duration-300 flex flex-col justify-between ${
                      isAE 
                        ? opt.isFeasible 
                          ? 'bg-gradient-to-br from-indigo-50/20 via-white to-emerald-50/10 border-indigo-150 shadow-indigo-50/20'
                          : 'bg-white border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Badge */}
                    {isAE && opt.isFeasible && (
                      <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                        🌿 Volledig Gasloos &amp; Duurzaam
                      </div>
                    )}
                    {!isAE && opt.isFeasible && (
                      <div className="absolute -top-3 right-6 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                        ⚡ Pragmatische Stap
                      </div>
                    )}

                    <div className="space-y-5">
                      {/* Option Header */}
                      <div className="border-b border-slate-100 pb-4">
                        <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                          {isAE ? <Award className="w-5 h-5 text-indigo-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
                          {opt.type} Warmtepomp
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {isAE 
                            ? 'Volledige vervanging van de CV-ketel voor verwarming en warm tapwater.'
                            : 'Samenwerking met je bestaande CV-ketel. De ketel helpt alleen bij strenge vorst en tapwater.'}
                        </p>
                      </div>

                      {/* Investments & Subsidies */}
                      <div className="grid grid-cols-2 gap-4 py-1">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Netto Investering</span>
                          <span className="text-2xl font-black text-slate-800">€ {Math.round(opt.netInvestment).toLocaleString('nl-NL')}</span>
                          <span className="text-[10px] text-slate-500 block">Bruto: €{Math.round(opt.brutoInvestment).toLocaleString('nl-NL')}</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ISDE Subsidie</span>
                          <span className="text-xl font-bold text-emerald-600">€ {Math.round(opt.subsidy).toLocaleString('nl-NL')}</span>
                          <span className="text-[10px] text-slate-500 block">Teruggave achteraf</span>
                        </div>
                      </div>

                      {/* Payback period and annual savings */}
                      <div className="bg-slate-50/70 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-slate-600">Netto Jaarbesparing:</span>
                          <span className="text-base font-bold text-slate-800">€ {Math.round(opt.netSavingsEuro).toLocaleString('nl-NL')} / jr</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                          <span className="text-xs font-bold text-slate-700">Terugverdientijd:</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${
                            opt.tvt < 8 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : opt.tvt < 15 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-150 text-slate-700'
                          }`}>
                            {opt.netSavingsEuro > 0 ? `${opt.tvt.toFixed(1)} jaar` : 'Geen rendement'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Energy Shift Metrics */}
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Gasbesparing:</span>
                          <span className="font-semibold text-emerald-600">-{Math.round(opt.gasSavingsM3)} m³ (-€ {Math.round(opt.gasSavingsEuro)})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Extra elektriciteitsverbruik:</span>
                          <span className="font-semibold text-rose-600">+{Math.round(opt.elecIncreaseKwh)} kWh (+€ {Math.round(opt.elecCostEuro)})</span>
                        </div>
                        {opt.fixedGasSavingsEuro > 0 && (
                          <div className="flex justify-between text-indigo-700 font-semibold bg-indigo-50/50 px-2 py-1 rounded">
                            <span>Vastrecht gas gespaard:</span>
                            <span>+€ {opt.fixedGasSavingsEuro} / jr</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feasibility Status Check */}
                    <div className={`mt-5 pt-4 border-t border-slate-100 flex gap-2.5 items-start text-xs ${
                      opt.isFeasible ? 'text-slate-700' : 'text-slate-500'
                    }`}>
                      {opt.isFeasible ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className={`font-bold block ${opt.isFeasible ? 'text-slate-800' : 'text-slate-600'}`}>
                          {opt.isFeasible ? 'Haalbaar &amp; Geschikt' : 'Nog niet direct geschikt'}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{opt.feasibilityReason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complete Comparison Table */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Gedetailleerde Financiële Vergelijkingstabel
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/30">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-500">Financiële Post</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 bg-blue-50/20">Optie A: Hybride</th>
                      <th className="px-5 py-3 text-right font-bold text-slate-700 bg-indigo-50/20">Optie B: All-Electric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Gemiddelde Bruto Kosten</td>
                      <td className="px-5 py-3 text-right text-slate-800">€ {Math.round(calculation.heatpump.options[0].brutoInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-800">€ {Math.round(calculation.heatpump.options[1].brutoInvestment).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">ISDE Subsidie (teruggave)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-€ {Math.round(calculation.heatpump.options[0].subsidy).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-€ {Math.round(calculation.heatpump.options[1].subsidy).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr className="bg-slate-50/30 font-bold">
                      <td className="px-5 py-3 text-slate-800">Netto Investering</td>
                      <td className="px-5 py-3 text-right text-slate-900">€ {Math.round(calculation.heatpump.options[0].netInvestment).toLocaleString('nl-NL')}</td>
                      <td className="px-5 py-3 text-right text-slate-900">€ {Math.round(calculation.heatpump.options[1].netInvestment).toLocaleString('nl-NL')}</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Gasbesparing (jaarlijks)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-{Math.round(calculation.heatpump.options[0].gasSavingsM3)} m³ (-€ {Math.round(calculation.heatpump.options[0].gasSavingsEuro).toLocaleString('nl-NL')})</td>
                      <td className="px-5 py-3 text-right text-emerald-600">-{Math.round(calculation.heatpump.options[1].gasSavingsM3)} m³ (-€ {Math.round(calculation.heatpump.options[1].gasSavingsEuro).toLocaleString('nl-NL')})</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Elektra stijging (jaarlijks)</td>
                      <td className="px-5 py-3 text-right text-rose-600">+{Math.round(calculation.heatpump.options[0].elecIncreaseKwh)} kWh (+€ {Math.round(calculation.heatpump.options[0].elecCostEuro).toLocaleString('nl-NL')})</td>
                      <td className="px-5 py-3 text-right text-rose-600">+{Math.round(calculation.heatpump.options[1].elecIncreaseKwh)} kWh (+€ {Math.round(calculation.heatpump.options[1].elecCostEuro).toLocaleString('nl-NL')})</td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3 text-slate-600 font-medium">Besparing vastrecht gas (jaarlijks)</td>
                      <td className="px-5 py-3 text-right text-slate-400">€ 0 (gasaansluiting blijft)</td>
                      <td className="px-5 py-3 text-right text-emerald-600">+€ {calculation.heatpump.options[1].fixedGasSavingsEuro} (geen gasmeter)</td>
                    </tr>
                    <tr className="bg-slate-50/50 font-extrabold text-slate-800">
                      <td className="px-5 py-3">Netto Besparing per jaar</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.heatpump.options[0].netSavingsEuro).toLocaleString('nl-NL')} / jr</td>
                      <td className="px-5 py-3 text-right text-emerald-600">€ {Math.round(calculation.heatpump.options[1].netSavingsEuro).toLocaleString('nl-NL')} / jr</td>
                    </tr>
                    <tr className="bg-slate-100/30 font-black text-slate-900">
                      <td className="px-5 py-3">Terugverdientijd (TVT)</td>
                      <td className="px-5 py-3 text-right text-blue-700">{calculation.heatpump.options[0].netSavingsEuro > 0 ? `${calculation.heatpump.options[0].tvt.toFixed(1)} jaar` : 'Onbekend'}</td>
                      <td className="px-5 py-3 text-right text-indigo-700">{calculation.heatpump.options[1].netSavingsEuro > 0 ? `${calculation.heatpump.options[1].tvt.toFixed(1)} jaar` : 'Onbekend'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom explanation / description from model */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 md:p-6 space-y-3">
              <h4 className="text-sm font-bold text-orange-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-orange-600" />
                Algemeen Advies &amp; Conclusie
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {calculation.heatpump.explanation}
              </p>
              <div className="text-[11px] text-slate-500 pt-1.5 leading-relaxed border-t border-orange-100/60">
                <p className="font-semibold text-slate-700">Wanneer kies je wat?</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li><strong>Kies Hybride</strong> als je huidige CV-ketel nog relatief nieuw is (jonger dan 8 jaar), je woning geen vloerverwarming heeft, of je de initiële investering lager wilt houden. De CV-ketel springt dan alleen bij voor tapwater en op de koudste winterdagen.</li>
                  <li><strong>Kies All-Electric</strong> als je CV-ketel aan vervanging toe is, je woning al zeer goed geïsoleerd is (Energielabel A, B of C), en je beschikt over laag-temperatuurverwarming (zoals vloerverwarming of speciale LTV-radiatoren). Dit is de enige route naar een volledig CO2-neutrale en gasloze woning in Peel en Maas.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 5: Original Text-based advice markdown */}
        {activeTab === 'text' && (
          <div className="p-8 print:p-0">
            {adviceMarkdown ? (
              <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg" id="markdown-viewer">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 border border-slate-150 rounded-2xl shadow-sm bg-white print:border-none print:shadow-none">
                        <table className="min-w-full divide-y divide-slate-100">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-slate-50/70 border-b border-slate-100">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-slate-50/30 transition duration-150">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {adviceMarkdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3" id="empty-report-placeholder">
                <p className="text-slate-400 text-sm">
                  Er is nog geen energieadvies gegenereerd. Vul links je gegevens in en klik op de knop om direct een op maat gemaakt, begrijpelijk en betrouwbaar NTA 8800 adviesrapport te ontvangen.
                </p>
                <p className="text-xs text-emerald-600 font-semibold">
                  Tip: Gebruik de snelprofielen bovenaan om direct te testen!
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

