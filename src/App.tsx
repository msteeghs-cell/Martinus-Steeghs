import React, { useState, useEffect } from 'react';
import { calculateAll } from './utils/calculator';
import { ResidentData, HouseData, InsulationData, TechData } from './types';
import InputForm from './components/InputForm';
import AdviceReport from './components/AdviceReport';
import { 
  Leaf, Info, HelpCircle, FileSpreadsheet, Sparkles, 
  Phone, Mail, MapPin, Download, Trash2, MailIcon, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';

const defaultResident: ResidentData = {
  naam: 'Jan Janssen',
  registratiecode: 'PM-70TJ-88',
  brutoGezinsinkomen: 45000,
  coach: 'Online Zelfscan',
  datum: '2026-04-24',
  aanhef: 'De heer',
  voorletters: 'J.',
  achternaam: 'Janssen',
  straat: 'Kerkstraat',
  huisnummer: '45',
  toevoeging: '',
  postcode: '5981AD',
  plaats: 'Panningen',
  aantalPersonen: 2,
  telefoon: '0612345678',
  email: 'jan@janssen.nl',
  akkoord: true
};

const defaultHouse: HouseData = {
  wozWaarde: 325000,
  energielabel: 'E',
  verbruikKwh: 3200,
  verbruikM3: 1600,
  soortWoning: 'Twee onder een kap',
  bouwjaar: 1974,
  woonoppervlakte: 120,
  verwarming: 'CV-ketel',
  afgiftesysteem: 'Radiatoren',
  tapwater: 'CV-ketel',
  koken: 'Gas',
  ventilatie: 'Natuurlijk (Type A)',
  zonnepanelenPresent: 'Nee',
  elektraPrijs: 0.30,
  elektraTeruglevering: 0,
  gasPrijs: 1.30,
  stookgedragOverride: 'auto',
  stookgedragBerekend: 'Normaal (1.0x)',
  stookgedragFactor: 1.0,
  isoDak: 'slecht',
  isoGevel: 'slecht',
  isoGlasBg: 'slecht',
  isoGlasVd: 'slecht',
  isoVloer: 'slecht',
  isoKieren: 'Nee, onderhoud nodig',
  inkomenCheck: true
};

const defaultInsulation: InsulationData = {
  vloer: 0,
  bodem: 0,
  spouw: 60,
  zolderVliering: 40,
  dakBinnenzijde: 0,
  gevelBuitenzijde: 0,
  glasEnkelHR: 12,
  glasDubbelHR: 0,
  glasTripleHout: 0,
};

const defaultTech: TechData = {
  aantalZonnepanelen: 4,
  dakOrientatie: 45,
  dakHellingshoek: 35,
  huidigDirectVerbruik: 30,
  capaciteitAccu: 0,
  omzettingsverliezen: 10,
  typeContract: 'Vast',
  evKilometers: 15000,
  evVerbruik: 18,
  evThuisLaden: 70,
  laadvermogen: 11,
  opslagLeverancier: 0.02,
};

export default function App() {
  // Synchronized active tab across inputs & results
  const [activeTab, setActiveTab] = useState<'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal'>('isolatie');

  // Load from localStorage or defaults
  const [resident, setResident] = useState<ResidentData>(() => {
    const cached = localStorage.getItem('pem_resident');
    try {
      return cached ? { ...defaultResident, ...JSON.parse(cached) } : defaultResident;
    } catch (e) {
      return defaultResident;
    }
  });

  const [house, setHouse] = useState<HouseData>(() => {
    const cached = localStorage.getItem('pem_house');
    try {
      return cached ? { ...defaultHouse, ...JSON.parse(cached) } : defaultHouse;
    } catch (e) {
      return defaultHouse;
    }
  });

  const [insulation, setInsulation] = useState<InsulationData>(() => {
    const cached = localStorage.getItem('pem_insulation');
    try {
      return cached ? { ...defaultInsulation, ...JSON.parse(cached) } : defaultInsulation;
    } catch (e) {
      return defaultInsulation;
    }
  });

  const [tech, setTech] = useState<TechData>(() => {
    const cached = localStorage.getItem('pem_tech');
    try {
      return cached ? { ...defaultTech, ...JSON.parse(cached) } : defaultTech;
    } catch (e) {
      return defaultTech;
    }
  });

  // Opmerkingen & notities state
  const [opmerkingenOffertes, setOpmerkingenOffertes] = useState(() => {
    return localStorage.getItem('pem_opmerkingen_offertes') || '';
  });
  const [opmerkingenAlgemeen, setOpmerkingenAlgemeen] = useState(() => {
    return localStorage.getItem('pem_opmerkingen') || '';
  });

  // Calculation results
  const [calculation, setCalculation] = useState(() => {
    const res = calculateAll(resident, house, insulation, tech);
    res.opmerkingenOffertes = opmerkingenOffertes;
    res.opmerkingen = opmerkingenAlgemeen;
    return res;
  });

  // Dynamic calculations whenever input changes
  useEffect(() => {
    const result = calculateAll(resident, house, insulation, tech);
    result.opmerkingenOffertes = opmerkingenOffertes;
    result.opmerkingen = opmerkingenAlgemeen;
    setCalculation(result);

    // Save to cache
    localStorage.setItem('pem_resident', JSON.stringify(resident));
    localStorage.setItem('pem_house', JSON.stringify(house));
    localStorage.setItem('pem_insulation', JSON.stringify(insulation));
    localStorage.setItem('pem_tech', JSON.stringify(tech));
    localStorage.setItem('pem_opmerkingen_offertes', opmerkingenOffertes);
    localStorage.setItem('pem_opmerkingen', opmerkingenAlgemeen);
  }, [resident, house, insulation, tech, opmerkingenOffertes, opmerkingenAlgemeen]);

  // AI Advice state
  const [adviceMarkdown, setAdviceMarkdown] = useState<string | null>(() => {
    return localStorage.getItem('pem_advice_markdown') || null;
  });
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    // Basic validation check
    let ontbrekend: string[] = [];
    if (!resident.postcode) ontbrekend.push("Postcode");
    if (!resident.huisnummer) ontbrekend.push("Huisnummer");
    if (!resident.achternaam) ontbrekend.push("Achternaam");
    if (!resident.telefoon) ontbrekend.push("Telefoonnummer");
    if (!house.soortWoning) ontbrekend.push("Soort woning");
    if (!house.wozWaarde) ontbrekend.push("WOZ-waarde");

    if (ontbrekend.length > 0) {
      alert("⚠️ Let op, het formulier is nog niet compleet of bevat fouten.\n\nControleer de volgende velden:\n\n- " + ontbrekend.join("\n- "));
      return;
    }

    // Checking cache for identical calculation parameters
    const currentCalculationStr = JSON.stringify(calculation);
    const cachedInputsStr = localStorage.getItem('pem_advice_inputs');
    const cachedAdviceStr = localStorage.getItem('pem_advice_markdown');

    if (cachedInputsStr === currentCalculationStr && cachedAdviceStr) {
      console.log("[Cache] Reusing identical cached advice report instantly.");
      setAdviceMarkdown(cachedAdviceStr);
      setActiveTab('laadpaal');
      return;
    }

    setLoadingAdvice(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculation }),
      });

      if (!response.ok) {
        throw new Error('Fout bij het aanroepen van de advies-API.');
      }

      const data = await response.json();
      setAdviceMarkdown(data.advice);
      localStorage.setItem('pem_advice_markdown', data.advice);
      localStorage.setItem('pem_advice_inputs', currentCalculationStr);
      // Automatically navigate to the results/advice tab (laadpaal displays the text advice)
      setActiveTab('laadpaal');
    } catch (err: any) {
      console.error(err);
      setError('Er is een fout opgetreden bij het genereren van het adviesrapport. Probeer het opnieuw.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Clear data function
  const wisFormulier = () => {
    if (confirm("Weet je zeker dat je alle gegevens wilt wissen om met een nieuwe bewoner te starten?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // JSON download
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(calculation, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventarisatie_${resident.registratiecode || 'PM-CONCEPT'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Excel download
  const downloadExcel = () => {
    const excelData: any[] = [];
    
    // Add resident details
    excelData.push({ Onderdeel: "Registratiecode", Ingevulde_Waarde: resident.registratiecode });
    excelData.push({ Onderdeel: "Datum", Ingevulde_Waarde: resident.datum });
    excelData.push({ Onderdeel: "Berekeningswijze", Ingevulde_Waarde: resident.coach });
    excelData.push({ Onderdeel: "Naam bewoner", Ingevulde_Waarde: resident.naam });
    excelData.push({ Onderdeel: "Adres", Ingevulde_Waarde: `${resident.straat} ${resident.huisnummer} ${resident.toevoeging || ''}, ${resident.postcode} ${resident.plaats}` });
    excelData.push({ Onderdeel: "Telefoon", Ingevulde_Waarde: resident.telefoon });
    excelData.push({ Onderdeel: "E-mail", Ingevulde_Waarde: resident.email });
    excelData.push({ Onderdeel: "Aantal bewoners", Ingevulde_Waarde: resident.aantalPersonen });
    
    // House details
    excelData.push({ Onderdeel: "Woningtype", Ingevulde_Waarde: house.soortWoning });
    excelData.push({ Onderdeel: "Bouwjaar", Ingevulde_Waarde: house.bouwjaar });
    excelData.push({ Onderdeel: "Woonoppervlakte (m²)", Ingevulde_Waarde: house.woonoppervlakte });
    excelData.push({ Onderdeel: "WOZ-waarde", Ingevulde_Waarde: house.wozWaarde });
    excelData.push({ Onderdeel: "Energielabel", Ingevulde_Waarde: house.energielabel });
    
    // Technical installs
    excelData.push({ Onderdeel: "Verwarming", Ingevulde_Waarde: house.verwarming });
    excelData.push({ Onderdeel: "Afgiftesysteem", Ingevulde_Waarde: house.afgiftesysteem });
    excelData.push({ Onderdeel: "Tapwater", Ingevulde_Waarde: house.tapwater });
    excelData.push({ Onderdeel: "Koken", Ingevulde_Waarde: house.koken });
    excelData.push({ Onderdeel: "Ventilatie", Ingevulde_Waarde: house.ventilatie });
    
    // Gas/Elektra
    excelData.push({ Onderdeel: "Elektra verbruik (kWh)", Ingevulde_Waarde: house.verbruikKwh });
    excelData.push({ Onderdeel: "Elektra teruglevering (kWh)", Ingevulde_Waarde: house.elektraTeruglevering });
    excelData.push({ Onderdeel: "Gas verbruik (m³)", Ingevulde_Waarde: house.verbruikM3 });
    excelData.push({ Onderdeel: "Berekend Stookgedrag", Ingevulde_Waarde: house.stookgedragBerekend });
    excelData.push({ Onderdeel: "Stookgedrag Factor", Ingevulde_Waarde: house.stookgedragFactor });

    // Financial totals
    excelData.push({ Onderdeel: "Totaal Bruto Kosten", Ingevulde_Waarde: calculation.totals.bruto });
    excelData.push({ Onderdeel: "Totaal ISDE Subsidie", Ingevulde_Waarde: calculation.totals.isde });
    excelData.push({ Onderdeel: "Totaal NIP Subsidie", Ingevulde_Waarde: calculation.totals.nip });
    excelData.push({ Onderdeel: "Totaal Netto Kosten", Ingevulde_Waarde: calculation.totals.net });
    excelData.push({ Onderdeel: "Jaarlijkse besparing (€)", Ingevulde_Waarde: calculation.totals.savingsEuro });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventarisatie");
    ws['!cols'] = [{ wch: 35 }, { wch: 50 }];
    XLSX.writeFile(wb, `Inventarisatie_${resident.registratiecode || 'PM-CONCEPT'}.xlsx`);
  };

  // Send via email to NIP loket
  const stuurEmail = () => {
    const emailAdres = "nip@energieloketpeelenmaas.nl"; 
    const onderwerp = `Nieuwe Inventarisatie: ${resident.registratiecode || 'Onbekend'} - ${resident.straat} ${resident.huisnummer}`;
    
    let body = `Beste NIP-team,\n\n`;
    body += `Hierbij de gegevens van de nieuwe inventarisatie:\n\n`;
    body += `Klant: ${resident.aanhef} ${resident.achternaam}\n`;
    body += `Adres: ${resident.straat} ${resident.huisnummer}, ${resident.plaats}\n`;
    body += `Registratiecode: ${resident.registratiecode || 'Nog niet gegenereerd'}\n`;
    body += `Datum: ${resident.datum}\n`;
    body += `Berekeningswijze: ${resident.coach}\n\n`;
    body += `Gerealiseerde Gasbesparing: ${Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0))} m³/jaar\n`;
    body += `Netto Eigen Bijdrage: €${Math.round(calculation.totals.net)}\n\n`;
    body += `LET OP: Vergeet niet om het gedownloade Excel- of JSON-bestand nog even als bijlage naar dit e-mailvenster te slepen!\n\n`;
    body += `Met vriendelijke groet,\n${resident.naam}`;

    const mailtoLink = `mailto:${emailAdres}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-container">
      {/* Top Banner & Header */}
      <header className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-6 px-4 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 backdrop-blur rounded-2xl border border-emerald-500/30 text-emerald-300">
              <Leaf className="w-8 h-8 fill-emerald-400/20" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Energieplanner Peel en Maas</h1>
              <p className="text-xs text-emerald-200/90 font-medium">
                Onafhankelijk, lokaal en betrouwbaar berekenen en besparen (NTA 8800)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-emerald-100 bg-emerald-950/40 px-4 py-2.5 rounded-2xl border border-emerald-800/30">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> EAC Panningen</span>
            <span className="h-4 w-px bg-emerald-800"></span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-400" /> Gemeente: 14 077</span>
          </div>
        </div>
      </header>

      {/* Intro info box */}
      <div className="bg-emerald-500 text-emerald-950 px-4 py-2.5 text-center text-xs font-semibold tracking-wide border-b border-emerald-600/20">
        Actieve Kernen: Panningen, Helden, Maasbree, Meijel, Baarlo, Kessel, Grashoek, Koningslust, Beringe en Egchel.
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">1</span>
              Invoer Gegevens
            </h2>
            <span className="text-xs font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
              2e Pilot Inventarisatie
            </span>
          </div>

          <InputForm
            resident={resident}
            setResident={setResident}
            house={house}
            setHouse={setHouse}
            insulation={insulation}
            setInsulation={setInsulation}
            tech={tech}
            setTech={setTech}
            onGenerate={generateReport}
            loading={loadingAdvice}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Right Column: Live Table & Dynamic Advice */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'isolatie' && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">2</span>
                Resultaten &amp; Persoonlijk Advies
              </h2>
              {calculation.addedMeasureForOptimization && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-pulse">
                  Subsidie-optimalisatie actief!
                </span>
              )}
            </div>
          )}

          {/* Quick Realtime Math Spreadsheet (Direct feedback on changes) */}
          {activeTab === 'isolatie' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  Live Rekenoverzicht (Basis vs Optimalisatie)
                </h3>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Gasprijs €{(house.gasPrijs ?? 1.30).toFixed(2)}/m³</span>
              </div>

              {calculation.measures.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="py-2.5 font-semibold">Maatregel</th>
                        <th className="py-2.5 font-semibold text-center">m²</th>
                        <th className="py-2.5 font-semibold text-right">Bruto</th>
                        <th className="py-2.5 font-semibold text-right">ISDE</th>
                        <th className="py-2.5 font-semibold text-right">NIP</th>
                        <th className="py-2.5 font-semibold text-right">Netto</th>
                        <th className="py-2.5 font-semibold text-right">TVT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.measures.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-slate-600">
                          <td className="py-2.5 font-medium text-slate-800">{m.name}</td>
                          <td className="py-2.5 text-center">{m.area}</td>
                          <td className="py-2.5 text-right">€{m.brutoCosts}</td>
                          <td className="py-2.5 text-right text-emerald-600">
                            {m.isdeSubsidy > 0 ? `€${Math.round(m.isdeSubsidy)}` : '€0'}
                          </td>
                          <td className="py-2.5 text-right text-blue-600">
                            {m.nipSubsidy > 0 ? `€${Math.round(m.nipSubsidy)}` : '€0'}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-800">€{Math.round(m.netCosts)}</td>
                          <td className="py-2.5 text-right font-mono">{m.tvt > 0 ? `${(m.tvt ?? 0).toFixed(1)}j` : '0j'}</td>
                        </tr>
                      ))}
                      {/* Totale sommen */}
                      <tr className="bg-slate-50/50 font-bold border-t border-slate-200">
                        <td className="py-3 text-slate-800 pl-2">Totaal (Basis)</td>
                        <td className="py-3 text-center">-</td>
                        <td className="py-3 text-right">€{calculation.totals.bruto}</td>
                        <td className="py-3 text-right text-emerald-600">€{Math.round(calculation.totals.isde)}</td>
                        <td className="py-3 text-right text-blue-600">€{Math.round(calculation.totals.nip)}</td>
                        <td className="py-3 text-right text-slate-900">€{Math.round(calculation.totals.net)}</td>
                        <td className="py-3 text-right font-mono pr-2">{(calculation.totals.tvt ?? 0).toFixed(1)}j</td>
                      </tr>
                      {/* Toon geoptimaliseerd resultaat indien aanwezig */}
                      {calculation.addedMeasureForOptimization && (
                        <tr className="bg-emerald-50 font-bold text-emerald-950">
                          <td className="py-3 text-emerald-900 pl-2 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-600 shrink-0" />
                            <span>Totaal (Geoptimaliseerd)</span>
                          </td>
                          <td className="py-3 text-center">-</td>
                          <td className="py-3 text-right">€{calculation.totalsOptimal.bruto}</td>
                          <td className="py-3 text-right">€{Math.round(calculation.totalsOptimal.isde)}</td>
                          <td className="py-3 text-right">€{Math.round(calculation.totalsOptimal.nip)}</td>
                          <td className="py-3 text-right">€{Math.round(calculation.totalsOptimal.net)}</td>
                          <td className="py-3 text-right font-mono pr-2">{(calculation.totalsOptimal.tvt ?? 0).toFixed(1)}j</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Voer isolatiemaatregelen in het linkerpaneel in om live berekeningen te starten.
                </div>
              )}

              {/* Toelichtende nootje */}
              <div className="bg-slate-50 rounded-xl p-3 flex gap-2 items-start text-[10px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p>
                  Bovenstaande is een directe, real-time rekenberekening gebaseerd op de Panningen EAC leidende kengetallen. 
                  De NIP subsidie (€2.900) wordt toegekend bij minimaal twee isolatiemaatregelen mits wordt voldaan aan de WOZ- en inkomenseisen.
                </p>
              </div>
            </div>
          )}

          {/* Opmerkingen Textareas */}
          {activeTab === 'isolatie' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                Opmerkingen &amp; Bijzonderheden
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Opmerkingen voor offertes (isolatiebedrijven)</label>
                  <textarea
                    value={opmerkingenOffertes}
                    onChange={(e) => setOpmerkingenOffertes(e.target.value)}
                    placeholder="Bijv. Kruipruimte is circa 60cm hoog, goed toegankelijk via luik bij de voordeur..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-500 h-16 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Bijzonderheden / leidraad verwerkers</label>
                  <textarea
                    value={opmerkingenAlgemeen}
                    onChange={(e) => setOpmerkingenAlgemeen(e.target.value)}
                    placeholder="Bijv. Bewoner wil graag eerst vloerisolatie aanpakken, daarna spouw..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-500 h-16 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* EAC Actieknoppen Opslaan en Verzenden */}
          {activeTab === 'isolatie' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex justify-between items-center gap-3">
              <button
                onClick={wisFormulier}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Nieuw formulier (Wis)</span>
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={downloadExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Opslaan (Excel)</span>
                </button>
                <button
                  onClick={downloadJSON}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Opslaan (JSON)</span>
                </button>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* AI generated report */}
          <AdviceReport
            calculation={calculation}
            adviceMarkdown={adviceMarkdown}
            loading={loadingAdvice}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-xs mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-3">
          <p>© 2026 Energie Advies Centrum Peel en Maas. Alle rechten voorbehouden.</p>
          <p className="max-w-2xl mx-auto text-slate-500 leading-relaxed font-normal">
            De opgestelde adviezen en subsidies zijn indicatief en gebaseerd op de NTA 8800 / ISSO-praktijkrichtlijnen, de gemeentelijke regelingen voor Peel en Maas en de landelijke ISDE-subsidieregels 2026. Er kunnen geen rechten worden ontleend aan de prognoses.
          </p>
        </div>
      </footer>
    </div>
  );
}
