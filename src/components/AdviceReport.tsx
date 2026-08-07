import React from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CalculationResult, TechData } from '../types';
import { getBatterySimulationData, COEFFS, getSolarInvestmentEstimate, getSolarInvestmentRange } from '../utils/calculator';
import BatteryMarketOverview from './BatteryMarketOverview';
import BatterySolarChart from './BatterySolarChart';
import { 
  FileText, Copy, Printer, Check, TrendingDown, ShieldAlert, Award, Zap, HelpCircle, 
  BarChart3, LineChart as LineIcon, Landmark, Sparkles, ArrowRightLeft, Clock, PiggyBank,
  Sun, Battery, Flame, ArrowUpRight, TrendingUp, Info, Mail, Send, Loader2, Layers,
  ChevronDown, ChevronUp
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
  Cell,
  ComposedChart
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
  const [showGasModal, setShowGasModal] = React.useState(false);
  const [targetEmail, setTargetEmail] = React.useState(calculation.resident.email || '');
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [emailStatusMessage, setEmailStatusMessage] = React.useState('');

  // Use a local state for the active tab inside AdviceReport
  const [localActiveTab, setLocalActiveTab] = React.useState<'graph' | 'solar' | 'saldering' | 'battery' | 'heatpump' | 'laadpaal' | 'text' | null>('graph');

  const toggleTab = (tab: 'graph' | 'solar' | 'saldering' | 'battery' | 'heatpump' | 'laadpaal' | 'text') => {
    if (localActiveTab === tab) {
      setLocalActiveTab(null);
    } else {
      setLocalActiveTab(tab);
      if (tab === 'graph') setActiveTab('isolatie');
      else if (tab === 'solar') { setActiveTab('zon'); setShowSalderingDetail(false); }
      else if (tab === 'saldering') { setActiveTab('saldering'); setShowSalderingDetail(true); }
      else if (tab === 'battery') setActiveTab('accu');
      else if (tab === 'heatpump') setActiveTab('warmtepomp');
      else if (tab === 'laadpaal') setActiveTab('laadpaal');
    }
  };

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

  const [showSalderingDetail, setShowSalderingDetail] = React.useState(false);

  // Selected capacity for the interactive battery chart
  const [chartBatteryCapacity, setChartBatteryCapacity] = React.useState<number>(10);

  // Synchronize chart capacity from active config
  React.useEffect(() => {
    if (calculation.tech.capaciteitAccu > 0) {
      setChartBatteryCapacity(calculation.tech.capaciteitAccu);
    } else {
      const rec = calculation.solar.annualYieldKwh < 3500 ? 5 : calculation.solar.annualYieldKwh < 7500 ? 10 : 15;
      setChartBatteryCapacity(rec);
    }
  }, [calculation.tech.capaciteitAccu, calculation.solar.annualYieldKwh]);

  // Compute monthly battery simulation data points
  const batteryChartData = React.useMemo(() => {
    return getBatterySimulationData(
      calculation.solar.annualYieldKwh || 0,
      calculation.house.verbruikKwh || 3500,
      chartBatteryCapacity || 10,
      calculation.tech.omzettingsverliezen || 20,
      calculation.solar.selfConsumptionBase || 30,
      calculation.solar.absoluteSelfConsumptionBaseKwh || 0,
      calculation.tech.dynamicProvider || 'Zonneplan',
      calculation.tech.batteryGridTrading
    );
  }, [
    calculation.solar.annualYieldKwh, 
    calculation.house.verbruikKwh, 
    chartBatteryCapacity, 
    calculation.tech.omzettingsverliezen, 
    calculation.solar.selfConsumptionBase, 
    calculation.solar.absoluteSelfConsumptionBaseKwh,
    calculation.tech.dynamicProvider,
    calculation.tech.batteryGridTrading
  ]);

  // Compute monthly laadpaal simulation data points
  const laadpaalChartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    // Solar distribution percentages
    const solarDistribution = [1.2, 4.6, 8.0, 12.0, 14.5, 16.0, 15.5, 12.5, 9.0, 4.5, 1.1, 1.1];
    
    const evAnnualDemand = calculation.laadpaal?.evAnnualDemandKwh || 0;
    const evSolarCoverage = calculation.laadpaal?.evSolarCoverageKwh || 0;

    // Calculate raw max solar charging per month based on remaining grid feed (available excess solar)
    const rawMaxSolarByMonth = batteryChartData.map((d, idx) => {
      const evDemandM = evAnnualDemand / 12;
      const remainingGridFeed = d['Teruglevering naar net (met accu) (kWh)'] || 0;
      return Math.min(evDemandM, remainingGridFeed);
    });

    const totalRawMaxSolar = rawMaxSolarByMonth.reduce((acc, v) => acc + v, 0);
    const scaleFactor = totalRawMaxSolar > 0 ? evSolarCoverage / totalRawMaxSolar : 0;

    return batteryChartData.map((d, idx) => {
      const evDemandM = Math.round(evAnnualDemand / 12);
      
      // Distribute solar coverage proportionally and cap it
      let evSolarM = totalRawMaxSolar > 0 
        ? Math.round(rawMaxSolarByMonth[idx] * scaleFactor) 
        : 0;
        
      const remainingGridFeed = d['Teruglevering naar net (met accu) (kWh)'] || 0;
      evSolarM = Math.min(evSolarM, evDemandM, remainingGridFeed);
      
      const evGridM = Math.max(0, evDemandM - evSolarM);
      const remainingGridFeedAfterEV = Math.max(0, remainingGridFeed - evSolarM);

      return {
        name: d.name,
        'Zonnestroom opwek (kWh)': d['Zonnestroom opwek (kWh)'],
        'Stroomverbruik (kWh)': d['Stroomverbruik (kWh)'],
        'Laadvraag EV (kWh)': evDemandM,
        'Geclaimed door de laadpaal (Zonnestroom) (kWh)': evSolarM,
        'Netstroom laadsessies (kWh)': evGridM,
        'Direct verbruik huis (zonder accu) (kWh)': d['Direct verbruik (zonder accu) (kWh)'],
        'Extra verbruik via accu (kWh)': d['Extra verbruik via accu (kWh)'],
        'Resterende teruglevering naar net (kWh)': remainingGridFeedAfterEV
      };
    });
  }, [batteryChartData, calculation.laadpaal]);

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
          Met de Energieplanner Peel en Maas analyseren we nu jouw verbruik en isolatiegegevens. We berekenen de subsidies (ISDE en NIP) en stellen een optimaal stappenplan op...
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
    : getSolarInvestmentEstimate(solarPanelsCount);
  const solarSavings = Math.round(calculation.solar.annualYieldKwh * (calculation.house.elektraPrijs - 0.05));
  const solarROI = solarNetInvestment > 0 ? Number(((solarSavings / solarNetInvestment) * 100).toFixed(1)) : 0;
  const solarTvt = solarSavings > 0 ? Number((solarNetInvestment / solarSavings).toFixed(1)) : 0;

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
      tvt: calculation.totals.tvt,
      color: '#10b981', // Emerald
      details: insulationNet > 0 ? `€ ${insulationNet.toLocaleString('nl-NL')} netto` : 'Geen maatregelen geselecteerd'
    },
    {
      name: 'Zonnepanelen',
      roi: solarROI,
      investment: solarNetInvestment,
      savings: solarSavings,
      tvt: solarTvt,
      color: '#f59e0b', // Amber
      details: solarPanelsCount > 0 ? `${solarPanelsCount} panelen (${Math.round(calculation.solar.annualYieldKwh)} kWh/jr)` : 'Geen zonnepanelen ingevoerd'
    },
    {
      name: 'Thuisbatterij',
      roi: batteryROI,
      investment: batteryNetInvestment,
      savings: batterySavings,
      tvt: batterySavings > 0 ? Number((batteryNetInvestment / batterySavings).toFixed(1)) : 0,
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
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl rounded-2xl text-xs space-y-3 min-w-[300px] border border-slate-800 font-sans">
          <div className="border-b border-slate-800 pb-2">
            <span className="text-sm font-bold block text-white">📋 {displayName}</span>
            <span className="text-[10px] text-slate-400">Financiële specificatie per maatregel</span>
          </div>
          <div className="space-y-2.5">
            {payload.map((p: any, idx: number) => {
              const isTvt = p.name.includes('Terugverdientijd');
              const isSavings = p.name.includes('Jaarbesparing') || p.name.includes('besparing');
              const isSubsidie = p.name.includes('subsidie') || p.name.includes('Subsidie');
              
              let desc = "Financieel detail van de maatregel.";
              if (p.name.includes('ISDE')) desc = "Subsidieregeling vanuit de landelijke overheid (RVO).";
              else if (p.name.includes('NIP')) desc = "Lokale gemeentelijke subsidie van Peel en Maas.";
              else if (p.name.includes('Netto')) desc = "De netto eigen bijdrage die u zelf investeert.";
              else if (isTvt) desc = "De berekende periode tot de investering is terugverdiend.";
              else if (isSavings) desc = "Structurele jaarlijkse verlaging van uw gasrekening.";

              return (
                <div key={idx} className="space-y-0.5 border-b border-slate-850 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-slate-300 flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color }}></span>
                      {p.name}:
                    </span>
                    <span className={`font-mono font-bold text-right ${
                      isSavings ? 'text-emerald-400 text-sm' : 
                      isTvt ? 'text-amber-400 text-sm' : 
                      isSubsidie ? 'text-blue-400' : 'text-orange-400'
                    }`}>
                      {isTvt ? `${p.value} jaar` : `€ ${p.value.toLocaleString('nl-NL')}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-4">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const BreakEvenTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const balance = payload[0].value;
      const totalSavings = payload[1]?.value || 0;
      const isPositive = balance >= 0;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl rounded-2xl text-xs space-y-3.5 min-w-[310px] border border-slate-800 font-sans">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <div>
              <span className="text-sm font-bold block text-white">📅 Na {label} Jaar</span>
              <span className="text-[10px] text-slate-400">Cumulative balansontwikkeling</span>
            </div>
            <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isPositive ? 'Rendabel 🎉' : 'Investering ⏳'}
            </span>
          </div>

          <div className="space-y-3">
            {/* Net Result card */}
            <div className={`p-2.5 rounded-xl space-y-0.5 border ${
              isPositive ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-rose-950/20 border-rose-500/20'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  💼 Netto Financieel Resultaat:
                </span>
                <span className={`font-mono font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}€ {balance.toLocaleString('nl-NL')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isPositive 
                  ? "U heeft al uw isolatiekosten volledig terugverdiend en maakt pure winst!" 
                  : `U bent nog in de terugverdienfase. Nog € ${Math.abs(balance).toLocaleString('nl-NL')} te gaan tot break-even.`
                }
              </p>
            </div>

            {/* Cumulative savings */}
            <div className="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/20">
              <span className="text-slate-300 flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                Totale gasbesparing:
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                € {totalSavings.toLocaleString('nl-NL')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const BatteryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const originalData = payload[0].payload;
      const arbitrageVal = originalData ? originalData['Arbitrage stroomverschuiving (kWh)'] : 0;
      
      // Extract metrics safely for computed display
      const directBase = originalData ? Number(originalData['Direct verbruik (zonder accu) (kWh)']) : 0;
      const extraBattery = originalData ? Number(originalData['Extra verbruik via accu (kWh)']) : 0;
      const totalSolarUsed = directBase + extraBattery;
      const demand = originalData ? Number(originalData['Stroomverbruik (kWh)']) : 1;
      const solarYield = originalData ? Number(originalData['Zonnestroom opwek (kWh)']) : 0;
      
      const selfSufficiency = Math.min(100, Math.round((totalSolarUsed / (demand || 1)) * 100));
      const isSummer = ['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(label);

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 shadow-2xl rounded-2xl text-xs space-y-3.5 w-[290px] sm:w-[330px] max-w-[calc(100vw-32px)] border border-slate-750 font-sans pointer-events-none">
          <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
            <div>
              <span className="text-sm font-bold block text-white">Maand: {label}</span>
              <span className="text-[10px] text-slate-400">Gedetailleerde stroom- & accubalans</span>
            </div>
            <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isSummer 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {isSummer ? '☀️ Zomermodus (Eigen stroom)' : '❄️ Wintermodus (Slimme Arbitrage)'}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Opwek & Verbruik summary */}
            <div className="grid grid-cols-2 gap-2 text-center pb-2 border-b border-slate-800/50">
              <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/30">
                <span className="block text-[10px] text-amber-400 font-medium">☀️ Zonne-opwek</span>
                <span className="font-bold text-sm text-amber-300 font-mono">{Math.round(solarYield)} kWh</span>
              </div>
              <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/30">
                <span className="block text-[10px] text-rose-400 font-medium">📈 Huisverbruik</span>
                <span className="font-bold text-sm text-rose-300 font-mono">{Math.round(demand)} kWh</span>
              </div>
            </div>

            {/* Custom high-contrast line-by-line item with clear explanation */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  Direct zonne-verbruik:
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {Math.round(directBase)} kWh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4 mb-2">Zonnestroom die direct in huis wordt verbruikt.</p>

              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                  Verbruikt via de accu:
                </span>
                <span className="font-bold text-blue-400 font-mono">
                  +{Math.round(extraBattery)} kWh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4 mb-2">Overdag in de batterij opgeslagen zonnestroom die u 's avonds en 's nachts opmaakt.</p>

              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shrink-0" />
                  Restant teruglevering net:
                </span>
                <span className="font-bold text-slate-300 font-mono">
                  {Math.round(Math.max(0, solarYield - totalSolarUsed))} kWh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4 mb-2">Overtollige stroom die overblijft en aan het net wordt teruggeleverd.</p>
            </div>

            {/* Self-sufficiency index */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">Zelfvoorzienendheid:</span>
                <span className={`font-black font-mono px-2 py-0.5 rounded text-xs ${
                  selfSufficiency >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                  selfSufficiency >= 60 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                  'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                }`}>
                  {selfSufficiency}% {selfSufficiency >= 95 ? 'Nul op de meter! 🎉' : ''}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    selfSufficiency >= 90 ? 'bg-emerald-500' :
                    selfSufficiency >= 60 ? 'bg-blue-500' :
                    'bg-orange-500'
                  }`} 
                  style={{ width: `${selfSufficiency}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isSummer 
                  ? "☀️ Dankzij uw 30 kWh accu draait u deze maand volledig autonoom op eigen zonnestroom (100% zelfvoorzienend)." 
                  : "❄️ In de wintermaanden schiet de zon tekort, maar minimaliseert uw EMS de kosten via net-arbitrage."
                }
              </p>
            </div>

            {/* Arbitrage and Smart EMS info */}
            {arbitrageVal > 0 && (
              <div className="pt-2.5 border-t border-slate-800 space-y-1 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/10">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 flex items-center gap-2 font-bold">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block shrink-0 animate-pulse" />
                    ⚡ Arbitrage-sturing:
                  </span>
                  <span className="font-extrabold text-purple-300 font-mono">
                    ~{Math.round(arbitrageVal)} kWh
                  </span>
                </div>
                <p className="text-[9.5px] text-purple-200/85 leading-relaxed">
                  Uw Smart Home-systeem laadt de accu op met goedkope windstroom van het net tijdens daluren/negatieve uren en ontlaadt tijdens dure piekuren om stroomkosten te vermijden.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const LaadpaalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const originalData = payload[0].payload;
      
      const solarYield = originalData ? Number(originalData['Zonnestroom opwek (kWh)']) : 0;
      const evDemand = originalData ? Number(originalData['Laadvraag EV (kWh)']) : 0;
      const evSolar = originalData ? Number(originalData['Geclaimed door de laadpaal (Zonnestroom) (kWh)']) : 0;
      const evGrid = originalData ? Number(originalData['Netstroom laadsessies (kWh)']) : 0;
      
      const directBase = originalData ? Number(originalData['Direct verbruik huis (zonder accu) (kWh)']) : 0;
      const extraBattery = originalData ? Number(originalData['Extra verbruik via accu (kWh)']) : 0;
      const remainingGridFeed = originalData ? Number(originalData['Resterende teruglevering naar net (kWh)']) : 0;
      
      const solarCoveragePercent = evDemand > 0 ? Math.min(100, Math.round((evSolar / evDemand) * 100)) : 0;
      const isSummer = ['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(label);

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 shadow-2xl rounded-2xl text-xs space-y-3.5 w-[290px] sm:w-[330px] max-w-[calc(100vw-32px)] border border-slate-750 font-sans pointer-events-none">
          <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
            <div>
              <span className="text-sm font-bold block text-white">Maand: {label}</span>
              <span className="text-[10px] text-slate-400">Gedetailleerde stroom- &amp; laadpaalbalans</span>
            </div>
            <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isSummer 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {isSummer ? '☀️ Veel zonnestroom' : '❄️ Minder zonnestroom'}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-center pb-2 border-b border-slate-800/50">
              <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/30">
                <span className="block text-[10px] text-amber-400 font-medium">☀️ Zonne-opwek</span>
                <span className="font-bold text-sm text-amber-300 font-mono">{Math.round(solarYield)} kWh</span>
              </div>
              <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/30">
                <span className="block text-[10px] text-emerald-400 font-medium">🚗 EV Laadvraag</span>
                <span className="font-bold text-sm text-emerald-300 font-mono">{Math.round(evDemand)} kWh</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block shrink-0" />
                  Zonnestroom in EV:
                </span>
                <span className="font-bold text-violet-400 font-mono">
                  {Math.round(evSolar)} kWh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4 mb-2 font-medium">Directe zonnestroom die in de auto wordt geladen.</p>

              <div className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block shrink-0" />
                  Netstroom in EV:
                </span>
                <span className="font-bold text-slate-300 font-mono">
                  {Math.round(evGrid)} kWh
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4 mb-2 font-medium">Stroom van het net om de auto op te laden (bijv. 's nachts).</p>
              
              <div className="border-t border-slate-800/40 my-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Verdeling totale zonnestroom in deze maand:</span>
                
                <div className="flex justify-between items-center text-[11px] text-slate-300">
                  <span>Huis direct verbruik:</span>
                  <span className="font-mono">{Math.round(directBase)} kWh</span>
                </div>
                {extraBattery > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-slate-300">
                    <span>Opgeslagen via accu:</span>
                    <span className="font-mono">{Math.round(extraBattery)} kWh</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px] text-violet-400 font-semibold">
                  <span>Geclaimed door laadpaal:</span>
                  <span className="font-mono">{Math.round(evSolar)} kWh</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-300">
                  <span>Teruggeleverd aan net:</span>
                  <span className="font-mono">{Math.round(remainingGridFeed)} kWh</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">Zonnedekking laadsessie:</span>
                <span className="font-black font-mono px-2 py-0.5 rounded text-xs bg-violet-500/20 text-violet-400 border border-violet-500/20">
                  {solarCoveragePercent}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${solarCoveragePercent}%` }}
                />
              </div>
            </div>
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
  const evVol = Math.round(((calculation.tech?.evKilometers ?? 15000) / 100) * (calculation.tech?.evVerbruik ?? 18) * (calculation.tech?.evThuisLaden ?? 75) / 100);
  const evSavings = evVol * (0.50 - (calculation.house?.elektraPrijs ?? 0.30));
  const ereRevenue = evVol * 0.12;
  const totalEvBenefit = Math.round(evSavings + ereRevenue);

  // 🌟 Totaalvoorstel Alle Maatregelen Samen
  const hasIso = isoCount > 0;
  const hasSolar = solarPanels > 0;
  const hasBat = batCapacity > 0;
  const hasWp = Boolean(calculation.tech?.selectedWarmtepompModel) && Boolean(chosenOpt);
  const hasEv = Boolean((calculation.tech?.evKilometers || 0) > 0);

  const totalCombinedNetInvestment = 
    (hasIso ? isoNetCosts : 0) + 
    (hasSolar ? solarNetInvestment : 0) + 
    (hasBat ? batteryNetInvestment : 0) + 
    (hasWp ? Math.round(chosenOpt?.netInvestment || 0) : 0) + 
    (hasEv ? (calculation.laadpaal?.netInvestmentEuro ?? 1200) : 0);

  const totalCombinedSavingsPerYear = 
    (hasIso ? Math.round(calculation.totals.savingsEuro) : 0) + 
    (hasSolar ? solarSavings : 0) + 
    (hasBat ? batSavings : 0) + 
    (hasWp ? Math.round(chosenOpt?.netSavingsEuro || 0) : 0) + 
    (hasEv ? totalEvBenefit : 0);

  const totalCombinedSubsidies = 
    (hasIso ? Math.round(calculation.totals.isde + calculation.totals.nip) : 0) + 
    (hasWp ? Math.round(chosenOpt?.subsidy || 0) : 0);

  const totalCombinedTvtNum = totalCombinedSavingsPerYear > 0 ? (totalCombinedNetInvestment / totalCombinedSavingsPerYear) : 0;
  const totalCombinedTvt = totalCombinedTvtNum > 0 && totalCombinedTvtNum < 99 ? `${totalCombinedTvtNum.toFixed(1)} jaar` : 'N.v.t.';

  return (
    <div className="space-y-3.5" id="advice-report-section">
      {/* Interactieve KPI Kaarten */}
      {outerTab === 'isolatie' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowGasModal(true)}
            className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2.5 hover:border-emerald-300 hover:shadow-md transition-all text-left cursor-pointer group relative overflow-hidden"
            title="Klik voor gedetailleerde berekening en opbouw van de gasbesparing"
          >
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Besparing</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors">
                  <Info className="w-2.5 h-2.5 text-emerald-600" /> Opbouw
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-extrabold text-slate-800">
                  €{Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">/ jaar</span>
              </div>
              <span className="block text-[10px] text-slate-500 font-medium">
                ({Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0))} m³ gas)
              </span>
            </div>
          </button>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2.5">
            <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Eigen Bijdrage</span>
              <span className="text-base font-extrabold text-slate-800">
                €{Math.round(calculation.totals.net).toLocaleString('nl-NL')}
              </span>
              <span className="block text-[10px] text-orange-600">Netto kosten</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2.5">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subsidies</span>
              <span className="text-base font-extrabold text-slate-800">
                €{Math.round(calculation.totals.isde + calculation.totals.nip).toLocaleString('nl-NL')}
              </span>
              <span className="block text-[10px] text-blue-600">ISDE + NIP</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-2.5">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Zonnestroom</span>
              <span className="text-base font-extrabold text-slate-800">
                {Math.round(calculation.solar.annualYieldKwh)} kWh
              </span>
              <span className="block text-[10px] text-amber-700 font-medium truncate">
                {solarPanelsCount > 0
                  ? `Inv: €${Math.round(solarNetInvestment).toLocaleString('nl-NL')} • TVT: ${solarTvt > 0 ? `${solarTvt} jr` : 'N.v.t.'}`
                  : 'Geen zonnepanelen'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NIP Subsidie alert panel */}
      {outerTab === 'isolatie' && (
        calculation.eligibleNip ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex gap-2.5 items-start">
            <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-800">NIP-Subsidie €2.900 Beschikbaar!</h4>
              <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-snug">
                Fantastisch nieuws! Je voldoet aan de criteria voor het gemeentelijke Nationaal Isolatieprogramma (NIP). 
                De €2.900 is in de berekening hiernaast reeds in mindering gebracht op de netto eigen bijdrage.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-700">Geen NIP-Subsidie (€2.900) mogelijk</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                {calculation.nipExplanation}
              </p>
            </div>
          </div>
        )
      )}

      {/* Advies rapportage container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden print:border-0 print:shadow-none">
        
        {/* Rapporthoofd: Registratiecode, Introductie & Acties */}
        <div className="bg-slate-50 border-b border-slate-200/80 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Registratiecode: {calculation.resident.registratiecode || "PM-CONCEPT"}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  {calculation.resident.datum || new Date().toLocaleDateString('nl-NL')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                Energieplanner Peel en Maas Adviesrapport
              </h2>
              <p className="text-xs text-slate-600 leading-snug max-w-3xl">
                Beste {calculation.resident.aanhef || ''} {calculation.resident.voorletters || ''} {calculation.resident.achternaam || ''}, bedankt voor het invullen van de Energieplanner Peel en Maas. Hieronder vind je het totaalvoorstel. Klik op een thema om de details te openen.
              </p>
              {/* Interactive Theme Status Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5 print:hidden">
                {/* 🏠 Isolatie */}
                <button
                  type="button"
                  onClick={() => toggleTab('graph')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'graph'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80'
                  }`}
                >
                  <span>🏠 Isolatie:</span>
                  <span className="font-semibold">
                    {isoCount > 0 
                      ? `${isoCount} ${isoCount === 1 ? 'maatregel' : 'maatregelen'} (€${Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}/jr)`
                      : '0 maatregelen'}
                  </span>
                  {activeTab === 'graph' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* ☀️ Zonnepanelen */}
                <button
                  type="button"
                  onClick={() => toggleTab('solar')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'solar'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                      : solarPanels > 0 
                        ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60'
                  }`}
                >
                  <span>☀️ Zonnepanelen:</span>
                  <span className="font-semibold">
                    {solarPanels > 0 
                      ? `${solarPanels} panelen / ${solarKwp} kWp (${solarYield.toLocaleString('nl-NL')} kWh/jr)`
                      : 'Geen zonnepanelen'}
                  </span>
                  {activeTab === 'solar' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* 🔋 Thuisbatterij */}
                <button
                  type="button"
                  onClick={() => toggleTab('battery')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'battery'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-500/20'
                      : batCapacity > 0
                        ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100/80'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60'
                  }`}
                >
                  <span>🔋 Thuisbatterij:</span>
                  <span className="font-semibold">
                    {batCapacity > 0 
                      ? `${batCapacity} kWh (€${batSavings.toLocaleString('nl-NL')}/jr)`
                      : 'Geen thuisbatterij'}
                  </span>
                  {activeTab === 'battery' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* ♨️ Warmtepomp */}
                <button
                  type="button"
                  onClick={() => toggleTab('heatpump')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'heatpump'
                      ? 'bg-orange-600 text-white border-orange-700 shadow-xs ring-2 ring-orange-500/20'
                      : calculation.house?.verwarming !== 'CV-ketel' && calculation.house?.verwarming !== 'Geen / Overig'
                        ? 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100/80'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60'
                  }`}
                >
                  <span>♨️ Warmtepomp:</span>
                  <span className="font-semibold">
                    {calculation.house?.verwarming === 'CV-ketel' || calculation.house?.verwarming === 'Geen / Overig' 
                      ? 'CV-ketel'
                      : `${wpType} (${wpSize})`}
                  </span>
                  {activeTab === 'heatpump' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* 🚗 EV / Laadpaal */}
                <button
                  type="button"
                  onClick={() => toggleTab('laadpaal')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'laadpaal'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-500/20'
                      : calculation.tech?.evKilometers
                        ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100/80'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/60'
                  }`}
                >
                  <span>🚗 EV / Laadpaal:</span>
                  <span className="font-semibold">
                    {calculation.tech?.evKilometers 
                      ? `${calculation.tech.evKilometers.toLocaleString('nl-NL')} km/jr`
                      : 'Geen EV'}
                  </span>
                  {activeTab === 'laadpaal' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* ⚖️ Saldering */}
                <button
                  type="button"
                  onClick={() => toggleTab('saldering')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'saldering'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-xs ring-2 ring-teal-500/20'
                      : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100/80'
                  }`}
                >
                  <span>⚖️ Saldering:</span>
                  <span className="font-semibold">{salderingContract}</span>
                  {activeTab === 'saldering' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>

                {/* 📄 AI Adviesrapport */}
                <button
                  type="button"
                  onClick={() => toggleTab('text')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'text'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100/80'
                  }`}
                >
                  <span>📄 AI Adviesrapport</span>
                  {activeTab === 'text' ? <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-90" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />}
                </button>
              </div>
            </div>

            {/* Print, Email, Copy action buttons */}
            <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-xs cursor-pointer"
                id="print-report-btn"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Afdrukken / PDF</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setIsEmailModalOpen(!isEmailModalOpen);
                    setEmailStatus('idle');
                    setEmailStatusMessage('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer ${
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
                        className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold py-2 px-3 rounded-xl transition shadow-xs cursor-pointer"
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

          {/* Totaalvoorstel Verduurzaming Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">Totaalvoorstel Verduurzaming</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Alle Maatregelen Samen
                </span>
              </div>
              {totalCombinedSubsidies > 0 && (
                <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-md self-start sm:self-auto">
                  € {totalCombinedSubsidies.toLocaleString('nl-NL')} Subsidie
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 border border-slate-150 p-3 rounded-xl text-xs font-medium">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Netto Investering</span>
                <strong className="text-slate-900 font-extrabold text-sm">€{totalCombinedNetInvestment.toLocaleString('nl-NL')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Totale Jaarbesparing</span>
                <strong className="text-emerald-700 font-extrabold text-sm">€{totalCombinedSavingsPerYear.toLocaleString('nl-NL')}/jr</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gemiddelde TVT</span>
                <strong className="text-amber-600 font-extrabold text-sm">{totalCombinedTvt}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rendement</span>
                <strong className="text-blue-600 font-extrabold text-sm">{totalCombinedNetInvestment > 0 ? `${((totalCombinedSavingsPerYear / totalCombinedNetInvestment) * 100).toFixed(1)}%` : '0%'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Geopend detail indicator banner */}
        {activeTab !== null && (
          <div className="mx-4 sm:mx-5 mb-2 p-3 bg-slate-100/90 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                Geopend detail: {
                  activeTab === 'graph' ? '🏠 Isolatie & Financiële Planner' :
                  activeTab === 'solar' ? '☀️ Zonnepanelen' :
                  activeTab === 'saldering' ? '⚖️ Saldering & Netto-teruglevering' :
                  activeTab === 'battery' ? '🔋 Thuisbatterij & Arbitrage' :
                  activeTab === 'heatpump' ? '♨️ Warmtepomp & Rendement' :
                  activeTab === 'laadpaal' ? '🚗 Eigen Laadpaal & EV' :
                  '📄 AI Adviesrapport'
                }
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLocalActiveTab(null)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              Details sluiten ✕
            </button>
          </div>
        )}

        {/* Tab Content 1: Graphical Overview */}
        {activeTab === 'graph' && (
          <div className="p-4 sm:p-5 space-y-4 animate-fadeIn" id="graphical-dashboard">
            
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-800">3. Jaarlijkse Structurele Besparing</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGasModal(true)}
                    className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    Bekijk opbouw m³ gasbesparing
                  </button>
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
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-xs font-bold text-slate-700">{item.name}</span>
                              <span className="text-xs font-extrabold" style={{ color: item.color }}>{item.roi}% ROI</span>
                              {item.investment > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                  Investering: €{Math.round(item.investment).toLocaleString('nl-NL')}
                                </span>
                              )}
                              {item.investment > 0 && item.savings > 0 && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                  TVT: {item.tvt.toFixed(1)} jr
                                </span>
                              )}
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
          <div className="p-4 sm:p-5 space-y-4 animate-fadeIn" id="solar-dashboard">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                Zonnepanelen & Einde Salderingsregeling
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gepersonaliseerd advies gebaseerd op een jaaropbrengst van <strong>{Math.round(calculation.solar.annualYieldKwh)} kWh</strong> met <strong>{calculation.tech.aantalZonnepanelen} zonnepanelen</strong>, een oriëntatie van <strong>{calculation.tech.dakOrientatie}°</strong> en een hellingshoek van <strong>{calculation.tech.dakHellingshoek !== undefined ? calculation.tech.dakHellingshoek : 35}°</strong>.
              </p>
              {calculation.tech.pvCurtailmentMode && (
                <div className="mt-3 bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Zonnepanelen Sturing Mode (AAN):</strong> Je omvormer wordt automatisch teruggeregeld bij negatieve dynamische stroomprijzen om terugleverboetes aan het net te voorkomen.
                  </span>
                </div>
              )}
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

            {/* Financial statistics row */}
            {solarPanelsCount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="solar-financials-grid">
                <div className="bg-amber-50/40 border border-amber-100/60 p-5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Netto investering zonnepanelen</span>
                  <span className="text-xl font-extrabold text-amber-950">
                    € {solarNetInvestment.toLocaleString('nl-NL')}
                  </span>
                  <p className="text-xs text-slate-500">
                    {calculation.tech.customZonnepanelenPrijs !== undefined && calculation.tech.customZonnepanelenPrijs > 0
                      ? 'Op basis van uw eigen prijsopgave.'
                      : `Richtprijs incl. installatie (~ € ${Math.round(solarNetInvestment / (solarPanelsCount || 1)).toLocaleString('nl-NL')}/paneel).`}
                  </p>
                </div>
                <div className="bg-amber-50/40 border border-amber-100/60 p-5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Jaarbesparing zonnepanelen</span>
                  <span className="text-xl font-extrabold text-amber-900">
                    € {solarSavings.toLocaleString('nl-NL')} / jr
                  </span>
                  <p className="text-xs text-slate-500">
                    Opbrengst vermenigvuldigd met nettobesparing per kWh.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Terugverdientijd (TVT)</span>
                  <span className="text-xl font-extrabold text-amber-600 flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
                    {solarTvt.toFixed(1)} jaar
                  </span>
                  <p className="text-xs text-slate-500">
                    Verwachte terugverdientijd van de zonnepanelen-investering.
                  </p>
                </div>
              </div>
            )}

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

              {/* Detailed Calculation Accordion */}
              <div className="bg-white/80 rounded-xl border border-rose-100/80 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowSalderingDetail(!showSalderingDetail)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-700 hover:bg-rose-50/50 transition-colors text-xs"
                >
                  <span className="flex items-center gap-2 text-rose-800">
                    <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    Hoe is deze verliespost berekend? Bekijk de uitgebreide berekening (met accu, warmtepomp, EV)
                  </span>
                  {showSalderingDetail ? (
                    <ChevronUp className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </button>

                {showSalderingDetail && (
                  <div className="p-5 border-t border-rose-100/60 space-y-5 text-xs text-slate-600 bg-slate-50/50 animate-fadeIn">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">De Salderingsformule (Vanaf 2027)</span>
                      <p className="bg-slate-100/80 p-3 rounded-lg font-mono text-[10px] text-slate-700 leading-relaxed border border-slate-200">
                        <strong>Bruto Verliespost = Bruto Teruglevering (kWh) × (Stroomtarief [€ {calculation.house.elektraPrijs.toFixed(2)}] - Terugleververgoeding [€ 0,06])</strong>
                        <br />
                        <span className="text-slate-500 font-sans text-[9.5px] mt-1 block">
                          Elke kWh die u opwekt en niet direct binnenshuis verbruikt, wordt teruggeleverd aan het net. Na de afschaffing van het salderen levert deze teruglevering u slechts een geschatte € 0,06/kWh op, terwijl u voor afname de hoofdprijs (€ {calculation.house.elektraPrijs.toFixed(2)}) betaalt. Dit verschil van <strong>€ {(calculation.house.elektraPrijs - 0.06).toFixed(2)}/kWh</strong> is uw netto verliespost.
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide text-rose-800">Uitsplitsing Parameters van de Rekenmethode</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1 shadow-xs">
                          <span className="text-[10px] font-bold text-blue-600 block">🔋 Thuisbatterij</span>
                          <p className="text-[11px] leading-snug">
                            <strong>Cap Accu:</strong> {calculation.tech.capaciteitAccu > 0 ? `${calculation.tech.capaciteitAccu} kWh` : `${batteryOpt ? batteryOpt.capacityKwh : 10} kWh (geadviseerd)`}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">Capaciteit om overdag overtollige zonnestroom tijdelijk op te slaan voor de avond.</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1 shadow-xs">
                          <span className="text-[10px] font-bold text-indigo-600 block">♨️ Warmtepomp</span>
                          <p className="text-[11px] leading-snug">
                            <strong>Verbruik WP:</strong> {Math.round(chosenOpt?.elecIncreaseKwh || 1800)} kWh/jr
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">Extra stroomverbruik van de warmtepomp om uw gasverbruik met 75%+ te verlagen.</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1 shadow-xs">
                          <span className="text-[10px] font-bold text-purple-600 block">🚗 Slimme Laadpaal</span>
                          <p className="text-[11px] leading-snug">
                            <strong>Verbruik EV:</strong> {Math.round(calculation.laadpaal?.evAnnualDemandKwh || 2025)} kWh/jr
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">Laadstroom benodigd voor de auto thuis op basis van kilometrage en verbruik.</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1 shadow-xs">
                          <span className="text-[10px] font-bold text-amber-600 block">⚡ Arbitrage Trading</span>
                          <p className="text-[11px] leading-snug">
                            <strong>Systeem:</strong> {calculation.tech.typeContract === 'Dynamisch' ? 'Actief (Dynamisch)' : 'Geadviseerd / Optioneel'}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">Handelen op uurtarieven (slim laden bij lage tarieven, ontladen bij hoge tarieven).</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stap-voor-stap Berekening van de Verliesbeperking</span>
                      <div className="space-y-2.5">
                        
                        {/* 1. Base State */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shrink-0" />
                              Stap 1: Bruto Uitgangssituatie (Zonder slimme sturing)
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Uw panelen wekken jaarlijks <strong>{Math.round(calculation.solar.annualYieldKwh).toLocaleString('nl-NL')} kWh</strong> op. Zonder actieve seizoenssturing verbruikt u direct slechts {Math.round(calculation.solar.selfConsumptionBase)}% ({Math.round(calculation.solar.absoluteSelfConsumptionBaseKwh).toLocaleString('nl-NL')} kWh). 
                              De resterende <strong>{Math.round(calculation.solar.gridFeedBaseKwh).toLocaleString('nl-NL')} kWh</strong> levert u terug aan het net.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-rose-600 font-extrabold block text-sm">
                              + € {Math.round(calculation.solar.gridFeedBaseKwh * (calculation.house.elektraPrijs - 0.06)).toLocaleString('nl-NL')}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">bruto jaarverlies</span>
                          </div>
                        </div>

                        {/* 2. Battery Impact */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <Battery className="w-4 h-4 text-blue-500 shrink-0" />
                              Stap 2: Impact van de Thuisbatterij ({calculation.tech.capaciteitAccu > 0 ? `${calculation.tech.capaciteitAccu} kWh` : `${batteryOpt ? batteryOpt.capacityKwh : 10} kWh`})
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              De thuisaccu slaat overdag zonnestroom op voor de avonduren. Dit verhoogt uw directe eigen verbruik met <strong>{Math.round(calculation.solar.absoluteSelfConsumptionWithBatteryKwh - calculation.solar.absoluteSelfConsumptionBaseKwh).toLocaleString('nl-NL')} kWh/jaar</strong>. 
                              Hierdoor hoeft deze stroom niet meer goedkoop te worden teruggeleverd.
                            </p>
                            {calculation.tech.typeContract === 'Dynamisch' && (
                              <p className={`text-[10px] font-semibold px-2 py-1 rounded-md inline-block mt-1 ${
                                calculation.tech.batteryGridTrading 
                                  ? 'text-blue-600 bg-blue-50' 
                                  : 'text-amber-800 bg-amber-50'
                              }`}>
                                {calculation.tech.batteryGridTrading ? (
                                  <span>🔗 <strong>Arbitrage Trading Actief:</strong> Dankzij uw dynamische contract en slimme EMS-batterijsturing koopt u stroom in op goedkope of negatieve uren en levert u terug op dure piekuren. Dit levert u circa <strong>€ {Math.round(batteryOpt ? (batteryOpt.capacityKwh * (calculation.tech.dynamicProvider === 'Zonneplan' ? 85 : calculation.tech.dynamicProvider === 'Frank' ? 70 : calculation.tech.dynamicProvider === 'Tibber' ? 65 : 60)) : 650).toLocaleString('nl-NL')} per jaar</strong> aan additioneel handelsvoordeel op!</span>
                                ) : (
                                  <span>☀️ <strong>100% Zonne-focus Actief:</strong> Accu slaat uitsluitend eigen zonnestroom op. Er vindt geen nethandel op dynamische tarieven plaats (€0/jaar pure arbitrage).</span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-600 font-extrabold block text-sm">
                              - € {Math.round((calculation.solar.absoluteSelfConsumptionWithBatteryKwh - calculation.solar.absoluteSelfConsumptionBaseKwh) * (calculation.house.elektraPrijs - 0.06)).toLocaleString('nl-NL')}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">verlies vermeden</span>
                          </div>
                        </div>

                        {/* 3. Heat Pump Impact */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                              Stap 3: Impact van de Warmtepomp ({Math.round(chosenOpt?.elecIncreaseKwh || 1800)} kWh/jr verbruik)
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Door de warmtepomp slim overdag te sturen (bijvoorbeeld door uw boiler overdag op te warmen tot 55°C met zonnestroom), dekken uw panelen direct <strong>{Math.round(chosenOpt?.solarCoverageKwh || 0).toLocaleString('nl-NL')} kWh/jaar</strong> van het warmtepompverbruik. Dit is stroom die u anders direct zou terugleveren.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-600 font-extrabold block text-sm">
                              - € {Math.round((chosenOpt?.solarCoverageKwh || 0) * (calculation.house.elektraPrijs - 0.06)).toLocaleString('nl-NL')}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">verlies vermeden</span>
                          </div>
                        </div>

                        {/* 4. EV Impact */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                              Stap 4: Impact van de Slimme EV Laadpaal ({Math.round(calculation.laadpaal?.evAnnualDemandKwh || 2025)} kWh/jr verbruik)
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {calculation.tech.slimEmsOnlySolar ? (
                                <span><strong>EMS Alleen Laden op Zonnestroom Actief:</strong> Uw auto laadt <i>uitsluitend</i> bij overschot aan zonne-energie. Dit voorkomt dat u stroom van het net moet inkopen om te laden. Uw auto verbruikt zo direct <strong>{Math.round(calculation.laadpaal?.evSolarCoverageKwh || 0).toLocaleString('nl-NL')} kWh/jaar</strong> gratis zonnestroom.</span>
                              ) : (
                                <span>Door uw auto overdag thuis in te pluggen, claimt de laadpaal direct <strong>{Math.round(calculation.laadpaal?.evSolarCoverageKwh || 0).toLocaleString('nl-NL')} kWh/jaar</strong> direct uit zonnestroom die anders het net op was gegaan.</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-emerald-600 font-extrabold block text-sm">
                              - € {Math.round((calculation.laadpaal?.evSolarCoverageKwh || 0) * (calculation.house.elektraPrijs - 0.06)).toLocaleString('nl-NL')}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">verlies vermeden</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="space-y-2 pt-2.5 border-t border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Netto Seizoensbalans na Optimale Integratiesturing</span>
                      <div className="bg-emerald-100/20 p-4 rounded-xl border border-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 block text-xs">📉 Nieuwe Resterende Netto Teruglevering:</span>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Door het gecombineerde seizoensgebonden verbruik van de <strong>warmtepomp</strong> en de <strong>laadpaal</strong>, samen met de opslagcap van de <strong>thuisbatterij</strong>, minimaliseert u uw teruglevering. Er blijft na deze sturing jaarlijks nog slechts:  
                            <strong className="text-slate-900 font-semibold block text-xs mt-0.5">
                              {Math.max(0, Math.round(
                                calculation.solar.gridFeedBaseKwh - 
                                (calculation.solar.absoluteSelfConsumptionWithBatteryKwh - calculation.solar.absoluteSelfConsumptionBaseKwh) -
                                (chosenOpt?.solarCoverageKwh || 0) -
                                (calculation.laadpaal?.evSolarCoverageKwh || 0)
                              )).toLocaleString('nl-NL')} kWh over om terug te leveren aan het net.
                            </strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0 md:border-l md:border-slate-100 md:pl-5">
                          <span className="text-2xl font-black text-emerald-600 block">
                            € {Math.max(0, Math.round(
                              Math.max(0, calculation.solar.gridFeedBaseKwh - 
                                (calculation.solar.absoluteSelfConsumptionWithBatteryKwh - calculation.solar.absoluteSelfConsumptionBaseKwh) -
                                (chosenOpt?.solarCoverageKwh || 0) -
                                (calculation.laadpaal?.evSolarCoverageKwh || 0)
                              ) * (calculation.house.elektraPrijs - 0.06)
                            )).toLocaleString('nl-NL')}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-bold">resterende verliespost / jr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
          <div className="p-4 sm:p-5 space-y-4 animate-fadeIn" id="battery-dashboard">
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
                  <span className="font-bold text-amber-800 block">Geen thuisbatterij ingesteld</span>
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


            {/* Maandelijkse Energiestromen met Thuisaccu Grafiek - Paginabreed */}
            <div className="-mx-6 md:-mx-8">
              <BatterySolarChart
                resident={calculation.resident}
                house={calculation.house}
                insulation={calculation.insulation}
                tech={calculation.tech}
                setTech={setTech}
              />
            </div>

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
          <div className="p-4 sm:p-5 space-y-4 animate-fadeIn" id="heatpump-dashboard">
            <div className="border-b border-slate-100 pb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Warmtepomp Vergelijking &amp; Financieel Advies
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gedetailleerde analyse van de financiële en technische haalbaarheid voor een <strong>Hybride</strong> of <strong>All-Electric</strong> warmtepomp op basis van je resterende gasverbruik van <strong>{Math.round(calculation.heatpump.remainingGasM3)} m³</strong>.
              </p>
            </div>

            {/* Current Config Status Alert for Warmtepomp */}
            {calculation.house?.verwarming === 'CV-ketel' || calculation.house?.verwarming === 'Geen / Overig' ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3 items-start text-xs shadow-2xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900 block">Geen warmtepomp ingevoerd</span>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    In je huidige instellingen staat de verwarming op een traditionele CV-ketel op gas. Hieronder vind je de doorberekening en vergelijking van een Hybride of All-Electric warmtepomp voor jouw woning in Peel en Maas, zodat je kunt zien hoeveel gas en geld je hiermee kunt besparen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex gap-3 items-start text-xs shadow-2xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block">Warmtepomp geconfigureerd: {calculation.house?.verwarming}</span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                    Jouw woning is geconfigureerd met een {calculation.house?.verwarming}. Bekijk hieronder het verwachte rendement, de ISDE-subsidie en de vergelijking tussen hybride en all-electric.
                  </p>
                </div>
              </div>
            )}

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


          </div>
        )}

        {/* Tab Content 5: Dedicated Laadpaal results */}
        {activeTab === 'laadpaal' && (
          <div className="p-4 sm:p-5 print:p-0 space-y-4">
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 space-y-6 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100/60">
                <Zap className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">🚗 Financiële Analyse: Eigen Laadpaal &amp; ERE-vergoeding</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thuisgeladen volume</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {(calculation.laadpaal?.evAnnualDemandKwh ?? 2025).toLocaleString('nl-NL')} kWh
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({calculation.tech?.evThuisLaden ?? 75}% van jaarlijks EV verbruik)
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Laadpaal Besparing</span>
                  <span className="text-lg font-extrabold text-emerald-600">
                    € {(calculation.laadpaal?.evSavingsEuro ?? 405).toLocaleString('nl-NL')} / jr
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (t.o.v. openbaar laden à €0,50/kWh)
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Wettelijke ERE-vergoeding</span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    € {(calculation.laadpaal?.ereRevenueEuro ?? 243).toLocaleString('nl-NL')} / jr
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Opbrengst van €0,12 / kWh geladen)
                  </span>
                </div>
              </div>

              {/* Solar energy balance integration warning / explanation */}
              {calculation.solar.annualYieldKwh > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                  <span className="font-bold block">☀️ Energiebalans &amp; Slim Zonnestroom Laden</span>
                  {calculation.tech?.slimEmsOnlySolar ? (
                    <p className="leading-relaxed">
                      Op basis van je zonnepanelenopbrengst en laadprofiel is berekend dat je jaarlijks circa <strong>{(calculation.laadpaal?.evSolarCoverageKwh ?? 0).toLocaleString('nl-NL')} kWh</strong> direct uit je eigen zonnepanelen laadt. Omdat je beschikt over een <strong>slim EMS dat alleen op overtollige zonnestroom laadt</strong>, importeer je thuis <strong>0 kWh</strong> van het net. De overige <strong>{Math.max(0, (calculation.laadpaal?.evAnnualDemandKwh ?? 0) - (calculation.laadpaal?.evSolarCoverageKwh ?? 0)).toLocaleString('nl-NL')} kWh</strong> laad je extern of openbaar.
                    </p>
                  ) : (
                    <p className="leading-relaxed">
                      Op basis van je zonnepanelenopbrengst en laadprofiel is berekend dat je jaarlijks circa <strong>{(calculation.laadpaal?.evSolarCoverageKwh ?? 0).toLocaleString('nl-NL')} kWh</strong> direct uit je eigen zonnepanelen kunt laden (slim gestuurd overdag). De resterende <strong>{(calculation.laadpaal?.evGridImportKwh ?? 2025).toLocaleString('nl-NL')} kWh</strong> laad je vanuit het stroomnet.
                    </p>
                  )}
                  <div className="bg-emerald-100/40 p-2.5 rounded-xl border border-emerald-200/50 text-[11px] leading-relaxed text-emerald-900 font-mono">
                    ⚠️ <strong>Let op:</strong> De <strong>{(calculation.laadpaal?.evSolarCoverageKwh ?? 0).toLocaleString('nl-NL')} kWh</strong> aan zonnestroom die direct naar je auto gaat, is automatisch in mindering gebracht op de totale teruglevering aan het net én is niet meer beschikbaar voor een eventuele warmtepomp. Dit voorkomt dubbeltellingen en zorgt voor een 100% sluitende energiebalans!
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gecombineerd Jaarlijks Voordeel</span>
                  <span className="text-2xl font-black text-slate-900">
                    € {(calculation.laadpaal?.totalSavingsEuro ?? 648).toLocaleString('nl-NL')} / jr
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 font-extrabold text-xs px-3 py-1.5 rounded-lg border border-emerald-100 font-mono">
                  Terugverdientijd: ~{(calculation.laadpaal?.tvt ?? 1.8).toFixed(1)} jaar {(calculation.tech?.customLaadpaalPrijs !== undefined && calculation.tech?.customLaadpaalPrijs > 0) ? '(op basis van eigen prijsopgave)' : '(standaard raming)'}
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
          <div className="p-4 sm:p-5 print:p-0 space-y-4">
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
                  Er is nog geen energieadvies gegenereerd. Vul links je gegevens in en klik op de knop om direct een op maat gemaakt, begrijpelijk en betrouwbaar adviesrapport te ontvangen.
                </p>
                <p className="text-xs text-emerald-600 font-semibold">
                  Tip: Gebruik de snelprofielen bovenaan om direct te testen!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gasbesparing Opbouw Modal */}
      {showGasModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Opbouw &amp; Berekening Gasbesparing
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Gedetailleerd overzicht van hoe de besparing in m³ en euro's is berekend
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowGasModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Top KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Totaal Gasbesparing
                </span>
                <span className="text-xl font-extrabold text-emerald-900 block mt-0.5 font-mono">
                  {Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0))} m³
                </span>
                <span className="text-[11px] text-emerald-700 font-medium block">per jaar</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Financiële Waarde
                </span>
                <span className="text-xl font-extrabold text-slate-800 block mt-0.5 font-mono">
                  € {Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  à € {(calculation.house.gasPrijs || 1.50).toFixed(2)} / m³
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Stookgedragfactor
                </span>
                <span className="text-xl font-extrabold text-slate-800 block mt-0.5 font-mono">
                  {(calculation.house.stookgedragFactor || 1.0).toFixed(1)}x
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {calculation.house.stookgedragBerekend || 'Normaal'}
                </span>
              </div>
            </div>

            {/* Tabel met maatregelen */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Gespecificeerde opbouw per gekozen isolatiemaatregel
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-3">Maatregel</th>
                      <th className="p-3 text-right">Opp. (m²)</th>
                      <th className="p-3 text-right">Norm m³/m²</th>
                      <th className="p-3 text-right">Stookfactor</th>
                      <th className="p-3 text-right text-emerald-700">Gas (m³/jr)</th>
                      <th className="p-3 text-right text-slate-500">Gasprijs</th>
                      <th className="p-3 text-right text-emerald-700">Besparing (€/jr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculation.measures.length > 0 ? (
                      calculation.measures.map((m) => {
                        const coeff = COEFFS[m.id as keyof typeof COEFFS];
                        const normSaving = coeff?.saving || 0;
                        const stookFactor = calculation.house.stookgedragFactor || 1.0;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-semibold text-slate-800">{m.name}</td>
                            <td className="p-3 text-right font-mono text-slate-600">{m.area} m²</td>
                            <td className="p-3 text-right font-mono text-slate-500">{normSaving.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono text-slate-500">{stookFactor.toFixed(2)}x</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                              {Math.round(m.savingM3)} m³
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">
                              € {(calculation.house.gasPrijs || 1.50).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                              € {Math.round(m.savingEuro).toLocaleString('nl-NL')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          Er zijn momenteel geen isolatiemaatregelen geselecteerd. Vul oppervlakten in bij het invoerformulier om de besparing te berekenen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {calculation.measures.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/80 font-extrabold text-slate-900 border-t border-slate-200">
                        <td className="p-3" colSpan={4}>Totaal Gecombineerd</td>
                        <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                          {Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0))} m³
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500 text-xs font-normal">
                          € {(calculation.house.gasPrijs || 1.50).toFixed(2)}/m³
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                          € {Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Toelichting Normen &amp; Stookgedrag */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" /> Achtergrond &amp; Bronvermelding
              </span>
              <p className="leading-relaxed">
                • <strong>Norm-kengetallen:</strong> De besparingen per m² vloeien voort uit praktijkrichtlijnen voor isolatie (bijv. Spouwmuurisolatie = 7,0 m³/m², Dakisolatie binnenzijde = 9,0 m³/m², HR++ Glas = 12,0 m³/m²).
              </p>
              <p className="leading-relaxed">
                • <strong>Stookgedragfactor ({(calculation.house.stookgedragFactor || 1.0).toFixed(1)}x — {calculation.house.stookgedragBerekend || 'Normaal'}):</strong> Deze waarde vergelijkt uw werkelijke gasverbruik ({calculation.house.verbruikM3 || 0} m³) met het gemiddelde verbruik van een gelijkwaardige woning en gezinssamenstelling ({calculation.resident.aantalPersonen || 1} pers.). Hierdoor sluit het advies exact aan op uw praktijksituatie.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGasModal(false)}
                className="bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-bold py-2.5 px-6 rounded-xl transition cursor-pointer shadow-sm"
              >
                Sluiten
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

