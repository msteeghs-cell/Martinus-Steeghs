import React, { useState, useEffect, useMemo } from 'react';
import { 
  Battery, BarChart3, Info, Sparkles, Check, ArrowUpRight, Zap, ShieldCheck 
} from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { calculateAll, getBatterySimulationData } from '../utils/calculator';

interface BatterySolarChartProps {
  resident: ResidentData;
  house: HouseData;
  insulation: InsulationData;
  tech: TechData;
  setTech?: React.Dispatch<React.SetStateAction<TechData>>;
}

const BatteryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const originalData = payload[0].payload;
    const arbitrageVal = originalData ? originalData['Arbitrage stroomverschuiving (kWh)'] : 0;
    const pureArbEuro = originalData ? (originalData['Pure Arbitrage Handel (€)'] || originalData['Arbitrage opbrengst (€)'] || 0) : 0;
    const eigenZonEvEuro = originalData ? (originalData['Eigen Zon & Slim Laden (€)'] || 0) : 0;
    const totalMaandEuro = originalData ? (originalData['Totaal Maandvoordeel (€)'] || (pureArbEuro + eigenZonEvEuro)) : 0;
    
    const directBase = originalData ? Number(originalData['Direct verbruik (zonder accu) (kWh)']) : 0;
    const extraBattery = originalData ? Number(originalData['Extra verbruik via accu (kWh)']) : 0;
    const totalConsumptionWithBattery = directBase + extraBattery;
    const totalSolarYield = originalData ? Number(originalData['Zonnestroom opwek (kWh)']) : 0;
    const totalDemand = originalData ? Number(originalData['Stroomverbruik (kWh)']) : 0;
    
    const selfSufficiency = totalDemand > 0 ? Math.min(100, Math.round((totalConsumptionWithBattery / totalDemand) * 100)) : 0;
    const isSummer = ['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(label);

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-5 shadow-2xl rounded-2xl text-xs space-y-3.5 w-[310px] sm:w-[360px] max-w-[calc(100vw-32px)] border border-slate-750 font-sans pointer-events-none">
        <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
          <div>
            <span className="text-sm font-bold block text-white">Maand: {label}</span>
            <span className="text-[10px] text-slate-400">Gedetailleerde stroom- &amp; accubalans</span>
          </div>
          <span className="text-[10px] text-blue-400 font-extrabold bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-blue-500/20">
            <Battery className="w-3 h-3" />
            {selfSufficiency}% Autonoom
          </span>
        </div>

        {/* Stack breakdown */}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            const isBase = entry.dataKey === 'Direct verbruik (zonder accu) (kWh)';
            const isExtra = entry.dataKey === 'Extra verbruik via accu (kWh)';
            const isDemand = entry.dataKey === 'Stroomverbruik (kWh)';
            const isArb = entry.dataKey === 'Arbitrage stroomverschuiving (kWh)';
            const isArbEur = entry.dataKey.includes('(€)');

            if (isArbEur) return null;

            if (isDemand || isArb) {
              return (
                <div key={`item-${index}`} className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <span className="flex items-center gap-1.5 font-semibold text-[11px]" style={{ color: entry.fill || entry.stroke }}>
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.fill || entry.stroke }} />
                    {isDemand ? 'Totaal verbruik' : '⚡ Arbitrage verschuiving'}
                  </span>
                  <span className="font-bold text-slate-100 font-mono text-[11px]">{Math.round(entry.value)} kWh</span>
                </div>
              );
            }
            
            return (
              <div key={`item-${index}`} className="flex justify-between items-center bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
                <span className="flex items-center gap-2 font-medium" style={{ color: entry.fill }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.fill }} />
                  {isBase ? 'Direct verbruikt' : isExtra ? 'Via accu (nachtverbruik)' : 'Teruggeleverd net'}
                </span>
                <span className="font-bold text-slate-100 font-mono">{Math.round(entry.value)} kWh</span>
              </div>
            );
          })}
        </div>

        {/* Detailed Financial Earnings Breakdown */}
        {totalMaandEuro > 0 && (
          <div className="bg-purple-950/70 border border-purple-600/50 rounded-xl p-3 space-y-2 text-purple-100 shadow-inner">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 border-b border-purple-800/60 pb-1 flex justify-between items-center">
              <span>Geschat Voordeel Maand {label}</span>
              <span className="text-[9px] text-purple-400 font-normal font-mono">~{Math.round(arbitrageVal)} kWh verhandeld</span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-purple-200/90 flex items-center gap-1">
                  ⚡ 1. Pure Arbitrage (EPEX Handel):
                </span>
                <strong className="font-mono text-purple-200">+€ {pureArbEuro}</strong>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-emerald-200/90 flex items-center gap-1">
                  ☀️ 2. Eigen Zon &amp; Slim Laden EV:
                </span>
                <strong className="font-mono text-emerald-300">+€ {eigenZonEvEuro}</strong>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-purple-800/80 font-bold text-xs">
              <span className="text-white">Totaal Voordeel Maand:</span>
              <strong className="text-sm font-black font-mono text-emerald-300">+€ {totalMaandEuro} / mnd</strong>
            </div>
          </div>
        )}

        {/* Context info box */}
        <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl p-2.5 text-[11px] space-y-1 text-blue-200">
          <div className="flex justify-between">
            <span className="text-slate-400">Totale zonneopwek:</span>
            <strong className="text-amber-300 font-mono">{Math.round(totalSolarYield)} kWh</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Totaal huisverbruik:</span>
            <strong className="text-slate-200 font-mono">{Math.round(totalDemand)} kWh</strong>
          </div>
        </div>

        {/* Dynamic seasonal note */}
        <div className="text-[10px] text-slate-400 italic leading-snug border-t border-slate-800 pt-2">
          {isSummer ? (
            selfSufficiency >= 95 
              ? "☀️ Dankzij uw accu draait u deze maand vrijwel 100% autonoom op eigen zonnestroom." 
              : "☀️ Hoge zonne-opbrengst: uw accu vangt het avondverbruik af (~4 kWh/nacht) en handelt overige capaciteit op de markt."
          ) : (
            arbitrageVal > 0 
              ? `⚡ Winter/Arbitrage: Smart EMS levert circa +€${pureArbEuro}/mnd handelsopbrengst op de EPEX markt.`
              : `🌧️ Lage zonne-opbrengst in de winter: de accu wordt aangevuld via net-arbitrage op goedkope uren.`
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function BatterySolarChart({
  resident,
  house,
  insulation,
  tech,
  setTech,
}: BatterySolarChartProps) {
  const calcResult = calculateAll(resident, house, insulation, tech);

  // Capacity selection
  const [chartBatteryCapacity, setChartBatteryCapacity] = useState<number>(10);

  // Sync capacity with tech config
  useEffect(() => {
    if (tech.capaciteitAccu > 0) {
      setChartBatteryCapacity(tech.capaciteitAccu);
    } else {
      const rec = calcResult.solar.annualYieldKwh < 3500 ? 5 : calcResult.solar.annualYieldKwh < 7500 ? 10 : 15;
      setChartBatteryCapacity(rec);
    }
  }, [tech.capaciteitAccu, calcResult.solar.annualYieldKwh]);

  // Compute monthly battery simulation
  const batteryChartData = useMemo(() => {
    return getBatterySimulationData(
      calcResult.solar.annualYieldKwh || 0,
      calcResult.house.verbruikKwh || 3500,
      chartBatteryCapacity || 10,
      calcResult.tech.omzettingsverliezen || 10,
      calcResult.solar.selfConsumptionBase || 30,
      calcResult.solar.absoluteSelfConsumptionBaseKwh || 0,
      tech.dynamicProvider || 'Zonneplan',
      tech.batteryGridTrading
    );
  }, [
    calcResult.solar.annualYieldKwh, 
    calcResult.house.verbruikKwh, 
    chartBatteryCapacity, 
    calcResult.tech.omzettingsverliezen, 
    calcResult.solar.selfConsumptionBase, 
    calcResult.solar.absoluteSelfConsumptionBaseKwh,
    tech.dynamicProvider,
    tech.batteryGridTrading
  ]);

  const totalExtraBatteryKwh = useMemo(() => {
    return batteryChartData.reduce((acc, d) => acc + d['Extra verbruik via accu (kWh)'], 0);
  }, [batteryChartData]);

  const totalDirectWithBatteryKwh = useMemo(() => {
    return batteryChartData.reduce((acc, d) => acc + d['Totaal direct verbruik (met accu) (kWh)'], 0);
  }, [batteryChartData]);

  const totalArbitrageEuros = useMemo(() => {
    return batteryChartData.reduce((acc, d) => acc + (d['Pure Arbitrage Handel (€)'] || d['Arbitrage opbrengst (€)'] || 0), 0);
  }, [batteryChartData]);

  const totalSolarEvEuros = useMemo(() => {
    return batteryChartData.reduce((acc, d) => acc + (d['Eigen Zon & Slim Laden (€)'] || 0), 0);
  }, [batteryChartData]);

  const totalMaandEurosSum = useMemo(() => {
    return batteryChartData.reduce((acc, d) => acc + (d['Totaal Maandvoordeel (€)'] || 0), 0);
  }, [batteryChartData]);

  const capRatio = (chartBatteryCapacity || 10) / 28;
  let pFactor = 1.0;
  if (tech.dynamicProvider === 'Frank') pFactor = 0.85;
  else if (tech.dynamicProvider === 'Tibber') pFactor = 0.80;
  else if (tech.dynamicProvider === 'Anwb') pFactor = 0.72;

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-fadeIn" id="battery-solar-chart-container">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-blue-600" />
              Paginabrede Seizoenssimulatie
            </span>
            {tech.capaciteitAccu > 0 && (
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Configuratie: {tech.capaciteitAccu} kWh
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 pt-1">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Maandelijkse Energiestromen met Thuisaccu ({chartBatteryCapacity} kWh)
          </h3>
          <p className="text-xs text-slate-500 max-w-3xl">
            Inzicht in hoe uw zonnestroom over de 12 maanden verdeeld wordt tussen direct verbruik, acculading en resterende netteruglevering.
          </p>
        </div>

        {/* Capacity switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start lg:self-center border border-slate-200/60">
          <span className="text-[11px] font-bold text-slate-500 px-2">Capaciteit:</span>
          {[5, 10, 15, 30].map(cap => {
            const isSelected = chartBatteryCapacity === cap;
            const isConfigured = tech.capaciteitAccu === cap;
            return (
              <button
                key={cap}
                type="button"
                onClick={() => {
                  setChartBatteryCapacity(cap);
                  if (setTech && tech.capaciteitAccu > 0) {
                    setTech(prev => ({ ...prev, capaciteitAccu: cap }));
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {cap} kWh
                {isConfigured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {cap === 30 && (
                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded-md font-black tracking-wide shrink-0">
                    Praktijk
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thuisaccu Sturing Mode Toggle Control */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tech.batteryGridTrading || false}
                onChange={(e) => {
                  if (setTech) setTech(prev => ({ ...prev, batteryGridTrading: e.target.checked }));
                }}
                className="w-4 h-4 accent-purple-600 rounded border-slate-300 cursor-pointer shrink-0"
              />
              <span className="font-extrabold text-slate-800 text-xs">Thuisaccu Sturing Mode:</span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (setTech) setTech(prev => ({ ...prev, batteryGridTrading: !prev.batteryGridTrading }));
              }}
              className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer text-[11px] ${
                tech.batteryGridTrading 
                  ? 'bg-purple-600 text-white shadow-xs hover:bg-purple-700' 
                  : 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
              }`}
            >
              <Battery className="w-3.5 h-3.5" />
              {tech.batteryGridTrading ? 'Slim EMS + Nethandel / Arbitrage (EPEX & Onbalans)' : '100% Zonne-focus (Alleen Zonnestroom Opslaan)'}
            </button>
          </div>
          
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 bg-white border border-slate-200 text-slate-700">
            {tech.batteryGridTrading ? '✓ Nethandel Actief' : '✓ 100% Zonnestroom Opslag'}
          </span>
        </div>

        <div className="text-[11px] text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-slate-200/60 font-sans">
          {tech.batteryGridTrading ? (
            <span>
              <strong className="text-purple-800">Slim EMS + Nethandel (AAN):</strong> De accu slaat zonnestroom op én handelt volautomatisch op goedkope/negatieve dynamische uurprijzen ({tech.dynamicProvider || 'Zonneplan'}). Dit levert extra handelsinkomsten op (pure arbitrage-opbrengst).
            </span>
          ) : (
            <span>
              <strong className="text-amber-800">100% Zonne-focus (UIT):</strong> De accu slaat uitsluitend eigen overtollige zonnestroom op voor eigen gebruik. Er vindt <strong className="text-rose-700">geen handel op de energiemarkt plaats (€0/jaar pure arbitrage)</strong>.
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Smart EMS banner for all battery capacities */}
      {chartBatteryCapacity > 0 && (
        <div className={`border rounded-2xl p-4 flex gap-3 items-start text-xs shadow-xs transition-colors ${
          tech.batteryGridTrading 
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/80 text-emerald-950'
            : 'bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-200/90 text-amber-950'
        }`}>
          <span className="flex h-2.5 w-2.5 relative shrink-0 mt-1">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tech.batteryGridTrading ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${tech.batteryGridTrading ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <div className="space-y-1">
            <span className={`font-extrabold block text-xs flex items-center gap-1.5 ${tech.batteryGridTrading ? 'text-emerald-800' : 'text-amber-900'}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {tech.batteryGridTrading ? `Smart EMS & Arbitrage Simulatie (${chartBatteryCapacity} kWh Accu)` : `100% Zonne-focus Simulatie (${chartBatteryCapacity} kWh Accu)`}
            </span>
            <p className="text-[11px] leading-relaxed font-semibold">
              {tech.batteryGridTrading ? (
                <>Voor jouw <strong>{chartBatteryCapacity} kWh</strong> opstelling simuleren we een intelligent home-automatisatiesysteem (EMS) met <strong>actieve energie-arbitrage &amp; dynamic load shifting</strong> (nul-op-de-meter).</>
              ) : (
                <>Voor jouw <strong>{chartBatteryCapacity} kWh</strong> opstelling simuleren we een <strong>100% zonne-focus</strong>. De batterij slaat alleen zonne-overschotten op. Er worden geen batterijladingen vanaf het net gedaan voor arbitrage-handel op de energiemarkt.</>
              )}
            </p>
            {tech.batteryGridTrading && (
              <p className="text-[10px] text-emerald-800/80 leading-relaxed font-medium">
                In de wintermaanden en bij overcapaciteit past het model actieve net-arbitrage toe (laden bij dal- of negatieve tarieven, ontladen bij pieken) voor maximale besparing!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visual Capaciteitsverdeling & Arbitrage Trading Breakdown (Dynamic for all battery sizes & house types) */}
      {chartBatteryCapacity > 0 && (() => {
        const cap = chartBatteryCapacity;
        
        // Dynamic night consumption based on house type:
        // Appartement / Tussenwoning: 0.8 kWh
        // Hoekwoning / 2-onder-1-kap: 1.6 kWh
        // Vrijstaand / Villa: 4.0 kWh
        const getNightConsumption = (type?: string, area?: number): number => {
          const s = (type || '').toLowerCase();
          if (s.includes('app') || s.includes('tussen')) return 0.8;
          if (s.includes('hoek') || s.includes('twee') || s.includes('2-onder') || s.includes('geschakeld')) return 1.6;
          if (s.includes('vrij') || s.includes('villa')) return 4.0;
          if (area && area < 100) return 0.8;
          if (area && area > 180) return 4.0;
          return 1.6;
        };

        const nightUse = getNightConsumption(house?.soortWoning, house?.woonoppervlakte);
        const lossPctConfigured = tech?.omzettingsverliezen !== undefined ? tech.omzettingsverliezen : 10;
        const lossKwh = Math.round((cap * (lossPctConfigured / 100)) * 10) / 10;
        const tradingOpt = Math.max(0, Math.round((cap - nightUse - lossKwh) * 10) / 10);
        const tradingPess = Math.max(0, Math.round((tradingOpt * 0.83) * 10) / 10);

        const nightPct = Math.min(100, Math.round((nightUse / cap) * 100));
        const lossPct = Math.min(100 - nightPct, Math.round((lossKwh / cap) * 100));
        const tradingPct = Math.max(0, 100 - nightPct - lossPct);

        const houseTypeLabel = house?.soortWoning ? house.soortWoning : 'deze woning';

        return (
          <div className="bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-200/70 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Capaciteitsverdeling &amp; Dynamische Arbitrage Handel ({cap} kWh)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Nachtverbruik ({houseTypeLabel}: {nightUse} kWh), omzettingsverlies ({lossPctConfigured}% = ~{lossKwh} kWh) en resterende handels-capaciteit op de dynamische markt.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-center border border-purple-200 shrink-0">
                Dynamisch Contract EMS
              </span>
            </div>

            {/* Horizontal Stacked Visual Capacity Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>Capaciteitsverdeling ({cap} kWh Totaal):</span>
                <span className="font-mono text-purple-700 text-[11px]">
                  {nightUse} kWh Nacht ({nightPct}%) + {lossKwh} kWh Verlies ({lossPct}%) + {tradingOpt} kWh Trading ({tradingPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-5 overflow-hidden flex text-[10px] font-bold text-white text-center leading-5 shadow-inner">
                {nightPct > 0 && (
                  <div 
                    className="bg-blue-600 h-full flex items-center justify-center transition-all px-1" 
                    style={{ width: `${nightPct}%` }}
                    title={`Eigen Nachtverbruik (${houseTypeLabel}): ${nightUse} kWh`}
                  >
                    {nightPct > 8 ? `${nightUse} kWh Nacht` : `${nightUse}k`}
                  </div>
                )}
                {lossPct > 0 && (
                  <div 
                    className="bg-slate-400 h-full flex items-center justify-center transition-all px-1" 
                    style={{ width: `${lossPct}%` }}
                    title={`Omzettingsverlies (${lossPctConfigured}%): ~${lossKwh} kWh`}
                  >
                    {lossPct > 8 ? `${lossKwh} kWh Verlies` : ''}
                  </div>
                )}
                {tradingPct > 0 && (
                  <div 
                    className="bg-purple-600 h-full flex items-center justify-center transition-all px-1" 
                    style={{ width: `${tradingPct}%` }}
                    title={`Arbitrage Trading Capaciteit: ${tradingOpt} kWh (pessimistisch ~${tradingPess} kWh)`}
                  >
                    {tradingPct > 20 ? `${tradingOpt} kWh Arbitrage Trading (Pessimistisch ~${tradingPess} kWh)` : `${tradingOpt} kWh Trading`}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-normal pt-1">
                💡 <strong>Grafiekuitleg:</strong> Bij een volgeladen accu ({cap} kWh) wordt voor een <strong>{houseTypeLabel}</strong> ca. <strong>{nightUse} kWh</strong> gereserveerd voor je eigen nachtverbruik (blauwe staaf). Met het ingestelde omzettingsverlies van <strong>{lossPctConfigured}%</strong> (~{lossKwh} kWh) blijft er circa <strong>{tradingOpt} kWh</strong> over (pessimistisch ~{tradingPess} kWh) die door het Smart EMS volledig wordt ingezet voor arbitrage-handel op de dynamische stroommarkt (paarse lijn).
              </p>
            </div>
          </div>
        );
      })()}

      {/* Chart container */}
      <div className="h-80 md:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={batteryChartData}
            margin={{ top: 20, right: 15, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}`}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            />
            <Tooltip 
              position={{ y: 50 }} 
              offset={15} 
              allowEscapeViewBox={{ x: false, y: false }} 
              content={<BatteryTooltip />} 
            />
            <Legend 
              verticalAlign="top" 
              height={40}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569' }}
            />
            
            {/* Stacked Bars representing Destination of Solar Production */}
            <Bar 
              dataKey="Direct verbruik (zonder accu) (kWh)" 
              name="🏠 Direct verbruikte zonnestroom (kWh)" 
              stackId="solar" 
              fill="#10b981" 
            />
            <Bar 
              dataKey="Extra verbruik via accu (kWh)" 
              name="🔋 Opgeslagen & verbruikt via accu (kWh)" 
              stackId="solar" 
              fill="#3b82f6" 
            />
            <Bar 
              dataKey="Teruglevering naar net (met accu) (kWh)" 
              name="🌐 Resterende teruglevering (kWh)" 
              stackId="solar" 
              fill="#94a3b8" 
              radius={[4, 4, 0, 0]} 
            />

            {/* Lines for context */}
            <Line 
              type="monotone" 
              dataKey="Stroomverbruik (kWh)" 
              name="📈 Totaal stroomverbruik (kWh)" 
              stroke="#f43f5e" 
              strokeWidth={3}
              strokeDasharray="4 4"
              dot={{ r: 3, strokeWidth: 1, stroke: '#f43f5e', fill: '#fff' }} 
            />
            <Line 
              type="monotone" 
              dataKey="Arbitrage stroomverschuiving (kWh)" 
              name="⚡ Arbitrage stroomverschuiving (kWh)" 
              stroke="#a855f7" 
              strokeWidth={2.5}
              dot={{ r: 3.5, strokeWidth: 1.5, stroke: '#a855f7', fill: '#fff' }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly & Seasonal Breakdown for Arbitrage Trading & Solar/EV Savings */}
      {chartBatteryCapacity > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                Seizoensgebonden Opbrengst- &amp; Trading Overzicht
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  {chartBatteryCapacity} kWh Accu
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Geschatte opbrengstverdeling op basis van ( Tarieven {tech.dynamicProvider || 'Zonneplan'} ).
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl self-start sm:self-center">
              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Totaal Geschat Jaarvoordeel</span>
              <span className="text-sm font-bold font-mono text-emerald-700">
                +€ {totalMaandEurosSum.toLocaleString('nl-NL')},- <span className="text-[10px] text-slate-500 font-normal">/ jaar</span>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Seizoen / Periode</th>
                  <th className="p-3 text-purple-900">1. Pure Arbitrage (EPEX Handel)</th>
                  <th className="p-3 text-emerald-800">2. Eigen Zon-besparing &amp; Slim Laden EV</th>
                  <th className="p-3 text-slate-800 text-right">Totaal Geschat Voordeel / mnd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans text-xs">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">
                    Winter (Nov – Feb)
                  </td>
                  <td className="p-3 font-mono text-purple-900">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(90 * capRatio * pFactor)} – € {Math.round(120 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(105 * capRatio * pFactor)})</span></>
                    ) : (
                      <span className="text-slate-400 font-sans italic">€ 0 (Nethandel Uit)</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-emerald-800">
                    € {Math.round(20 * capRatio)} – € {Math.round(40 * capRatio)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(30 * capRatio)})</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900 text-right">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(110 * capRatio * pFactor)} – € {Math.round(160 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    ) : (
                      <>€ {Math.round(20 * capRatio)} – € {Math.round(40 * capRatio)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    )}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">
                    Lente / Herfst (Mrt, Apr, Sep, Okt)
                  </td>
                  <td className="p-3 font-mono text-purple-900">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(70 * capRatio * pFactor)} – € {Math.round(100 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(85 * capRatio * pFactor)})</span></>
                    ) : (
                      <span className="text-slate-400 font-sans italic">€ 0 (Nethandel Uit)</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-emerald-800">
                    € {Math.round(80 * capRatio)} – € {Math.round(120 * capRatio)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(100 * capRatio)})</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900 text-right">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(150 * capRatio * pFactor)} – € {Math.round(220 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    ) : (
                      <>€ {Math.round(80 * capRatio)} – € {Math.round(120 * capRatio)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    )}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">
                    Zomer (Mei – Aug)
                  </td>
                  <td className="p-3 font-mono text-purple-900">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(60 * capRatio * pFactor)} – € {Math.round(90 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(75 * capRatio * pFactor)})</span></>
                    ) : (
                      <span className="text-slate-400 font-sans italic">€ 0 (Nethandel Uit)</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-emerald-800">
                    € {Math.round(120 * capRatio)} – € {Math.round(160 * capRatio)} <span className="text-[10px] text-slate-400 font-sans">(gem. €{Math.round(140 * capRatio)})</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900 text-right">
                    {tech.batteryGridTrading ? (
                      <>€ {Math.round(180 * capRatio * pFactor)} – € {Math.round(250 * capRatio * pFactor)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    ) : (
                      <>€ {Math.round(120 * capRatio)} – € {Math.round(160 * capRatio)} <span className="text-[10px] text-slate-400 font-normal">/ mnd</span></>
                    )}
                  </td>
                </tr>

                <tr className="bg-slate-100/80 text-slate-900 font-bold text-xs border-t border-slate-200">
                  <td className="p-3 uppercase tracking-wider text-slate-700">Gemiddeld per maand</td>
                  <td className="p-3 font-mono text-purple-900">
                    {tech.batteryGridTrading ? `~ € ${Math.round(85 * capRatio * pFactor)},-` : '~ € 0,-'} <span className="text-[10px] text-slate-500 font-normal">/ mnd</span>
                  </td>
                  <td className="p-3 font-mono text-emerald-800">~ € {Math.round(95 * capRatio)},- <span className="text-[10px] text-slate-500 font-normal">/ mnd</span></td>
                  <td className="p-3 font-mono text-slate-900 text-right font-black">
                    {tech.batteryGridTrading ? `~ € ${Math.round(180 * capRatio * pFactor)},-` : `~ € ${Math.round(95 * capRatio)},-`} <span className="text-[10px] text-slate-500 font-normal">/ mnd</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanatory legend and key metrics of the active simulation */}
      <div className="grid md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
        <div className="space-y-1 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">1. Pure Arbitrage (EPEX)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 font-mono">
              +€ {totalArbitrageEuros.toLocaleString('nl-NL')}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/ jaar</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Geautomatiseerde handel op dal- en negatieve uurprijzen op de energiemarkt.
          </p>
        </div>

        <div className="space-y-1 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">2. Zon &amp; Slim Laden EV</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 font-mono">
              +€ {totalSolarEvEuros.toLocaleString('nl-NL')}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/ jaar</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Direct eigen verbruik van zonne-energie en laden op goedkope uren.
          </p>
        </div>

        <div className="space-y-1 bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-200/60">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block font-sans">Totaal Berekend Voordeel</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-800 font-mono">
              +€ {totalMaandEurosSum.toLocaleString('nl-NL')}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/ jaar</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Gecombineerd geschat jaarlijks voordeel voor de {chartBatteryCapacity} kWh accu.
          </p>
        </div>

        <div className="space-y-1 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Autonomie (Zonne-dekking)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900">
              {Math.min(100, Math.round((totalDirectWithBatteryKwh / (calcResult.house.verbruikKwh || 1)) * 100))}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">zelfvoorzienend</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Stroomvraag die rechtstreeks door zonnepanelen én accu samen wordt gedekt.
          </p>
        </div>
      </div>
    </div>
  );
}
