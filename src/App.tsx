import React, { useState, useEffect } from 'react';
import { calculateAll } from './utils/calculator';
import { ResidentData, HouseData, InsulationData, TechData } from './types';
import InputForm from './components/InputForm';
import AdviceReport from './components/AdviceReport';
import HeatpumpSolarChart from './components/HeatpumpSolarChart';
import LaadpaalSolarChart from './components/LaadpaalSolarChart';
import SolarSelfConsumptionChart from './components/SolarSelfConsumptionChart';
import { safeStorage } from './utils/storage';
import { 
  Leaf, Info, HelpCircle, FileSpreadsheet, Sparkles, RefreshCw,
  Phone, Mail, MapPin, Download, Trash2, MailIcon, Printer,
  Share2, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

const defaultResident: ResidentData = {
  naam: 'Jan Janssen',
  registratiecode: 'PM-70TJ-88',
  brutoGezinsinkomen: 45000,
  coach: 'Online Zelfscan',
  datum: new Date().toISOString().split('T')[0],
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
  vermogenPerPaneel: 400,
  dakOrientatie: 45,
  dakHellingshoek: 35,
  huidigDirectVerbruik: 30,
  capaciteitAccu: 0,
  omzettingsverliezen: 10,
  typeContract: 'Vast',
  dynamicProvider: 'Zonneplan',
  evKilometers: 15000,
  evVerbruik: 18,
  evThuisLaden: 75,
  laadvermogen: 11,
  opslagLeverancier: 0.02,
  selectedWarmtepompModel: 'Standard',
  selectedWarmtepompType: 'Hybride',
  customAccuPrijs: undefined,
  customZonnepanelenPrijs: undefined,
  customWarmtepompPrijs: undefined,
  customLaadpaalPrijs: undefined,
};

export default function App() {
  // Synchronized active tab across inputs & results
  const [activeTab, setActiveTab] = useState<'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal'>('isolatie');
  const [linkCopied, setLinkCopied] = useState(false);

  const deelLink = () => {
    // Copy current page URL to clipboard
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  // Load from localStorage or defaults
  const [resident, setResident] = useState<ResidentData>(() => {
    const cached = safeStorage.getItem('pem_resident');
    try {
      return cached ? { ...defaultResident, ...JSON.parse(cached) } : defaultResident;
    } catch (e) {
      return defaultResident;
    }
  });

  const [house, setHouse] = useState<HouseData>(() => {
    const cached = safeStorage.getItem('pem_house');
    try {
      return cached ? { ...defaultHouse, ...JSON.parse(cached) } : defaultHouse;
    } catch (e) {
      return defaultHouse;
    }
  });

  const [insulation, setInsulation] = useState<InsulationData>(() => {
    const cached = safeStorage.getItem('pem_insulation');
    try {
      return cached ? { ...defaultInsulation, ...JSON.parse(cached) } : defaultInsulation;
    } catch (e) {
      return defaultInsulation;
    }
  });

  const [tech, setTech] = useState<TechData>(() => {
    const cached = safeStorage.getItem('pem_tech');
    try {
      return cached ? { ...defaultTech, ...JSON.parse(cached) } : defaultTech;
    } catch (e) {
      return defaultTech;
    }
  });

  // Opmerkingen & notities state
  const [opmerkingenOffertes, setOpmerkingenOffertes] = useState(() => {
    return safeStorage.getItem('pem_opmerkingen_offertes') || '';
  });
  const [opmerkingenAlgemeen, setOpmerkingenAlgemeen] = useState(() => {
    return safeStorage.getItem('pem_opmerkingen') || '';
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
    safeStorage.setItem('pem_resident', JSON.stringify(resident));
    safeStorage.setItem('pem_house', JSON.stringify(house));
    safeStorage.setItem('pem_insulation', JSON.stringify(insulation));
    safeStorage.setItem('pem_tech', JSON.stringify(tech));
    safeStorage.setItem('pem_opmerkingen_offertes', opmerkingenOffertes);
    safeStorage.setItem('pem_opmerkingen', opmerkingenAlgemeen);
  }, [resident, house, insulation, tech, opmerkingenOffertes, opmerkingenAlgemeen]);

  // AI Advice state
  const [adviceMarkdown, setAdviceMarkdown] = useState<string | null>(() => {
    return safeStorage.getItem('pem_advice_markdown') || null;
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
    const cachedInputsStr = safeStorage.getItem('pem_advice_inputs');
    const cachedAdviceStr = safeStorage.getItem('pem_advice_markdown');

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
      safeStorage.setItem('pem_advice_markdown', data.advice);
      safeStorage.setItem('pem_advice_inputs', currentCalculationStr);
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
      safeStorage.clear();
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
    // 1. General & House Data
    const generalData = [
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Registratiecode", Waarde: resident.registratiecode },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Datum", Waarde: resident.datum },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Energiecoach", Waarde: resident.coach },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Naam bewoner", Waarde: `${resident.aanhef || ''} ${resident.naam || ''} ${resident.achternaam || ''}`.trim() },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Adres", Waarde: `${resident.straat || ''} ${resident.huisnummer || ''} ${resident.toevoeging || ''}, ${resident.postcode || ''} ${resident.plaats || ''}`.trim() },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Telefoonnummer", Waarde: resident.telefoon },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "E-mailadres", Waarde: resident.email },
      { Categorie: "KLANTGEGEVENS", Onderdeel: "Aantal bewoners", Waarde: resident.aantalPersonen },
      
      { Categorie: "WONINGKENMERKEN", Onderdeel: "Woningtype", Waarde: house.soortWoning },
      { Categorie: "WONINGKENMERKEN", Onderdeel: "Bouwjaar", Waarde: house.bouwjaar },
      { Categorie: "WONINGKENMERKEN", Onderdeel: "Woonoppervlakte (m²)", Waarde: house.woonoppervlakte },
      { Categorie: "WONINGKENMERKEN", Onderdeel: "WOZ-waarde", Waarde: house.wozWaarde },
      { Categorie: "WONINGKENMERKEN", Onderdeel: "Energielabel", Waarde: house.energielabel },
      
      { Categorie: "INSTALLATIES", Onderdeel: "Hoofdverwarming", Waarde: house.verwarming },
      { Categorie: "INSTALLATIES", Onderdeel: "Afgiftesysteem", Waarde: house.afgiftesysteem },
      { Categorie: "INSTALLATIES", Onderdeel: "Warm tapwater", Waarde: house.tapwater },
      { Categorie: "INSTALLATIES", Onderdeel: "Kooktoestel", Waarde: house.koken },
      { Categorie: "INSTALLATIES", Onderdeel: "Ventilatiesysteem", Waarde: house.ventilatie },
      
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Elektriciteitsverbruik (kWh)", Waarde: house.verbruikKwh },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Teruglevering (kWh)", Waarde: house.elektraTeruglevering },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Gasverbruik (m³)", Waarde: house.verbruikM3 },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Berekend stookgedrag", Waarde: calculation.house.stookgedragBerekend },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Stookgedrag factor", Waarde: calculation.house.stookgedragFactor },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Gasprijs (€/m³)", Waarde: house.gasPrijs },
      { Categorie: "ENERGIEVERBRUIK", Onderdeel: "Elektraprijs (€/kWh)", Waarde: house.elektraPrijs },
    ];

    // 2. Insulation Measures Data
    const insulationData: any[] = [];
    insulationData.push({
      Maatregel: "Maatregel Naam",
      Oppervlakte: "Ingevulde Oppervlakte (m²)",
      "Bruto Kosten (€)": "Bruto Kosten (€)",
      "ISDE Subsidie (€)": "ISDE Subsidie (€)",
      "NIP Subsidie (€)": "NIP Subsidie (€)",
      "Netto Kosten (€)": "Netto Kosten (€)",
      "Besparing (m³ gas)": "Besparing (m³ gas)",
      "Besparing (€)": "Besparing (€)",
      "Terugverdientijd (jr)": "Terugverdientijd (jr)"
    });

    calculation.measures.forEach(m => {
      insulationData.push({
        Maatregel: m.name,
        Oppervlakte: m.area,
        "Bruto Kosten (€)": m.brutoCosts,
        "ISDE Subsidie (€)": Math.round(m.isdeSubsidy),
        "NIP Subsidie (€)": Math.round(m.nipSubsidy),
        "Netto Kosten (€)": Math.round(m.netCosts),
        "Besparing (m³ gas)": Math.round(m.savingM3),
        "Besparing (€)": Math.round(m.savingEuro),
        "Terugverdientijd (jr)": m.tvt > 0 ? Number(m.tvt.toFixed(1)) : 0
      });
    });

    insulationData.push({}); // Empty separator row
    insulationData.push({
      Maatregel: "TOTAAL (BASIS SCENARIO)",
      Oppervlakte: calculation.measures.reduce((sum, m) => sum + (m.area || 0), 0),
      "Bruto Kosten (€)": calculation.totals.bruto,
      "ISDE Subsidie (€)": Math.round(calculation.totals.isde),
      "NIP Subsidie (€)": Math.round(calculation.totals.nip),
      "Netto Kosten (€)": Math.round(calculation.totals.net),
      "Besparing (m³ gas)": Math.round(calculation.measures.reduce((sum, m) => sum + m.savingM3, 0)),
      "Besparing (€)": Math.round(calculation.totals.savingsEuro),
      "Terugverdientijd (jr)": calculation.totals.tvt > 0 ? Number(calculation.totals.tvt.toFixed(1)) : 0
    });

    if (calculation.addedMeasureForOptimization) {
      insulationData.push({});
      insulationData.push({
        Maatregel: `OPTIMALISATIE: ${calculation.addedMeasureForOptimization}`,
        Oppervlakte: "",
        "Bruto Kosten (€)": "",
        "ISDE Subsidie (€)": "",
        "NIP Subsidie (€)": "",
        "Netto Kosten (€)": "",
        "Besparing (m³ gas)": "",
        "Besparing (€)": "",
        "Terugverdientijd (jr)": ""
      });
      calculation.optimalMeasures.forEach(m => {
        insulationData.push({
          Maatregel: m.name,
          Oppervlakte: m.area,
          "Bruto Kosten (€)": m.brutoCosts,
          "ISDE Subsidie (€)": Math.round(m.isdeSubsidy),
          "NIP Subsidie (€)": Math.round(m.nipSubsidy),
          "Netto Kosten (€)": Math.round(m.netCosts),
          "Besparing (m³ gas)": Math.round(m.savingM3),
          "Besparing (€)": Math.round(m.savingEuro),
          "Terugverdientijd (jr)": m.tvt > 0 ? Number(m.tvt.toFixed(1)) : 0
        });
      });
      insulationData.push({
        Maatregel: "TOTAAL (GEOPTIMALISEERD SCENARIO)",
        Oppervlakte: calculation.optimalMeasures.reduce((sum, m) => sum + (m.area || 0), 0),
        "Bruto Kosten (€)": calculation.totalsOptimal.bruto,
        "ISDE Subsidie (€)": Math.round(calculation.totalsOptimal.isde),
        "NIP Subsidie (€)": Math.round(calculation.totalsOptimal.nip),
        "Netto Kosten (€)": Math.round(calculation.totalsOptimal.net),
        "Besparing (m³ gas)": Math.round(calculation.optimalMeasures.reduce((sum, m) => sum + m.savingM3, 0)),
        "Besparing (€)": Math.round(calculation.totalsOptimal.savingsEuro),
        "Terugverdientijd (jr)": calculation.totalsOptimal.tvt > 0 ? Number(calculation.totalsOptimal.tvt.toFixed(1)) : 0
      });
    }

    insulationData.push({});
    insulationData.push({ Maatregel: "Opmerkingen voor offertes", Oppervlakte: opmerkingenOffertes });
    insulationData.push({ Maatregel: "Bijzonderheden verwerkers", Oppervlakte: opmerkingenAlgemeen });

    // 3. Solar Prognosis Data
    const solarData = [
      { Parameter: "Aantal zonnepanelen", Waarde: tech.aantalZonnepanelen, Eenheid: "stuks" },
      { Parameter: "Vermogen per paneel", Waarde: tech.vermogenPerPaneel || 400, Eenheid: "Wp" },
      { Parameter: "Totaal geïnstalleerd vermogen", Waarde: (tech.aantalZonnepanelen * (tech.vermogenPerPaneel || 400)), Eenheid: "Wp" },
      { Parameter: "Dakoriëntatie", Waarde: tech.dakOrientatie, Eenheid: "graden t.o.v. Zuid" },
      { Parameter: "Oriëntatiefactor", Waarde: Number(calculation.solar.orientationFactor.toFixed(3)), Eenheid: "-" },
      { Parameter: "Dakhellingshoek", Waarde: tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35, Eenheid: "graden" },
      { Parameter: "Jaarlijkse zonne-opbrengst", Waarde: Math.round(calculation.solar.annualYieldKwh), Eenheid: "kWh/jaar" },
      { Parameter: "Huidig direct eigen verbruik (basis)", Waarde: calculation.solar.selfConsumptionBase, Eenheid: "%" },
      { Parameter: "Huidig direct eigen verbruik (kWh)", Waarde: Math.round(calculation.solar.absoluteSelfConsumptionBaseKwh), Eenheid: "kWh/jaar" },
      { Parameter: "Netteruglevering aan het net (basis)", Waarde: Math.round(calculation.solar.gridFeedBaseKwh), Eenheid: "kWh/jaar" }
    ];

    // 4. Battery & Smart Trading Data
    const batteryData: any[] = [];
    batteryData.push({
      Onderdeel: "Geselecteerde Thuisbatterij Capaciteit",
      Waarde: tech.capaciteitAccu > 0 ? `${tech.capaciteitAccu} kWh` : "Geen geselecteerd",
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Eigen Prijsopgave (Optioneel)",
      Waarde: tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 ? `€ ${tech.customAccuPrijs}` : "Standaard schatting",
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Energiecontract Type",
      Waarde: tech.typeContract,
      Details: ""
    });
    if (tech.typeContract === 'Dynamisch') {
      batteryData.push({
        Onderdeel: "Energieleverancier",
        Waarde: tech.dynamicProvider || 'Zonneplan',
        Details: ""
      });
    }
    batteryData.push({
      Onderdeel: "Nieuw direct eigen verbruik met batterij",
      Waarde: `${Math.round(calculation.solar.selfConsumptionWithBattery)}%`,
      Details: `(+${Math.round(calculation.battery.efficiencyIncrease)}% toename)`
    });
    batteryData.push({
      Onderdeel: "Nieuw direct eigen verbruik (kWh)",
      Waarde: `${Math.round(calculation.solar.absoluteSelfConsumptionWithBatteryKwh)} kWh/jr`,
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Nieuwe teruglevering aan net",
      Waarde: `${Math.round(calculation.solar.gridFeedWithBatteryKwh)} kWh/jr`,
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Jaarlijkse besparing pre-2027 (onder saldering)",
      Waarde: `€ ${Math.round(calculation.battery.costSavingsPre2027)}`,
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Jaarlijkse besparing post-2027 (zonder saldering)",
      Waarde: `€ ${Math.round(calculation.battery.costSavingsPost2027)}`,
      Details: ""
    });

    batteryData.push({}); // Space
    batteryData.push({
      Onderdeel: "STANDAARD CAPACITEITEN VERGELIJKING",
      Waarde: "",
      Details: ""
    });
    
    batteryData.push({
      Onderdeel: "Batterij Capaciteit",
      Waarde: "Netto Investeringskosten (na btw-teruggave)",
      Details: "Jaarlijkse Opbrengst (Dynamisch handelen/Arbitrage)",
      "Terugverdientijd (Dynamisch jr)": "Terugverdientijd (Vast Contract Post-2027 jr)",
      Advies: "Advies"
    });

    calculation.battery.options.forEach(opt => {
      batteryData.push({
        Onderdeel: `${opt.capacityKwh} kWh (${opt.label})`,
        Waarde: `€ ${Math.round(opt.netInvestment)}`,
        Details: `€ ${Math.round(opt.annualSavingsDynamisch)} / jr`,
        "Terugverdientijd (Dynamisch jr)": opt.tvtDynamisch < 90 ? `${opt.tvtDynamisch.toFixed(1)} jaar` : "N.v.t.",
        "Terugverdientijd (Vast Contract Post-2027 jr)": opt.tvtPost2027 < 90 ? `${opt.tvtPost2027.toFixed(1)} jaar` : "N.v.t.",
        Advies: opt.bestSuited ? "BEST PASSEND (Geadviseerd)" : opt.recommendation
      });
    });

    // 5. Heatpump & EV Charging Data
    const hpLpData: any[] = [];
    hpLpData.push({ Onderdeel: "WARMTEPOMP CHECK", Waarde: "", Details: "" });
    hpLpData.push({ Onderdeel: "Isolatie voldoende voor WP?", Waarde: calculation.heatpump.isInsulatedSufficiently ? "Ja" : "Nee", Details: "" });
    hpLpData.push({ Onderdeel: "Resterend gasverbruik na isolatie", Waarde: `${Math.round(calculation.heatpump.remainingGasM3)} m³/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Warmtepomp aanbevolen?", Waarde: calculation.heatpump.isRecommended ? "Ja" : "Nee", Details: "" });
    hpLpData.push({ Onderdeel: "Geselecteerd warmtepomp model", Waarde: tech.selectedWarmtepompModel || 'Standard', Details: "" });
    
    hpLpData.push({});
    hpLpData.push({
      Onderdeel: "Systeemtype",
      Waarde: "Netto Investering (€)",
      Details: "Gasbesparing (m³)",
      "Elektra Toename (kWh)": "Jaarlijkse Netto Besparing (€)",
      "Terugverdientijd (jr)": "Haalbaarheid / Advies"
    });

    calculation.heatpump.options.forEach(opt => {
      hpLpData.push({
        Onderdeel: opt.type,
        Waarde: `€ ${Math.round(opt.netInvestment)}`,
        Details: `${Math.round(opt.gasSavingsM3)} m³`,
        "Elektra Toename (kWh)": `${Math.round(opt.elecIncreaseKwh)} kWh`,
        "Jaarlijkse Netto Besparing (€)": `€ ${Math.round(opt.netSavingsEuro)}`,
        "Terugverdientijd (jr)": opt.tvt < 90 ? `${opt.tvt.toFixed(1)} jaar` : "N.v.t.",
        "Haalbaarheid / Advies": opt.isFeasible ? "Haalbaar / Geschikt" : opt.feasibilityReason
      });
    });

    hpLpData.push({});
    hpLpData.push({ Onderdeel: "ELEKTRISCH RIJDEN & LAADPAAL ANALYSE", Waarde: "", Details: "" });
    
    const lpResult = calculation.laadpaal || {
      evAnnualDemandKwh: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100)),
      evSolarCoverageKwh: 0,
      evGridImportKwh: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100)),
      evSavingsEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * (0.50 - house.elektraPrijs)),
      ereRevenueEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * 0.12),
      totalSavingsEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * (0.50 - house.elektraPrijs + 0.12)),
      netInvestmentEuro: 1200,
      tvt: 1.8
    };

    const evKm = tech.evKilometers ?? 15000;
    const evCons = tech.evVerbruik ?? 18;
    const evHome = tech.evThuisLaden ?? 75;

    hpLpData.push({ Onderdeel: "Jaarkilometrage EV", Waarde: `${evKm} km/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "EV Normverbruik", Waarde: `${evCons} kWh/100km`, Details: "" });
    hpLpData.push({ Onderdeel: "Thuislaad-aandeel", Waarde: `${evHome}%`, Details: "" });
    hpLpData.push({ Onderdeel: "Laadvermogen laadpaal", Waarde: `${tech.laadvermogen ?? 11} kW`, Details: "" });
    hpLpData.push({ Onderdeel: "Thuisgeladen volume", Waarde: `${lpResult.evAnnualDemandKwh} kWh/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Zonnedekking laadsessies", Waarde: `${lpResult.evSolarCoverageKwh} kWh/jaar`, Details: "Zonnestroom direct gebruikt voor de EV, in mindering gebracht op teruglevering en warmtepomp" });
    hpLpData.push({ Onderdeel: "Netstroom laadsessies", Waarde: `${lpResult.evGridImportKwh} kWh/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Laadpaal besparing (vs openbaar laden)", Waarde: `€ ${lpResult.evSavingsEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Wettelijke ERE-vergoeding (€0,12/kWh)", Waarde: `€ ${lpResult.ereRevenueEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Gecombineerd jaarlijks voordeel laadpaal", Waarde: `€ ${lpResult.totalSavingsEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Geschatte terugverdientijd laadpaal", Waarde: lpResult.tvt < 90 ? `${lpResult.tvt.toFixed(1)} jaar` : "N.v.t.", Details: `Op basis van € ${lpResult.netInvestmentEuro} installatiekosten` });

    // Build the workbook
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(generalData);
    XLSX.utils.book_append_sheet(wb, ws1, "1. Klant & Woning");
    ws1['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 45 }];

    const ws2 = XLSX.utils.json_to_sheet(insulationData);
    XLSX.utils.book_append_sheet(wb, ws2, "2. Isolatie");
    ws2['!cols'] = [{ wch: 35 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];

    const ws3 = XLSX.utils.json_to_sheet(solarData);
    XLSX.utils.book_append_sheet(wb, ws3, "3. Zonnepanelen");
    ws3['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 25 }];

    const ws4 = XLSX.utils.json_to_sheet(batteryData);
    XLSX.utils.book_append_sheet(wb, ws4, "4. Thuisbatterij");
    ws4['!cols'] = [{ wch: 40 }, { wch: 45 }, { wch: 50 }, { wch: 35 }, { wch: 35 }, { wch: 35 }];

    const ws5 = XLSX.utils.json_to_sheet(hpLpData);
    XLSX.utils.book_append_sheet(wb, ws5, "5. Warmtepomp & Laadpaal");
    ws5['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 45 }];

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
                Onafhankelijk, lokaal en betrouwbaar berekenen en besparen
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={deelLink}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl transition shadow-sm border border-emerald-500/30 ${
                linkCopied
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/50'
              }`}
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                  <span>Link Gekopieerd!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Deel link</span>
                </>
              )}
            </button>
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
        <div className={`space-y-6 ${activeTab === 'accu' || activeTab === 'zon' || activeTab === 'warmtepomp' || activeTab === 'laadpaal' ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">1</span>
              Invoer Gegevens
            </h2>
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
            onWis={wisFormulier}
            onDownloadExcel={downloadExcel}
            onDownloadJSON={downloadJSON}
          />
        </div>

        {/* Right Column: Live Table & Dynamic Advice */}
        <div className={`space-y-6 ${activeTab === 'accu' || activeTab === 'zon' || activeTab === 'warmtepomp' || activeTab === 'laadpaal' ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  Live Rekenoverzicht (Basis vs Optimalisatie)
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80 flex items-center gap-1">
                    <span>Stookfactor:</span>
                    <strong className="font-mono text-emerald-700 font-bold">{(calculation?.house?.stookgedragFactor ?? 1.0).toFixed(1)}x</strong>
                    <span className="text-[9px] text-slate-500">({calculation?.house?.stookgedragBerekend || 'Normaal'})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Gasprijs €{(house.gasPrijs ?? 1.30).toFixed(2)}/m³</span>
                </div>
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
                        <td className="py-3 text-center">{calculation.measures.reduce((sum, m) => sum + (m.area || 0), 0)} m²</td>
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
                          <td className="py-3 text-center">{calculation.optimalMeasures.reduce((sum, m) => sum + (m.area || 0), 0)} m²</td>
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
                  Bovenstaande is een directe, real-time rekenberekening gebaseerd op de lokale Peel en Maas richtlijnen. 
                  De gasbesparingen en TVT zijn gecorrigeerd met stookgedragfactor <strong className="text-slate-700">{(calculation?.house?.stookgedragFactor ?? 1.0).toFixed(1)}x</strong> ({calculation?.house?.stookgedragBerekend || 'Normaal'}).
                  De NIP subsidie (€2.900) wordt toegekend bij minimaal twee isolatiemaatregelen mits wordt voldaan aan de WOZ-waarde (maximaal €477.000 met peildatum 2024) en inkomenseisen.
                </p>
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
            setTech={setTech}
          />
        </div>

        {/* Full-width/Page-wide sections */}
        {activeTab === 'zon' && (
          <div className="lg:col-span-12 mt-4 animate-fadeIn">
            <SolarSelfConsumptionChart
              resident={resident}
              house={house}
              insulation={insulation}
              tech={tech}
              setTech={setTech}
            />
          </div>
        )}
        {activeTab === 'warmtepomp' && (
          <div className="lg:col-span-12 mt-4 animate-fadeIn">
            <HeatpumpSolarChart
              resident={resident}
              house={house}
              insulation={insulation}
              tech={tech}
              setTech={setTech}
            />
          </div>
        )}
        {activeTab === 'laadpaal' && calculation.solar.annualYieldKwh > 0 && (
          <div className="lg:col-span-12 mt-4 animate-fadeIn">
            <LaadpaalSolarChart
              resident={resident}
              house={house}
              insulation={insulation}
              tech={tech}
              setTech={setTech}
            />
          </div>
        )}

        {/* Grote actieknop - altijd helemaal onderin als laatste op alle tabbladen */}
        <div className="lg:col-span-12 mt-8 pt-6 border-t border-slate-200/80">
          <button
            onClick={generateReport}
            disabled={loadingAdvice}
            className="w-full bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-base"
            id="generate-coach-report-btn"
          >
            {loadingAdvice ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Stappenplan opstellen...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-emerald-500/20" />
                <span>Genereer Uitgebreid Adviesrapport</span>
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-xs mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-3">
          <p>© 2026 Energie Advies Centrum Peel en Maas. Alle rechten voorbehouden.</p>
          <p className="max-w-2xl mx-auto text-slate-500 leading-relaxed font-normal">
            De opgestelde adviezen en subsidies zijn indicatief en gebaseerd op praktijkrichtlijnen, de gemeentelijke regelingen voor Peel en Maas en de landelijke ISDE-subsidieregels 2026. Er kunnen geen rechten worden ontleend aan de prognoses.
          </p>
        </div>
      </footer>
    </div>
  );
}
