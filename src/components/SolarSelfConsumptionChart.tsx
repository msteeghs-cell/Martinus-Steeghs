import React, { useState, useMemo } from 'react';
import { 
  Sun, Zap, ArrowUpRight, ArrowDownRight, Sparkles, Info, ShieldCheck, 
  Battery, Car, Flame, Sliders, TrendingUp, HelpCircle 
} from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { calculateAll } from '../utils/calculator';

interface SolarSelfConsumptionChartProps {
  resident: ResidentData;
  house: HouseData;
  insulation: InsulationData;
  tech: TechData;
  setTech?: React.Dispatch<React.SetStateAction<TechData>>;
}

const MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
// Monthly solar distribution weights (% of annual production in Netherlands/Belgium)
const SOLAR_MONTHLY_WEIGHTS = [0.03, 0.05, 0.09, 0.12, 0.15, 0.16, 0.15, 0.13, 0.08, 0.05, 0.02, 0.02];
// Monthly household consumption weights (% of annual consumption - higher in winter)
const DEMAND_MONTHLY_WEIGHTS = [0.12, 0.11, 0.10, 0.08, 0.07, 0.06, 0.06, 0.06, 0.07, 0.08, 0.10, 0.11];
// Monthly space heating weights for heat pump (% of annual WP consumption - strong winter peak)
const HEATING_MONTHLY_WEIGHTS = [0.20, 0.18, 0.12, 0.06, 0.025, 0.01, 0.01, 0.01, 0.02, 0.06, 0.135, 0.17];

export default function SolarSelfConsumptionChart({
  resident,
  house,
  insulation,
  tech,
  setTech,
}: SolarSelfConsumptionChartProps) {
  // Local state for interactive post-saldering simulation parameters
  const [directSelfConsumptionPct, setDirectSelfConsumptionPct] = useState<number>(30); // default 30% without battery/EV
  const [gridPurchasePrice, setGridPurchasePrice] = useState<number>(house.elektraPrijs || 0.28); // €/kWh
  const [feedInCompensation, setFeedInCompensation] = useState<number>(0.05); // €/kWh net feed-in return (or -0.03 for penalty)

  const calculation = useMemo(() => {
    return calculateAll(resident, house, insulation, tech);
  }, [resident, house, insulation, tech]);

  // Warmtepomp analysis
  const selectedModel = tech.selectedWarmtepompModel || 'Standard';
  const selectedType = tech.selectedWarmtepompType || 'Hybride';
  const typeLabel = selectedType === 'All-Electric' ? 'All-Electric' : (selectedModel === 'LuchtLucht' ? 'Lucht-lucht (Airco)' : 'Hybride');
  const activeWpOption = calculation.heatpump.options.find(
    opt => opt.type === typeLabel
  ) || calculation.heatpump.options[0];

  const hasWarmtepomp = Boolean(tech.selectedWarmtepompModel);
  const wpAnnualKwh = hasWarmtepomp ? (activeWpOption?.elecIncreaseKwh || 0) : 0;
  
  const hasLaadpaal = Boolean((tech.evKilometers || 0) > 0);
  const evAnnualKwh = hasLaadpaal ? (calculation.laadpaal?.evAnnualDemandKwh || 0) : 0;
  
  const baseAnnualDemand = calculation.house.verbruikKwh || 3500;
  const annualElectricityDemand = baseAnnualDemand + wpAnnualKwh + evAnnualKwh;
  const annualSolarYield = calculation.solar.annualYieldKwh || 0;

  // Generate monthly simulation data
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const solarM = annualSolarYield * SOLAR_MONTHLY_WEIGHTS[idx];
      
      const baseDemandM = baseAnnualDemand * DEMAND_MONTHLY_WEIGHTS[idx];
      const wpDemandM = wpAnnualKwh * HEATING_MONTHLY_WEIGHTS[idx];
      const evDemandM = evAnnualKwh / 12;
      const totalDemandM = baseDemandM + wpDemandM + evDemandM;

      // Base direct self-consumption for this month
      // In summer months, daytime direct consumption is slightly higher if people are active.
      // In winter, daytime solar is low, but daytime heatpump/EV absorbs available solar.
      const baseSelfConsumptionRate = (directSelfConsumptionPct / 100);
      const baseDirectSolarM = solarM * baseSelfConsumptionRate;
      const extraApplianceSolarM = Math.min(solarM - baseDirectSolarM, wpDemandM * 0.25 + evDemandM * 0.20);
      const directConsumptionM = Math.min(solarM, totalDemandM, baseDirectSolarM + Math.max(0, extraApplianceSolarM));
      
      // Solar surplus (overschot) for feed-in or battery/EV
      const summerSurplusM = Math.max(0, solarM - directConsumptionM);
      
      // Winter/grid deficit (tekort in te kopen uit net)
      const winterDeficitM = Math.max(0, totalDemandM - directConsumptionM);

      // Financial calculations post-saldering for this month
      const savedByDirectEuro = directConsumptionM * gridPurchasePrice;
      const feedInIncomeEuro = summerSurplusM * feedInCompensation;
      const gridPurchaseCostEuro = winterDeficitM * gridPurchasePrice;
      const netMonthlyBalanceEuro = savedByDirectEuro + feedInIncomeEuro - gridPurchaseCostEuro;

      return {
        month,
        baseDemandM: Math.round(baseDemandM),
        wpDemandM: Math.round(wpDemandM),
        evDemandM: Math.round(evDemandM),
        'Totale Zonneopwek (kWh)': Math.round(solarM),
        'Stroomverbruik Huis (kWh)': Math.round(totalDemandM),
        'Direct Zelfverbruik (kWh)': Math.round(directConsumptionM),
        'Opbrengst Zonnepanelen (Teruglevering/Accu) (kWh)': Math.round(summerSurplusM),
        'Winterse Stroominkoop uit Net (kWh)': Math.round(winterDeficitM),
        savedByDirectEuro,
        feedInIncomeEuro,
        gridPurchaseCostEuro,
        netMonthlyBalanceEuro,
      };
    });
  }, [annualSolarYield, baseAnnualDemand, wpAnnualKwh, evAnnualKwh, directSelfConsumptionPct, gridPurchasePrice, feedInCompensation]);

  // Totals for KPI cards
  const totalDirectConsumptionKwh = monthlyData.reduce((acc, d) => acc + d['Direct Zelfverbruik (kWh)'], 0);
  const totalSummerSurplusKwh = monthlyData.reduce((acc, d) => acc + d['Opbrengst Zonnepanelen (Teruglevering/Accu) (kWh)'], 0);
  const totalWinterDeficitKwh = monthlyData.reduce((acc, d) => acc + d['Winterse Stroominkoop uit Net (kWh)'], 0);

  const realSelfConsumptionPct = annualSolarYield > 0 
    ? Math.min(100, Math.round((totalDirectConsumptionKwh / annualSolarYield) * 100))
    : 0;

  const totalDirectSavingsEuro = Math.round(totalDirectConsumptionKwh * gridPurchasePrice);
  const totalFeedInReturnEuro = Math.round(totalSummerSurplusKwh * feedInCompensation);
  const totalGridPurchaseCostEuro = Math.round(totalWinterDeficitKwh * gridPurchasePrice);
  const netAnnualBillPostSaldering = totalGridPurchaseCostEuro - (totalDirectSavingsEuro + totalFeedInReturnEuro);

  const handlePanelChange = (count: number) => {
    if (setTech) {
      setTech(prev => ({
        ...prev,
        aantalZonnepanelen: count,
        heeftZonnepanelen: count > 0,
      }));
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-8 my-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-amber-500/20">
              <Sun className="w-4 h-4 text-amber-500" />
              Zonnepanelen &amp; Post-Salderingsanalyse (2027+)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Seizoenssimulatie: Zelfverbruik, Opbrengst Zonnepanelen &amp; Net-Inkoop
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-3xl">
            Zonder salderingsregeling telt elke direct verbruikte kilowattuur op het moment van opwekking voor 100%. Bekijk hier exact hoeveel stroom u direct in huis gebruikt, hoeveel opbrengst van de zonnepanelen beschikbaar is voor teruglevering of opslag, en hoeveel u ’s winters moet inkopen.
          </p>
        </div>

        {/* Quick status badge */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/20">
            {realSelfConsumptionPct}%
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-900">Direct Zelfverbruik</div>
            <div className="text-xs text-amber-700 font-mono">
              {totalDirectConsumptionKwh.toLocaleString('nl-NL')} kWh / {annualSolarYield.toLocaleString('nl-NL')} kWh
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
              € {totalDirectSavingsEuro.toLocaleString('nl-NL')} volle besparing
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Sliders & Appliance Controls Bar */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Aantal Zonnepanelen */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Aantal Zonnepanelen</span>
              </label>
              <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                {tech.aantalZonnepanelen || 0} stuks ({annualSolarYield.toLocaleString('nl-NL')} kWh/jaar)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="36"
              step="1"
              value={tech.aantalZonnepanelen || 0}
              onChange={(e) => handlePanelChange(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 panelen</span>
              <span>12 (gemiddeld)</span>
              <span>36 panelen</span>
            </div>
          </div>

          {/* Slider 2: Direct Zelfverbruik Target */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>Direct Zelfverbruik Huis</span>
              </label>
              <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                {directSelfConsumptionPct}%
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="65"
              step="5"
              value={directSelfConsumptionPct}
              onChange={(e) => setDirectSelfConsumptionPct(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>15% (standaard)</span>
              <span>30% (gemiddeld)</span>
              <span>65% (slim sturen)</span>
            </div>
          </div>

          {/* Selector 3: Vergoeding / Heffing Na Salderen */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Terugleververgoeding na salderen</span>
              </label>
              <span className="font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold">
                € {feedInCompensation.toFixed(2)} / kWh
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '€ 0,02', val: 0.02 },
                { label: '€ 0,05', val: 0.05 },
                { label: '€ 0,08', val: 0.08 },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setFeedInCompensation(opt.val)}
                  className={`text-xs font-semibold py-1.5 rounded-lg border transition-all ${
                    feedInCompensation === opt.val 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Geschatte marktwaarde van de opbrengst van zonnepanelen na afschaffing salderingsregeling.
            </p>
          </div>
        </div>

        {/* Zonnepanelen Sturing Mode Toggle Control */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tech.pvCurtailmentMode || false}
                  onChange={(e) => {
                    if (setTech) setTech(prev => ({ ...prev, pvCurtailmentMode: e.target.checked }));
                  }}
                  className="w-4 h-4 accent-amber-500 rounded border-slate-300 cursor-pointer shrink-0"
                />
                <span className="font-extrabold text-slate-800 text-xs">Zonnepanelen Sturing Mode:</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (setTech) setTech(prev => ({ ...prev, pvCurtailmentMode: !prev.pvCurtailmentMode }));
                }}
                className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                  tech.pvCurtailmentMode 
                    ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600' 
                    : 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {tech.pvCurtailmentMode ? 'Slim EMS: Omvormer Afschakelen bij Negatieve Prijzen (100% Zonne-focus)' : 'Standaard Omvormer (Altijd Terugleveren)'}
              </button>
            </div>
            
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 bg-slate-100 border border-slate-200 text-slate-700">
              {tech.pvCurtailmentMode ? '✓ Slim Afschakelen Actief' : '✓ Altijd Terugleveren'}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-sans">
            {tech.pvCurtailmentMode ? (
              <span>
                <strong className="text-amber-800">100% Zonne-focus & Slim Afschakelen (AAN):</strong> Het intelligente EMS stelt de omvormer zo in dat er uitsluitend zonnestroom wordt opgewekt voor eigen verbruik/accu en omvormer-capaciteit automatisch wordt teruggeregeld/uitgeschakeld tijdens uren met negatieve dynamische stroomprijzen. Je voorkomt zo boetes en kosten voor terugleveren aan het net.
              </span>
            ) : (
              <span>
                <strong className="text-indigo-800">Standaard Omvormer (UIT):</strong> De zonnepanelen leveren altijd op volle capaciteit terug aan het net, ongeacht het actuele uur- of spottarief. Bij een dynamisch contract met negatieve uurprijzen kan dit op zonnige piekmomenten leiden tot een negatieve vergoeding (kosten om terug te leveren).
              </span>
            )}
          </div>
        </div>

        {/* Warmtepomp & EV Model Quick Toggle Bar */}
        <div className="border-t border-slate-200/80 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Warmtepomp Selectie */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                Warmtepomp Systeem in Grafiek
              </span>
              <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                hasWarmtepomp ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {hasWarmtepomp ? `+${Math.round(wpAnnualKwh).toLocaleString('nl-NL')} kWh/jaar` : 'Geen WP'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Geen WP', model: undefined, active: !hasWarmtepomp },
                { label: 'Standard (6kW)', model: 'Standard', active: hasWarmtepomp && selectedModel === 'Standard' },
                { label: 'Middelgroot 8kW', model: 'Middelgroot 8kW', active: hasWarmtepomp && selectedModel === 'Middelgroot 8kW' },
                { label: 'Groot 12kW', model: 'Groot 12kW', active: hasWarmtepomp && selectedModel === 'Groot 12kW' },
                { label: 'Airco / Lucht-Lucht', model: 'LuchtLucht', active: hasWarmtepomp && selectedModel === 'LuchtLucht' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (setTech) {
                      setTech(prev => ({
                        ...prev,
                        selectedWarmtepompModel: opt.model as any,
                      }));
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border font-medium text-[11px] transition-all ${
                    opt.active
                      ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Totale Stroomvraag Samenvatting Badge */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
                Opbouw Totale Stroomvraag
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {Math.round(annualElectricityDemand).toLocaleString('nl-NL')} kWh/jaar
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Basis Huis:</span>
                <strong>{Math.round(baseAnnualDemand).toLocaleString('nl-NL')} kWh</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Warmtepomp:</span>
                <strong className={wpAnnualKwh > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                  {Math.round(wpAnnualKwh).toLocaleString('nl-NL')} kWh
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">EV Auto:</span>
                <strong className={evAnnualKwh > 0 ? 'text-purple-600 font-bold' : 'text-slate-400'}>
                  {Math.round(evAnnualKwh).toLocaleString('nl-NL')} kWh
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Composed Chart */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 px-1">
          <span>Maandelijkse Energiestromen (kWh)</span>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              Direct Zelfverbruik
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              Opbrengst Zonnepanelen (Teruglevering/Accu/EV)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              Winter Stroominkoop (Net)
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
              Zonneopwek
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-0.5 bg-slate-800 inline-block" />
              Stroomvraag
            </span>
          </div>
        </div>

        <div className="h-[360px] w-full bg-slate-900/95 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} unit=" kWh" />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 text-white p-4 rounded-xl shadow-2xl text-xs space-y-2 w-72 backdrop-blur-md">
                        <div className="font-bold border-b border-slate-800 pb-1.5 text-amber-400 text-sm flex justify-between items-center">
                          <span>Maand: {label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Post-Saldering</span>
                        </div>

                        <div className="space-y-1 font-sans">
                          <div className="flex justify-between text-emerald-400">
                            <span>Direct Zelfverbruik:</span>
                            <strong className="font-mono">{data['Direct Zelfverbruik (kWh)']} kWh</strong>
                          </div>
                          <div className="flex justify-between text-amber-300">
                            <span>Opbrengst Zonnepanelen (Teruglevering):</span>
                            <strong className="font-mono">{data['Opbrengst Zonnepanelen (Teruglevering/Accu) (kWh)']} kWh</strong>
                          </div>
                          <div className="flex justify-between text-indigo-300">
                            <span>Winter Netinkoop:</span>
                            <strong className="font-mono">{data['Winterse Stroominkoop uit Net (kWh)']} kWh</strong>
                          </div>
                          <div className="border-t border-slate-800 pt-1.5 mt-1 space-y-1 text-slate-300">
                            <div className="flex justify-between text-slate-300">
                              <span>Totale Opwek:</span>
                              <strong className="font-mono text-amber-400">{data['Totale Zonneopwek (kWh)']} kWh</strong>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Totale Stroomvraag:</span>
                              <strong className="font-mono text-white">{data['Stroomverbruik Huis (kWh)']} kWh</strong>
                            </div>
                            <div className="pl-2 border-l border-slate-700 text-[10px] space-y-0.5 text-slate-400">
                              <div className="flex justify-between">
                                <span>- Basisverbruik Huis:</span>
                                <span className="font-mono">{data.baseDemandM} kWh</span>
                              </div>
                              {hasWarmtepomp && (
                                <div className="flex justify-between text-amber-300">
                                  <span>- Warmtepomp ({selectedModel}):</span>
                                  <span className="font-mono">{data.wpDemandM} kWh</span>
                                </div>
                              )}
                              {hasLaadpaal && (
                                <div className="flex justify-between text-purple-300">
                                  <span>- EV Laadpaal:</span>
                                  <span className="font-mono">{data.evDemandM} kWh</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-800/80 p-2 rounded-lg text-[11px] space-y-1 border border-slate-700/50 mt-2">
                          <div className="flex justify-between text-emerald-300">
                            <span>Volle Besparing Direct:</span>
                            <strong className="font-mono">+€ {Math.round(data.savedByDirectEuro)}</strong>
                          </div>
                          <div className="flex justify-between text-blue-300">
                            <span>Vergoeding Teruglevering:</span>
                            <strong className="font-mono">+€ {Math.round(data.feedInIncomeEuro)}</strong>
                          </div>
                          <div className="flex justify-between text-rose-300">
                            <span>Kosten Netinkoop:</span>
                            <strong className="font-mono">-€ {Math.round(data.gridPurchaseCostEuro)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }} 
              />
              <Bar dataKey="Direct Zelfverbruik (kWh)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Opbrengst Zonnepanelen (Teruglevering/Accu) (kWh)" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Winterse Stroominkoop uit Net (kWh)" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Line type="monotone" dataKey="Totale Zonneopwek (kWh)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="Stroomverbruik Huis (kWh)" stroke="#f8fafc" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Cards (3 Kern-Inzichten) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Direct Zelfverbruik */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold font-mono bg-emerald-200/60 text-emerald-800 px-2.5 py-1 rounded-full">
              {realSelfConsumptionPct}% Direct
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">1. Direct Zelfverbruik in Huis</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {totalDirectConsumptionKwh.toLocaleString('nl-NL')} <span className="text-sm font-normal text-slate-600">kWh/jaar</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed border-t border-emerald-200/60 pt-2.5">
            <strong>100% Volle Rendementswaarde (€ {totalDirectSavingsEuro}/jaar):</strong> Dit deel wordt direct verbruikt door achtergrondelektra, koelkast, wasmachine of warmtepomp. Hierop levert u géén cent in wanneer salderen stopt!
          </p>
        </div>

        {/* Card 2: Opbrengst Zonnepanelen (Teruglevering / Opslag) */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Sun className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold font-mono bg-amber-200/60 text-amber-800 px-2.5 py-1 rounded-full">
              Teruglevering / Opslag
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider">2. Opbrengst Zonnepanelen (Teruglevering)</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {totalSummerSurplusKwh.toLocaleString('nl-NL')} <span className="text-sm font-normal text-slate-600">kWh/jaar</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed border-t border-amber-200/60 pt-2.5">
            <strong>Beschikbaar voor Opslag &amp; Laden:</strong> Dit betreft de opbrengst van de zonnepanelen die boven het directe verbruik uitkomt. Zonder accu levert dit netto circa <strong>€ {totalFeedInReturnEuro}/jaar</strong> op. Met een <strong>Thuisaccu</strong> of <strong>EV Slim Laden</strong> zet u deze opbrengst om in volle besparing!
          </p>
        </div>

        {/* Card 3: Winterse Tekorten */}
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold font-mono bg-indigo-200/60 text-indigo-800 px-2.5 py-1 rounded-full">
              Winter Inkoop
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">3. Winterse Net-Inkoop (Tekort)</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
              {totalWinterDeficitKwh.toLocaleString('nl-NL')} <span className="text-sm font-normal text-slate-600">kWh/jaar</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed border-t border-indigo-200/60 pt-2.5">
            <strong>Noodzakelijke Inkoop uit Net (€ {totalGridPurchaseCostEuro.toLocaleString('nl-NL')}/jaar):</strong> {hasWarmtepomp ? (
              <>Met uw <strong>Warmtepomp ({selectedModel})</strong> (+{Math.round(wpAnnualKwh).toLocaleString('nl-NL')} kWh/jaar) ligt het zwaartepunt van de stroomvraag voornamelijk in de winter. Doordat zonnepanelen in de winter circa 10% van hun jaaropbrengst produceren, wordt deze stroom uit het net gekocht.</>
            ) : (
              <>In november t/m februari schijnt de zon kort. Stroom voor verlichting, apparaten en huishouden koopt u in tegen het standaard tarief (€ {totalGridPurchaseCostEuro.toLocaleString('nl-NL')}/jaar).</>
            )}
          </p>
        </div>
      </div>

      {/* Strategic Advice Box: Hoe verhoogt u het direct zelfverbruik na salderen? */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 space-y-4 border border-slate-700 shadow-lg">
        <div className="flex items-center gap-2.5 border-b border-slate-700 pb-3">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="font-bold text-base text-slate-100">
            Advies voor het Post-Salderingstijdperk: Hoe haalt u het maximale uit uw Zonnepanelen?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5 text-sm">
              <Sun className="w-4 h-4" />
              1. Slimme Gedragsaanpassing (Gratis)
            </div>
            <p className="leading-relaxed">
              Laat vaatwasser, wasmachine en droger draaien tussen 11:00 en 15:00 uur. Hiermee stijgt uw direct zelfverbruik eenvoudig van 28% naar circa 38%-40%.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="font-semibold text-blue-400 flex items-center gap-1.5 text-sm">
              <Battery className="w-4 h-4" />
              2. Thuisaccu of Warmtepompboiler
            </div>
            <p className="leading-relaxed">
              Een thuisaccu van 5 tot 10 kWh slaat uw overschot uit de middag op voor de avond en nacht. Een warmtepompboiler zet overtollige zonne-energie om in warm tapwater.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5 text-sm">
              <Car className="w-4 h-4" />
              3. Slim EV Laden op Zonnestroom
            </div>
            <p className="leading-relaxed">
              Heeft u een elektrische auto? Met een slimme laadpaal (EMS) laadt de auto uitsluitend wanneer uw zonnepanelen overschot produceren. Zo vervalt uw benzine- of netinkooprekening!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
