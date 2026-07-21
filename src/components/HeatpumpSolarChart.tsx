import React, { useState } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { Sun, Info, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
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
import { calculateAll } from '../utils/calculator';

interface HeatpumpSolarTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const HeatpumpSolarTooltip = ({ active, payload, label }: HeatpumpSolarTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  // Extract raw month data
  const data = payload[0].payload;
  const solar = data['Zonne-energie opwek (kWh)'] || 0;
  const wp = data['Warmtepomp verbruik (kWh)'] || 0;
  const direct = data['Direct eigen verbruik (kWh)'] || 0;
  const nettoKosten = data['Netto maandkosten (€)'] || 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-5 shadow-2xl border border-slate-800 text-xs space-y-4 min-w-[320px] font-sans">
      <div className="font-bold text-slate-200 border-b border-slate-800 pb-2.5 flex justify-between items-center">
        <span className="text-sm">Maand: {label}</span>
        <span className="text-[10px] text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-500/20">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Energie &amp; Financiën
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Section 1: Stromen (Left Axis) */}
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">⚡ STROOMENERGIE (linkeras)</span>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-amber-400" />
                  ☀️ Zonne-opwekking:
                </span>
                <span className="font-bold text-amber-300 font-mono text-right">{Math.round(solar).toLocaleString('nl-NL')} kWh</span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4">De stroom opgewekt door uw zonnepanelen deze maand.</p>
            </div>

            <div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-300 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-indigo-500" />
                  ⚡ Warmtepomp verbruik:
                </span>
                <span className="font-bold text-indigo-300 font-mono text-right">{Math.round(wp).toLocaleString('nl-NL')} kWh</span>
              </div>
              <p className="text-[10px] text-slate-400 pl-4">Het stroomverbruik van de warmtepomp om uw huis te verwarmen.</p>
            </div>

            <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/10 space-y-0.5">
              <div className="flex justify-between items-center gap-4">
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-emerald-400" />
                  🔄 Direct eigen verbruik:
                </span>
                <span className="font-black text-emerald-300 font-mono text-right">{Math.round(direct).toLocaleString('nl-NL')} kWh</span>
              </div>
              <p className="text-[10px] text-slate-400 pl-3.5">Zonnestroom die direct door de warmtepomp gebruikt is (volledig gratis).</p>
            </div>
          </div>
        </div>

        {/* Section 2: Financieel Resultaat (Right Axis) */}
        <div className="space-y-2 pt-2.5 border-t border-slate-800">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">💶 KOSTEN &amp; BATEN (rechteras)</span>
          <div className={`p-2.5 rounded-xl space-y-0.5 border ${
            nettoKosten < 0 ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-rose-950/20 border-rose-500/20'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-200 flex items-center gap-1.5 font-semibold">
                {nettoKosten < 0 ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ArrowDownRight className="w-4 h-4 shrink-0" />
                    Netto opbrengst:
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400">
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    Netto stroomkosten:
                  </span>
                )}
              </span>
              <span className={`font-black font-mono text-sm text-right ${nettoKosten < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                € {Math.abs(nettoKosten).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {nettoKosten < 0 
                ? "Uw opgewekte stroom overtreft uw verbruik. U verdient hieraan terug!" 
                : "Elektriciteitsrekening deze maand voor de resterende benodigde stroom."
              }
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-medium">
        {nettoKosten < 0 ? (
          <p className="text-emerald-400/90 font-semibold flex items-center gap-1">
            🎉 Meer opgewekt dan verbruikt! Deze maand verdient u geld terug met teruglevering.
          </p>
        ) : (
          <p className="text-rose-400/90 font-semibold flex items-center gap-1">
            ❄️ De warmtepomp vraagt meer stroom dan uw panelen opwekken. Dit is uw netto bijdrage.
          </p>
        )}
      </div>
    </div>
  );
};

interface HeatpumpSolarChartProps {
  resident: ResidentData;
  house: HouseData;
  insulation: InsulationData;
  tech: TechData;
  setTech?: React.Dispatch<React.SetStateAction<TechData>>;
}

export default function HeatpumpSolarChart({
  resident,
  house,
  insulation,
  tech,
  setTech,
}: HeatpumpSolarChartProps) {
  // Read custom overrides globally if present, fallback locally if setTech is missing
  const [localUserAnnualSolar, setLocalUserAnnualSolar] = useState<number | ''>('');
  const [localUserAnnualWp, setLocalUserAnnualWp] = useState<number | ''>('');

  const userAnnualSolar = setTech
    ? (tech.userAnnualSolar !== undefined ? tech.userAnnualSolar : '')
    : localUserAnnualSolar;

  const userAnnualWp = setTech
    ? (tech.userAnnualWp !== undefined ? tech.userAnnualWp : '')
    : localUserAnnualWp;

  const setUserAnnualSolar = (val: number | '') => {
    if (setTech) {
      setTech(prev => ({ ...prev, userAnnualSolar: val === '' ? undefined : val }));
    } else {
      setLocalUserAnnualSolar(val);
    }
  };

  const setUserAnnualWp = (val: number | '') => {
    if (setTech) {
      setTech(prev => ({ ...prev, userAnnualWp: val === '' ? undefined : val }));
    } else {
      setLocalUserAnnualWp(val);
    }
  };

  const calcResult = calculateAll(resident, house, insulation, tech);
  const selectedModel = tech.selectedWarmtepompModel || 'Standard';
  const selectedType = tech.selectedWarmtepompType || 'Hybride';
  
  // Map selected option to type in options array
  const typeLabel = selectedType === 'All-Electric' ? 'All-Electric' : (selectedModel === 'LuchtLucht' ? 'Lucht-lucht (Airco)' : 'Hybride');
  
  const activeWpOption = calcResult.heatpump.options.find(
    opt => opt.type === typeLabel
  ) || calcResult.heatpump.options[0];

  const totalWpKwh = activeWpOption.elecIncreaseKwh || 0;

  // Real-world balanced monthly distribution profiles matching Dutch meteorology & user data:
  // - Heatpump: strong winter peak (Jan 20%, Feb 18%, Dec 17%) so winter consumption matches 700-900 kWh for a Panasonic heat pump of ~4000-4500 kWh.
  // - Solar: tuned precisely to reflect user's real-world winter values (Jan 1.2%, Feb 4.6%, Dec 1.1%), summing to EXACTLY 100.0%.
  const heatingDistribution = [20, 18, 12, 6, 2.5, 1, 1, 1, 2, 6, 13.5, 17]; // Jan-Dec (sums to exactly 100)
  const solarDistribution = [1.2, 4.6, 8.0, 12.0, 14.5, 16.0, 15.5, 12.5, 9.0, 4.5, 1.1, 1.1]; // Jan-Dec (sums to exactly 100.0)
  const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  const inkoopprijs = house.elektraPrijs || 0.25;
  const terugleververgoeding = 0.05; // Standard returned solar rate in the Netherlands

  // Recalculate local solar yield (to get exact solarM for each month, perfectly aligned with the Zon tab)
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

  // Apply user overrides if specified
  const finalAnnualSolar = userAnnualSolar !== '' ? userAnnualSolar : localAnnualYieldKwh;
  const finalAnnualWp = userAnnualWp !== '' ? userAnnualWp : totalWpKwh;

  // Calculate monthly data points
  const chartData = months.map((month, i) => {
    const solarM = (finalAnnualSolar * solarDistribution[i]) / 100;
    const wpM = (finalAnnualWp * heatingDistribution[i]) / 100;
    
    // Smooth, highly realistic coincidence factor on monthly scale
    const R = solarM / (wpM + 0.1);
    // Max 80% coverage under high solar months for tap water / minor summer load
    const sufficiencyFraction = Math.min(0.80, 1 - Math.exp(-0.85 * R));
    const directUse = wpM * sufficiencyFraction;
    
    const netImport = Math.max(0, wpM - directUse);
    const netExport = Math.max(0, solarM - directUse);
    
    const kostenImport = netImport * inkoopprijs;
    const opbrengstExport = netExport * terugleververgoeding;
    const nettoKosten = kostenImport - opbrengstExport;

    return {
      name: month,
      'Zonne-energie opwek (kWh)': Math.round(solarM),
      'Warmtepomp verbruik (kWh)': Math.round(wpM),
      'Direct eigen verbruik (kWh)': Math.round(directUse),
      'Net-import (resterend verbruik) (kWh)': Math.round(netImport),
      'Net-export (teruggeleverd) (kWh)': Math.round(netExport),
      'Kosten net-import (€)': Number(kostenImport.toFixed(2)),
      'Opbrengst net-export (€)': Number(opbrengstExport.toFixed(2)),
      'Netto maandkosten (€)': Number(nettoKosten.toFixed(2)),
      'Netto te betalen (€)': nettoKosten > 0 ? Number(nettoKosten.toFixed(2)) : 0,
      'Netto terugontvangen (€)': nettoKosten < 0 ? Number(Math.abs(nettoKosten).toFixed(2)) : 0
    };
  });

  // Calculate annual aggregated metrics from the monthly realistic distribution
  const totalSolarOpwek = chartData.reduce((acc, d) => acc + d['Zonne-energie opwek (kWh)'], 0);
  const totalWpVerbruik = chartData.reduce((acc, d) => acc + d['Warmtepomp verbruik (kWh)'], 0);
  const totalDirectEigenVerbruik = chartData.reduce((acc, d) => acc + d['Direct eigen verbruik (kWh)'], 0);
  const totalNetImport = chartData.reduce((acc, d) => acc + d['Net-import (resterend verbruik) (kWh)'], 0);
  const totalNetExport = chartData.reduce((acc, d) => acc + d['Net-export (teruggeleverd) (kWh)'], 0);
  const totalNettoKosten = chartData.reduce((acc, d) => acc + d['Netto maandkosten (€)'], 0);

  const solarPercentage = totalWpVerbruik > 0 ? Math.round((totalDirectEigenVerbruik / totalWpVerbruik) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-150/70 shadow-md overflow-hidden space-y-4" id="hp-solar-integration-card-wide">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sun className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-base font-bold text-slate-800 font-sans leading-tight">
              Gedetailleerde Seizoensanalyse: Warmtepomp &amp; Zonne-Integratie
            </h3>
            <p className="text-xs text-slate-400 font-medium">Maandelijkse stroombalans en netto kosten over het jaar</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Deze interactieve grafiek toont het realistische, seizoensgebonden samenspel tussen uw zonnepanelen opwek en de stroomconsumptie van de geselecteerde <strong>{typeLabel} ({selectedModel})</strong> warmtepomp. 
          De zonne-opwek is maximaal in de zomer, terwijl de warmtepomp stroomvraag piekt in de winter. De grafiek berekent exact hoeveel procent u direct zelf kunt afdekken en wat de resterende netto energiekosten of terugleveropbrengsten per maand zijn.
        </p>

        {/* Custom user inputs to fine-tune practical measurements */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Praktijkgegevens verfijnen</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Heeft u concrete cijfers van uw eigen installatie (zoals het werkelijke stroomverbruik van uw warmtepomp of de opbrengst van uw zonnepanelen)? Pas de onderstaande jaarwaarden aan om de seizoensgrafiek en de berekeningen direct op uw praktijk af te stemmen:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700" htmlFor="user_annual_solar_input">
                Jaarlijkse zonne-opwekking (kWh)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type="number"
                  id="user_annual_solar_input"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  placeholder={`${localAnnualYieldKwh} kWh (berekend op basis van panelen)`}
                  value={userAnnualSolar}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setUserAnnualSolar(val);
                  }}
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">kWh</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Theoretische opwek is berekend op basis van <strong>{tech.aantalZonnepanelen || 0} panelen</strong> à {paneelVermogenLocal} Wp met uw dakoriëntatie en hellingshoek.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700" htmlFor="user_annual_wp_input">
                Jaarlijks stroomverbruik warmtepomp (kWh)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type="number"
                  id="user_annual_wp_input"
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  placeholder={`${Math.round(totalWpKwh)} kWh (theoretische schatting)`}
                  value={userAnnualWp}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setUserAnnualWp(val);
                  }}
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">kWh</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Vul uw werkelijke jaarverbruik in (of pas het aan op basis van uw gemeten winterverbruik) voor een perfecte seizoenssimulatie.
              </p>
            </div>
          </div>
        </div>

        {/* Summary metric pill cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-3xl text-xs">
          <div className="bg-amber-50/50 border border-amber-100/80 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">☀️ Jaaropbrengst Zonnestroom</span>
            <strong className="text-amber-600 text-lg font-black font-mono">{Math.round(totalSolarOpwek).toLocaleString('nl-NL')} kWh</strong>
          </div>
          <div className="bg-indigo-50/40 border border-indigo-150 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">⚡ Warmtepomp Verbruik</span>
            <strong className="text-indigo-700 text-lg font-black font-mono">{Math.round(totalWpVerbruik).toLocaleString('nl-NL')} kWh</strong>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100/80 p-4 rounded-2xl shadow-xs">
            <span className="text-slate-500 block font-bold mb-1">🔄 Direct Eigen Verbruik</span>
            <strong className="text-emerald-700 text-lg font-black font-mono">
              {Math.round(totalDirectEigenVerbruik).toLocaleString('nl-NL')} kWh 
              <span className="text-xs font-semibold text-emerald-600 ml-1.5">({solarPercentage}%)</span>
            </strong>
          </div>
          <div className={`p-4 rounded-2xl shadow-xs border ${
            totalNettoKosten < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50/50 border-rose-150'
          }`}>
            <span className="text-slate-500 block font-bold mb-1">💶 Netto Stroomkosten WP &amp; PV</span>
            <strong className={`text-lg font-black font-mono ${totalNettoKosten < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totalNettoKosten < 0 ? '💰 -€ ' : '💸 € '}
              {Math.abs(Math.round(totalNettoKosten)).toLocaleString('nl-NL')}
            </strong>
          </div>
        </div>

        {/* Dual-axis composed chart */}
        <div className="h-[460px] bg-slate-50 border border-slate-100 rounded-3xl p-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              
              {/* Left Y-axis for Energy (kWh) */}
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
                label={{ value: 'Energie (kWh)', angle: -90, position: 'insideLeft', offset: 10, fill: '#475569', fontSize: 11, fontWeight: 750 }} 
              />
              
              {/* Right Y-axis for Financial result (€) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
                axisLine={false} 
                tickLine={false} 
                label={{ value: 'Netto Maandresultaat (€)', angle: 90, position: 'insideRight', offset: -10, fill: '#475569', fontSize: 11, fontWeight: 750 }} 
              />
              
              <RechartsTooltip content={<HeatpumpSolarTooltip />} />
              <RechartsLegend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
              
              {/* Energy (Left Axis) */}
              <Bar yAxisId="left" dataKey="Zonne-energie opwek (kWh)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="☀️ Opgewekte Zonnestroom (kWh)" barSize={16} />
              <Bar yAxisId="left" dataKey="Warmtepomp verbruik (kWh)" fill="#4f46e5" radius={[4, 4, 0, 0]} name="⚡ Warmtepomp Verbruik (kWh)" barSize={16} />
              
              {/* Financial Result (Right Axis) - Plotting as a beautifully highlighted Line instead of redundant bars */}
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="Netto maandkosten (€)" 
                stroke="#f43f5e" 
                strokeWidth={3} 
                dot={{ r: 5, strokeWidth: 2, stroke: '#f43f5e', fill: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                name="📈 Netto Maandkosten/Baten (€)" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Informational advice note */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start text-xs text-amber-900/90 leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Inzicht uit de seizoensbalans:</span>
            <p>
              De grafiek vergelijkt de maandelijkse zonne-opwekking (geel) direct met het warmtepompverbruik (paars). In de winter (nov t/m feb) verbruikt de warmtepomp de meeste energie terwijl zonnepanelen minimaal opwekken. In de zomer is dit precies omgekeerd. Met een slimme sturing of warmtepomp-optimalisaties kunt u het directe eigen verbruik verhogen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
