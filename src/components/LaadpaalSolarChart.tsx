import React, { useState, useMemo } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { Info, Zap, Car, Sun, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ComposedChart,
  Line
} from 'recharts';
import { calculateAll, getBatterySimulationData } from '../utils/calculator';

interface LaadpaalSolarTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  hasBattery: boolean;
  slimEmsOnlySolar?: boolean;
}

const LaadpaalSolarTooltip = ({ active, payload, label, hasBattery, slimEmsOnlySolar }: LaadpaalSolarTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  // Extract raw month data safely
  const data = payload[0].payload;
  const solarM = data['Zonnestroom opwek (kWh)'] || 0;
  const evDemandM = data['Laadvraag EV (kWh)'] || 0;
  
  // Destination of solar
  const houseDirectM = data['Direct verbruik huis (zonder accu) (kWh)'] || 0;
  const batteryM = data['Extra verbruik via accu (kWh)'] || 0;
  const evSolarM = data['Zonnestroom direct naar EV (kWh)'] || 0;
  const feedInM = data['Resterende teruglevering naar net (kWh)'] || 0;

  // Sources of EV charging
  const evGridM = data['Netstroom laadsessies (kWh)'] || 0;
  const evExternM = data['Extern/publiek laden (kWh)'] || 0;
  
  const evSolarPercent = evDemandM > 0 ? Math.min(100, Math.round((evSolarM / evDemandM) * 100)) : 0;
  const evGridPercent = 100 - evSolarPercent;
  
  const isSummer = ['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(label || '');

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-800 text-xs space-y-3.5 w-[290px] sm:w-[330px] max-w-[calc(100vw-32px)] font-sans pointer-events-none">
      <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
        <div>
          <span className="text-sm font-bold block text-white">Maand: {label}</span>
          <span className="text-[10px] text-slate-400">Energiebalans &amp; EV Opladen</span>
        </div>
        <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
          isSummer 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
        }`}>
          {isSummer ? '☀️ Zonnig Seizoen' : '❄️ Winter Seizoen'}
        </span>
      </div>

      <div className="space-y-3">
        {/* Core numbers */}
        <div className="grid grid-cols-2 gap-2 text-center bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
          <div>
            <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">☀️ Solar Opwek</span>
            <span className="font-bold text-sm text-amber-300 font-mono">{Math.round(solarM)} kWh</span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">🚗 EV Vraag</span>
            <span className="font-bold text-sm text-purple-300 font-mono">{Math.round(evDemandM)} kWh</span>
          </div>
        </div>

        {/* Column 1 Explanation: Destination of solar */}
        <div className="space-y-1.5 border-t border-slate-800/50 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bestemming van uw Zonnestroom (Kolom 1):</span>
          
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              🏠 Direct verbruik in huis:
            </span>
            <span className="font-mono text-slate-200 font-semibold">{Math.round(houseDirectM)} kWh</span>
          </div>

          {hasBattery && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                🔋 Opgeslagen via thuisaccu:
              </span>
              <span className="font-mono text-slate-200 font-semibold">{Math.round(batteryM)} kWh</span>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-purple-300 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              🚗 Direct geladen in EV:
            </span>
            <span className="font-mono text-purple-300 font-bold">{Math.round(evSolarM)} kWh</span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              🌐 Teruggeleverd aan het net:
            </span>
            <span className="font-mono text-slate-300 font-semibold">{Math.round(feedInM)} kWh</span>
          </div>
        </div>

        {/* Column 2 Explanation: EV charging sources */}
        <div className="space-y-1.5 border-t border-slate-800/50 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Herkomst van EV stroom (Kolom 2):</span>
          
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-purple-300 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              ☀️ Eigen gratis zonnestroom:
            </span>
            <span className="font-mono text-purple-300 font-bold">
              {Math.round(evSolarM)} kWh ({evSolarPercent}%)
            </span>
          </div>

          {slimEmsOnlySolar ? (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                🌐 Publiek / extern laden (EMS):
              </span>
              <span className="font-mono text-slate-300 font-semibold">
                {Math.round(evExternM)} kWh ({evGridPercent}%)
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                🔌 Gekochte netstroom:
              </span>
              <span className="font-mono text-slate-300 font-semibold">
                {Math.round(evGridM)} kWh ({evGridPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* Summary analysis */}
        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-medium">
          {evSolarPercent >= 60 ? (
            <p className="text-emerald-400 font-semibold flex items-center gap-1">
              🎉 Uitstekende zonnedekking! Deze maand laadt u uw auto voor {evSolarPercent}% met pure, gratis zonnestroom.
            </p>
          ) : evSolarPercent >= 30 ? (
            <p className="text-amber-400 font-semibold flex items-center gap-1">
              ⛅ Gedeeltelijke zonnedekking. U laadt {evSolarPercent}% gratis zonnestroom en {evGridPercent}% netstroom.
            </p>
          ) : (
            <p className="text-slate-400 flex items-center gap-1">
              ☁️ Beperkte zon-opbrengst deze maand. Uw auto laadt voornamelijk via het net ({evGridPercent}%).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface LaadpaalSolarChartProps {
  resident: ResidentData;
  house: HouseData;
  insulation: InsulationData;
  tech: TechData;
  setTech?: React.Dispatch<React.SetStateAction<TechData>>;
}

export default function LaadpaalSolarChart({
  resident,
  house,
  insulation,
  tech,
  setTech,
}: LaadpaalSolarChartProps) {
  // Overrides handle
  const [localUserAnnualSolar, setLocalUserAnnualSolar] = useState<number | ''>('');

  const userAnnualSolar = setTech
    ? (tech.userAnnualSolar !== undefined ? tech.userAnnualSolar : '')
    : localUserAnnualSolar;

  const setUserAnnualSolar = (val: number | '') => {
    if (setTech) {
      setTech(prev => ({ ...prev, userAnnualSolar: val === '' ? undefined : val }));
    } else {
      setLocalUserAnnualSolar(val);
    }
  };

  const calcResult = calculateAll(resident, house, insulation, tech);
  const evAnnualDemand = calcResult.laadpaal?.evAnnualDemandKwh || 0;
  const evSolarCoverage = calcResult.laadpaal?.evSolarCoverageKwh || 0;
  const evGridImport = calcResult.laadpaal?.evGridImportKwh || 0;

  // Recompute local solar yield matching standard
  const paneelVermogenLocal = tech.vermogenPerPaneel || 400;
  const totalWpLocal = (tech.aantalZonnepanelen || 0) * paneelVermogenLocal;
  const orientRadLocal = ((tech.dakOrientatie || 0) * Math.PI) / 180;
  const cosOrientLocal = Math.cos(orientRadLocal);
  let orientationFactorLocal = 1.0;
  if (cosOrientLocal >= 0) {
    orientationFactorLocal = 0.85 + 0.15 * cosOrientLocal;
  } else {
    orientationFactorLocal = 0.85 + 0.30 * cosOrientLocal;
  }
  const tiltLocal = tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35;
  const tiltFactorLocal = Math.max(0.5, 1 - 0.0001 * Math.pow(tiltLocal - 35, 2));
  const localAnnualYieldKwh = Math.round((totalWpLocal / 1000) * 900 * orientationFactorLocal * tiltFactorLocal);

  const finalAnnualSolar = userAnnualSolar !== '' ? userAnnualSolar : localAnnualYieldKwh;

  const chartBatteryCapacity = tech.capaciteitAccu || 0;

  // Compute monthly battery simulation data points
  const batteryChartData = useMemo(() => {
    return getBatterySimulationData(
      Number(finalAnnualSolar) || 0,
      house.verbruikKwh || 3500,
      chartBatteryCapacity,
      tech.omzettingsverliezen || 20,
      calcResult.solar.selfConsumptionBase || 30,
      calcResult.solar.absoluteSelfConsumptionBaseKwh || 0,
      tech.dynamicProvider || 'Zonneplan',
      tech.batteryGridTrading
    );
  }, [finalAnnualSolar, house.verbruikKwh, chartBatteryCapacity, tech.omzettingsverliezen, calcResult.solar.selfConsumptionBase, calcResult.solar.absoluteSelfConsumptionBaseKwh, tech.dynamicProvider, tech.batteryGridTrading]);

  // Compute monthly laadpaal simulation data points
  const laadpaalChartData = useMemo(() => {
    // Calculate raw max solar charging per month based on remaining grid feed (available excess solar)
    const rawMaxSolarByMonth = batteryChartData.map((d) => {
      const evDemandM = evAnnualDemand / 12;
      const remainingGridFeed = d['Teruglevering naar net (met accu) (kWh)'] || 0;
      return Math.min(evDemandM, remainingGridFeed);
    });

    const totalRawMaxSolar = rawMaxSolarByMonth.reduce((acc, v) => acc + v, 0);
    const scaleFactor = totalRawMaxSolar > 0 ? evSolarCoverage / totalRawMaxSolar : 0;

    return batteryChartData.map((d, idx) => {
      const evDemandM = evAnnualDemand / 12;
      
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
        
        // Stack 1 (solar destination) data keys
        'Direct verbruik huis (zonder accu) (kWh)': d['Direct verbruik (zonder accu) (kWh)'],
        'Extra verbruik via accu (kWh)': d['Extra verbruik via accu (kWh)'],
        'Zonnestroom direct naar EV (kWh)': evSolarM,
        'Resterende teruglevering naar net (kWh)': remainingGridFeedAfterEV,
        
        // Stack 2 (EV charging source) data keys
        'Zonnestroom geladen in EV (kWh)': evSolarM,
        'Netstroom laadsessies (kWh)': tech.slimEmsOnlySolar ? 0 : evGridM,
        'Extern/publiek laden (kWh)': tech.slimEmsOnlySolar ? evGridM : 0,
      };
    });
  }, [batteryChartData, evAnnualDemand, evSolarCoverage, tech.slimEmsOnlySolar]);

  const hasBattery = chartBatteryCapacity > 0;
  const solarCoveragePercent = evAnnualDemand > 0 ? Math.round((evSolarCoverage / evAnnualDemand) * 100) : 0;
  const gridImportPercent = 100 - solarCoveragePercent;

  // Active step state for the dynamic guide
  const [activeGuideStep, setActiveGuideStep] = useState<number>(0);

  return (
    <div className="bg-white rounded-3xl border border-slate-150/70 shadow-md overflow-hidden space-y-4" id="laadpaal-solar-integration-card-wide">
      {/* Dynamic colored visual header banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 backdrop-blur border border-emerald-500/20 rounded-2xl text-emerald-400">
            <Car className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-300 uppercase font-black tracking-wider">
              Peel en Maas Duurzaamheidstools
            </span>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5 mt-0.5">
              Seizoenssimulatie: Slimme Laadpaal &amp; Zonne-energie
            </h3>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-extrabold text-white/95">Optimalisatierapport 2026</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Met deze interactieve seizoenssimulatie krijgt u direct grip op de stroombalans van uw laadpaal. 
          Omdat zonnepanelen vooral stroom leveren in de zomer en overdag, berekent de simulatie exact hoeveel zonnestroom er daadwerkelijk in uw elektrische auto geladen kan worden. 
          De grafiek laat dit zien door per maand de zonne-energiebestemming (linker kolom) naast uw autoladen (rechter kolom) te zetten!
        </p>

        {/* Custom live user inputs to fine-tune EV parameters & solar output in real-time */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-indigo-600" />
                Live Simulatie Parameters EV &amp; Zonne-energie
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Wijzig hier direct uw EV kilometers, verbruik en zonne-energie. De seizoenssimulatie grafiek en kengetallen passen zich <strong>direct live</strong> aan!
              </p>
            </div>
            {setTech && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto border border-emerald-200/80 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" />
                Live Reactieve Sync
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Jaarkilometrage */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                <span>🚗 Jaarkilometrage EV</span>
                <span className="text-indigo-600 font-mono font-extrabold">{tech.evKilometers ?? 15000} km</span>
              </label>
              <input
                type="number"
                value={tech.evKilometers ?? 15000}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  if (setTech) {
                    setTech(prev => ({ 
                      ...prev, 
                      evKilometers: val,
                      evThuisLaden: (prev.evThuisLaden && prev.evThuisLaden > 0) ? prev.evThuisLaden : 75,
                      evVerbruik: (prev.evVerbruik && prev.evVerbruik > 0) ? prev.evVerbruik : 18
                    }));
                  }
                }}
                placeholder="Bijv. 15000"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 2. Verbruik per 100km */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                <span>⚡ Verbruik (kWh/100km)</span>
                <span className="text-indigo-600 font-mono font-extrabold">{tech.evVerbruik || 18} kWh</span>
              </label>
              <input
                type="number"
                value={tech.evVerbruik || 18}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 0);
                  if (setTech) setTech(prev => ({ ...prev, evVerbruik: val }));
                }}
                placeholder="Bijv. 18"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 3. Thuis laden % */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                <span>🏡 Thuis geladen (%)</span>
                <span className="text-indigo-600 font-mono font-extrabold">
                  {(tech.evThuisLaden !== undefined && tech.evThuisLaden > 0) ? tech.evThuisLaden : ((tech.evKilometers ?? 0) > 0 ? 75 : 0)}%
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={(tech.evThuisLaden !== undefined && tech.evThuisLaden > 0) ? tech.evThuisLaden : ((tech.evKilometers ?? 0) > 0 ? 75 : 0)}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                  if (setTech) setTech(prev => ({ ...prev, evThuisLaden: val }));
                }}
                placeholder="Bijv. 75"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 4. Tweak Jaaropbrengst Zonnestroom */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Zonnestroom (kWh)
                </span>
                <span className="text-amber-600 font-mono font-extrabold">{finalAnnualSolar} kWh</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={userAnnualSolar}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                    setUserAnnualSolar(val);
                  }}
                  placeholder={`${localAnnualYieldKwh} kWh`}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {userAnnualSolar !== '' && (
                  <button
                    type="button"
                    onClick={() => setUserAnnualSolar('')}
                    className="bg-slate-200 text-slate-700 font-bold px-2.5 py-2 rounded-xl text-xs hover:bg-slate-300 transition shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Extra toggle for Slim EMS */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tech.slimEmsOnlySolar || false}
                    onChange={(e) => {
                      if (setTech) setTech(prev => ({ ...prev, slimEmsOnlySolar: e.target.checked }));
                    }}
                    className="w-4 h-4 accent-amber-500 rounded border-slate-300 cursor-pointer shrink-0"
                  />
                  <span className="font-extrabold text-slate-800 text-xs">Laadpaal Sturing Mode:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (setTech) setTech(prev => ({ ...prev, slimEmsOnlySolar: !prev.slimEmsOnlySolar }));
                  }}
                  className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    tech.slimEmsOnlySolar 
                      ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600' 
                      : 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {tech.slimEmsOnlySolar ? 'Slim EMS: Alleen Laden op Zonnestroom (100% Zonne-focus)' : 'Standaard Laden (Netstroom Aanvullen)'}
                </button>
              </div>
              
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                Totaal thuis berekende laadvraag: <strong className="text-indigo-700 font-mono font-bold text-xs">{Math.round(evAnnualDemand).toLocaleString('nl-NL')} kWh/jaar</strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-slate-200/60 font-sans">
              {tech.slimEmsOnlySolar ? (
                <span>
                  <strong className="text-amber-800">100% Zonne-focus (AAN):</strong> De laadpaal pauzeert automatisch als de zon niet genoeg schijnt en laadt de EV uitsluitend op eigen opgewekte zonnestroom. Tekorten worden niet via het net aangevuld maar extern/publiek geladen.
                </span>
              ) : (
                <span>
                  <strong className="text-indigo-800">Standaard Laden (UIT):</strong> De auto laadt altijd direct op wanneer hij is ingeplugd. Zonnestroom wordt primair gebruikt en als er te weinig zon is, wordt het restant automatisch aangevuld vanaf het stroomnet.
                </span>
              )}
            </div>
          </div>
        </div>

        {evAnnualDemand === 0 && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-950 shadow-xs">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold text-amber-900 block text-xs">Jaarkilometrage of Laadvraag staat momenteel op 0 km/jaar.</strong>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed font-medium">
                Vul in de bovenstaande vakjes uw verwachte kilometrage (bijv. 15.000 km) en verbruik (bijv. 18 kWh/100km) in. De seizoenssimulatie grafiek en alle statistieken passen zich direct aan!
              </p>
            </div>
          </div>
        )}

        {/* Visual explanations of the side-by-side columns */}
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-tight">
              Eenvoudige Uitleg: Wat betekenen de twee kolommen per maand?
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column A explanation */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">1</span>
                <span>Kolom 1: ☀️ Uw Zonnestroom</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Deze kolom toont de totale opgewekte zonnestroom in die maand en waar het heen gaat:
              </p>
              <ul className="space-y-1 text-[10.5px] text-slate-500 pl-1 list-disc list-inside">
                <li><strong className="text-emerald-600">Groen:</strong> Direct verbruikt door apparaten in huis.</li>
                {hasBattery ? (
                  <li><strong className="text-blue-500">Blauw:</strong> Opgeslagen in de thuisaccu voor later.</li>
                ) : null}
                <li><strong className="text-purple-600">Paars:</strong> Rechtstreeks in de elektrische auto geladen.</li>
                <li><strong className="text-slate-400">Grijs:</strong> Teruglevering aan het net (overtollige stroom).</li>
              </ul>
            </div>

            {/* Column B explanation */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold">
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">2</span>
                <span>Kolom 2: 🚗 Het EV Laden</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Deze kolom laat zien hoe de maandelijkse laadvraag van uw auto wordt ingevuld:
              </p>
              <ul className="space-y-1 text-[10.5px] text-slate-500 pl-1 list-disc list-inside">
                <li><strong className="text-purple-600">Paars:</strong> Direct gedekt met gratis eigen zonnestroom.</li>
                <li><strong className="text-slate-600">Donkergrijs:</strong> Gekocht van het elektriciteitsnet op zonloze momenten.</li>
              </ul>
            </div>

            {/* The bridge explanation */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-xl flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-purple-900 font-extrabold block">💜 De Paarse Verbinding</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Ziet u dat het <strong>paarse blok</strong> in beide kolommen even groot is? Dat is geen toeval! Dit is de directe koppeling: het is de zonnestroom die direct van uw panelen uw auto in stroomt.
                </p>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-purple-100 text-[10px] text-purple-800 font-medium flex items-center gap-1 mt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Dit voorkomt dubbeltellingen in de energiebalans!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric cards block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-3xl text-xs">
          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">☀️ Jaaropbrengst Zonnestroom</span>
            <strong className="text-amber-600 text-lg font-black font-mono">{Math.round(finalAnnualSolar).toLocaleString('nl-NL')} kWh</strong>
            <p className="text-[10px] text-slate-400 mt-1">Uw totale zonnepanelenopbrengst</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">🚗 Jaarlijkse EV Laadvraag</span>
            <strong className="text-indigo-700 text-lg font-black font-mono">{Math.round(evAnnualDemand).toLocaleString('nl-NL')} kWh</strong>
            <p className="text-[10px] text-slate-400 mt-1">Benodigd laadvolume voor de auto thuis</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">💜 Aandeel Gratis Zonnestroom</span>
            <strong className="text-emerald-700 text-lg font-black font-mono">
              {Math.round(evSolarCoverage).toLocaleString('nl-NL')} kWh <span className="text-xs font-bold text-emerald-600">({solarCoveragePercent}%)</span>
            </strong>
            <p className="text-[10px] text-slate-400 mt-1">Direct geladen met eigen zonnestroom</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">
              {tech.slimEmsOnlySolar ? "🌐 Publiek / Extern Laden" : "🔌 Aandeel Gekochte Netstroom"}
            </span>
            <strong className="text-slate-700 text-lg font-black font-mono">
              {Math.round(tech.slimEmsOnlySolar ? (evAnnualDemand - evSolarCoverage) : evGridImport).toLocaleString('nl-NL')} kWh <span className="text-xs font-bold text-slate-500 font-sans">({gridImportPercent}%)</span>
            </strong>
            <p className="text-[10px] text-slate-400 mt-1">
              {tech.slimEmsOnlySolar 
                ? "Resterend laden buiten de deur (vanwege zonnestroom-beperking)" 
                : "Stroom ingekocht via uw energieleverancier"}
            </p>
          </div>
        </div>

        {/* Large Chart Container */}
        <div className="h-[480px] bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between" id="laadpaal-solar-chart-main-box">
          {/* Visual Column Guide inside the chart box */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/60 pb-3 mb-2">
            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Verduidelijking per maand: Twee kolommen</span>
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex gap-0.5">
                  <span className="w-2.5 h-3 bg-[#10b981] rounded-xs" />
                  <span className="w-2.5 h-3 bg-[#cbd5e1] rounded-xs" />
                </span>
                <span className="text-slate-500 font-semibold">Linker Kolom:</span>
                <span className="text-emerald-700 font-extrabold">☀️ Zonnestroom Bestemming</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex gap-0.5">
                  <span className="w-2.5 h-3 bg-[#8b5cf6] rounded-xs" />
                  <span className="w-2.5 h-3 bg-[#475569] rounded-xs" />
                </span>
                <span className="text-slate-500 font-semibold">Rechter Kolom:</span>
                <span className="text-indigo-900 font-extrabold">🚗 EV Laadstroom Bron</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={laadpaalChartData}
                margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val} kWh`}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                />
                
                <RechartsTooltip position={{ y: 50 }} offset={15} allowEscapeViewBox={{ x: false, y: false }} content={<LaadpaalSolarTooltip hasBattery={hasBattery} slimEmsOnlySolar={tech.slimEmsOnlySolar} />} />
                
                <RechartsLegend 
                  verticalAlign="top" 
                  height={45}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#334155' }}
                />
                
                {/* STACK 1: SOLAR DISTRIBUTION (Left Bar in each month) */}
                <Bar 
                  dataKey="Direct verbruik huis (zonder accu) (kWh)" 
                  name="🏠 Huis direct verbruik" 
                  stackId="solar" 
                  fill="#10b981" 
                  barSize={20}
                />
                {hasBattery && (
                  <Bar 
                    dataKey="Extra verbruik via accu (kWh)" 
                    name="🔋 Opgeslagen via thuisaccu" 
                    stackId="solar" 
                    fill="#3b82f6" 
                    barSize={20}
                  />
                )}
                <Bar 
                  dataKey="Zonnestroom direct naar EV (kWh)" 
                  name="🚗 Direct naar EV (Zonnestroom)" 
                  stackId="solar" 
                  fill="#8b5cf6" 
                  barSize={20}
                />
                <Bar 
                  dataKey="Resterende teruglevering naar net (kWh)" 
                  name="🌐 Resterende teruglevering" 
                  stackId="solar" 
                  fill="#cbd5e1" 
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                />
  
                {/* STACK 2: EV CHARGING SOURCES (Right Bar in each month) */}
                <Bar 
                  dataKey="Zonnestroom geladen in EV (kWh)" 
                  name="💜 Zonnestroom in EV" 
                  stackId="ev" 
                  fill="#8b5cf6" 
                  barSize={20}
                />
                {tech.slimEmsOnlySolar ? (
                  <Bar 
                    dataKey="Extern/publiek laden (kWh)" 
                    name="🌐 Publiek / extern laden (EMS)" 
                    stackId="ev" 
                    fill="#f59e0b" 
                    radius={[3, 3, 0, 0]}
                    barSize={20}
                  />
                ) : (
                  <Bar 
                    dataKey="Netstroom laadsessies (kWh)" 
                    name="🔌 Netstroom in EV" 
                    stackId="ev" 
                    fill="#475569" 
                    radius={[3, 3, 0, 0]}
                    barSize={20}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic educational notice box */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs text-slate-700 space-y-3">
          <div className="flex items-center gap-2 text-indigo-950 font-bold">
            <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
            <span>Slim laden in Peel en Maas: Haal het maximale uit uw zonnestroom</span>
          </div>
          <p className="leading-relaxed">
            In de wintermaanden (november t/m februari) ziet u dat de zonne-kolom (Kolom 1) erg laag is en uw autoladen (Kolom 2) bijna volledig uit netstroom (donkergrijs) bestaat. 
            Dit is heel normaal! In de lente en zomer (april t/m augustus) is er juist een enorm overschot aan zonnestroom. 
            Door op zonnige dagen uw auto overdag in te pluggen, claimt de laadpaal direct de overtollige zonnestroom. 
            Hierdoor laadt u uw auto nagenoeg 100% gratis en vermijdt u de afbouw van de salderingsregeling!
          </p>
        </div>
      </div>
    </div>
  );
}
