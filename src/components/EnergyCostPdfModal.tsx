import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  PiggyBank, 
  Zap, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Leaf, 
  Copy, 
  FileText, 
  Calculator, 
  Home,
  Sun,
  BatteryCharging,
  ShieldCheck
} from 'lucide-react';
import { CalculationResult, ResidentData, HouseData } from '../types';

interface EnergyCostPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: ResidentData;
  house: HouseData;
  liveCalcResult: CalculationResult;
  gPrice: number;
  ePrice: number;
  currentGasM3: number;
  currentGasYr: number;
  currentGasMth: number;
  houseKwh: number;
  currentElektraYr: number;
  currentElektraMth: number;
  currentTotalYr: number;
  currentTotalMth: number;
  postGasM3: number;
  postGasYr: number;
  postGasMth: number;
  postHouseKwh: number;
  postAddElektraKwh: number;
  postElektraYr: number;
  postElektraMth: number;
  postTotalYr: number;
  postTotalMth: number;
  solarKwh: number;
  solarInv: number;
  aantalZonnepanelen: number;
  batteryCap: number;
  batteryInv: number;
  selfConsPct: number;
  batteryTradingYield: number;
  isVolledigWp: boolean;
  isHybrideWp: boolean;
  wpInv: number;
  wpCapacityStr: string;
  wpModelId: string;
  insulationInv: number;
  totalInsulationM2: number;
  totalGasSavingsM3: number;
  totalInvestmentInv: number;
}

export const EnergyCostPdfModal: React.FC<EnergyCostPdfModalProps> = ({
  isOpen,
  onClose,
  resident,
  house,
  liveCalcResult,
  gPrice,
  ePrice,
  currentGasM3,
  currentGasYr,
  currentGasMth,
  houseKwh,
  currentElektraYr,
  currentElektraMth,
  currentTotalYr,
  currentTotalMth,
  postGasM3,
  postGasYr,
  postGasMth,
  postHouseKwh,
  postAddElektraKwh,
  postElektraYr,
  postElektraMth,
  postTotalYr,
  postTotalMth,
  solarKwh,
  solarInv,
  aantalZonnepanelen,
  batteryCap,
  batteryInv,
  selfConsPct,
  batteryTradingYield,
  isVolledigWp,
  isHybrideWp,
  wpInv,
  wpCapacityStr,
  insulationInv,
  totalInsulationM2,
  totalGasSavingsM3,
  totalInvestmentInv,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('pdf-modal-open');
    } else {
      document.body.classList.remove('pdf-modal-open');
    }
    return () => {
      document.body.classList.remove('pdf-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const netSavingsYr = currentTotalYr - postTotalYr;
  const netSavingsMth = currentTotalMth - postTotalMth;
  const paybackYears = netSavingsYr > 0 && totalInvestmentInv > 0 
    ? (totalInvestmentInv / netSavingsYr).toFixed(1) 
    : null;

  const co2GasSavings = Math.round((currentGasM3 - postGasM3) * 1.884); // ~1.884 kg CO2 per m3 gas
  const co2TotalSavings = Math.max(0, co2GasSavings);

  const handlePrint = () => {
    window.print();
  };

  const generateMarkdownSummary = () => {
    return `
# GECOMBINEERDE ENERGIEKOSTEN & VERDUURZAMINGSBEREKENING
**Gemeente Peel en Maas • Verduurzamingsadvies**
Datum: ${new Date().toLocaleDateString('nl-NL')}
Adres: ${resident?.postcode || '5981 AA'} ${resident?.huisnummer || '1'}${resident?.toevoeging || ''}
Woningtype: ${house?.soortWoning || 'Hoekwoning'} (Bouwjaar: ${house?.bouwjaar || 'Onbekend'}, ${house?.woonoppervlakte || 0} m²)

---

### 1. ENERGIEKOSTEN OVERZICHT (HUIDIG VS NA VERDUURZAMING)
- **Huidige Situatie (Nulmeting)**:
  • Gas: ${currentGasM3.toLocaleString('nl-NL')} m³/jaar = € ${currentGasYr.toLocaleString('nl-NL')}/jaar (€ ${currentGasMth.toLocaleString('nl-NL')}/maand)
  • Elektra: ${houseKwh.toLocaleString('nl-NL')} kWh/jaar = € ${currentElektraYr.toLocaleString('nl-NL')}/jaar (€ ${currentElektraMth.toLocaleString('nl-NL')}/maand)
  • Totale energiekosten: € ${currentTotalYr.toLocaleString('nl-NL')}/jaar (€ ${currentTotalMth.toLocaleString('nl-NL')}/maand)

- **Na Verduurzaming**:
  • Gas: ${postGasM3 === 0 ? '0 m³ (Gasloos)' : `${postGasM3.toLocaleString('nl-NL')} m³/jaar`} = € ${postGasYr.toLocaleString('nl-NL')}/jaar (€ ${postGasMth.toLocaleString('nl-NL')}/maand)
  • Elektra: ${postHouseKwh.toLocaleString('nl-NL')} kWh/jaar vraag = € ${postElektraYr.toLocaleString('nl-NL')}/jaar (€ ${postElektraMth.toLocaleString('nl-NL')}/maand)
  • Totale energiekosten: € ${postTotalYr.toLocaleString('nl-NL')}/jaar (€ ${postTotalMth.toLocaleString('nl-NL')}/maand)

- **Netto Resultaat**:
  • Besparing per jaar: € ${netSavingsYr.toLocaleString('nl-NL')}/jaar
  • Besparing per maand: € ${netSavingsMth.toLocaleString('nl-NL')}/maand

---

### 2. INVESTERINGSOVERZICHT
- Isolatie (${totalInsulationM2} m², besparing: ${totalGasSavingsM3} m³ gas): € ${Math.round(insulationInv).toLocaleString('nl-NL')}
- Zonnepanelen (${aantalZonnepanelen} panelen, opbrengst: ${Math.round(solarKwh)} kWh): € ${Math.round(solarInv).toLocaleString('nl-NL')}
- Thuisbatterij (${batteryCap} kWh, eigenverbruik: ${selfConsPct.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}%): € ${Math.round(batteryInv).toLocaleString('nl-NL')}
- Warmtepomp (${isVolledigWp ? 'All-Electric' : isHybrideWp ? 'Hybride' : 'Geen'} - ${wpCapacityStr}): € ${Math.round(wpInv).toLocaleString('nl-NL')}
- **Totale Netto Investering**: € ${Math.round(totalInvestmentInv).toLocaleString('nl-NL')}
- **Geschatte Terugverdientijd**: ${paybackYears ? `${paybackYears} jaar` : 'Direct rendement'}

---

### 3. UITGEBREIDE BEREKENINGSVERANTOORDING
- **Aardgasreductie**: Van ${currentGasM3} m³ -> isolatiebesparing (-${totalGasSavingsM3} m³) -> warmtepompbesparing -> Restgasverbruik: ${postGasM3} m³.
- **Elektriciteitsbalans**: Basisstroom ${houseKwh} kWh + Warmtepomp ${postAddElektraKwh} kWh = Totaal ${postHouseKwh} kWh.
  Direct eigenverbruik via zonnestroom & accu: ${Math.round(solarKwh * (selfConsPct/100))} kWh.
- **CO2-reductie**: ~${co2TotalSavings.toLocaleString('nl-NL')} kg CO2 per jaar.
`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateMarkdownSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white print:block">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header - Screen Only */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Gedetailleerde Energiekosten &amp; Verduurzamingsberekening
              </h2>
              <p className="text-xs text-slate-300">
                Officiële berekeningsrapportage • Huidige Situatie vs. Na Verduurzaming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>{copied ? 'Gekopieerd!' : 'Kopieer Tekst'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Afdrukken / Opslaan als PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              aria-label="Sluiten"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0 print:overflow-visible print:space-y-4 text-xs">
          
          {/* Document Title Banner */}
          <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Gemeente Peel en Maas • Verduurzamingsadvies</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Berekeningsrapport Energiekosten &amp; Verduurzaming
              </h1>
              <p className="text-slate-600 text-xs mt-0.5">
                Uitgebreide stapsgewijze vergelijking: Huidige Nulmeting vs. Situatie Na Verduurzaming
              </p>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-800">
                Adres: {resident?.postcode || '5981 AA'} {resident?.huisnummer || '1'}{resident?.toevoeging || ''}
              </p>
              <p>Woningtype: <span className="font-medium text-slate-700">{house?.soortWoning || 'Vrijstaand'} (Bouwjaar: {house?.bouwjaar || 'Onbekend'}, {house?.woonoppervlakte || 0} m²)</span></p>
              <p>Rapportdatum: <span className="font-mono">{new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            </div>
          </div>

          {/* Key Metrics Header Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Huidige Kosten</span>
              <p className="text-base font-black text-amber-950">
                € {currentTotalYr.toLocaleString('nl-NL')}<span className="text-xs font-normal text-amber-800">/jr</span>
              </p>
              <p className="text-[10px] text-amber-800 font-mono">€ {currentTotalMth.toLocaleString('nl-NL')}/mnd</p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/90 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Na Verduurzaming</span>
              <p className="text-base font-black text-emerald-950">
                {postTotalYr < 0 ? `-€ ${Math.abs(postTotalYr).toLocaleString('nl-NL')}` : `€ ${postTotalYr.toLocaleString('nl-NL')}`}<span className="text-xs font-normal text-emerald-800">/jr</span>
              </p>
              <p className="text-[10px] text-emerald-800 font-mono">
                {postTotalMth < 0 ? `-€ ${Math.abs(postTotalMth).toLocaleString('nl-NL')}` : `€ ${postTotalMth.toLocaleString('nl-NL')}`}/mnd
              </p>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/90 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">Netto Besparing</span>
              <p className="text-base font-black text-sky-950">
                € {netSavingsYr.toLocaleString('nl-NL')}<span className="text-xs font-normal text-sky-800">/jr</span>
              </p>
              <p className="text-[10px] text-sky-800 font-mono">€ {netSavingsMth.toLocaleString('nl-NL')}/mnd besparing</p>
            </div>

            <div className="bg-purple-50/80 border border-purple-200/90 p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Netto Investering</span>
              <p className="text-base font-black text-purple-950">
                € {Math.round(totalInvestmentInv).toLocaleString('nl-NL')}
              </p>
              <p className="text-[10px] text-purple-800 font-medium">
                {paybackYears ? `~${paybackYears} jaar TVT` : 'Direct rendement'}
              </p>
            </div>
          </div>

          {/* Section 1: Detailed Table Comparison */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              1. Energiekosten Vergelijking (Gas &amp; Elektra)
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="p-2.5">Situatie</th>
                    <th className="p-2.5 text-right bg-amber-50/70 text-amber-950">Gas Verbruik</th>
                    <th className="p-2.5 text-right bg-amber-50/70 text-amber-950">Gas / Jaar</th>
                    <th className="p-2.5 text-right bg-sky-50/70 text-sky-950">Elektra Vraag</th>
                    <th className="p-2.5 text-right bg-sky-50/70 text-sky-950">Elektra / Jaar</th>
                    <th className="p-2.5 text-right bg-emerald-50/80 text-emerald-950 font-black">Totaal / Mnd</th>
                    <th className="p-2.5 text-right bg-emerald-50/80 text-emerald-950 font-black">Totaal / Jaar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr className="bg-amber-50/20">
                    <td className="p-2.5 font-sans font-medium text-slate-800">
                      <span className="font-bold text-amber-900 block">Huidige Situatie (Nulmeting)</span>
                      <span className="text-[10px] font-normal text-slate-500">Aardgas: €{gPrice.toFixed(2)}/m³ • Elektra: €{ePrice.toFixed(2)}/kWh</span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-amber-900">{currentGasM3.toLocaleString('nl-NL')} m³</td>
                    <td className="p-2.5 text-right font-bold text-amber-950">€ {currentGasYr.toLocaleString('nl-NL')}</td>
                    <td className="p-2.5 text-right font-bold text-sky-900">{houseKwh.toLocaleString('nl-NL')} kWh</td>
                    <td className="p-2.5 text-right font-bold text-sky-950">
                      {currentElektraYr < 0 ? `-€ ${Math.abs(currentElektraYr).toLocaleString('nl-NL')}` : `€ ${currentElektraYr.toLocaleString('nl-NL')}`}
                    </td>
                    <td className="p-2.5 text-right bg-amber-100/40 text-slate-900 font-bold">
                      {currentTotalMth < 0 ? `-€ ${Math.abs(currentTotalMth).toLocaleString('nl-NL')}` : `€ ${currentTotalMth.toLocaleString('nl-NL')}`}
                    </td>
                    <td className="p-2.5 text-right bg-amber-100/40 text-slate-950 font-black">
                      {currentTotalYr < 0 ? `-€ ${Math.abs(currentTotalYr).toLocaleString('nl-NL')}` : `€ ${currentTotalYr.toLocaleString('nl-NL')}`}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/30 font-bold">
                    <td className="p-2.5 font-sans font-bold text-emerald-950">
                      <span className="font-black text-emerald-950 block">Na Verduurzaming</span>
                      <span className="text-[10px] font-normal text-slate-600">Inclusief isolatie, warmtepomp, zonnepanelen &amp; accu</span>
                    </td>
                    <td className="p-2.5 text-right text-emerald-950">
                      {postGasM3 === 0 ? <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black text-[10px]">0 m³ (Gasloos)</span> : `${postGasM3.toLocaleString('nl-NL')} m³`}
                    </td>
                    <td className="p-2.5 text-right text-amber-950">
                      {postGasM3 === 0 ? <span className="text-emerald-700 font-bold">€ 0</span> : `€ ${postGasYr.toLocaleString('nl-NL')}`}
                    </td>
                    <td className="p-2.5 text-right text-sky-950">{postHouseKwh.toLocaleString('nl-NL')} kWh</td>
                    <td className="p-2.5 text-right text-sky-950">
                      {postElektraYr < 0 ? <span className="text-emerald-700 font-bold">-€ {Math.abs(postElektraYr).toLocaleString('nl-NL')}</span> : `€ ${postElektraYr.toLocaleString('nl-NL')}`}
                    </td>
                    <td className="p-2.5 text-right bg-emerald-100/60 text-emerald-950 font-extrabold">
                      {postTotalMth < 0 ? <span className="text-emerald-700 font-black">-€ {Math.abs(postTotalMth).toLocaleString('nl-NL')}</span> : `€ ${postTotalMth.toLocaleString('nl-NL')}`}
                    </td>
                    <td className="p-2.5 text-right bg-emerald-100/60 text-emerald-950 font-black">
                      {postTotalYr < 0 ? (
                        <span className="text-emerald-800 font-black bg-emerald-200 px-2 py-0.5 rounded shadow-2xs">
                          -€ {Math.abs(postTotalYr).toLocaleString('nl-NL')} (Winst)
                        </span>
                      ) : (
                        `€ ${postTotalYr.toLocaleString('nl-NL')}`
                      )}
                    </td>
                  </tr>

                  {/* Savings row */}
                  <tr className="bg-sky-50/50 font-black text-sky-950">
                    <td className="p-2.5 font-sans font-extrabold text-sky-950">
                      Verschil / Netto Jaarlijkse Besparing
                    </td>
                    <td className="p-2.5 text-right text-emerald-700">
                      -{(currentGasM3 - postGasM3).toLocaleString('nl-NL')} m³
                    </td>
                    <td className="p-2.5 text-right text-emerald-700">
                      -€ {(currentGasYr - postGasYr).toLocaleString('nl-NL')}
                    </td>
                    <td className="p-2.5 text-right text-sky-900">
                      {postHouseKwh > houseKwh ? `+${(postHouseKwh - houseKwh).toLocaleString('nl-NL')} kWh` : `-${(houseKwh - postHouseKwh).toLocaleString('nl-NL')} kWh`}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700">
                      -€ {(currentElektraYr - postElektraYr).toLocaleString('nl-NL')}
                    </td>
                    <td className="p-2.5 text-right bg-sky-100 text-sky-950 font-black">
                      € {netSavingsMth.toLocaleString('nl-NL')}/mnd
                    </td>
                    <td className="p-2.5 text-right bg-sky-100 text-sky-950 font-black">
                      € {netSavingsYr.toLocaleString('nl-NL')}/jaar
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Specific Investment Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Calculator className="w-4 h-4 text-emerald-600" />
              2. Doorberekende Maatregelen &amp; Investeringsposten
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="p-2.5">Maatregel / Systeem</th>
                    <th className="p-2.5">Specificatie &amp; Capaciteit</th>
                    <th className="p-2.5 text-right">Energiebesparing / Opbrengst</th>
                    <th className="p-2.5 text-right">Netto Investering</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Insulation */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-amber-600 shrink-0" /> Isolatiemaatregelen
                    </td>
                    <td className="p-2.5 text-slate-600">
                      Totale oppervlakte: <span className="font-semibold text-slate-800">{totalInsulationM2} m²</span> ({liveCalcResult.measures.filter(m => (m.savingM3 && m.savingM3 > 0) || (m.netCosts && m.netCosts > 0)).map(m => m.name).join(', ') || 'Geen isolatie gekozen'})
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {totalGasSavingsM3 > 0 ? `-${totalGasSavingsM3} m³ gas/jaar` : '0 m³'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      € {Math.round(insulationInv).toLocaleString('nl-NL')}
                    </td>
                  </tr>

                  {/* Solar */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500 shrink-0" /> Zonnepanelen
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {aantalZonnepanelen > 0 ? `${aantalZonnepanelen} panelen geïnstalleerd` : 'Geen zonnepanelen'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {solarKwh > 0 ? `+${Math.round(solarKwh).toLocaleString('nl-NL')} kWh stroom/jaar` : '0 kWh'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      € {Math.round(solarInv).toLocaleString('nl-NL')}
                    </td>
                  </tr>

                  {/* Battery */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      <BatteryCharging className="w-4 h-4 text-sky-600 shrink-0" /> Thuisbatterij
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {batteryCap > 0 ? `${batteryCap} kWh capaciteit (${selfConsPct.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}% eigenverbruik)` : 'Geen thuisbatterij'}
                      {batteryTradingYield > 0 && (
                        <span className="block text-[10px] text-sky-700 font-semibold mt-0.5">
                          Dynamische handelsopbrengst: € {Math.round(batteryTradingYield).toLocaleString('nl-NL')}/jaar
                          <span className="block text-[9px] text-slate-500 font-normal">
                            (Formule: {batteryCap} kWh × € {Math.round(batteryCap > 0 ? batteryTradingYield / batteryCap : 38.25).toLocaleString('nl-NL')}/kWh/jaar via {liveCalcResult.tech?.dynamicProvider || 'Zonneplan'})
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {batteryCap > 0 ? `Hoger eigenverbruik (+${(selfConsPct - 35).toLocaleString('nl-NL', { maximumFractionDigits: 2 })}%)` : '35% basis verbruik'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      € {Math.round(batteryInv).toLocaleString('nl-NL')}
                    </td>
                  </tr>

                  {/* Heatpump */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-emerald-600 shrink-0" /> Warmtepomp
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {isVolledigWp ? `Volledige warmtepomp (All-Electric · ${wpCapacityStr})` : isHybrideWp ? `Hybride warmtepomp (${wpCapacityStr})` : 'Geen warmtepomp (CV-ketel behouden)'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                      {isVolledigWp ? (
                        <span className="text-emerald-700">100% Gasvrij (+{postAddElektraKwh} kWh stroom)</span>
                      ) : isHybrideWp ? (
                        <span className="text-emerald-700">~60-75% Gasreductie (+{postAddElektraKwh} kWh stroom)</span>
                      ) : (
                        'Geen verandering'
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      € {Math.round(wpInv).toLocaleString('nl-NL')}
                    </td>
                  </tr>

                  {/* Total row */}
                  <tr className="bg-slate-100/90 font-black">
                    <td colSpan={3} className="p-2.5 text-slate-900 font-extrabold uppercase text-[11px]">
                      Totale Netto Investeringssom
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-900 text-sm">
                      € {Math.round(totalInvestmentInv).toLocaleString('nl-NL')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Deep Dive Calculation Explanation */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              3. Uitgebreide Berekeningsverantwoording &amp; Formule Opbouw
            </h3>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3 text-[11px] leading-relaxed text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Gas calculation breakdown */}
                <div className="bg-white p-3 rounded-lg border border-amber-200/80 space-y-1.5">
                  <span className="font-bold text-amber-950 flex items-center gap-1 text-xs">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    Aardgasreductie Berekening
                  </span>
                  <ul className="space-y-1 text-[10.5px]">
                    <li>• <strong>Oorspronkelijke Nulmeting:</strong> <span className="font-mono font-bold">{currentGasM3} m³</span> gas/jaar.</li>
                    <li>• <strong>Minus Isolatiebesparing:</strong> <span className="font-mono font-bold text-emerald-700">-{totalGasSavingsM3} m³</span> gas/jaar.</li>
                    <li>
                      • <strong>Warmtepomp effect:</strong>{' '}
                      {isVolledigWp ? (
                        <span className="font-bold text-emerald-800">100% vervanging van het resterende gas ({currentGasM3 - totalGasSavingsM3} m³ saved).</span>
                      ) : isHybrideWp ? (
                        <span className="font-bold text-emerald-800">Hybride ketel dekt ~75% van de warmtevraag via stroom.</span>
                      ) : (
                        <span>Geen warmtepomp ingesteld.</span>
                      )}
                    </li>
                    <li className="pt-1 border-t border-slate-150 font-bold text-slate-900 flex justify-between">
                      <span>Restgasverbruik na verduurzaming:</span>
                      <span className="font-mono text-emerald-800">{postGasM3 === 0 ? '0 m³ (Gasloos)' : `${postGasM3} m³`}</span>
                    </li>
                  </ul>
                </div>

                {/* Electricity calculation breakdown */}
                <div className="bg-white p-3 rounded-lg border border-sky-200/80 space-y-1.5">
                  <span className="font-bold text-sky-950 flex items-center gap-1 text-xs">
                    <Zap className="w-3.5 h-3.5 text-sky-600" />
                    Elektriciteitsbalans &amp; Zonnestroom
                  </span>
                  <ul className="space-y-1 text-[10.5px]">
                    <li>• <strong>Basis Huishoudelijk Verbruik:</strong> <span className="font-mono font-bold">{houseKwh} kWh</span>/jaar.</li>
                    <li>• <strong>Plus Warmtepomp Stroomvraag:</strong> <span className="font-mono font-bold text-sky-800">+{postAddElektraKwh} kWh</span>/jaar.</li>
                    <li>• <strong>Totale Stroomvraag:</strong> <span className="font-mono font-bold text-slate-900">{postHouseKwh} kWh</span>/jaar.</li>
                    <li>
                      • <strong>Zonnepanelen &amp; Accu:</strong> {aantalZonnepanelen} panelen ({Math.round(solarKwh)} kWh opbrengst) met {selfConsPct.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}% direct eigenverbruik via {batteryCap > 0 ? `${batteryCap} kWh thuisbatterij` : 'geen thuisaccu'}.
                    </li>
                    <li className="pt-1 border-t border-slate-150 font-bold text-slate-900 flex justify-between">
                      <span>Nettokosten Elektriciteit per jaar:</span>
                      <span className="font-mono text-sky-900">
                        {postElektraYr < 0 ? `-€ ${Math.abs(postElektraYr)} (Winst)` : `€ ${postElektraYr}`}
                      </span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Dynamic Battery Trading Explanation Block */}
              {batteryTradingYield > 0 && (
                <div className="bg-sky-50/90 border border-sky-200 p-3 rounded-lg space-y-1.5 text-[10.5px]">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                    <BatteryCharging className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Berekening Dynamische Handelsopbrengst (€ {Math.round(batteryTradingYield).toLocaleString('nl-NL')} / jaar)
                  </span>
                  <p className="text-slate-700 leading-snug">
                    <strong>Hoe wordt dit berekend?</strong> Bij een dynamisch energiecontract met nethandel (Smart EMS) slaat de accu goedkope (of negatieve) wind- en zonnestroom op en ontlaadt/levert terug op dure piekuren op de EPEX- &amp; onbalansmarkt.
                  </p>
                  <div className="bg-white p-2 rounded border border-sky-200 font-mono text-[11px] text-sky-950 font-bold flex flex-wrap justify-between items-center gap-2">
                    <span>Formule: Accucapaciteit ({batteryCap} kWh) × Spottarief per kWh/jaar (€ {Math.round(batteryCap > 0 ? batteryTradingYield / batteryCap : 38.25).toLocaleString('nl-NL')})</span>
                    <span className="text-emerald-700 font-black text-xs">= € {Math.round(batteryTradingYield).toLocaleString('nl-NL')} / jaar</span>
                  </div>
                  <p className="text-slate-600 text-[9.5px]">
                    * Provider: <strong>{liveCalcResult.tech?.dynamicProvider || 'Zonneplan'}</strong> (Powerplay sturing op onbalansmarkt: € 85,00/kWh bruto × 45% nettorendementsfactor = <strong>€ 38,25 per kWh accucapaciteit per jaar</strong>. Rekenvoorbeeld voor jouw {batteryCap} kWh accu: {batteryCap} × € 38,25 = <strong>€ {Math.round(batteryTradingYield).toLocaleString('nl-NL')} per jaar</strong>).
                  </p>
                </div>
              )}

              {/* Financial & Environmental Return summary */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-3 rounded-lg border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 block">Duurzaamheids- &amp; CO2 Reductie Impact</span>
                    <p className="text-slate-600">
                      Door deze verduurzaming verminder je de jaarlijkse uitstoot van jouw woning met ca.{' '}
                      <strong className="text-emerald-900">{co2TotalSavings.toLocaleString('nl-NL')} kg CO2/jaar</strong>!
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-white/90 px-3 py-1.5 rounded border border-emerald-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Investeringsrendement</span>
                  <span className="text-xs font-black text-emerald-900">
                    {paybackYears ? `${paybackYears} jaar TVT (~${(100 / parseFloat(paybackYears)).toFixed(1)}%/jr)` : 'Direct positieve kasstroom'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer - Officiële disclaimers */}
          <div className="pt-3 border-t border-slate-200 text-[9.5px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              * Dit berekeningsrapport is samengesteld op basis van de ingevoerde woningkenmerken en standaard energietarieven voor de gemeente Peel en Maas.
            </p>
            <p className="font-mono text-slate-400 shrink-0">
              Verduurzamingsadvies Peel en Maas • Document ID: PM-ENERGIE-{Math.floor(100000 + Math.random() * 900000)}
            </p>
          </div>

        </div>

        {/* Footer - Screen Only */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0 text-xs">
          <span className="text-slate-500 font-medium">
            💡 Tip: Gebruik "Opslaan als PDF" in het afdrukscherm van je browser om het bestand digitaal te bewaren.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              Sluiten
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Afdrukken / Opslaan als PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
