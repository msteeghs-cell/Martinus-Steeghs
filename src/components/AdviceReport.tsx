import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CalculationResult, TechData } from '../types';
import BatteryMarketOverview from './BatteryMarketOverview';
import { 
  FileText, Copy, Printer, Check, TrendingDown, ShieldAlert, Award, Zap, HelpCircle, 
  BarChart3, LineChart as LineIcon, Landmark, Sparkles, ArrowRightLeft, Clock, PiggyBank,
  Sun, Battery, Flame, ArrowUpRight, TrendingUp, Info, Mail, Send, Loader2, Layers
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
  activeTab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal';
  setActiveTab: (tab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal') => void;
  setTech?: React.Dispatch<React.SetStateAction<TechData>>;
}

export default function AdviceReport({ 
  calculation, 
  adviceMarkdown, 
  loading,
  activeTab: outerTab,
  setActiveTab,
  setTech
}: AdviceReportProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);
  const [targetEmail, setTargetEmail] = React.useState(calculation.resident.email || '');
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [emailStatusMessage, setEmailStatusMessage] = React.useState('');

  // Use a local state for the active tab inside AdviceReport
  const [localActiveTab, setLocalActiveTab] = React.useState<'graph' | 'solar' | 'battery' | 'heatpump' | 'laadpaal' | 'text'>('graph');

  // Synchronize targetEmail from calculation when it loads/changes
  React.useEffect(() => {
    if (calculation.resident.email) {
      setTargetEmail(calculation.resident.email);
    }
  }, [calculation.resident.email]);

  // Synchronize local tab from outer tab changes
  React.useEffect(() => {
    if (outerTab === 'isolatie') {
      setLocalActiveTab('graph');
    } else if (outerTab === 'zon' || outerTab === 'saldering') {
      setLocalActiveTab('solar');
    } else if (outerTab === 'accu') {
      setLocalActiveTab('battery');
    } else if (outerTab === 'warmtepomp') {
      setLocalActiveTab('heatpump');
    } else if (outerTab === 'laadpaal') {
      setLocalActiveTab('laadpaal');
    }
  }, [outerTab]);

  // If adviceMarkdown becomes available (loading finishes), automatically switch to 'text' (AI Advies) tab!
  React.useEffect(() => {
    if (adviceMarkdown) {
      setLocalActiveTab('text');
    }
  }, [adviceMarkdown]);

  const activeTab = localActiveTab;

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

  const handleSendEmail = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailStatus('error');
      setEmailStatusMessage('Vul a.u.b. een geldig e-mailadres in.');
      return;
    }

    setSendingEmail(true);
    setEmailStatus('idle');
    setEmailStatusMessage('');

    try {
      const clientName = `${calculation.resident.aanhef || ''} ${calculation.resident.voorletters || ''} ${calculation.resident.achternaam || ''}`.trim() || 'Bewoner';
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: targetEmail,
          clientName: clientName,
          reportText: adviceMarkdown || `
Energieplanner Peel en Maas Adviesrapport

Beste ${clientName},

Hierbij ontvang je de berekende resultaten voor jouw woning aan de ${calculation.resident.straat || ''} ${calculation.resident.huisnummer || ''}.

- Totale bruto kosten: €${Math.round(calculation.totals.bruto).toLocaleString('nl-NL')}
- Totale ISDE subsidie: €${Math.round(calculation.totals.isde).toLocaleString('nl-NL')}
- Totale NIP subsidie: €${Math.round(calculation.totals.nip).toLocaleString('nl-NL')}
- Netto eigen bijdrage: €${Math.round(calculation.totals.net).toLocaleString('nl-NL')}
- Verwachte jaarlijkse besparing: €${Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}
- Terugverdientijd: ${calculation.totals.tvt.toFixed(1)} jaar

Met vriendelijke groet,
Energieplanner Peel en Maas
          `.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailStatus('success');
        if (data.isSimulated) {
          setEmailStatusMessage('Advies succesvol verzonden! (Simulatiemodus: de e-mail is gelogd op de server console omdat er geen SMTP is geconfigureerd).');
        } else {
          setEmailStatusMessage(`Advies succesvol verzonden naar ${targetEmail}!`);
        }
      } else {
        throw new Error(data.error || 'Er ging iets fout bij het verzenden.');
      }
    } catch (err: any) {
      setEmailStatus('error');
      setEmailStatusMessage(err.message || 'Mislukt om e-mail te verzenden. Controleer de verbinding of server configuratie.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMailto = () => {
    const clientName = `${calculation.resident.aanhef || ''} ${calculation.resident.voorletters || ''} ${calculation.resident.achternaam || ''}`.trim() || 'Bewoner';
    const subject = encodeURIComponent(`Jouw Energieplanner Peel en Maas Adviesrapport - ${clientName}`);
    
    const bodyContent = adviceMarkdown || `
Beste ${clientName},

Bedankt voor het invullen van de Energieplanner Peel en Maas. Hierbij ontvang je jouw persoonlijke, onafhankelijke verduurzamingsadvies.

Hier zijn jouw belangrijkste resultaten:
- Totale bruto kosten: €${Math.round(calculation.totals.bruto).toLocaleString('nl-NL')}
- Totale ISDE subsidie: €${Math.round(calculation.totals.isde).toLocaleString('nl-NL')}
- Totale NIP subsidie: €${Math.round(calculation.totals.nip).toLocaleString('nl-NL')}
- Netto eigen bijdrage: €${Math.round(calculation.totals.net).toLocaleString('nl-NL')}
- Verwachte jaarlijkse besparing: €${Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}
- Gemiddelde terugverdientijd: ${calculation.totals.tvt.toFixed(1)} jaar

Met vriendelijke groet,
Energieplanner Peel en Maas
    `.trim();

    const body = encodeURIComponent(bodyContent);
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
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

  // ROI calculations for Insulation, Solar panels, and Battery
  const insulationNet = Math.round(calculation.totals.net);
  const insulationSavings = Math.round(calculation.totals.savingsEuro);
  const insulationROI = insulationNet > 0 ? Number(((insulationSavings / insulationNet) * 100).toFixed(1)) : 0;

  const solarPanelsCount = calculation.tech.aantalZonnepanelen || 0;
  const solarNetInvestment = (calculation.tech.customZonnepanelenPrijs !== undefined && calculation.tech.customZonnepanelenPrijs > 0)
    ? calculation.tech.customZonnepanelenPrijs
    : solarPanelsCount * 500; // Realistic standard net cost of €500 per panel
  const solarSavings = Math.round(calculation.solar.annualYieldKwh * (calculation.house.elektraPrijs - 0.05));
  const solarROI = solarNetInvestment > 0 ? Number(((solarSavings / solarNetInvestment) * 100).toFixed(1)) : 0;

  const selectedCap = calculation.tech.capaciteitAccu || 0;
  const batteryOpt = calculation.battery.options.find(opt => opt.capacityKwh === selectedCap) ||
                     calculation.battery.options.find(opt => opt.bestSuited) ||
                     calculation.battery.options[1] ||
                     calculation.battery.options[0];

  const batteryNetInvestment = batteryOpt ? batteryOpt.netInvestment : 7500;
  const batterySavings = batteryOpt ? (calculation.tech.typeContract === 'Dynamisch' ? batteryOpt.annualSavingsDynamisch : batteryOpt.annualSavingsVastPost2027) : 0;
  const batteryROI = batteryNetInvestment > 0 ? Number(((batterySavings / batteryNetInvestment) * 100).toFixed(1)) : 0;

  const roiChartData = [
    {
      name: 'Isolatie',
      roi: insulationROI,
      investment: insulationNet,
      savings: insulationSavings,
      color: '#10b981', // Emerald
      details: insulationNet > 0 ? `€ ${insulationNet.toLocaleString('nl-NL')} netto` : 'Geen maatregelen geselecteerd'
    },
    {
      name: 'Zonnepanelen',
      roi: solarROI,
      investment: solarNetInvestment,
      savings: solarSavings,
      color: '#f59e0b', // Amber
      details: solarPanelsCount > 0 ? `${solarPanelsCount} panelen (${Math.round(calculation.solar.annualYieldKwh)} kWh/jr)` : 'Geen zonnepanelen ingevoerd'
    },
    {
      name: 'Thuisbatterij',
      roi: batteryROI,
      investment: batteryNetInvestment,
      savings: batterySavings,
      color: '#3b82f6', // Blue
      details: batteryOpt ? `${batteryOpt.capacityKwh} kWh (${calculation.tech.typeContract} contract)` : 'Geadviseerd model'
    }
  ];

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

  // 🏠 Isolatie values
  const isoCount = calculation.measures?.length || 0;
  const isoSavingsM3 = Math.round(calculation.measures?.reduce((sum, m) => sum + m.savingM3, 0) || 0);
  const isoNetCosts = Math.round(calculation.totals?.net || 0);
  const isoTvt = calculation.totals?.tvt > 0 ? `${calculation.totals.tvt.toFixed(1)} jaar` : 'N.v.t.';

  // ☀️ Zon values
  const solarPanels = calculation.tech?.aantalZonnepanelen || 0;
  const solarKwp = ((solarPanels * (calculation.tech?.vermogenPerPaneel || 400)) / 1000).toFixed(2);
  const solarYield = Math.round(calculation.solar?.annualYieldKwh || 0);

  // 🔋 Thuisbatterij values
  const batCapacity = calculation.tech?.capaciteitAccu || 0;
  const batSavings = batterySavings;
  const batTvtVal = batteryNetInvestment > 0 && batterySavings > 0 ? (batteryNetInvestment / batterySavings) : 0;
  const batTvt = batTvtVal > 0 ? `${batTvtVal.toFixed(1)} jaar` : 'N.v.t.';

  // ⚖️ Saldering values
  const salderingContract = calculation.tech?.typeContract || 'Vast';
  const salderingLoss = Math.round((calculation.solar?.gridFeedBaseKwh || 0) * ((calculation.house?.elektraPrijs || 0.30) - 0.06));

  // ♨️ Warmtepomp values
  const selectedType = calculation.tech?.selectedWarmtepompType || 'Hybride';
  const wpModel = calculation.tech?.selectedWarmtepompModel || 'Standard';
  const wpType = wpModel === 'LuchtLucht' 
    ? (selectedType === 'All-Electric' ? 'All-Electric (Multi-split)' : 'Lucht-lucht (Airco)')
    : selectedType;
  const wpSize = wpModel === 'Standard' ? '4 - 5 kW' :
                 wpModel === 'Middelgroot 8kW' ? '6 - 8 kW' :
                 wpModel === 'Groot 12kW' ? '10 - 12 kW' : 
                 (selectedType === 'All-Electric' ? 'All-Electric equivalent' : 'Lucht-lucht (Airco)');
  const optIdx = selectedType === 'All-Electric' ? 1 : 0;
  const chosenOpt = calculation.heatpump?.options?.[optIdx];
  const wpAdvice = calculation.heatpump 
    ? (!calculation.heatpump.isInsulatedSufficiently ? 'Eerst isoleren' : (chosenOpt?.isFeasible ? 'Zinvol / Geadviseerd' : 'Beperkt rendabel')) 
    : 'Onbekend';
  const wpTvtVal = chosenOpt ? chosenOpt.tvt : 0;
  const wpTvt = wpTvtVal > 0 && wpTvtVal < 99 ? `${wpTvtVal.toFixed(1)} jaar` : 'Onbekend';

  // 🚗 Laadpaal values
  const evVol = Math.round(((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100);
  const evSavings = evVol * (0.50 - (calculation.house?.elektraPrijs ?? 0.30));
  const ereRevenue = evVol * 0.12;
  const totalEvBenefit = Math.round(evSavings + ereRevenue);

  return (
    <div className="space-y-6" id="advice-report-section">
      {/* Interactieve KPI Kaarten */}
      {outerTab === 'isolatie' && (
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
      )}

      {/* NIP Subsidie alert panel */}
      {outerTab === 'isolatie' && (
        calculation.eligibleNip ? (
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
        )
      )}

      {/* Advies rapportage container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden print:border-0 print:shadow-none">
        
        {/* Rapporthoofd: Registratiecode, Introductie & Compact Overzichtsraster */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                  Registratiecode: {calculation.resident.registratiecode || "PM-CONCEPT"}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                  {calculation.resident.datum || new Date().toLocaleDateString('nl-NL')}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight mt-1.5">
                Energieplanner Peel en Maas Adviesrapport
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Beste {calculation.resident.aanhef || ''} {calculation.resident.voorletters || ''} {calculation.resident.achternaam || ''}, bedankt voor het invullen van de Energieplanner Peel en Maas. Hierbij ontvang je jouw persoonlijke, onafhankelijke verduurzamingsadvies. Hieronder zie je de belangrijkste kerncijfers per thema in één compact overzicht:
              </p>
            </div>
          </div>

          {/* Compact Overzichtsraster per tabblad */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 print:hidden">Klik op een categorie hieronder om de gedetailleerde planner en adviezen te openen:</span>
            <div className="grid grid-cols-1 gap-2.5">
              {/* 🏠 Isolatie & Financiën */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('graph');
                  setActiveTab('isolatie');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'graph'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm shadow-emerald-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">🏠</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Isolatie &amp; Financiën</span>
                  {activeTab === 'graph' && (
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    {isoCount > 0 ? (
                      <>
                        <strong className="text-slate-900 font-bold">{isoCount} {isoCount === 1 ? 'maatregel' : 'maatregelen'}</strong>,{' '}
                        <strong className="text-emerald-700 font-extrabold">{isoSavingsM3} m³/jr</strong> gasbesparing,{' '}
                        netto eigen bijdrage:{' '}
                        <strong className="text-slate-900 font-bold">€{isoNetCosts.toLocaleString('nl-NL')}</strong>,{' '}
                        TVT: <strong className="text-amber-600 font-bold">{isoTvt}</strong>
                      </>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Geen isolatiemaatregelen geselecteerd</span>
                    )}
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'graph' ? 'rotate-45 text-emerald-600' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* ☀️ Zonnepanelen */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('solar');
                  setActiveTab('zon');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'solar' && outerTab === 'zon'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/15 shadow-sm shadow-amber-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">☀️</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Zonnepanelen</span>
                  {activeTab === 'solar' && outerTab === 'zon' && (
                    <span className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    {solarPanels > 0 ? (
                      <>
                        <strong className="text-slate-900 font-bold">{solarPanels} panelen</strong> ({solarKwp} kWp),{' '}
                        opbrengst: <strong className="text-amber-600 font-bold">{solarYield.toLocaleString('nl-NL')} kWh/jr</strong>
                      </>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Geen zonnepanelen ingevoerd</span>
                    )}
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'solar' && outerTab === 'zon' ? 'rotate-45 text-amber-500' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* 🔋 Thuisbatterij */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('battery');
                  setActiveTab('accu');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'battery'
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/15 shadow-sm shadow-blue-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">🔋</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Thuisbatterij</span>
                  {activeTab === 'battery' && (
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    capaciteit: <strong className="text-slate-900 font-semibold">{batCapacity > 0 ? `${batCapacity} kWh` : (batteryOpt ? `${batteryOpt.capacityKwh} kWh` : '10 kWh')}</strong>,{' '}
                    jaarbesparing: <strong className="text-emerald-700 font-bold">€{batSavings.toLocaleString('nl-NL')}</strong>,{' '}
                    TVT: <strong className="text-blue-600 font-bold">{batTvt}</strong>
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'battery' ? 'rotate-45 text-blue-500' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* ⚖️ Saldering */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('solar');
                  setActiveTab('saldering');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'solar' && outerTab === 'saldering'
                    ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/15 shadow-sm shadow-teal-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">⚖️</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Saldering</span>
                  {activeTab === 'solar' && outerTab === 'saldering' && (
                    <span className="bg-teal-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    contractvorm: <strong className="text-slate-900 font-semibold">{salderingContract}</strong>,{' '}
                    effect afschaffing saldering: <strong className="text-rose-600 font-bold">€{salderingLoss.toLocaleString('nl-NL')} / jr extra kosten</strong>
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'solar' && outerTab === 'saldering' ? 'rotate-45 text-teal-600' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* ♨️ Warmtepomp */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('heatpump');
                  setActiveTab('warmtepomp');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'heatpump'
                    ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/15 shadow-sm shadow-orange-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">♨️</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Warmtepomp</span>
                  {activeTab === 'heatpump' && (
                    <span className="bg-orange-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    type: <strong className="text-slate-900 font-semibold">{wpType} ({wpSize})</strong>,{' '}
                    advies: <strong className={`${wpAdvice === 'Zinvol / Geadviseerd' ? 'text-emerald-600' : wpAdvice === 'Eerst isoleren' ? 'text-amber-600' : 'text-slate-600'} font-semibold`}>{wpAdvice}</strong>,{' '}
                    TVT: <strong className="text-orange-600 font-bold">{wpTvt}</strong>
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'heatpump' ? 'rotate-45 text-orange-500' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* 🚗 Laadpaal */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('laadpaal');
                  setActiveTab('laadpaal');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'laadpaal'
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-600/15 shadow-sm shadow-emerald-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">🚗</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Eigen Laadpaal</span>
                  {activeTab === 'laadpaal' && (
                    <span className="bg-emerald-700 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    {calculation.tech.evKilometers ? (
                      <>
                        jaarlijks voordeel thuisladen: <strong className="text-emerald-600 font-bold">€{totalEvBenefit.toLocaleString('nl-NL')}</strong> <span className="text-[10px] text-slate-400 font-normal">(incl. vergoeding €{(evVol * 0.12).toFixed(0)}/jr)</span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Geen elektrische auto ingevoerd</span>
                    )}
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'laadpaal' ? 'rotate-45 text-emerald-600' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>

              {/* 📄 Advies Rapport (AI) */}
              <button 
                type="button"
                onClick={() => {
                  setLocalActiveTab('text');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 group ${
                  activeTab === 'text'
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/15 shadow-sm shadow-indigo-50/80'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-base shrink-0 group-hover:scale-110 transition duration-150">📄</span>
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Gepersonaliseerd AI Adviesrapport</span>
                  {activeTab === 'text' && (
                    <span className="bg-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Actief
                    </span>
                  )}
                </div>
                <div className="text-slate-600 font-medium text-xs sm:text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="leading-normal">
                    {adviceMarkdown ? (
                      <span className="text-emerald-600 font-semibold">✓ Rapport gegenereerd door AI</span>
                    ) : (
                      <span className="text-slate-400 italic font-normal">Rapport wordt geladen...</span>
                    )}
                  </span>
                  <ArrowUpRight className={`w-4 h-4 shrink-0 transition-all duration-200 print:hidden ${activeTab === 'text' ? 'rotate-45 text-indigo-500' : 'text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Tab Header & Action Bar */}
        <div className="bg-slate-50/50 border-y border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              activeTab === 'graph' ? 'bg-emerald-500' :
              activeTab === 'solar' && outerTab === 'zon' ? 'bg-amber-500' :
              activeTab === 'solar' && outerTab === 'saldering' ? 'bg-teal-500' :
              activeTab === 'battery' ? 'bg-blue-500' :
              activeTab === 'heatpump' ? 'bg-orange-500' :
              activeTab === 'laadpaal' ? 'bg-emerald-600' :
              'bg-indigo-500'
            }`}></div>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
              Geselecteerd Detail: {
                activeTab === 'graph' ? 'Isolatie & Financiële Planner' :
                activeTab === 'solar' && outerTab === 'zon' ? 'Zonnepanelen' :
                activeTab === 'solar' && outerTab === 'saldering' ? 'Saldering & Netto-teruglevering' :
                activeTab === 'battery' ? 'Thuisbatterij & Arbitrage' :
                activeTab === 'heatpump' ? 'Warmtepomp & Rendement' :
                activeTab === 'laadpaal' ? 'Eigen Laadpaal & EV' :
                'AI Adviesrapport'
              }
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === 'text' && adviceMarkdown && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm cursor-pointer"
              id="print-report-btn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Afdrukken / PDF</span>
            </button>

            {/* Email send widget */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsEmailModalOpen(!isEmailModalOpen);
                  setEmailStatus('idle');
                  setEmailStatusMessage('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-sm cursor-pointer ${
                  isEmailModalOpen 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold' 
                    : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                }`}
                id="mail-report-btn"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Mail Advies</span>
              </button>

              {isEmailModalOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fadeIn" id="email-popover" style={{ transformOrigin: 'top right' }}>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">Adviesrapport mailen</span>
                    <button 
                      type="button"
                      onClick={() => setIsEmailModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Sluiten
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mailadres van de klant</label>
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="bijv. klant@example.nl"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium bg-slate-50/50 focus:bg-white transition"
                    />
                  </div>

                  {emailStatusMessage && (
                    <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                      emailStatus === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                        : 'bg-rose-50 text-rose-800 border-rose-100'
                    }`}>
                      {emailStatusMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={sendingEmail}
                      onClick={handleSendEmail}
                      className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold py-2 px-3 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mailing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Direct Mailen</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleMailto}
                      className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
                      title="Open in je eigen e-mailprogramma"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Eigen Mailer</span>
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-400 leading-normal text-center">
                    Stuurt direct een mail met de berekeningen en de AI samenvatting naar de klant.
                  </p>
                </div>
              )}
            </div>
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

            {/* Section 5: ROI Vergelijking */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800">5. Rendement op Investering (ROI) Vergelijking</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Het Rendement op Investering (ROI) geeft aan hoeveel procent van je investering je jaarlijks terugverdient. Hoe hoger het percentage, hoe rendabeler de maatregel. Ter vergelijking: de gemiddelde rente op een spaarrekening ligt momenteel rond de 2% à 3%.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Chart container */}
                <div className="md:col-span-2 h-64 md:h-72 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={roiChartData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl text-xs space-y-1.5">
                                <p className="font-bold text-slate-800">{data.name}</p>
                                <div className="space-y-1 text-slate-600">
                                  <div className="flex justify-between gap-6">
                                    <span>Netto Investering:</span>
                                    <span className="font-semibold text-slate-800">€ {Math.round(data.investment).toLocaleString('nl-NL')}</span>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <span>Jaarlijkse Besparing:</span>
                                    <span className="font-semibold text-emerald-600">€ {Math.round(data.savings).toLocaleString('nl-NL')} / jr</span>
                                  </div>
                                  <div className="flex justify-between gap-6 border-t border-slate-100 pt-1 font-bold text-slate-900">
                                    <span>Jaarlijks Rendement (ROI):</span>
                                    <span className="text-emerald-700">{data.roi}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Bar 
                        dataKey="roi" 
                        radius={[6, 6, 0, 0]}
                        barSize={60}
                      >
                        {roiChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-slate-400 text-center italic">
                    Beweeg over de balken voor gedetailleerde investering- en besparingscijfers.
                  </p>
                </div>

                {/* Legend & explanations */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Financieel Overzicht</span>
                    
                    {roiChartData.map((item, idx) => {
                      const Icon = item.name === 'Isolatie' ? Layers : item.name === 'Zonnepanelen' ? Sun : Battery;
                      return (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-bold text-slate-700">{item.name}</span>
                              <span className="text-xs font-extrabold" style={{ color: item.color }}>{item.roi}%</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block leading-tight">{item.details}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-[10px] text-emerald-800 leading-relaxed">
                    <span className="font-bold block mb-0.5">💡 Slimme tip:</span>
                    Door isolatie en zonnepanelen te combineren met een thuisbatterij maximaliseer je de onafhankelijkheid van het net én profiteer op deze manier optimaal van de dynamische stroomtarieven.
                  </div>
                </div>
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
                Gepersonaliseerd advies gebaseerd op een jaaropbrengst van <strong>{Math.round(calculation.solar.annualYieldKwh)} kWh</strong> met <strong>{calculation.tech.aantalZonnepanelen} zonnepanelen</strong>, een oriëntatie van <strong>{calculation.tech.dakOrientatie}°</strong> en een hellingshoek van <strong>{calculation.tech.dakHellingshoek !== undefined ? calculation.tech.dakHellingshoek : 35}°</strong>.
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
                          <span className="text-[9px] text-slate-400 block">
                            Btw teruggevraagd
                          </span>
                        </div>
                        <div className="space-y-0.5 text-right font-sans">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Bruto Kosten</span>
                          <span className="text-base font-bold text-slate-600 flex items-center justify-end gap-1">
                            € {Math.round(opt.brutoInvestment).toLocaleString('nl-NL')}
                          </span>
                          {calculation.tech.capaciteitAccu === opt.capacityKwh && calculation.tech.customAccuPrijs !== undefined && calculation.tech.customAccuPrijs > 0 ? (
                            <span className="text-[9px] text-indigo-600 font-extrabold block">✓ Eigen prijsopgave</span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-semibold block">Btw terug: €{Math.round(opt.btwRefund).toLocaleString('nl-NL')}</span>
                          )}
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
                      <td className="px-5 py-3 text-slate-600 font-medium">
                        <div>Jaarbesparing Dynamisch contract (Met smart-trading)</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Gebaseerd op het reële Zonneplan H1 gemiddeld teruglevertarief van <strong>€ 0,1049 / kWh</strong> en actieve arbitrage.
                        </div>
                      </td>
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

            {/* Advice & Recommendation Box */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-100 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <h4 className="text-base font-bold text-slate-800">
                  Geadviseerde Thuisbatterij &amp; Contract Analyse
                </h4>
              </div>

              {/* Grid with suitable battery and contract dependency */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* 1. Suitable Battery Size */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jouw Meest Geschikte Accu</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">Aanbevolen</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <Battery className="w-5 h-5 text-blue-500 self-center" />
                    <span className="text-xl font-extrabold text-slate-800">
                      {calculation.solar.annualYieldKwh === 0 
                        ? 'Geen thuisaccu' 
                        : calculation.solar.annualYieldKwh < 3500 
                          ? '5 kWh (Klein)' 
                          : calculation.solar.annualYieldKwh < 7500 
                            ? '10 kWh (Middelgroot)' 
                            : '15 kWh (Groot)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {calculation.solar.annualYieldKwh === 0 ? (
                      "Een thuisbatterij heeft momenteel zonnepanelen nodig om rendabel te laden met eigen gratis stroom. We adviseren eerst zonnepanelen te installeren."
                    ) : calculation.solar.annualYieldKwh < 3500 ? (
                      `Met een jaaropbrengst van ${Math.round(calculation.solar.annualYieldKwh)} kWh zonnestroom is een 5 kWh thuisaccu ruim voldoende om je avond- en nachtverbruik af te dekken zonder overcapaciteit.`
                    ) : calculation.solar.annualYieldKwh < 7500 ? (
                      `Met een zonneopbrengst van ${Math.round(calculation.solar.annualYieldKwh)} kWh is een 10 kWh accu de gulden middenweg. Dit biedt voldoende opslag om de dagpieken op te vangen en 's avonds volledig zelfvoorzienend te zijn.`
                    ) : (
                      `Met een uitstekende jaaropbrengst van ${Math.round(calculation.solar.annualYieldKwh)} kWh zonnestroom is een 15 kWh accu uitermate geschikt om grote hoeveelheden stroom op te slaan, ideaal bij een warmtepomp of EV.`
                    )}
                  </p>

                  {setTech && calculation.solar.annualYieldKwh > 0 && calculation.tech.capaciteitAccu !== (calculation.solar.annualYieldKwh < 3500 ? 5 : calculation.solar.annualYieldKwh < 7500 ? 10 : 15) && (
                    <button
                      type="button"
                      onClick={() => {
                        const recSize = calculation.solar.annualYieldKwh < 3500 ? 5 : calculation.solar.annualYieldKwh < 7500 ? 10 : 15;
                        setTech(prev => ({ ...prev, capaciteitAccu: recSize }));
                      }}
                      className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Stel mijn actieve accu in op {calculation.solar.annualYieldKwh < 3500 ? '5' : calculation.solar.annualYieldKwh < 7500 ? '10' : '15'} kWh
                    </button>
                  )}
                </div>

                {/* 2. Contract Dependency */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Contract Invloed</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        calculation.tech.typeContract === 'Dynamisch' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        Actief: {calculation.tech.typeContract} contract
                      </span>
                    </div>

                    {calculation.tech.typeContract === 'Vast' ? (
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-rose-700 flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          Minder rendabel onder Vast contract
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Met een vast of variabel contract mag je in Nederland salderen (tot 2027). Hierdoor fungeert het elektriciteitsnet gratis als 'virtuele accu'. Een fysieke accu voegt dan financieel weinig toe behalve een lichte verhoging van direct eigen verbruik.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                          Maximaal rendement met Dynamisch!
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Met een dynamisch contract profiteer je direct van <strong>arbitrage-trading</strong>. Je accu laadt automatisch op als stroom gratis of negatief geprijsd is (bijv. bij veel wind/zon) en ontlaadt tijdens de dure piekuren. Dit verkort de terugverdientijd direct met wel 5 tot 7 jaar!
                        </p>
                      </div>
                    )}
                  </div>

                  {setTech && (
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ 
                        ...prev, 
                        typeContract: calculation.tech.typeContract === 'Vast' ? 'Dynamisch' : 'Vast' 
                      }))}
                      className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Wissel naar {calculation.tech.typeContract === 'Vast' ? 'Dynamisch' : 'Vast / Variabel'} contract
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Interactive Provider Chooser & Details */}
              <div className="space-y-4 pt-4 border-t border-slate-200/60">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide block">
                    Aanbevolen Dynamische Energieaanbieders voor Thuisaccu's:
                  </span>
                  {calculation.tech.typeContract === 'Vast' && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded self-start sm:self-auto">
                      ⚠️ Alleen van toepassing bij Dynamisch contract
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'Zonneplan' as const, name: 'Zonneplan', tag: 'Powerplay', desc: 'Onbalansmarkt' },
                    { id: 'Tibber' as const, name: 'Tibber', tag: 'Pulse & API', desc: 'Domotica ready' },
                    { id: 'Frank' as const, name: 'Frank Energie', tag: 'Slim Handelen', desc: 'EPEX arbitrage' },
                    { id: 'Anwb' as const, name: 'ANWB Energie', tag: 'Slim Laden', desc: 'EV Combinatie' }
                  ].map((p) => {
                    const isSelected = calculation.tech.dynamicProvider === p.id || (!calculation.tech.dynamicProvider && p.id === 'Zonneplan');
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!setTech}
                        onClick={() => {
                          if (setTech) {
                            setTech(prev => ({ ...prev, dynamicProvider: p.id, typeContract: 'Dynamisch' }));
                          }
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-500 shadow-md shadow-indigo-100 ring-2 ring-offset-2 ring-indigo-500'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block">{p.name}</span>
                          <span className={`text-[9px] font-semibold mt-0.5 block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{p.tag}</span>
                        </div>
                        <span className={`text-[10px] mt-2 font-mono ${isSelected ? 'text-white font-bold' : 'text-slate-500'}`}>
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Provider Details Display */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3 shadow-sm">
                  {((!calculation.tech.dynamicProvider || calculation.tech.dynamicProvider === 'Zonneplan')) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Waarom Zonneplan Powerplay perfect is voor jouw thuisaccu:</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Zonneplan Powerplay stuurt je thuisbatterij volledig automatisch aan op de <strong>onbalansmarkt</strong> van TenneT. In plaats van stroom simpelweg op te slaan voor de avond, helpt jouw batterij actief mee om het Nederlandse stroomnet te stabiliseren. Hiervoor ontvang je zeer hoge vergoedingen.
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1">
                        <li><strong>Volledig ontzorgd:</strong> De slimme software handelt autonoom; je hoeft zelf niets in te stellen.</li>
                        <li><strong>Maximale opbrengsten:</strong> Onbalansprijzen schieten vaak veel harder omhoog of omlaag dan reguliere uurprijzen (soms wel tot €1,00/kWh vergoeding).</li>
                        <li><strong>Btw-teruggave:</strong> De Belastingdienst ziet je door dit actieve handelen als ondernemer, waardoor je de 21% btw op de accu volledig kunt terugvragen!</li>
                      </ul>
                    </div>
                  )}

                  {calculation.tech.dynamicProvider === 'Tibber' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
                        <Zap className="w-4 h-4 text-sky-400" />
                        <span>Waarom Tibber uitstekend is voor slimme tech-integraties:</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Tibber is marktleider in slimme dynamic-sturing. Dankzij hun open en gedocumenteerde API-koppelingen communiceert Tibber perfect met Home Assistant, Bliq, en omvormers van bekende merken (zoals SolarEdge, Growatt of Victron).
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1">
                        <li><strong>Tibber Pulse:</strong> Real-time inzicht in je stroommeter (P1-poort) om de accu exact aan te sturen op je actuele nul-verbruik.</li>
                        <li><strong>Open Eco-systeem:</strong> Je zit niet vast aan één accumerk. Je kunt de sturing zelf programmeren of koppelen met externe domotica.</li>
                        <li><strong>Lage inkoopopslag:</strong> Tibber rekent een zeer scherpe inkoopopslag per kWh, wat de marge voor batterij-arbitrage vergroot.</li>
                      </ul>
                    </div>
                  )}

                  {calculation.tech.dynamicProvider === 'Frank' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span>Waarom Frank Energie "Slim Handelen" de ideale partner is:</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Frank Energie biedt de slimme sturingsdienst genaamd "Slim Handelen". Hun algoritme berekent elk uur de optimale laad- en ontlaadcycli op de EPEX spotmarkt.
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1">
                        <li><strong>Wind- &amp; Zonne-Arbitrage:</strong> De accu laadt op de goedkoopste uren van de dag (bijvoorbeeld 's nachts bij harde wind of 's middags bij felle zon) en levert terug tijdens de dure piekuren.</li>
                        <li><strong>Gebruiksvriendelijke app:</strong> Je ziet in de Frank Energie app live hoeveel winst je accu vandaag heeft gemaakt met slim handelen.</li>
                        <li><strong>Geen ingewikkelde hardware:</strong> Directe softwarematige koppeling met de omvormer/accu van je thuisbatterij.</li>
                      </ul>
                    </div>
                  )}

                  {calculation.tech.dynamicProvider === 'Anwb' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Waarom ANWB Energie de beste keuze is in combinatie met een EV:</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        ANWB Energie blinkt uit in de combinatie van een thuisaccu en een elektrische auto (EV). Hun slimme laad-software synchroniseert het opladen van je auto en je thuisaccu voor maximaal financieel voordeel.
                      </p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1">
                        <li><strong>Geïntegreerde laadsturing:</strong> Voorkom dat de thuisaccu leegloopt in de auto op momenten dat dat financieel niet gunstig is.</li>
                        <li><strong>Betrouwbare merknaam:</strong> Groene, transparante dynamic-stroom zonder winstoogmerk op je verbruik.</li>
                        <li><strong>ANWB Slim Laden:</strong> Bekroonde app voor het inplannen van slimme laadbeurten op basis van de goedkoopste uren van de dag.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comprehensive Battery Market Overview & Decision Advice */}
            <BatteryMarketOverview 
              dynamicProvider={calculation.tech.dynamicProvider}
              typeContract={calculation.tech.typeContract}
              capaciteitAccu={calculation.tech.capaciteitAccu}
              solarYield={calculation.solar.annualYieldKwh}
            />
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
                const isChosen = isAE 
                  ? calculation.tech?.selectedWarmtepompType === 'All-Electric'
                  : (calculation.tech?.selectedWarmtepompType === 'Hybride' || !calculation.tech?.selectedWarmtepompType);
                return (
                  <div 
                    key={opt.type} 
                    className={`relative border rounded-3xl p-6 shadow-sm transition-all duration-300 flex flex-col justify-between ${
                      isChosen
                        ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-gradient-to-br from-emerald-50/15 via-white to-emerald-50/5 shadow-md shadow-emerald-100/40'
                        : isAE 
                          ? opt.isFeasible 
                            ? 'bg-gradient-to-br from-indigo-50/20 via-white to-emerald-50/10 border-indigo-150 shadow-indigo-50/20'
                            : 'bg-white border-slate-200'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Badge */}
                    {isChosen && (
                      <div className="absolute -top-3 left-6 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                        🎯 Jouw Keuze
                      </div>
                    )}
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
                          {calculation.tech.selectedWarmtepompModel && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              {calculation.tech.selectedWarmtepompModel === 'Standard' ? '4 - 5 kW' :
                               calculation.tech.selectedWarmtepompModel === 'Middelgroot 8kW' ? '6 - 8 kW' :
                               calculation.tech.selectedWarmtepompModel === 'Groot 12kW' ? '10 - 12 kW' : 'Lucht-lucht (Airco)'}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {isAE 
                            ? 'Volledige vervanging van de CV-ketel voor verwarming en warm tapwater.'
                            : (opt.type === 'Lucht-lucht (Airco)'
                                ? 'Directe ruimteverwarming via lucht-blaasunits. Ideaal voor snelle, gerichte verwarming per zone.'
                                : 'Samenwerking met je bestaande CV-ketel. De ketel helpt alleen bij strenge vorst en tapwater.')}
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
                        {opt.solarCoverageKwh !== undefined && opt.solarCoverageKwh > 0 && (
                          <div className="flex justify-between text-[11px] text-emerald-600 bg-emerald-50/40 px-2 py-0.5 rounded">
                            <span>↪ Waarvan gedekt door zonne-overschot:</span>
                            <span className="font-semibold">-{Math.round(opt.solarCoverageKwh)} kWh (lage kosten)</span>
                          </div>
                        )}
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

            {/* TACTVOL COMFORT PERSPECTIEF (De Auto-analogie) */}
            <div className="bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/40 border border-indigo-100/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl shrink-0">🚗</span>
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-900 tracking-tight">
                    Investeren in Comfort &amp; Woongenot versus 'Terugverdientijd'
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Een verfrissend perspectief van de Energieplanner
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <p>
                  Wanneer we praten over verduurzaming van onze woning, staren we ons vaak blind op de <strong>terugverdientijd (TVT)</strong>. Maar wist je dat we dat bij andere grote levensinvesteringen eigenlijk nooit doen?
                </p>
                <div className="grid md:grid-cols-1 sm:grid-cols-2 gap-4 my-2.5">
                  <div className="bg-white/60 border border-slate-100 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 text-xs block mb-1">De vergelijking met een auto of keuken:</span>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Niemand vraagt bij de aanschaf van een nieuwe auto, een moderne designkeuken of een luxe badkamer naar de terugverdientijd. We kopen deze voor de betrouwbaarheid, het dagelijkse comfort, de esthetiek en de directe stijging in levenskwaliteit.
                    </p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100/60 p-3 rounded-xl">
                    <span className="font-bold text-emerald-900 text-xs block mb-1">De warmtepomp als woning-upgrade:</span>
                    <p className="text-[11px] text-emerald-800/90 leading-normal">
                      Een warmtepomp is precies hetzelfde: een modernisering van de technische installatie van je woning. Het brengt een heerlijk constante binnentemperatuur zonder koude zones of tocht. Het zorgt voor een gezonder binnenklimaat én verhoogt de waarde en het energielabel van je huis direct.
                    </p>
                  </div>
                </div>
                <p className="font-medium text-slate-700">
                  Het grote verschil? Een nieuwe auto of designkeuken schrijft direct af vanaf dag één. Een warmtepomp is een comfort-upgrade die je – in tegenstelling tot een auto of keuken – <strong>elke maand direct geld oplevert</strong> in plaats van afschrijft!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 5: Dedicated Laadpaal results */}
        {activeTab === 'laadpaal' && (
          <div className="p-8 print:p-0 space-y-6">
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100/60">
                <Zap className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">🚗 Financiële Analyse: Eigen Laadpaal &amp; ERE-vergoeding</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thuisgeladen volume</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {Math.round(((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100).toLocaleString('nl-NL')} kWh
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({calculation.tech?.evThuisLaden ?? 70}% van jaarlijks EV verbruik)
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Laadpaal Besparing</span>
                  <span className="text-lg font-extrabold text-emerald-600">
                    € {Math.round(
                      (((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * (0.50 - (calculation.house?.elektraPrijs ?? 0.30))
                    ).toLocaleString('nl-NL')} / jr
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (t.o.v. openbaar laden à €0,50/kWh)
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Wettelijke ERE-vergoeding</span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    € {Math.round(
                      (((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * 0.12
                    ).toLocaleString('nl-NL')} / jr
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Opbrengst van €0,12 / kWh geladen)
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gecombineerd Jaarlijks Voordeel</span>
                  <span className="text-2xl font-black text-slate-900">
                    € {Math.round(
                      ((((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * (0.50 - (calculation.house?.elektraPrijs ?? 0.30))) + 
                      ((((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * 0.12)
                    ).toLocaleString('nl-NL')} / jr
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-emerald-100 font-mono">
                  Terugverdientijd: ~{(
                    ((calculation.tech?.customLaadpaalPrijs !== undefined && calculation.tech?.customLaadpaalPrijs > 0) ? calculation.tech?.customLaadpaalPrijs : 1200) / 
                    ((((((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * (0.50 - (calculation.house?.elektraPrijs ?? 0.30))) + 
                    ((((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 70) / 100) * 0.12)) || 1)
                  ).toFixed(1)} jaar {(calculation.tech?.customLaadpaalPrijs !== undefined && calculation.tech?.customLaadpaalPrijs > 0) ? '(op basis van eigen prijsopgave)' : '(standaard raming)'}
                </div>
              </div>

              <div className="bg-indigo-50/50 rounded-xl p-4 text-xs text-indigo-950 leading-relaxed border border-indigo-100/60">
                <span className="font-bold block mb-1">💡 Hoe werkt de ERE-claim?</span>
                Bovenop alles wat je al bespaart, verdien je ook nog eens geld terug! Voor elke kWh die je thuis laadt, zijn oliemaatschappijen zoals Shell en BP wettelijk verplicht een vergoeding te betalen van circa <strong>€ 0,12 per kWh</strong>. Deze vergoeding (de ERE / HBE-vergoeding) kun je claimen door je laadpaal aan te melden bij partijen zoals <strong>Zonneplan</strong>, <strong>Laadpaal App</strong> of <strong>EREclaim.nl</strong>. Je laadsessies worden automatisch verwerkt en jaarlijks uitbetaald!
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 6: Original Text-based advice markdown */}
        {activeTab === 'text' && (
          <div className="p-8 print:p-0 space-y-6">
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

