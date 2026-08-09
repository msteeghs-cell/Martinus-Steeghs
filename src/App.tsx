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
  Share2, Check, PiggyBank, Sun
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
  elektraPrijs: 0.35,
  elektraTeruglevering: 0,
  gasPrijs: 1.50,
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
  omzettingsverliezen: 20,
  pvCurtailmentMode: true,
  typeContract: 'Vast',
  dynamicProvider: 'Zonneplan',
  evKilometers: 15000,
  evVerbruik: 18,
  evThuisLaden: 75,
  laadvermogen: 11,
  opslagLeverancier: 0.02,
  selectedWarmtepompModel: 'Standard',
  selectedWarmtepompType: undefined,
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
    // Determine public URL by converting dev preview domain (ais-dev-) to public domain (ais-pre-)
    let targetUrl = window.location.href;
    if (targetUrl.includes('ais-dev-')) {
      targetUrl = targetUrl.replace('ais-dev-', 'ais-pre-');
    }

    const copySuccess = () => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(targetUrl)
        .then(() => copySuccess())
        .catch(() => {
          fallbackCopyText(targetUrl);
        });
    } else {
      fallbackCopyText(targetUrl);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Fallback copy error: ', err);
    }
    document.body.removeChild(textArea);
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
    // 0. Live Rekenoverzicht & Uitgebreide Berekeningen
    const gPrice = house.gasPrijs || 1.50;
    const ePrice = house.elektraPrijs || 0.35;
    const currentGasM3 = house.verbruikM3 || 0;
    const currentGasYr = Math.round(currentGasM3 * gPrice);
    const currentGasMth = Math.round(currentGasYr / 12);
    const houseKwh = house.verbruikKwh || 0;
    const currentElektraYr = Math.round(houseKwh * ePrice);
    const currentElektraMth = Math.round(currentElektraYr / 12);
    const currentTotalYr = currentGasYr + currentElektraYr;
    const currentTotalMth = Math.round(currentTotalYr / 12);

    const totalGasSavingsM3 = calculation.measures.reduce((s, m) => s + m.savingM3, 0);
    const remainingGasAfterInsulation = Math.max(0, currentGasM3 - totalGasSavingsM3);

    const activeType = tech.selectedWarmtepompType;
    const houseWpType = house.verwarming || 'CV-ketel';
    const isWpActiveInHouse = houseWpType !== 'CV-ketel' && houseWpType !== 'Geen / Overig' && houseWpType !== 'Andere' && houseWpType !== 'CV-ketel op gas';
    const isVolledigWp = isWpActiveInHouse && (houseWpType === 'Volledige warmtepomp' || houseWpType === 'Full electric' || activeType === 'All-Electric');
    const isHybrideWp = isWpActiveInHouse && (houseWpType === 'Hybride warmtepomp' || activeType === 'Hybride');

    let postGasM3 = remainingGasAfterInsulation;
    let postAddElektraKwh = 0;

    if (isVolledigWp) {
      postGasM3 = 0;
      const aeOption = calculation.heatpump?.options?.find(o => o.type === 'All-Electric');
      postAddElektraKwh = (tech.userAnnualWp && tech.userAnnualWp > 0)
        ? tech.userAnnualWp
        : (aeOption ? Math.round(aeOption.elecIncreaseKwh) : Math.round(remainingGasAfterInsulation * 2.2));
    } else if (isHybrideWp) {
      const isAirco = tech.selectedWarmtepompModel === 'LuchtLucht';
      const hybridRatio = isAirco ? 0.55 : 0.75;
      postGasM3 = Math.max(0, Math.round(remainingGasAfterInsulation * (1 - hybridRatio)));
      const hybridOption = calculation.heatpump?.options?.find(o => o.type.includes('Hybride') || o.type.includes('Lucht'));
      postAddElektraKwh = (tech.userAnnualWp && tech.userAnnualWp > 0)
        ? tech.userAnnualWp
        : (hybridOption ? Math.round(hybridOption.elecIncreaseKwh) : Math.round(remainingGasAfterInsulation * hybridRatio * 2.2));
    } else {
      postGasM3 = remainingGasAfterInsulation;
      postAddElektraKwh = 0;
    }

    const postGasYr = Math.round(postGasM3 * gPrice);
    const postGasMth = Math.round(postGasYr / 12);

    const solarKwh = calculation.solar.annualYieldKwh || 0;
    const selfConsPct = calculation.solar.selfConsumptionWithBattery || 35;
    const postHouseKwh = houseKwh + postAddElektraKwh;
    const postDirectSelfKwh = Math.min(postHouseKwh, (solarKwh * selfConsPct) / 100);
    const postFeedInKwh = Math.max(0, solarKwh - postDirectSelfKwh);
    const postGridImportKwh = Math.max(0, postHouseKwh - postDirectSelfKwh);

    let batteryTradingYield = 0;
    const batteryCap = tech.capaciteitAccu || 0;
    if (batteryCap > 0 && tech.typeContract === 'Dynamisch' && tech.batteryGridTrading !== false) {
      const provider = tech.dynamicProvider || 'Zonneplan';
      const ratePerKwh = provider === 'Zonneplan' ? 38.25 : provider === 'Frank' ? 31.5 : provider === 'Tibber' ? 29.25 : provider === 'Anwb' ? 27.00 : 24.75;
      batteryTradingYield = batteryCap * ratePerKwh;
    }

    const postElektraYr = Math.round((postGridImportKwh * ePrice) - (postFeedInKwh * 0.05) - batteryTradingYield);
    const postElektraMth = Math.round(postElektraYr / 12);

    const postTotalYr = postGasYr + postElektraYr;
    const postTotalMth = Math.round(postTotalYr / 12);
    const totalJaarbesparing = currentTotalYr - postTotalYr;

    // Investment breakdowns
    const solarInv = (solarKwh > 0 || (tech.aantalZonnepanelen && tech.aantalZonnepanelen > 0))
      ? (tech.customZonnepanelenPrijs || ((tech.aantalZonnepanelen || 0) * 350 + 800))
      : 0;
    const batteryInv = (batteryCap > 0)
      ? (tech.customAccuPrijs || (batteryCap * 450 + 1200))
      : 0;

    let wpInv = 0;
    let wpIsde = 0;
    if (isVolledigWp) {
      const ae = calculation.heatpump?.options?.find(o => o.type === 'All-Electric');
      wpInv = ae ? ae.netInvestment : 9500;
      wpIsde = 2850;
    } else if (isHybrideWp) {
      const hy = calculation.heatpump?.options?.find(o => o.type.includes('Hybride'));
      wpInv = hy ? hy.netInvestment : 4200;
      wpIsde = 2400;
    }

    const insulationBruto = calculation.totals.bruto || 0;
    const insulationIsde = Math.round(calculation.totals.isde || 0);
    const insulationNip = Math.round(calculation.totals.nip || 0);
    const insulationNetto = Math.round(calculation.totals.net || 0);

    const evKm = tech.evKilometers || 0;
    const hasEv = evKm > 0;
    const lpResult = calculation.laadpaal;
    const laadpaalInv = hasEv ? (lpResult?.netInvestmentEuro ?? 1200) : 0;
    const laadpaalSavings = hasEv ? (lpResult?.totalSavingsEuro ?? 0) : 0;

    const totalBrutoInv = insulationBruto + solarInv + batteryInv + (wpInv + wpIsde) + laadpaalInv;
    const totalSubsidies = insulationIsde + insulationNip + wpIsde;
    const totalNettoInv = insulationNetto + solarInv + batteryInv + wpInv + laadpaalInv;
    const overallTvt = totalJaarbesparing > 0 ? (totalNettoInv / totalJaarbesparing).toFixed(1) : 'N.v.t.';

    const liveRekenoverzichtData = [
      { Categorie: "OVERZICHT BEREKENING", Onderdeel: "Registratiecode", Waarde: resident.registratiecode || 'PM-CONCEPT', Details: "" },
      { Categorie: "OVERZICHT BEREKENING", Onderdeel: "Woningadres", Waarde: `${resident.straat || ''} ${resident.huisnummer || ''}, ${resident.postcode || ''} ${resident.plaats || ''}`.trim(), Details: "" },
      { Categorie: "OVERZICHT BEREKENING", Onderdeel: "Woningtype & Label", Waarde: `${house.soortWoning || 'Hoekwoning'} (Label ${house.energielabel || 'C'})`, Details: "" },
      { Categorie: "OVERZICHT BEREKENING", Onderdeel: "Berekend Stookgedrag", Waarde: `${calculation.house.stookgedragBerekend || 'Normaal'} (${(calculation.house.stookgedragFactor || 1.0).toFixed(1)}x factor)`, Details: "" },
      { Categorie: "OVERZICHT BEREKENING", Onderdeel: "Contracttype", Waarde: `${tech.typeContract || 'Vast'}${tech.typeContract === 'Dynamisch' ? ` (${tech.dynamicProvider || 'Zonneplan'})` : ''}`, Details: "" },
      
      { Categorie: "", Onderdeel: "", Waarde: "", Details: "" },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "SITUATIE", Waarde: "JAARKOSTEN (€)", Details: "MAANDKOSTEN (€)" },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Huidige Situatie (Nulmeting) Gas", Waarde: `€ ${currentGasYr}`, Details: `€ ${currentGasMth} / mnd (${currentGasM3} m³ à €${gPrice.toFixed(2)})` },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Huidige Situatie (Nulmeting) Elektra", Waarde: `€ ${currentElektraYr}`, Details: `€ ${currentElektraMth} / mnd (${houseKwh} kWh à €${ePrice.toFixed(2)})` },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Huidige Situatie TOTAAL", Waarde: `€ ${currentTotalYr}`, Details: `€ ${currentTotalMth} / mnd` },
      
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Na Verduurzaming Gas", Waarde: postGasM3 === 0 ? "€ 0 (Gasloos)" : `€ ${postGasYr}`, Details: postGasM3 === 0 ? "0 m³ gas" : `€ ${postGasMth} / mnd (${postGasM3} m³)` },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Na Verduurzaming Elektra", Waarde: postElektraYr < 0 ? `-€ ${Math.abs(postElektraYr)} (netto opbrengst)` : `€ ${postElektraYr}`, Details: `€ ${postElektraMth} / mnd (incl. zonnestroom, accu, WP & EV)` },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "Na Verduurzaming TOTAAL", Waarde: postTotalYr < 0 ? `-€ ${Math.abs(postTotalYr)} (netto opbrengst)` : `€ ${postTotalYr}`, Details: `€ ${postTotalMth} / mnd` },
      { Categorie: "ENERGIEKOSTEN BALANS", Onderdeel: "TOTALE NETTO JAARBESPARING", Waarde: `€ ${totalJaarbesparing} / jaar`, Details: `€ ${Math.round(totalJaarbesparing / 12)} / mnd voordeel` },

      { Categorie: "", Onderdeel: "", Waarde: "", Details: "" },
      { Categorie: "BESPARINGSOPBOUW PER MAATREGEL", Onderdeel: "🏠 Isolatiebesparing", Waarde: `€ ${Math.round(calculation.totals.savingsEuro || 0)} / jaar`, Details: `${Math.round(totalGasSavingsM3)} m³ gasbesparing` },
      { Categorie: "BESPARINGSOPBOUW PER MAATREGEL", Onderdeel: "☀️ Zonnepanelen Opbrengst", Waarde: `€ ${Math.round((solarKwh * ePrice))} / jaar`, Details: `${tech.aantalZonnepanelen || 0} panelen (~${Math.round(solarKwh)} kWh/jr opbrengst)` },
      { Categorie: "BESPARINGSOPBOUW PER MAATREGEL", Onderdeel: "🔋 Thuisbatterij Output", Waarde: `€ ${Math.round(batteryTradingYield)} / jaar`, Details: `${batteryCap} kWh accu (${Math.round(selfConsPct)}% eigenverbruik + handelsrendement)` },
      { Categorie: "BESPARINGSOPBOUW PER MAATREGEL", Onderdeel: "♨️ Warmtepomp Rendement", Waarde: `€ ${Math.round((currentGasYr - postGasYr) - Math.round(postAddElektraKwh * ePrice))} / jaar`, Details: `${isVolledigWp ? 'All-Electric' : isHybrideWp ? 'Hybride' : 'Geen'} (uitgespaard gas minus extra stroom)` },
      { Categorie: "BESPARINGSOPBOUW PER MAATREGEL", Onderdeel: "🚗 EV / Laadpaal Brandstofverplaatsing", Waarde: `€ ${laadpaalSavings} / jaar`, Details: hasEv ? `${evKm} km/jr (besparing brandstof vs thuisstroom & ERE)` : 'Geen EV' },

      { Categorie: "", Onderdeel: "", Waarde: "", Details: "" },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "Isolatie", Waarde: `Bruto € ${insulationBruto} | Subsidie € ${insulationIsde + insulationNip}`, Details: `Netto € ${insulationNetto}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "Zonnepanelen", Waarde: `Bruto € ${solarInv}`, Details: `Netto € ${solarInv}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "Thuisbatterij", Waarde: `Bruto € ${batteryInv}`, Details: `Netto € ${batteryInv}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "Warmtepomp", Waarde: `Bruto € ${wpInv + wpIsde} | ISDE € ${wpIsde}`, Details: `Netto € ${wpInv}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "Laadpaal", Waarde: `Bruto € ${laadpaalInv}`, Details: `Netto € ${laadpaalInv}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "TOTALE OVERALL INVESTERING", Waarde: `Bruto € ${totalBrutoInv} | Subsidies € ${totalSubsidies}`, Details: `Netto € ${totalNettoInv}` },
      { Categorie: "INVESTERINGEN & SUBSIDIES", Onderdeel: "TOTALE TERUGVERDIENTIJD (TVT)", Waarde: `${overallTvt} jaar`, Details: `Op basis van € ${totalJaarbesparing}/jr besparing` }
    ];

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

    // 3. Solar Prognosis Data (Ingestelde Gegevens & Stap-voor-stap Berekening)
    const solarData: any[] = [];
    const solarPanelsCount = tech.aantalZonnepanelen || 0;
    const solarWpPerPanel = tech.vermogenPerPaneel || 400;
    const totalWp = solarPanelsCount * solarWpPerPanel;
    const totalKwp = (totalWp / 1000).toFixed(2);
    const orientationFactor = Number(calculation.solar.orientationFactor.toFixed(3));
    const annualYieldKwh = Math.round(calculation.solar.annualYieldKwh || 0);
    const selfConsBasePct = Math.round(calculation.solar.selfConsumptionBase || 35);
    const selfConsBaseKwh = Math.round(calculation.solar.absoluteSelfConsumptionBaseKwh || 0);
    const gridFeedBaseKwh = Math.round(calculation.solar.gridFeedBaseKwh || 0);
    const pre2027Savings = Math.round(annualYieldKwh * ePrice);
    const post2027Savings = Math.round((selfConsBaseKwh * ePrice) + (gridFeedBaseKwh * 0.06));
    const solarTvtVal = (solarInv > 0 && pre2027Savings > 0) ? (solarInv / pre2027Savings).toFixed(1) : "N.v.t.";

    solarData.push({ Onderdeel: "ZONNEPANELEN CONFIGURATIE & INSTALLATIE", Waarde: "", Details: "" });
    solarData.push({ Onderdeel: "Aantal zonnepanelen", Waarde: `${solarPanelsCount} stuks`, Details: "" });
    solarData.push({ Onderdeel: "Vermogen per paneel", Waarde: `${solarWpPerPanel} Wp`, Details: "" });
    solarData.push({ Onderdeel: "Totaal geïnstalleerd vermogen (Wp)", Waarde: `${totalWp} Wp`, Details: "" });
    solarData.push({ Onderdeel: "Totaal geïnstalleerd vermogen (kWp)", Waarde: `${totalKwp} kWp`, Details: "" });
    solarData.push({ Onderdeel: "Dakoriëntatie", Waarde: `${tech.dakOrientatie || 'Zuid'}°`, Details: "Aantal graden t.o.v. Zuid" });
    solarData.push({ Onderdeel: "Dakhellingshoek", Waarde: `${tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}°`, Details: "Aantal graden dakhelling" });
    solarData.push({ Onderdeel: "Oriëntatiefactor (instraling)", Waarde: `${orientationFactor}`, Details: "Correctiefactor op basis van oriëntatie & helling" });

    solarData.push({});
    solarData.push({ Onderdeel: "STAP-VOOR-STAP ZONNE-OPBRENGST & RENDEMENT BEREKENING", Waarde: "", Details: "" });
    solarData.push({
      Onderdeel: "1. Berekende Bruto Jaaropbrengst (kWh)",
      Waarde: `${annualYieldKwh} kWh/jaar`,
      Details: `Formule: Geïnstalleerd vermogen (${totalWp} Wp) × Oriëntatiefactor (${orientationFactor})`
    });
    solarData.push({
      Onderdeel: "2. Direct Eigen Verbruik % (Basis zonder accu)",
      Waarde: `${selfConsBasePct}%`,
      Details: "Percentage direct binnenshuis verbruikte zonnestroom"
    });
    solarData.push({
      Onderdeel: "3. Direct Eigen Verbruik Volume (Basis zonder accu)",
      Waarde: `${selfConsBaseKwh} kWh/jaar`,
      Details: `Formule: Opbrengst (${annualYieldKwh} kWh) × Direct verbruik (${selfConsBasePct}%)`
    });
    solarData.push({
      Onderdeel: "4. Netteruglevering Volume (Basis zonder accu)",
      Waarde: `${gridFeedBaseKwh} kWh/jaar`,
      Details: `Formule: Opbrengst (${annualYieldKwh} kWh) - Direct verbruik (${selfConsBaseKwh} kWh)`
    });
    solarData.push({
      Onderdeel: "5. Financiële Jaaropbrengst Pre-2027 (Met Saldering)",
      Waarde: `€ ${pre2027Savings} / jaar`,
      Details: `Formule: Total opbrengst (${annualYieldKwh} kWh) × Stroomtarief (€${ePrice.toFixed(2)}/kWh)`
    });
    solarData.push({
      Onderdeel: "6. Financiële Jaaropbrengst Post-2027 (Zonder Saldering)",
      Waarde: `€ ${post2027Savings} / jaar`,
      Details: `Formule: Direct verbruik (${selfConsBaseKwh} kWh × €${ePrice.toFixed(2)}) + Teruglevering (${gridFeedBaseKwh} kWh × €0,06/kWh)`
    });
    solarData.push({
      Onderdeel: "7. Investeringskosten Zonnepanelen",
      Waarde: `€ ${Math.round(solarInv)}`,
      Details: tech.customZonnepanelenPrijs ? "Op basis van eigen prijsopgave" : "Standaard raming inclusief omvormer & montage"
    });
    solarData.push({
      Onderdeel: "8. Berekende Terugverdientijd Zonnepanelen (TVT)",
      Waarde: solarTvtVal !== "N.v.t." ? `${solarTvtVal} jaar` : "N.v.t.",
      Details: `Formule: Investering (€${Math.round(solarInv)}) / Jaarbesparing (€${pre2027Savings})`
    });

    // 4. Battery & Smart Trading Data (Ingevulde Gegevens & Stap-voor-stap Berekening)
    const batteryData: any[] = [];
    batteryData.push({ Onderdeel: "THUISBATTERIJ CONFIGURATIE & INSTELLINGEN", Waarde: "", Details: "" });
    batteryData.push({
      Onderdeel: "Geselecteerde Thuisbatterij Capaciteit",
      Waarde: batteryCap > 0 ? `${batteryCap} kWh` : "Geen thuisbatterij geselecteerd",
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Investering / Eigen Prijsopgave",
      Waarde: tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 
        ? `€ ${Math.round(tech.customAccuPrijs)} (eigen opgave)` 
        : batteryCap > 0 ? `€ ${Math.round(batteryInv)} (standaard raming)` : "€ 0",
      Details: ""
    });
    batteryData.push({
      Onderdeel: "Energiecontract Type",
      Waarde: tech.typeContract || 'Vast',
      Details: ""
    });
    if (tech.typeContract === 'Dynamisch') {
      batteryData.push({
        Onderdeel: "Energieleverancier",
        Waarde: tech.dynamicProvider || 'Zonneplan',
        Details: ""
      });
      batteryData.push({
        Onderdeel: "Dynamische Nethandel / Arbitrage Status",
        Waarde: tech.batteryGridTrading !== false ? "Actief (Powerplay / Onbalanssturing)" : "Inactief (100% Zonne-focus)",
        Details: ""
      });
    }

    batteryData.push({});
    batteryData.push({ Onderdeel: "STAP-VOOR-STAP THUISBATTERIJ BEREKENING", Waarde: "", Details: "" });

    const batSelfConsBaseKwh = Math.round(calculation.solar.absoluteSelfConsumptionBaseKwh || 0);
    const batSelfConsWithBatKwh = Math.round(calculation.solar.absoluteSelfConsumptionWithBatteryKwh || 0);
    const extraSelfConsKwh = Math.max(0, batSelfConsWithBatKwh - batSelfConsBaseKwh);
    const selfConsSavingsEuro = Math.round(extraSelfConsKwh * ePrice);
    const totalAnnualBatteryYield = Math.round(batteryTradingYield + selfConsSavingsEuro);
    const batTvtVal = (batteryInv > 0 && totalAnnualBatteryYield > 0) ? (batteryInv / totalAnnualBatteryYield).toFixed(1) : "N.v.t.";

    batteryData.push({
      Onderdeel: "1. Direct Eigen Verbruik Zonnestroom (Basis zonder accu)",
      Waarde: `${Math.round(calculation.solar.selfConsumptionBase)}%`,
      Details: `${batSelfConsBaseKwh} kWh/jaar direct verbruikt`
    });
    batteryData.push({
      Onderdeel: "2. Nieuw Direct Eigen Verbruik Zonnestroom (Met accu)",
      Waarde: `${Math.round(calculation.solar.selfConsumptionWithBattery)}%`,
      Details: `${batSelfConsWithBatKwh} kWh/jaar direct verbruikt (+${Math.round(calculation.battery.efficiencyIncrease)}% toename)`
    });
    batteryData.push({
      Onderdeel: "3. Extra Opgevangen Zonnestroom in Accu",
      Waarde: `${extraSelfConsKwh} kWh/jaar`,
      Details: `Formule: Met accu (${batSelfConsWithBatKwh} kWh) - Zonder accu (${batSelfConsBaseKwh} kWh)`
    });
    batteryData.push({
      Onderdeel: "4. Besparing op Netimport door Extra Eigenverbruik (€)",
      Waarde: `€ ${selfConsSavingsEuro} / jaar`,
      Details: `Formule: Extra zonnestroom (${extraSelfConsKwh} kWh) × Stroomtarief (€${ePrice.toFixed(2)}/kWh)`
    });
    batteryData.push({
      Onderdeel: "5. Berekende Jaarlijkse Handelsopbrengst (Arbitrage / Nethandel)",
      Waarde: `€ ${Math.round(batteryTradingYield)} / jaar`,
      Details: batteryCap > 0 && tech.typeContract === 'Dynamisch' && tech.batteryGridTrading !== false
        ? `Formule: Accucapaciteit (${batteryCap} kWh) × Spottarief vergoeding (€${(batteryTradingYield / batteryCap).toFixed(2)}/kWh/jaar via ${tech.dynamicProvider || 'Zonneplan'})`
        : "€ 0 (Nethandel inactief of vast contract)"
    });
    batteryData.push({
      Onderdeel: "6. Resterende Teruglevering aan Net (Met accu)",
      Waarde: `${Math.round(calculation.solar.gridFeedWithBatteryKwh)} kWh/jaar`,
      Details: `Formule: Totale opbrengst (${annualYieldKwh} kWh) - Nieuw eigenverbruik (${batSelfConsWithBatKwh} kWh)`
    });
    batteryData.push({
      Onderdeel: "7. Totale Gecombineerde Jaaropbrengst Thuisbatterij (€)",
      Waarde: `€ ${totalAnnualBatteryYield} / jaar`,
      Details: `Formule: Handelsopbrengst (€${Math.round(batteryTradingYield)}) + Besparing eigenverbruik (€${selfConsSavingsEuro})`
    });
    batteryData.push({
      Onderdeel: "8. Berekende Terugverdientijd Thuisbatterij (TVT)",
      Waarde: batTvtVal !== "N.v.t." ? `${batTvtVal} jaar` : "N.v.t.",
      Details: `Formule: Investering (€${Math.round(batteryInv)}) / Totale Jaaropbrengst (€${totalAnnualBatteryYield})`
    });

    // 5. Heatpump & EV Charging Data (Ingestelde Gegevens & Stap-voor-stap Berekening)
    const hpLpData: any[] = [];
    const selWpType = tech.selectedWarmtepompType || (isVolledigWp ? 'All-Electric' : isHybrideWp ? 'Hybride' : 'Hybride');
    const selWpModel = tech.selectedWarmtepompModel || 'Standaard';
    const chosenHpOption = calculation.heatpump?.options?.find(o => 
      selWpType === 'All-Electric' ? o.type === 'All-Electric' : (o.type.includes('Hybride') || o.type.includes('Lucht'))
    ) || calculation.heatpump?.options?.[0];

    hpLpData.push({ Onderdeel: "WARMTEPOMP CHECK & SYSTEEMINFORMATIE", Waarde: "", Details: "" });
    hpLpData.push({ Onderdeel: "Geselecteerd Warmtepomp Systeemtype", Waarde: selWpType, Details: "" });
    hpLpData.push({ Onderdeel: "Geselecteerd Model / Vermogen", Waarde: selWpModel, Details: "" });
    hpLpData.push({ Onderdeel: "Woningtype & Woonoppervlakte", Waarde: `${house.soortWoning || 'Hoekwoning'} (${house.woonoppervlakte || 120} m²)`, Details: "" });
    hpLpData.push({ Onderdeel: "Oorspronkelijk gasverbruik", Waarde: `${house.verbruikM3 || 0} m³/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Resterend gasverbruik na isolatie", Waarde: `${Math.round(remainingGasAfterInsulation)} m³/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Streefwaarde max. gasverbruik voor warmtepomp", Waarde: `${Math.round((house.woonoppervlakte || 120) * 9.0)} m³/jaar`, Details: "Heuristiek op basis van woningtype en m²" });
    hpLpData.push({ Onderdeel: "Isolatie voldoende voor warmtepomp?", Waarde: calculation.heatpump.isInsulatedSufficiently ? "Ja (Klaar voor warmtepomp)" : "Nee (Eerst extra isoleren)", Details: "" });
    hpLpData.push({ Onderdeel: "Warmtepomp geadviseerd?", Waarde: calculation.heatpump.isRecommended ? "Ja" : "Nee", Details: calculation.heatpump.explanation });

    hpLpData.push({});
    hpLpData.push({ Onderdeel: "STAP-VOOR-STAP WARMTEPOMP BEREKENING", Waarde: "", Details: "" });

    const calculatedGasSavingsM3 = chosenHpOption ? Math.round(chosenHpOption.gasSavingsM3) : (selWpType === 'All-Electric' ? Math.round(remainingGasAfterInsulation) : Math.round(remainingGasAfterInsulation * 0.75));
    const calculatedGasSavingsEuro = Math.round(calculatedGasSavingsM3 * gPrice);
    const fixedGasSavingEuro = selWpType === 'All-Electric' ? 280 : 0;

    hpLpData.push({
      Onderdeel: "1. Verwachte Gasbesparing (m³)",
      Waarde: `${calculatedGasSavingsM3} m³/jaar`,
      Details: selWpType === 'All-Electric' ? '100% gasbesparing (volledig gasloos)' : selWpModel === 'LuchtLucht' ? '55% gasbesparing (lucht-lucht airco)' : '75% gasbesparing (hybride)'
    });
    hpLpData.push({
      Onderdeel: "2. Financiële Besparing op Gas (€)",
      Waarde: `€ ${calculatedGasSavingsEuro} / jaar`,
      Details: `Formule: ${calculatedGasSavingsM3} m³ × €${gPrice.toFixed(2)}/m³`
    });
    if (fixedGasSavingEuro > 0) {
      hpLpData.push({
        Onderdeel: "3. Besparing Vastrecht Gasaansluiting (€)",
        Waarde: `€ ${fixedGasSavingEuro} / jaar`,
        Details: "Volledige verwijdering gasaansluiting & meter"
      });
    }

    const copFactor = selWpModel === 'Middelgroot 8kW' ? 2.0 : selWpModel === 'Groot 12kW' ? 2.4 : selWpModel === 'LuchtLucht' ? 1.9 : 2.2;
    const calculatedAddElecKwh = chosenHpOption ? Math.round(chosenHpOption.elecIncreaseKwh) : Math.round(calculatedGasSavingsM3 * copFactor);
    const calculatedElecCostEuro = Math.round(calculatedAddElecKwh * ePrice);

    hpLpData.push({
      Onderdeel: "4. Omzettings-Coëfficiënt / SCOP Factor",
      Waarde: `${copFactor} kWh per m³ gas`,
      Details: "Berekend elektrisch verbruik per m³ uitgespaard gas op basis van seizoensrendement"
    });
    hpLpData.push({
      Onderdeel: "5. Berekend Extra Elektriciteitsverbruik (kWh)",
      Waarde: `${calculatedAddElecKwh} kWh/jaar`,
      Details: `Formule: ${calculatedGasSavingsM3} m³ gasbesparing × ${copFactor} kWh/m³`
    });

    const wpSolarCoverage = chosenHpOption ? Math.round(chosenHpOption.solarCoverageKwh) : 0;
    const wpGridImport = chosenHpOption ? Math.round(chosenHpOption.gridImportKwh) : calculatedAddElecKwh;

    hpLpData.push({
      Onderdeel: "6. Zonnestroom direct gebruikt voor Warmtepomp",
      Waarde: `${wpSolarCoverage} kWh/jaar`,
      Details: "Overtollige zonnestroom ingezet voor warmtepomp (na aftrek EV-laden)"
    });
    hpLpData.push({
      Onderdeel: "7. Netstroom Import voor Warmtepomp",
      Waarde: `${wpGridImport} kWh/jaar`,
      Details: "Resterende stroom benodigd van het net"
    });
    hpLpData.push({
      Onderdeel: "8. Extra Elektriciteitskosten Warmtepomp (€)",
      Waarde: `€ ${calculatedElecCostEuro} / jaar`,
      Details: `Formule: ${calculatedAddElecKwh} kWh × €${ePrice.toFixed(2)}/kWh`
    });

    const calculatedNetSavingsEuro = Math.round(calculatedGasSavingsEuro + fixedGasSavingEuro - calculatedElecCostEuro);

    hpLpData.push({
      Onderdeel: "9. Jaarlijkse NETTO Financiele Besparing Warmtepomp (€)",
      Waarde: `€ ${calculatedNetSavingsEuro} / jaar`,
      Details: `Formule: Gasbesparing (€${calculatedGasSavingsEuro})${fixedGasSavingEuro > 0 ? ` + Vastrecht (€${fixedGasSavingEuro})` : ''} - Extra Elektra (€${calculatedElecCostEuro})`
    });

    const hpBrutoInv = chosenHpOption ? Math.round(chosenHpOption.brutoInvestment) : (wpInv + wpIsde);
    const hpSubsidie = chosenHpOption ? Math.round(chosenHpOption.subsidy) : wpIsde;
    const hpNettoInv = chosenHpOption ? Math.round(chosenHpOption.netInvestment) : wpInv;
    const hpTvt = calculatedNetSavingsEuro > 0 ? (hpNettoInv / calculatedNetSavingsEuro) : 99;

    hpLpData.push({
      Onderdeel: "10. Bruto Investeringskosten Warmtepomp",
      Waarde: `€ ${hpBrutoInv}`,
      Details: tech.customWarmtepompPrijs ? "Op basis van eigen prijsopgave" : "Standaard raming inclusief installatie"
    });
    hpLpData.push({
      Onderdeel: "11. ISDE Subsidie Warmtepomp",
      Waarde: `€ ${hpSubsidie}`,
      Details: "Mogelijke overheidsvergoeding via ISDE"
    });
    hpLpData.push({
      Onderdeel: "12. Netto Investering Warmtepomp",
      Waarde: `€ ${hpNettoInv}`,
      Details: `Formule: Bruto (€${hpBrutoInv}) - Subsidie (€${hpSubsidie})`
    });
    hpLpData.push({
      Onderdeel: "13. Berekende Terugverdientijd Warmtepomp (TVT)",
      Waarde: hpTvt < 90 ? `${hpTvt.toFixed(1)} jaar` : "N.v.t.",
      Details: `Formule: Netto Investering (€${hpNettoInv}) / Netto Jaarbesparing (€${calculatedNetSavingsEuro})`
    });
    hpLpData.push({
      Onderdeel: "14. Haalbaarheid & Advies",
      Waarde: chosenHpOption ? (chosenHpOption.isFeasible ? "Haalbaar & Geschikt" : "Beperkt geschikt") : "Geschikt",
      Details: chosenHpOption ? chosenHpOption.feasibilityReason : calculation.heatpump.explanation
    });

    hpLpData.push({});
    hpLpData.push({ Onderdeel: "ELEKTRISCH RIJDEN & LAADPAAL ANALYSE", Waarde: "", Details: "" });
    
    const lpSheetResult = calculation.laadpaal || {
      evAnnualDemandKwh: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100)),
      evSolarCoverageKwh: 0,
      evGridImportKwh: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100)),
      evSavingsEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * (0.50 - house.elektraPrijs)),
      ereRevenueEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * 0.12),
      totalSavingsEuro: Math.round(((tech.evKilometers ?? 15000) / 100) * (tech.evVerbruik ?? 18) * ((tech.evThuisLaden ?? 75) / 100) * (0.50 - house.elektraPrijs + 0.12)),
      netInvestmentEuro: 1200,
      tvt: 1.8
    };

    const evKmSheet = tech.evKilometers ?? 15000;
    const evCons = tech.evVerbruik ?? 18;
    const evHome = tech.evThuisLaden ?? 75;

    hpLpData.push({ Onderdeel: "Jaarkilometrage EV", Waarde: `${evKmSheet} km/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "EV Normverbruik", Waarde: `${evCons} kWh/100km`, Details: "" });
    hpLpData.push({ Onderdeel: "Thuislaad-aandeel", Waarde: `${evHome}%`, Details: "" });
    hpLpData.push({ Onderdeel: "Laadvermogen laadpaal", Waarde: `${tech.laadvermogen ?? 11} kW`, Details: "" });
    hpLpData.push({ Onderdeel: "Thuisgeladen volume", Waarde: `${lpSheetResult.evAnnualDemandKwh} kWh/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Zonnedekking laadsessies", Waarde: `${lpSheetResult.evSolarCoverageKwh} kWh/jaar`, Details: "Zonnestroom direct gebruikt voor de EV, in mindering gebracht op teruglevering en warmtepomp" });
    hpLpData.push({ Onderdeel: "Netstroom laadsessies", Waarde: `${lpSheetResult.evGridImportKwh} kWh/jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Laadpaal besparing (vs openbaar laden)", Waarde: `€ ${lpSheetResult.evSavingsEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Wettelijke ERE-vergoeding (€0,12/kWh)", Waarde: `€ ${lpSheetResult.ereRevenueEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Gecombineerd jaarlijks voordeel laadpaal", Waarde: `€ ${lpSheetResult.totalSavingsEuro} / jaar`, Details: "" });
    hpLpData.push({ Onderdeel: "Geschatte terugverdientijd laadpaal", Waarde: lpSheetResult.tvt < 90 ? `${lpSheetResult.tvt.toFixed(1)} jaar` : "N.v.t.", Details: `Op basis van € ${lpSheetResult.netInvestmentEuro} installatiekosten` });

    // Build the workbook
    const wb = XLSX.utils.book_new();

    const ws0 = XLSX.utils.json_to_sheet(liveRekenoverzichtData);
    XLSX.utils.book_append_sheet(wb, ws0, "0. Live Rekenoverzicht");
    ws0['!cols'] = [{ wch: 35 }, { wch: 45 }, { wch: 40 }, { wch: 50 }];

    const ws1 = XLSX.utils.json_to_sheet(generalData);
    XLSX.utils.book_append_sheet(wb, ws1, "1. Klant & Woning");
    ws1['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 45 }];

    const ws2 = XLSX.utils.json_to_sheet(insulationData);
    XLSX.utils.book_append_sheet(wb, ws2, "2. Isolatie");
    ws2['!cols'] = [{ wch: 35 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];

    const ws3 = XLSX.utils.json_to_sheet(solarData);
    XLSX.utils.book_append_sheet(wb, ws3, "3. Zonnepanelen");
    ws3['!cols'] = [{ wch: 45 }, { wch: 30 }, { wch: 65 }];

    const ws4 = XLSX.utils.json_to_sheet(batteryData);
    XLSX.utils.book_append_sheet(wb, ws4, "4. Thuisbatterij");
    ws4['!cols'] = [{ wch: 45 }, { wch: 30 }, { wch: 65 }];

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
    <div className="min-h-screen bg-[#faf7f2] text-slate-800 flex flex-col font-sans" id="app-container">
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
        Actieve Kerkdorpen: Panningen, Helden, Maasbree, Meijel, Baarlo, Kessel, Kessel-Eik, Grashoek, Koningslust, Beringe en Egchel.
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* 1. Invoer Gegevens & Instellingen (Woning, Isolatie, Zon, Accu, Warmtepomp, EV/Laadpaal) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">1</span>
              Invoer Gegevens &amp; Instellingen
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

        {/* 2. Energieplanner Peel en Maas - Totaalvoorstel & Persoonlijk Advies */}
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center font-bold">2</span>
              Energieplanner Peel en Maas - Totaalvoorstel &amp; Advies
            </h2>
            {calculation.addedMeasureForOptimization && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full animate-pulse">
                Subsidie-optimalisatie actief!
              </span>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* AI generated report & Totaalvoorstel (Header, Theme badges, Summary card & Active detail tab) */}
          <AdviceReport
            calculation={calculation}
            adviceMarkdown={adviceMarkdown}
            loading={loadingAdvice}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setTech={setTech}
          />

          {/* Grafieken - Direct hoger geplaatst onder het Totaalvoorstel voor snelle visuele inzichten */}
          {activeTab === 'zon' && (
            <div className="mt-4 animate-fadeIn">
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
            <div className="mt-4 animate-fadeIn">
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
            <div className="mt-4 animate-fadeIn">
              <LaadpaalSolarChart
                resident={resident}
                house={house}
                insulation={insulation}
                tech={tech}
                setTech={setTech}
              />
            </div>
          )}
        </div>

        {/* Grote actieknop - altijd onderin als laatste op alle tabbladen */}
        <div className="mt-8 pt-6 border-t border-slate-200/80">
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
