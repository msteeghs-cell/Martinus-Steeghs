import React, { useEffect, useState, useMemo } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { 
  User, Home, Layers, Battery, Sun, HelpCircle, 
  Sparkles, RefreshCw, Calendar, CheckCircle2, Zap, Info,
  TrendingDown, Gauge, AlertTriangle, Trash2, Download, Check, Sliders,
  FileSpreadsheet, PiggyBank, FileText, RotateCcw, ShieldCheck
} from 'lucide-react';
import { EnergyCostPdfModal } from './EnergyCostPdfModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ComposedChart,
  Line
} from 'recharts';
import { calculateAll, getSolarInvestmentEstimate, getSolarInvestmentRange, getBatteryInvestmentEstimate, getBatteryInvestmentRange, getHeatpumpCopFactor } from '../utils/calculator';

interface InputFormProps {
  resident: ResidentData;
  setResident: React.Dispatch<React.SetStateAction<ResidentData>>;
  house: HouseData;
  setHouse: React.Dispatch<React.SetStateAction<HouseData>>;
  insulation: InsulationData;
  setInsulation: React.Dispatch<React.SetStateAction<InsulationData>>;
  tech: TechData;
  setTech: React.Dispatch<React.SetStateAction<TechData>>;
  onGenerate: () => void;
  loading: boolean;
  activeTab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal';
  setActiveTab: (tab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal') => void;
  onWis: () => void;
  onDownloadExcel: () => void;
  onDownloadJSON: () => void;
}

function Tooltip({
  text,
  align = 'left',
  position = 'top'
}: {
  text: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  position?: 'top' | 'bottom';
}) {
  let alignClasses = 'left-0 translate-x-0';
  let arrowAlignClasses = 'left-3';

  if (align === 'center') {
    alignClasses = 'left-1/2 -translate-x-1/2';
    arrowAlignClasses = 'left-1/2 -translate-x-1/2';
  } else if (align === 'right') {
    alignClasses = 'right-0 translate-x-0';
    arrowAlignClasses = 'right-3';
  }

  const posClasses = position === 'bottom'
    ? 'top-full mt-2'
    : 'bottom-full mb-2';

  const arrowPosClasses = position === 'bottom'
    ? 'bottom-full border-4 border-transparent border-b-slate-900'
    : 'top-full border-4 border-transparent border-t-slate-900';

  return (
    <span className="group relative inline-block text-slate-400 hover:text-slate-600 cursor-help ml-1.5 align-middle shrink-0 z-30 hover:z-[9999]">
      <HelpCircle className="w-3.5 h-3.5" />
      <span className={`pointer-events-none absolute hidden group-hover:block w-64 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl z-[9999] font-normal leading-relaxed normal-case text-left ${posClasses} ${alignClasses}`}>
        {text}
        <span className={`absolute ${arrowPosClasses} ${arrowAlignClasses}`} />
      </span>
    </span>
  );
}

export default function InputForm({
  resident,
  setResident,
  house,
  setHouse,
  insulation,
  setInsulation,
  tech,
  setTech,
  onGenerate,
  loading,
  activeTab,
  setActiveTab,
  onWis,
  onDownloadExcel,
  onDownloadJSON
}: InputFormProps) {
  const [fetchingBag, setFetchingBag] = useState(false);
  const [bagSuccess, setBagSuccess] = useState<boolean | null>(null);
  const [smartCalcReason, setSmartCalcReason] = useState<string>('');
  const [simulatedSpotPrice, setSimulatedSpotPrice] = useState<number>(0.08);
  const [activePreset, setActivePreset] = useState<'60s' | '70s' | '80s' | '90s' | '2000s' | 'modern' | null>(() => {
    if (house.bouwjaar === 1965) return '60s';
    if (house.bouwjaar === 1974) return '70s';
    if (house.bouwjaar === 1984) return '80s';
    if (house.bouwjaar === 1994) return '90s';
    if (house.bouwjaar === 2005) return '2000s';
    if (house.bouwjaar === 2010 || house.bouwjaar === 2023) return 'modern';
    return null;
  });

  const [presetSnapshot, setPresetSnapshot] = useState<{ house: HouseData; tech: TechData } | null>(() => {
    return { house: { ...house }, tech: { ...tech } };
  });

  const [showSimExplanation, setShowSimExplanation] = useState<boolean>(false);
  const [showEnergyPdfModal, setShowEnergyPdfModal] = useState<boolean>(false);

  const isPresetModified = useMemo(() => {
    if (!activePreset || !presetSnapshot) return false;
    return (
      house.verwarming !== presetSnapshot.house.verwarming ||
      house.zonnepanelenPresent !== presetSnapshot.house.zonnepanelenPresent ||
      tech.aantalZonnepanelen !== presetSnapshot.tech.aantalZonnepanelen ||
      tech.capaciteitAccu !== presetSnapshot.tech.capaciteitAccu ||
      tech.evKilometers !== presetSnapshot.tech.evKilometers ||
      house.verbruikM3 !== presetSnapshot.house.verbruikM3 ||
      house.verbruikKwh !== presetSnapshot.house.verbruikKwh ||
      house.bouwjaar !== presetSnapshot.house.bouwjaar ||
      house.woonoppervlakte !== presetSnapshot.house.woonoppervlakte ||
      house.energielabel !== presetSnapshot.house.energielabel
    );
  }, [activePreset, presetSnapshot, house, tech]);

  const isNulmeting = useMemo(() => {
    return (
      tech.aantalZonnepanelen === 0 &&
      tech.capaciteitAccu === 0 &&
      (house.verwarming === 'CV-ketel' || !house.verwarming) &&
      (tech.evKilometers || 0) === 0
    );
  }, [tech.aantalZonnepanelen, tech.capaciteitAccu, tech.evKilometers, house.verwarming]);

  const handleSetNulmeting = () => {
    setTech(prev => ({
      ...prev,
      aantalZonnepanelen: 0,
      capaciteitAccu: 0,
      evKilometers: 0,
      evThuisLaden: 0,
      laadvermogen: 0,
      batteryGridTrading: false,
      pvCurtailmentMode: true,
      solarStatus: 'nieuw',
      heatpumpStatus: 'nieuw',
      batteryStatus: 'nieuw',
      laadpaalStatus: 'nieuw',
    }));
    setHouse(prev => ({
      ...prev,
      verwarming: 'CV-ketel',
      tapwater: 'CV-ketel',
      zonnepanelenPresent: 'Nee',
      verbruikM3: prev.verbruikM3 === 0 ? 1500 : prev.verbruikM3,
    }));
  };

  const handleSetNulmetingPv = () => {
    setTech(prev => ({
      ...prev,
      aantalZonnepanelen: 10,
      solarStatus: 'bestaand',
      capaciteitAccu: 0,
      evKilometers: 0,
      evThuisLaden: 0,
      laadvermogen: 0,
      batteryGridTrading: false,
      batteryStatus: 'nieuw',
      heatpumpStatus: 'nieuw',
      laadpaalStatus: 'nieuw',
    }));
    setHouse(prev => ({
      ...prev,
      verwarming: 'CV-ketel',
      tapwater: 'CV-ketel',
      zonnepanelenPresent: 'Ja',
      verbruikM3: prev.verbruikM3 === 0 ? 1500 : prev.verbruikM3,
    }));
  };

  const handleSetNulmetingPvAccu = () => {
    setTech(prev => ({
      ...prev,
      aantalZonnepanelen: prev.aantalZonnepanelen > 0 ? prev.aantalZonnepanelen : 12,
      solarStatus: 'bestaand',
      capaciteitAccu: prev.capaciteitAccu > 0 ? prev.capaciteitAccu : 10,
      batteryStatus: 'bestaand',
      heatpumpStatus: 'nieuw',
      evKilometers: 0,
      evThuisLaden: 0,
      laadvermogen: 0,
      laadpaalStatus: 'nieuw',
      batteryGridTrading: false,
    }));
    setHouse(prev => ({
      ...prev,
      verwarming: 'CV-ketel',
      tapwater: 'CV-ketel',
      zonnepanelenPresent: 'Ja',
      verbruikM3: prev.verbruikM3 === 0 ? 1500 : prev.verbruikM3,
    }));
  };

  const handleSetNulmetingWpPv = () => {
    setTech(prev => ({
      ...prev,
      aantalZonnepanelen: 12,
      solarStatus: 'bestaand',
      selectedWarmtepompType: 'All-Electric',
      selectedWarmtepompModel: 'Standard',
      heatpumpStatus: 'bestaand',
      capaciteitAccu: 0,
      batteryStatus: 'nieuw',
      evKilometers: 0,
      laadpaalStatus: 'nieuw',
      batteryGridTrading: false,
    }));
    setHouse(prev => ({
      ...prev,
      verwarming: 'Volledige warmtepomp',
      tapwater: 'Warmtepompboiler',
      zonnepanelenPresent: 'Ja',
      verbruikM3: 0,
    }));
  };

  // Helper to update resident data and auto-update datum to today
  const updateResident = (updater: Partial<ResidentData> | ((prev: ResidentData) => Partial<ResidentData>)) => {
    const today = new Date().toISOString().split('T')[0];
    setResident(prev => {
      const changes = typeof updater === 'function' ? updater(prev) : updater;
      return {
        ...prev,
        ...changes,
        datum: changes.datum !== undefined ? changes.datum : today
      };
    });
  };

  // Calculate local solar yield and break-even points for the 'zon' tab (declared at top so available to all hooks)
  const liveCalcResult = calculateAll(resident, house, insulation, tech);
  const liveStookgedragBerekend = liveCalcResult.house.stookgedragBerekend;

  const paneelVermogenLocal = tech.vermogenPerPaneel || 400;
  const totalWpLocal = tech.aantalZonnepanelen * paneelVermogenLocal;
  const orientRadLocal = (tech.dakOrientatie * Math.PI) / 180;
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

  // Auto update registration code when postcode, house number or addition changes
  useEffect(() => {
    const pc = resident.postcode.replace(/\s/g, '').toUpperCase();
    const nr = resident.huisnummer;
    const tv = resident.toevoeging;
    setResident(prev => ({
      ...prev,
      registratiecode: pc + nr + tv
    }));
  }, [resident.postcode, resident.huisnummer, resident.toevoeging]);

  // Handle change in number of solar panels
  const handleAantalZonnepanelenChange = (newVal: number) => {
    if (tech.aantalZonnepanelen === newVal) return;

    // Estimate yield for newVal panels to calculate new direct self-consumption default
    const singlePanelYield = (tech.vermogenPerPaneel || 400) * 0.90; // approx Wp yield factor
    const newYield = newVal * singlePanelYield;
    const verbruik = house.verbruikKwh || 3500;
    const ratio = newYield > 0 ? verbruik / newYield : 1;

    let calculatedSelfConsumption = 30;
    if (ratio > 2.0) {
      calculatedSelfConsumption = 40;
    } else if (ratio > 1.2) {
      calculatedSelfConsumption = 35;
    } else if (ratio >= 0.8) {
      calculatedSelfConsumption = 30;
    } else if (ratio >= 0.4) {
      calculatedSelfConsumption = 25;
    } else {
      calculatedSelfConsumption = 20;
    }

    setTech(prev => ({ 
      ...prev, 
      aantalZonnepanelen: newVal,
      huidigDirectVerbruik: newVal > 0 ? calculatedSelfConsumption : 30
    }));
  };

  const calculatePostSalderingEarnings = (cap: number, prov: 'Zonneplan' | 'Tibber' | 'Frank' | 'Anwb', customPriceOverride?: number) => {
    if (cap <= 0 || localAnnualYieldKwh <= 0) {
      return {
        directSavings: 0,
        arbitrageYield: 0,
        totalSavings: 0,
        investment: 0,
        tvt: 0
      };
    }

    // Calculate efficiency increase
    const avgDaily = localAnnualYieldKwh / 365;
    const ratio = cap / avgDaily;
    const rawIncrease = 40 * (1 - Math.exp(-0.7 * ratio));
    const omzettingsverliezen = tech.omzettingsverliezen !== undefined ? tech.omzettingsverliezen : 20;
    const effIncrease = rawIncrease * (1 - omzettingsverliezen / 100);
    const optSelfConsumption = Math.min(100, tech.huidigDirectVerbruik + effIncrease);
    
    const baseSelfConsumptionKwh = (localAnnualYieldKwh * tech.huidigDirectVerbruik) / 100;
    const optSelfConsumptionKwh = (localAnnualYieldKwh * optSelfConsumption) / 100;
    
    // Direct savings on increased self-consumption: replacing grid purchase (house.elektraPrijs) instead of feeding back (assumed 0.06 return rate)
    const directSavings = (optSelfConsumptionKwh - baseSelfConsumptionKwh) * (house.elektraPrijs - 0.06);

    // Arbitrage trading based on provider (rate in € per kWh capacity per year)
    let arbitragePerKwh = 24.75;
    if (prov === 'Zonneplan') {
      arbitragePerKwh = 38.25;
    } else if (prov === 'Frank') {
      arbitragePerKwh = 31.5;
    } else if (prov === 'Tibber') {
      arbitragePerKwh = 29.25;
    } else if (prov === 'Anwb') {
      arbitragePerKwh = 27.00;
    }
    const arbitrageYield = tech.batteryGridTrading ? cap * arbitragePerKwh : 0;
    const totalSavings = directSavings + arbitrageYield;

    // Investment estimation (with VAT reclamation: net = bruto * 100/121)
    let bruto = getBatteryInvestmentEstimate(cap);
    if (customPriceOverride !== undefined && customPriceOverride > 0) {
      bruto = customPriceOverride;
    }
    const netInvestment = bruto * (100 / 121);
    const tvt = totalSavings > 0 ? netInvestment / totalSavings : 99;

    return {
      directSavings,
      arbitrageYield,
      totalSavings,
      investment: netInvestment,
      tvt
    };
  };

  // BAG & EP-Online fetch
  const autoFetchBag = async () => {
    const pc = resident.postcode.replace(/\s/g, '').toUpperCase();
    const nr = resident.huisnummer;

    if (pc.length >= 4 && nr.length >= 1) {
      setFetchingBag(true);
      setBagSuccess(null);
      
      // 1. Kadaster BAG Fetch
      try {
        const kadasterKey = "l7a22b73157f084f1b9dbb5caeba5d1047";
        const url = `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressenuitgebreid?postcode=${pc}&huisnummer=${nr}`;
        const response = await fetch(url, { 
          headers: { 
            "X-Api-Key": kadasterKey, 
            "Accept-Crs": "epsg:28992" 
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data._embedded && data._embedded.adressen && data._embedded.adressen.length > 0) {
            const adres = data._embedded.adressen[0];
            const straat = adres.openbareRuimteNaam || '';
            const plaats = adres.woonplaatsNaam || '';
            
            let bouwjaar = adres.oorspronkelijkBouwjaar || 0;
            if (!bouwjaar && adres.panden && adres.panden[0]) {
              bouwjaar = Array.isArray(adres.panden[0].oorspronkelijkBouwjaar) 
                ? adres.panden[0].oorspronkelijkBouwjaar[0] 
                : adres.panden[0].oorspronkelijkBouwjaar;
            }

            let opp = adres.gebruiksoppervlakte || adres.oppervlakte || 0;
            if (!opp && adres.adresseerbaarObject) {
              opp = adres.adresseerbaarObject.gebruiksoppervlakte || adres.adresseerbaarObject.oppervlakte || 0;
            }

            setResident(prev => ({
              ...prev,
              straat,
              plaats: ['Baarlo', 'Beringe', 'Egchel', 'Grashoek', 'Helden', 'Kessel', 'Kessel-Eik', 'Koningslust', 'Maasbree', 'Meijel', 'Panningen'].includes(plaats) ? plaats : prev.plaats
            }));

            setHouse(prev => ({
              ...prev,
              bouwjaar: bouwjaar || prev.bouwjaar,
              woonoppervlakte: opp || prev.woonoppervlakte
            }));
            
            setBagSuccess(true);
          }
        }
      } catch (error) {
        console.warn("Kadaster API error", error);
      }

      // 2. EP-Online Fetch
      try {
        const epOnlineKey = "MjVDQTk3N0FCNzQ4MEMwOUZFOUNFODA4OTg3QTJDRDZCQjY2Mjk0MTBEMjE0NDg5NDE2RERFOTgwNDE3NDc0MzlBM0VFOTREQUQzOUJFNDgwM0REM0MyOTg3RTBCQTk4"; 
        const epUrl = `https://public.ep-online.nl/api/v5/PandEnergielabel/Adres?postcode=${pc}&huisnummer=${nr}`;
        const epResponse = await fetch(epUrl, { headers: { "Authorization": epOnlineKey } });

        if (epResponse.ok) {
          const epData = await epResponse.json();
          if (epData && epData.length > 0) {
            const labelLetter = epData[0].labelLetter || epData[0].labelKlasse || epData[0].energieklasse || "";
            if (labelLetter) {
              const l = labelLetter.toUpperCase();
              let formattedLabel: any = 'Geen';
              if (l.includes("A") || l.includes("B") || l.includes("C")) formattedLabel = "A - B - C";
              else if (l.includes("D")) formattedLabel = "D";
              else if (l.includes("E")) formattedLabel = "E";
              else if (l.includes("F")) formattedLabel = "F";
              else if (l.includes("G")) formattedLabel = "G";

              setHouse(prev => ({
                ...prev,
                energielabel: formattedLabel
              }));
            }
          }
        }
      } catch (error) {
        console.warn("EP-Online API error", error);
      }

      setFetchingBag(false);
    }
  };

  const calculateSmartSelfConsumption = () => {
    let base = 30;
    const details: string[] = [];

    // Household size
    if (resident.aantalPersonen === 1) {
      base = 25;
      details.push('1 persoon');
    } else if (resident.aantalPersonen >= 4) {
      base = 35;
      details.push(`${resident.aantalPersonen} personen`);
    } else {
      details.push(`${resident.aantalPersonen} personen`);
    }

    // Heating system
    if (house.verwarming === 'Hybride warmtepomp') {
      base += 5;
      details.push('hybride WP (+5%)');
    } else if (house.verwarming === 'Full electric') {
      base += 10;
      details.push('full electric WP (+10%)');
    }

    // Airco/Cooling system
    if (house.afgiftesysteem === 'Airco') {
      base += 5;
      details.push('airco (+5%)');
    }

    // Induction cooking
    if (house.koken === 'Inductie') {
      base += 2;
      details.push('inductie (+2%)');
    }

    // Ventilation type
    if (house.ventilatie === 'Balans (Type D / WTW)') {
      base += 3;
      details.push('balansvent. (+3%)');
    }

    // Generation vs consumption ratio
    const paneelVermogen = tech.vermogenPerPaneel || 400;
    const totalWp = tech.aantalZonnepanelen * paneelVermogen;
    const orientRad = (tech.dakOrientatie * Math.PI) / 180;
    const cosOrient = Math.cos(orientRad);
    let orientationFactor = 1.0;
    if (cosOrient >= 0) {
      orientationFactor = 0.85 + 0.15 * cosOrient;
    } else {
      orientationFactor = 0.85 + 0.30 * cosOrient;
    }
    const annualYieldKwh = (totalWp / 1000) * 900 * orientationFactor;

    if (annualYieldKwh > 0 && house.verbruikKwh > 0) {
      const ratio = annualYieldKwh / house.verbruikKwh;
      if (ratio < 0.5) {
        base += 15;
        details.push('lage opwek/vraag verhouding (+15%)');
      } else if (ratio < 0.8) {
        base += 5;
        details.push('matige opwek/vraag verhouding (+5%)');
      } else if (ratio > 1.2 && ratio <= 1.8) {
        base -= 5;
        details.push('hoge opwek/vraag verhouding (-5%)');
      } else if (ratio > 1.8) {
        base -= 10;
        details.push('zeer hoge opwek/vraag verhouding (-10%)');
      }
    }

    const finalVal = Math.max(10, Math.min(80, Math.round(base / 5) * 5));
    setTech(prev => ({ ...prev, huidigDirectVerbruik: finalVal }));
    setSmartCalcReason(`Slim berekend op ${finalVal}% op basis van ingevoerde gegevens.`);
  };

  // Presets
  const applyPreset = (type: '60s' | '70s' | '80s' | '90s' | '2000s' | 'modern') => {
    setActivePreset(type);
    const todayStr = new Date().toISOString().split('T')[0];
    let nextHouse: HouseData;
    let nextTech: TechData;

    if (type === '60s') {
      setResident({
        naam: 'Piet Berends',
        registratiecode: 'PM-60PB-19',
        brutoGezinsinkomen: 38000,
        coach: 'Online Zelfscan',
        datum: todayStr,
        aanhef: 'De heer',
        voorletters: 'P.',
        achternaam: 'Berends',
        straat: 'Schoolstraat',
        huisnummer: '19',
        toevoeging: '',
        postcode: '5981AB',
        plaats: 'Panningen',
        aantalPersonen: 2,
        telefoon: '0611223344',
        email: 'piet@berends.nl',
        akkoord: true
      });
      nextHouse = {
        wozWaarde: 295000,
        energielabel: 'F',
        verbruikKwh: 2900,
        verbruikM3: 1750,
        soortWoning: 'Tussenwoning',
        bouwjaar: 1965,
        woonoppervlakte: 115,
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
      setHouse(nextHouse);
      setInsulation({
        vloer: 45,
        bodem: 0,
        spouw: 55,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 10,
        glasDubbelHR: 0,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 0,
        dakOrientatie: 0,
        huidigDirectVerbruik: 30,
        capaciteitAccu: 0,
        omzettingsverliezen: 20,
        typeContract: 'Vast',
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      };
      setTech(nextTech);
    } else if (type === '70s') {
      setResident({
        naam: 'Jan Janssen',
        registratiecode: 'PM-70TJ-88',
        brutoGezinsinkomen: 45000,
        coach: 'Online Zelfscan',
        datum: todayStr,
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
      });
      nextHouse = {
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
      setHouse(nextHouse);
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 60,
        zolderVliering: 40,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 12,
        glasDubbelHR: 0,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 4,
        dakOrientatie: 45, // South-West
        huidigDirectVerbruik: 30,
        capaciteitAccu: 0,
        omzettingsverliezen: 20,
        typeContract: 'Vast',
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      };
      setTech(nextTech);
    } else if (type === '80s') {
      setResident({
        naam: 'Karel Visser',
        registratiecode: 'PM-80KV-33',
        brutoGezinsinkomen: 52000,
        coach: 'Online Zelfscan',
        datum: todayStr,
        aanhef: 'De heer',
        voorletters: 'K.',
        achternaam: 'Visser',
        straat: 'Dorpsstraat',
        huisnummer: '33',
        toevoeging: '',
        postcode: '5981AE',
        plaats: 'Panningen',
        aantalPersonen: 3,
        telefoon: '0622334455',
        email: 'karel@visser.nl',
        akkoord: true
      });
      nextHouse = {
        wozWaarde: 365000,
        energielabel: 'D',
        verbruikKwh: 3100,
        verbruikM3: 1450,
        soortWoning: 'Hoekwoning',
        bouwjaar: 1984,
        woonoppervlakte: 125,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Radiatoren',
        tapwater: 'CV-ketel',
        koken: 'Gas',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Nee',
        elektraPrijs: 0.35,
        elektraTeruglevering: 0,
        gasPrijs: 1.50,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'matig',
        isoGevel: 'slecht',
        isoGlasBg: 'slecht',
        isoGlasVd: 'slecht',
        isoVloer: 'matig',
        isoKieren: 'Nee, onderhoud nodig',
        inkomenCheck: true
      };
      setHouse(nextHouse);
      setInsulation({
        vloer: 45,
        bodem: 0,
        spouw: 60,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 14,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 0,
        dakOrientatie: 0,
        huidigDirectVerbruik: 30,
        capaciteitAccu: 0,
        omzettingsverliezen: 20,
        typeContract: 'Vast',
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      };
      setTech(nextTech);
    } else if (type === '90s') {
      setResident({
        naam: 'Familie Smeets',
        registratiecode: 'PM-90HW-42',
        brutoGezinsinkomen: 72000,
        coach: 'Online Zelfscan',
        datum: todayStr,
        aanhef: 'De heer en mevrouw',
        voorletters: 'H. & M.',
        achternaam: 'Smeets',
        straat: 'Rijksweg',
        huisnummer: '12',
        toevoeging: 'A',
        postcode: '5991BC',
        plaats: 'Baarlo',
        aantalPersonen: 4,
        telefoon: '0687654321',
        email: 'info@smeets.nl',
        akkoord: true
      });
      nextHouse = {
        wozWaarde: 410000,
        energielabel: 'D',
        verbruikKwh: 3800,
        verbruikM3: 2100,
        soortWoning: 'Vrijstaand',
        bouwjaar: 1994,
        woonoppervlakte: 160,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Radiatoren',
        tapwater: 'CV-ketel',
        koken: 'Inductie',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.35,
        elektraTeruglevering: 1500,
        gasPrijs: 1.50,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'slecht',
        isoGevel: 'slecht',
        isoGlasBg: 'matig',
        isoGlasVd: 'slecht',
        isoVloer: 'slecht',
        isoKieren: 'Ja, in orde',
        inkomenCheck: false
      };
      setHouse(nextHouse);
      setInsulation({
        vloer: 50,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 50,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 15,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 10,
        dakOrientatie: 0, // South
        huidigDirectVerbruik: 35,
        capaciteitAccu: 5,
        omzettingsverliezen: 20,
        typeContract: 'Dynamisch',
        evKilometers: 10000,
        evVerbruik: 18,
        evThuisLaden: 60,
        laadvermogen: 11,
      };
      setTech(nextTech);
    } else if (type === '2000s') {
      setResident({
        naam: 'Familie Hendriks',
        registratiecode: 'PM-05VW-28',
        brutoGezinsinkomen: 85000,
        coach: 'Online Zelfscan',
        datum: todayStr,
        aanhef: 'De heer en mevrouw',
        voorletters: 'M. & K.',
        achternaam: 'Hendriks',
        straat: 'Bosrand',
        huisnummer: '28',
        toevoeging: '',
        postcode: '5981NE',
        plaats: 'Panningen',
        aantalPersonen: 4,
        telefoon: '0698765432',
        email: 'info@hendriks-bosrand.nl',
        akkoord: true
      });
      nextHouse = {
        wozWaarde: 440000,
        energielabel: 'A - B - C',
        verbruikKwh: 3500,
        verbruikM3: 1350,
        soortWoning: 'Twee onder een kap',
        bouwjaar: 2005,
        woonoppervlakte: 145,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Vloerverwarming',
        tapwater: 'CV-ketel',
        koken: 'Inductie',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.35,
        elektraTeruglevering: 1500,
        gasPrijs: 1.50,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'goed',
        isoGevel: 'goed',
        isoGlasBg: 'goed',
        isoGlasVd: 'goed',
        isoVloer: 'goed',
        isoKieren: 'Ja, in orde',
        inkomenCheck: false
      };
      setHouse(nextHouse);
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 20,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 10,
        dakOrientatie: 0, // South
        huidigDirectVerbruik: 35,
        capaciteitAccu: 0,
        omzettingsverliezen: 20,
        typeContract: 'Vast',
        batteryGridTrading: false,
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      };
      setTech(nextTech);
    } else if (type === 'modern') {
      setResident({
        naam: 'Anouk de Vries',
        registratiecode: 'PM-10AV-11',
        brutoGezinsinkomen: 78000,
        coach: 'Online Zelfscan',
        datum: todayStr,
        aanhef: 'Mevrouw',
        voorletters: 'A.',
        achternaam: 'de Vries',
        straat: 'Nieuwbouwweg',
        huisnummer: '12',
        toevoeging: '',
        postcode: '5995XH',
        plaats: 'Kessel',
        aantalPersonen: 4,
        telefoon: '0655443322',
        email: 'anouk@devries.nl',
        akkoord: true
      });
      nextHouse = {
        wozWaarde: 580000,
        energielabel: 'A - B - C',
        verbruikKwh: 4200,
        verbruikM3: 1700,
        soortWoning: 'Vrijstaand',
        bouwjaar: 2010,
        woonoppervlakte: 250,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Vloerverwarming',
        tapwater: 'CV-ketel',
        koken: 'Inductie',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.35,
        elektraTeruglevering: 2000,
        gasPrijs: 1.50,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'goed',
        isoGevel: 'goed',
        isoGlasBg: 'goed',
        isoGlasVd: 'goed',
        isoVloer: 'goed',
        isoKieren: 'Ja, in orde',
        inkomenCheck: false
      };
      setHouse(nextHouse);
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 25,
        glasTripleHout: 0,
      });
      nextTech = {
        aantalZonnepanelen: 12,
        dakOrientatie: 0, // South
        huidigDirectVerbruik: 35,
        capaciteitAccu: 0,
        omzettingsverliezen: 20,
        typeContract: 'Vast',
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      };
      setTech(nextTech);
    }
    setPresetSnapshot({ house: nextHouse!, tech: nextTech! });
  };

  // Quick lookup links
  const openWoz = (e: any) => {
    e.preventDefault();
    const pc = resident.postcode.trim();
    const nr = resident.huisnummer.trim();
    const tv = resident.toevoeging.trim();
    const fullAdres = `${pc} ${nr} ${tv}`.trim();
    if (fullAdres) {
      navigator.clipboard.writeText(fullAdres).then(() => {
        alert("✅ Postcode en huisnummer zijn gekopieerd naar je klembord!\n\nJe kunt dit direct Plakken (Ctrl+V) in het WOZ-waardeloket.");
        window.open('https://www.wozwaardeloket.nl/', '_blank');
      }).catch(() => {
        window.open('https://www.wozwaardeloket.nl/', '_blank');
      });
    } else {
      window.open('https://www.wozwaardeloket.nl/', '_blank');
    }
  };

  const openEpOnline = (e: any) => {
    e.preventDefault();
    const pc = resident.postcode.trim();
    const nr = resident.huisnummer.trim();
    const tv = resident.toevoeging.trim();
    const fullAdres = `${pc} ${nr} ${tv}`.trim();
    if (fullAdres) {
      navigator.clipboard.writeText(fullAdres).then(() => {
        alert("✅ Postcode en huisnummer zijn gekopieerd naar je klembord!\n\nJe kunt dit direct Plakken (Ctrl+V) op de EP-Online website.");
        window.open('https://www.ep-online.nl/', '_blank');
      }).catch(() => {
        window.open('https://www.ep-online.nl/', '_blank');
      });
    } else {
      window.open('https://www.ep-online.nl/', '_blank');
    }
  };

  // (Note: localAnnualYieldKwh and its helper variables are declared at the top of the component so they can be referenced everywhere)

  const opslagLeverancier = tech.opslagLeverancier !== undefined ? tech.opslagLeverancier : 0.02;

  // Personal break-even calculations
  const breakEvenFeedIn = opslagLeverancier; // Spot price at which net feed-in is negative
  const energyTaxAndVat = 0.15; // standard ODE + tax + VAT in NL is around 15 cents
  const breakEvenImport = -(opslagLeverancier + energyTaxAndVat); // Spot price at which importing is net-free

  // Active advice calculation
  let adviceTitle = '';
  let adviceText = '';
  let adviceColor = '';

  if (simulatedSpotPrice > breakEvenFeedIn) {
    adviceTitle = 'Zorgeloos Terugleveren';
    adviceText = `De spotprijs (€${simulatedSpotPrice.toFixed(2)}/kWh) is hoger dan je inkoopopslag van €${opslagLeverancier.toFixed(2)}/kWh. Je verdient momenteel netto €${(simulatedSpotPrice - opslagLeverancier).toFixed(3)} per teruggeleverde kWh. Jouw zonnepanelen leveren nu direct winst op!`;
    adviceColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  } else if (simulatedSpotPrice <= breakEvenFeedIn && simulatedSpotPrice > breakEvenImport) {
    adviceTitle = 'Licht Negatieve Prijs: Verbruik Direct Stroom';
    adviceText = `Ondanks de lage of negatieve spotprijs (€${simulatedSpotPrice.toFixed(2)}/kWh), kost het importeren van stroom van het net nog steeds geld (€${(simulatedSpotPrice + opslagLeverancier + energyTaxAndVat).toFixed(3)}/kWh incl. belastingen). Zet nu grote stroomverbruikers (wasmachine, vaatwasser) aan om je EIGEN gratis zonnestroom te verbruiken en voorkom dat je betaalt om terug te leveren!`;
    adviceColor = 'bg-amber-50 border-amber-200 text-amber-800';
  } else {
    adviceTitle = 'Extreem Negatieve Prijs: Schakel uiterlijk uit of Laad op!';
    adviceText = `De spotprijs is extreem negatief (€${simulatedSpotPrice.toFixed(2)}/kWh). Zelfs inclusief alle belastingen en opslagen levert het afnemen van stroom van het net je geld op! Schakel de omvormer van je zonnepanelen (indien mogelijk) tijdelijk uit en laad je elektrische auto of thuisaccu maximaal op vanaf het stroomnet!`;
    adviceColor = 'bg-blue-50 border-blue-200 text-blue-800';
  }

  return (
    <div className="space-y-4" id="input-form">
      {/* 6-Tab Navigation Bar matching user design - compact & themed */}
      <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 grid grid-cols-3 sm:grid-cols-6 gap-1 shadow-2xs" id="panelTabbar">
        {[
          {
            id: 'isolatie',
            label: 'Isolatie',
            icon: Layers,
            activeBg: 'bg-emerald-800 text-white border-emerald-800 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300',
            iconActive: 'text-white',
            iconInactive: 'text-emerald-600',
          },
          {
            id: 'zon',
            label: 'Zonnepanelen',
            icon: Sun,
            activeBg: 'bg-amber-500 text-white border-amber-500 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300',
            iconActive: 'text-white',
            iconInactive: 'text-amber-500',
          },
          {
            id: 'accu',
            label: 'Thuisaccu',
            icon: Battery,
            activeBg: 'bg-sky-600 text-white border-sky-600 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300',
            iconActive: 'text-white',
            iconInactive: 'text-sky-500',
          },
          {
            id: 'warmtepomp',
            label: 'Warmtepomp',
            icon: Zap,
            activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300',
            iconActive: 'text-white',
            iconInactive: 'text-emerald-600',
          },
          {
            id: 'laadpaal',
            label: 'Laadpaal',
            icon: Zap,
            activeBg: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-300',
            iconActive: 'text-white',
            iconInactive: 'text-indigo-500',
          },
          {
            id: 'saldering',
            label: 'Saldering',
            icon: RefreshCw,
            activeBg: 'bg-purple-700 text-white border-purple-700 shadow-xs',
            inactiveBg: 'bg-white text-slate-700 border-slate-200/80 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-300',
            iconActive: 'text-white',
            iconInactive: 'text-purple-600',
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center justify-center gap-1.5 py-1.5 md:py-2 px-1.5 md:px-2.5 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer ${
                isActive ? t.activeBg : t.inactiveBg
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? t.iconActive : t.iconInactive}`} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conditional rendering of tab panels */}
      {activeTab === 'isolatie' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Snelkoppelingen Presets */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Snel woning-profiel Laden
              </h3>
              {activePreset && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  Gekozen profiel actief
                  {isPresetModified && (
                    <span className="text-amber-700 font-extrabold bg-amber-100/90 border border-amber-300/60 px-1.5 py-0.2 rounded-md text-[10px] ml-0.5">
                      (Aangepast)
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Pas details aan in het overeenkomstige Tabblad.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                {
                  id: '60s' as const,
                  title: "Jaren '60",
                  subtitle: 'Tussenwoning • 110 m² • Label F',
                  activeStyle: 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-rose-200 bg-rose-50/40 text-rose-800 hover:bg-rose-100/70',
                },
                {
                  id: '70s' as const,
                  title: "Jaren '70",
                  subtitle: '2-onder-1-kap • 130 m² • Label E',
                  activeStyle: 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-orange-200 bg-orange-50/40 text-orange-800 hover:bg-orange-100/70',
                },
                {
                  id: '80s' as const,
                  title: "Jaren '80",
                  subtitle: 'Hoekwoning • 125 m² • Label D',
                  activeStyle: 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-amber-200 bg-amber-50/40 text-amber-800 hover:bg-amber-100/70',
                },
                {
                  id: '90s' as const,
                  title: "Jaren '90",
                  subtitle: 'Vrijstaand • 160 m² • Label C',
                  activeStyle: 'bg-yellow-600 text-white border-yellow-600 ring-2 ring-yellow-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-yellow-200 bg-yellow-50/40 text-yellow-800 hover:bg-yellow-100/70',
                },
                {
                  id: '2000s' as const,
                  title: '2000 - 2010',
                  subtitle: '2-onder-1-kap • 145 m² • Label B',
                  activeStyle: 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-sky-200 bg-sky-50/40 text-sky-800 hover:bg-sky-100/70',
                },
                {
                  id: 'modern' as const,
                  title: 'Woning 2010',
                  subtitle: 'Vrijstaand • 250 m² • Label A',
                  activeStyle: 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400 shadow-md scale-[1.03]',
                  inactiveStyle: 'border-emerald-200 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-100/70',
                },
              ].map((preset) => {
                const isActive = activePreset === preset.id;
                
                const liveType = house.soortWoning === 'Twee onder een kap' ? '2-onder-1-kap' : (house.soortWoning || '');
                const liveArea = house.woonoppervlakte ? `${house.woonoppervlakte} m²` : '';
                const rawLabel = house.energielabel || '';
                const liveLabel = rawLabel ? (rawLabel.startsWith('Label') ? rawLabel : `Label ${rawLabel}`) : '';
                const liveSubtitle = [liveType, liveArea, liveLabel].filter(Boolean).join(' • ');
                const displaySubtitle = (isActive && liveSubtitle) ? liveSubtitle : preset.subtitle;

                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    type="button"
                    className={`relative flex flex-col items-center justify-center p-2.5 text-xs font-medium border rounded-xl transition duration-150 ${
                      isActive ? preset.activeStyle : preset.inactiveStyle
                    }`}
                    id={`preset-${preset.id}-btn`}
                  >
                    {isActive && (
                      <span className="absolute -top-2 -right-1 bg-white text-emerald-800 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-300 shadow-xs flex items-center gap-0.5 whitespace-nowrap">
                        <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" /> Gekozen
                      </span>
                    )}
                    <span className="font-extrabold">{preset.title}</span>
                    <span className={`text-[10px] ${isActive ? 'text-white/90 font-medium' : 'text-slate-600'}`}>
                      {displaySubtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Profile Modifiers */}
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-4 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Snel Profiel Aanpassen &amp; Nulmeting
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSetNulmeting}
                      title="Zet alle installaties/techniek op 0 voor een schone nulmeting"
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer whitespace-nowrap ${
                        isNulmeting
                          ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs'
                      }`}
                    >
                      <RotateCcw className={`w-3 h-3 ${isNulmeting ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>0-meting</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetNulmetingPv}
                      title="Nulmeting voor woning die al 10 zonnepanelen heeft (bestaand dak: €0 investering)"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer whitespace-nowrap ${
                        tech.solarStatus === 'bestaand' && tech.aantalZonnepanelen > 0 && house.verwarming === 'CV-ketel' && tech.capaciteitAccu === 0
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 shadow-2xs'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>0-meting met PV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetNulmetingPvAccu}
                      title="Nulmeting voor woning die al zonnepanelen én een thuisaccu heeft (€0 investering). Ideaal om een nieuwe warmtepomp of laadpaal toe te voegen!"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer whitespace-nowrap ${
                        tech.solarStatus === 'bestaand' && tech.aantalZonnepanelen > 0 && tech.batteryStatus === 'bestaand' && tech.capaciteitAccu > 0 && tech.heatpumpStatus !== 'bestaand'
                          ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50 hover:text-sky-800 shadow-2xs'
                      }`}
                    >
                      <Battery className="w-3 h-3 text-sky-500" />
                      <span>0-meting met PV + Accu</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSetNulmetingWpPv}
                      title="Nulmeting voor woning die al een warmtepomp en zonnepanelen heeft (€0 investering). Ideaal om aanvulling met Accu en Laadpaal te testen!"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer whitespace-nowrap ${
                        tech.heatpumpStatus === 'bestaand' && tech.solarStatus === 'bestaand' && tech.capaciteitAccu === 0
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 shadow-2xs'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-emerald-600" />
                      <span>0-meting met WP + PV</span>
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">
                  Kies "Nieuw" voor investering of "Bestaand (€0)" indien al aanwezig
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Warmtepomp / Verwarming */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('warmtepomp');
                        const el = document.getElementById('panelTabbar');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      title="Klik om direct naar het tabblad Warmtepomp te gaan"
                      className="flex items-center gap-1 hover:text-emerald-700 transition cursor-pointer group text-left"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="group-hover:underline underline-offset-2">Verwarming / WP</span>
                      <span className="text-[9px] text-slate-400 font-normal group-hover:text-emerald-600 transition-colors">➔</span>
                    </button>
                    {(() => {
                      const wpCapStr = tech.selectedWarmtepompModel === 'Middelgroot 8kW' ? '6-8 kW'
                        : tech.selectedWarmtepompModel === 'Groot 12kW' ? '10-12 kW'
                        : tech.selectedWarmtepompModel === 'LuchtLucht' ? 'Airco'
                        : tech.selectedWarmtepompModel === 'Standard' ? '4-5 kW' : '';
                      return (
                        <span className="font-semibold text-emerald-700 text-[10px] truncate max-w-[110px]" title={house.verwarming}>
                          {house.verwarming === 'Hybride warmtepomp'
                            ? `Hybride${wpCapStr ? ` (${wpCapStr})` : ''}`
                            : (house.verwarming === 'Volledige warmtepomp' || house.verwarming === 'Full electric')
                            ? `Volledig${wpCapStr ? ` (${wpCapStr})` : ''}`
                            : house.verwarming}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHouse(prev => ({ ...prev, verwarming: 'CV-ketel', tapwater: 'CV-ketel' }));
                        setTech(prev => ({ ...prev, selectedWarmtepompType: undefined, selectedWarmtepompModel: undefined, heatpumpStatus: 'nieuw' }));
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        house.verwarming === 'CV-ketel'
                          ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      CV-ketel
                    </button>
                    {(() => {
                      const wpCapStr = tech.selectedWarmtepompModel === 'Middelgroot 8kW' ? '6-8 kW'
                        : tech.selectedWarmtepompModel === 'Groot 12kW' ? '10-12 kW'
                        : tech.selectedWarmtepompModel === 'LuchtLucht' ? 'Airco'
                        : tech.selectedWarmtepompModel === 'Standard' ? '4-5 kW' : '';
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setHouse(prev => ({ ...prev, verwarming: 'Hybride warmtepomp' }));
                            setTech(prev => {
                              let nextModel = prev.selectedWarmtepompModel || 'Standard';
                              if (house.verwarming === 'Hybride warmtepomp') {
                                if (nextModel === 'Standard') nextModel = 'Middelgroot 8kW';
                                else if (nextModel === 'Middelgroot 8kW') nextModel = 'Groot 12kW';
                                else if (nextModel === 'Groot 12kW') nextModel = 'LuchtLucht';
                                else nextModel = 'Standard';
                              }
                              return { ...prev, selectedWarmtepompType: 'Hybride', selectedWarmtepompModel: nextModel };
                            });
                          }}
                          className={`py-1 px-1 text-[9.5px] leading-tight font-medium rounded-lg border text-center transition ${
                            house.verwarming === 'Hybride warmtepomp'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {house.verwarming === 'Hybride warmtepomp' && wpCapStr
                            ? `Hybride (${wpCapStr})`
                            : 'Hybride WP'}
                        </button>
                      );
                    })()}
                    {(() => {
                      const wpCapStr = tech.selectedWarmtepompModel === 'Middelgroot 8kW' ? '6-8 kW'
                        : tech.selectedWarmtepompModel === 'Groot 12kW' ? '10-12 kW'
                        : tech.selectedWarmtepompModel === 'LuchtLucht' ? 'Airco'
                        : tech.selectedWarmtepompModel === 'Standard' ? '4-5 kW' : '';
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setHouse(prev => ({ ...prev, verwarming: 'Volledige warmtepomp', tapwater: 'Warmtepompboiler' }));
                            setTech(prev => {
                              let nextModel = prev.selectedWarmtepompModel || 'Standard';
                              if (house.verwarming === 'Volledige warmtepomp' || house.verwarming === 'Full electric') {
                                if (nextModel === 'Standard') nextModel = 'Middelgroot 8kW';
                                else if (nextModel === 'Middelgroot 8kW') nextModel = 'Groot 12kW';
                                else if (nextModel === 'Groot 12kW') nextModel = 'LuchtLucht';
                                else nextModel = 'Standard';
                              }
                              return { ...prev, selectedWarmtepompType: 'All-Electric', selectedWarmtepompModel: nextModel };
                            });
                          }}
                          className={`py-1 px-1 text-[9.5px] leading-tight font-medium rounded-lg border text-center transition ${
                            house.verwarming === 'Volledige warmtepomp' || house.verwarming === 'Full electric'
                              ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {(house.verwarming === 'Volledige warmtepomp' || house.verwarming === 'Full electric') && wpCapStr
                            ? `Volledig WP (${wpCapStr})`
                            : 'Volledig WP'}
                        </button>
                      );
                    })()}
                  </div>
                  {/* Status Toggle WP */}
                  {house.verwarming !== 'CV-ketel' && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, heatpumpStatus: 'nieuw' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.heatpumpStatus !== 'bestaand' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🆕 Nieuw
                        </button>
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, heatpumpStatus: 'bestaand' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.heatpumpStatus === 'bestaand' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Warmtepomp is reeds aanwezig. Investering wordt op €0 gezet."
                        >
                          🏠 Bestaand (€0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Zonnepanelen */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('zon');
                          const el = document.getElementById('panelTabbar');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Klik om direct naar het tabblad Zonnepanelen te gaan"
                        className="flex items-center gap-1 hover:text-amber-700 transition cursor-pointer group text-left"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                        <span className="group-hover:underline underline-offset-2">Zonnepanelen</span>
                        <span className="text-[9px] text-slate-400 font-normal group-hover:text-amber-600 transition-colors">➔</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTech(prev => {
                          const nextType = prev.typeContract === 'Dynamisch' ? 'Vast' : 'Dynamisch';
                          return { ...prev, typeContract: nextType, batteryGridTrading: nextType === 'Dynamisch' };
                        })}
                        title="Klik om te wisselen tussen Dynamisch en Vast Tarief contract"
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border font-sans whitespace-nowrap transition cursor-pointer flex items-center gap-0.5 ${
                          tech.typeContract === 'Dynamisch'
                            ? 'text-purple-700 bg-purple-50 border-purple-200/80 hover:bg-purple-100 font-bold'
                            : 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{tech.typeContract === 'Dynamisch' ? '⚡ Dynamisch' : '🔒 Vast'}</span>
                      </button>
                    </div>
                    <span className="font-semibold text-emerald-700 text-[10px]">
                      {tech.aantalZonnepanelen > 0
                        ? `${tech.aantalZonnepanelen} panelen`
                        : 'Geen PV'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHouse(prev => ({ ...prev, zonnepanelenPresent: 'Nee' }));
                        setTech(prev => ({ ...prev, aantalZonnepanelen: 0, solarStatus: 'nieuw' }));
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.aantalZonnepanelen === 0
                          ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHouse(prev => ({ ...prev, zonnepanelenPresent: 'Ja' }));
                        setTech(prev => ({ ...prev, aantalZonnepanelen: 6 }));
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.aantalZonnepanelen === 6
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      6 st
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHouse(prev => ({ ...prev, zonnepanelenPresent: 'Ja' }));
                        setTech(prev => ({ ...prev, aantalZonnepanelen: 10 }));
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.aantalZonnepanelen === 10
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      10 st
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let nextVal = 16;
                        if (![0, 6, 10].includes(tech.aantalZonnepanelen)) {
                          if (tech.aantalZonnepanelen >= 40) {
                            nextVal = 16;
                          } else {
                            nextVal = tech.aantalZonnepanelen + 2;
                          }
                        }
                        handleAantalZonnepanelenChange(nextVal);
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.aantalZonnepanelen > 0 && tech.aantalZonnepanelen !== 6 && tech.aantalZonnepanelen !== 10
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Klik om het aantal zonnepanelen te verhogen (+2)"
                    >
                      {[0, 6, 10].includes(tech.aantalZonnepanelen) ? '16 st' : `${tech.aantalZonnepanelen} st`}
                    </button>
                  </div>
                  {/* Status Toggle Solar */}
                  {tech.aantalZonnepanelen > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, solarStatus: 'nieuw' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.solarStatus !== 'bestaand' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🆕 Nieuw
                        </button>
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, solarStatus: 'bestaand' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.solarStatus === 'bestaand' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Zonnepanelen zijn reeds aanwezig op het dak. Investering wordt op €0 gezet."
                        >
                          🏠 Bestaand (€0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Thuisaccu */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('accu');
                          const el = document.getElementById('panelTabbar');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Klik om direct naar het tabblad Thuisaccu te gaan"
                        className="flex items-center gap-1 hover:text-sky-700 transition cursor-pointer group text-left"
                      >
                        <Battery className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
                        <span className="group-hover:underline underline-offset-2">Thuisaccu</span>
                        <span className="text-[9px] text-slate-400 font-normal group-hover:text-sky-600 transition-colors">➔</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTech(prev => ({ ...prev, batteryGridTrading: prev.batteryGridTrading === false ? true : false }))}
                        title="Klik om Slim EMS sturing (Nethandel & Arbitrage) in of uit te schakelen"
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border font-sans whitespace-nowrap transition cursor-pointer ${
                          tech.batteryGridTrading !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100'
                            : 'text-amber-800 bg-amber-50 border-amber-200/80 hover:bg-amber-100'
                        }`}
                      >
                        EMS {tech.batteryGridTrading !== false ? 'aan' : 'uit'}
                      </button>
                    </div>
                    <span className="font-semibold text-sky-700 text-[10px]">
                      {tech.capaciteitAccu > 0 ? `${tech.capaciteitAccu} kWh` : 'Geen'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, capaciteitAccu: 0, batteryStatus: 'nieuw' }))}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.capaciteitAccu === 0
                          ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, capaciteitAccu: 5 }))}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.capaciteitAccu === 5
                          ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      5 kWh
                    </button>
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, capaciteitAccu: 10 }))}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.capaciteitAccu === 10
                          ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      10 kWh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let nextVal = 15;
                        if (![0, 5, 10].includes(tech.capaciteitAccu)) {
                          if (tech.capaciteitAccu >= 50) {
                            nextVal = 15;
                          } else {
                            nextVal = Math.floor(tech.capaciteitAccu / 5) * 5 + 5;
                          }
                        }
                        setTech(prev => ({ ...prev, capaciteitAccu: nextVal }));
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        tech.capaciteitAccu > 0 && tech.capaciteitAccu !== 5 && tech.capaciteitAccu !== 10
                          ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Klik om de accucapaciteit te verhogen (+5 kWh)"
                    >
                      {[0, 5, 10].includes(tech.capaciteitAccu) ? '15 kWh' : `${tech.capaciteitAccu} kWh`}
                    </button>
                  </div>
                  {/* Status Toggle Battery */}
                  {tech.capaciteitAccu > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, batteryStatus: 'nieuw' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.batteryStatus !== 'bestaand' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🆕 Nieuw
                        </button>
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, batteryStatus: 'bestaand' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.batteryStatus === 'bestaand' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Thuisbatterij is reeds aanwezig. Investering wordt op €0 gezet."
                        >
                          🏠 Bestaand (€0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Elektrische Auto / EV */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('laadpaal');
                          const el = document.getElementById('panelTabbar');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Klik om direct naar het tabblad Laadpaal te gaan"
                        className="flex items-center gap-1 hover:text-indigo-700 transition cursor-pointer group text-left"
                      >
                        <Zap className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span className="group-hover:underline underline-offset-2">Auto / Laadpaal</span>
                        <span className="text-[9px] text-slate-400 font-normal group-hover:text-indigo-600 transition-colors">➔</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTech(prev => ({ ...prev, slimEmsOnlySolar: !prev.slimEmsOnlySolar }))}
                        title="Klik om Slim EMS laden (alleen laden op zonnestroom) in of uit te schakelen"
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border font-sans whitespace-nowrap transition cursor-pointer ${
                          tech.slimEmsOnlySolar
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100 font-bold'
                            : 'text-indigo-800 bg-indigo-50 border-indigo-200/80 hover:bg-indigo-100'
                        }`}
                      >
                        EMS {tech.slimEmsOnlySolar ? 'aan' : 'uit'}
                      </button>
                    </div>
                    <span className="font-semibold text-indigo-700 text-[10px]">
                      {(tech.evKilometers || 0) > 0
                        ? `${((tech.evKilometers || 0) / 1000).toFixed((tech.evKilometers || 0) % 1000 === 0 ? 0 : 1)}k km`
                        : 'Geen EV'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, evKilometers: 0, evThuisLaden: 0, laadpaalStatus: 'nieuw' }))}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        (tech.evKilometers || 0) === 0
                          ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Geen EV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTech(prev => {
                          const currentKm = prev.evKilometers || 0;
                          let nextKm = 12000;
                          if (currentKm > 0) {
                            if (currentKm < 12000) nextKm = 12000;
                            else if (currentKm >= 50000) nextKm = 12000;
                            else if (currentKm < 15000) nextKm = 15000;
                            else nextKm = Math.floor(currentKm / 5000) * 5000 + 5000;
                          }
                          return {
                            ...prev,
                            evKilometers: nextKm,
                            evVerbruik: prev.evVerbruik || 18,
                            evThuisLaden: prev.evThuisLaden || 60,
                            laadvermogen: prev.laadvermogen || 11
                          };
                        });
                      }}
                      className={`py-1 px-1 text-[10px] font-medium rounded-lg border text-center transition ${
                        (tech.evKilometers || 0) > 0
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Klik om het aantal EV kilometers stapsgewijs te verhogen (+5.000 km)"
                    >
                      {(tech.evKilometers || 0) > 0
                        ? `Met EV (${((tech.evKilometers || 0) / 1000).toFixed((tech.evKilometers || 0) % 1000 === 0 ? 0 : 1)}k km)`
                        : 'Met EV'}
                    </button>
                  </div>
                  {/* Status Toggle Laadpaal */}
                  {(tech.evKilometers || 0) > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-medium">Laadpaal:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, laadpaalStatus: 'nieuw' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.laadpaalStatus !== 'bestaand' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          🆕 Nieuw
                        </button>
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, laadpaalStatus: 'bestaand' }))}
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold transition ${
                            tech.laadpaalStatus === 'bestaand' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Laadpaal is reeds aanwezig. Investering wordt op €0 gezet."
                        >
                          🏠 Bestaand (€0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Realtime Math Spreadsheet (Direct feedback direct onder snel profiel aanpassen) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Live Rekenoverzicht
                </h3>
                <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  Toekomstbestendig berekend (Einde-Saldering 2027)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/70 flex items-center gap-1">
                  <span>Stookfactor:</span>
                  <strong className="font-mono text-emerald-700 font-bold">{(liveCalcResult?.house?.stookgedragFactor ?? 1.0).toFixed(1)}x</strong>
                  <span className="text-[9px] text-slate-500">({liveCalcResult?.house?.stookgedragBerekend || 'Normaal'})</span>
                </span>
                <span className="text-slate-500 font-mono">Gasprijs €{(house.gasPrijs ?? 1.50).toFixed(2)}/m³</span>
              </div>
            </div>

            {liveCalcResult.measures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500 text-[10px] uppercase tracking-tight">
                      <th className="py-1 px-1 font-bold">Maatregel</th>
                      <th className="py-1 px-1 font-bold text-center">m²</th>
                      <th className="py-1 px-1 font-bold text-right">Bruto</th>
                      <th className="py-1 px-1 font-bold text-right">ISDE</th>
                      <th className="py-1 px-1 font-bold text-right">NIP</th>
                      <th className="py-1 px-1 font-bold text-right">Netto</th>
                      <th className="py-1 px-1 font-bold text-right">TVT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {liveCalcResult.measures.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors text-slate-700">
                        <td className="py-1 px-1 font-medium text-slate-800">{m.name}</td>
                        <td className="py-1 px-1 text-center font-mono">{m.area}</td>
                        <td className="py-1 px-1 text-right font-mono">€{m.brutoCosts}</td>
                        <td className="py-1 px-1 text-right font-mono text-emerald-600">
                          {m.isdeSubsidy > 0 ? `€${Math.round(m.isdeSubsidy)}` : '€0'}
                        </td>
                        <td className="py-1 px-1 text-right font-mono text-blue-600">
                          {m.nipSubsidy > 0 ? `€${Math.round(m.nipSubsidy)}` : '€0'}
                        </td>
                        <td className="py-1 px-1 text-right font-mono font-semibold text-slate-800">€{Math.round(m.netCosts)}</td>
                        <td className="py-1 px-1 text-right font-mono text-slate-600">{m.tvt > 0 ? `${(m.tvt ?? 0).toFixed(1)}j` : '0j'}</td>
                      </tr>
                    ))}
                    {/* Totale sommen */}
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <td className="py-1.5 px-1 text-slate-800">Totaal</td>
                      <td className="py-1.5 px-1 text-center font-mono">{liveCalcResult.measures.reduce((sum, m) => sum + (m.area || 0), 0)} m²</td>
                      <td className="py-1.5 px-1 text-right font-mono">€{liveCalcResult.totals.bruto}</td>
                      <td className="py-1.5 px-1 text-right font-mono text-emerald-600">€{Math.round(liveCalcResult.totals.isde)}</td>
                      <td className="py-1.5 px-1 text-right font-mono text-blue-600">€{Math.round(liveCalcResult.totals.nip)}</td>
                      <td className="py-1.5 px-1 text-right font-mono text-slate-900">€{Math.round(liveCalcResult.totals.net)}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{(liveCalcResult.totals.tvt ?? 0).toFixed(1)}j</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Energiekosten Jouw Woning (Gas & Elektra) */}
            {liveCalcResult && (() => {
              const gPrice = liveCalcResult.house?.gasPrijs || 1.50;
              const ePrice = liveCalcResult.house?.elektraPrijs || 0.35;

              // Gas costs
              const currentGasM3 = liveCalcResult.house?.verbruikM3 || 0;
              const currentGasYr = Math.round(currentGasM3 * gPrice);
              const currentGasMth = Math.round(currentGasYr / 12);

              const houseKwh = liveCalcResult.house?.verbruikKwh || 0;
              const solarKwh = liveCalcResult.solar?.annualYieldKwh || 0;
              const batteryCap = liveCalcResult.tech?.capaciteitAccu || 0;

              // Self consumption percentage (with battery vs base)
              const rawSelfConsPct = batteryCap > 0
                ? (liveCalcResult.solar?.selfConsumptionWithBattery || 65)
                : (liveCalcResult.solar?.selfConsumptionBase || 35);
              const selfConsPct = Math.round(rawSelfConsPct * 100) / 100;

              // Heat pump status & selection
              const activeType = liveCalcResult.tech?.selectedWarmtepompType;
              const houseWpType = liveCalcResult.house?.verwarming || 'CV-ketel';

              const isWpActiveInHouse = houseWpType !== 'CV-ketel' && houseWpType !== 'Geen / Overig' && houseWpType !== 'Andere' && houseWpType !== 'CV-ketel op gas';
              const isVolledigWp = isWpActiveInHouse && (houseWpType === 'Volledige warmtepomp' || houseWpType === 'Full electric' || activeType === 'All-Electric');
              const isHybrideWp = isWpActiveInHouse && (houseWpType === 'Hybride warmtepomp' || activeType === 'Hybride');

              const isWpBestaand = tech.heatpumpStatus === 'bestaand';

              // Huidige Situatie (Nulmeting / Uitgangssituatie):
              // Alleen technieken die als 'bestaand' gemarkeerd zijn (reeds aanwezig bij de bewoner) horen in de Huidige Situatie.
              // Nieuw toe te voegen maatregelen (status 'nieuw') horen exclusief thuis in 'Na Verduurzaming'.
              const isBaselineSolarBestaand = tech.solarStatus === 'bestaand' && (tech.aantalZonnepanelen || 0) > 0;
              const isBaselineBatteryBestaand = tech.batteryStatus === 'bestaand' && (tech.capaciteitAccu || 0) > 0;
              const isBaselineWpBestaand = isWpBestaand && (isVolledigWp || isHybrideWp);
              const isBaselineLaadpaalBestaand = tech.laadpaalStatus === 'bestaand' && (tech.evKilometers || 0) > 0;

              const baselineSolarPresent = isBaselineSolarBestaand;
              const baselineSolarKwh = baselineSolarPresent ? solarKwh : 0;
              const baselineSelfConsPct = isBaselineBatteryBestaand 
                ? (liveCalcResult.solar?.selfConsumptionWithBattery || 65)
                : (liveCalcResult.solar?.selfConsumptionBase || 35);
              const baselineDirectSelfKwh = baselineSolarPresent ? Math.min(houseKwh, (baselineSolarKwh * baselineSelfConsPct) / 100) : 0;
              const baselineFeedInKwh = baselineSolarPresent ? Math.max(0, baselineSolarKwh - baselineDirectSelfKwh) : 0;
              const baselineGridImportKwh = Math.max(0, houseKwh - baselineDirectSelfKwh);

              // Dynamic rates for Vast vs. Dynamisch contract
              const isVast = tech.typeContract === 'Vast';
              const vastTarief = ePrice;
              const vastTerugleverkosten = tech.vastTerugleverkosten !== undefined ? tech.vastTerugleverkosten : 0.11;
              const vastTerugleverVergoeding = tech.vastTerugleverVergoeding !== undefined ? tech.vastTerugleverVergoeding : 0.05;
              const dynInkoopTarief = tech.dynamischStroomTarief !== undefined ? tech.dynamischStroomTarief : 0.25;
              const dynTerugleverTarief = tech.dynamischTerugleverTarief !== undefined ? tech.dynamischTerugleverTarief : 0.09;

              const baselineBatteryTradingYield = (isBaselineBatteryBestaand && tech.typeContract === 'Dynamisch' && tech.batteryGridTrading !== false)
                ? (batteryCap * (tech.dynamicProvider === 'Zonneplan' ? 38.25 : tech.dynamicProvider === 'Frank' ? 31.5 : tech.dynamicProvider === 'Tibber' ? 29.25 : tech.dynamicProvider === 'Anwb' ? 27.00 : 24.75))
                : 0;

              let currentElektraYr = 0;
              if (baselineSolarPresent) {
                if (isVast) {
                  const baseSaldeerd = Math.min(houseKwh, baselineSolarKwh);
                  const baseSurplus = Math.max(0, baselineSolarKwh - houseKwh);
                  const baseImportAfterSaldering = Math.max(0, houseKwh - baselineSolarKwh);
                  currentElektraYr = Math.round((baseImportAfterSaldering * vastTarief) + (baselineFeedInKwh * vastTerugleverkosten) - (baseSurplus * vastTerugleverVergoeding));
                } else {
                  currentElektraYr = Math.round((baselineGridImportKwh * dynInkoopTarief) - (baselineFeedInKwh * dynTerugleverTarief) - baselineBatteryTradingYield);
                }
              } else {
                currentElektraYr = Math.round(isVast ? (houseKwh * vastTarief) : ((houseKwh * dynInkoopTarief) - baselineBatteryTradingYield));
              }
              const currentElektraMth = Math.round(currentElektraYr / 12);

              const currentTotalYr = currentGasYr + currentElektraYr;
              const currentTotalMth = Math.round(currentTotalYr / 12);

              // Na Verduurzaming
              const totalGasSavingsM3 = liveCalcResult.measures.reduce((s, m) => s + m.savingM3, 0);
              const remainingGasAfterInsulation = Math.max(0, currentGasM3 - totalGasSavingsM3);

              // Dynamic label for Huidige Situatie based on user choices / baseline presence
              const presentBaselineItems: string[] = [];
              if (isBaselineWpBestaand) {
                const wpLabel = isVolledigWp ? 'All-Electric WP' : isHybrideWp ? 'Hybride WP' : 'Warmtepomp';
                presentBaselineItems.push(wpLabel);
              }
              if (isBaselineSolarBestaand) {
                const pCount = tech.aantalZonnepanelen || 0;
                presentBaselineItems.push(pCount > 0 ? `${pCount} Zonnepanelen` : 'Zonnepanelen');
              }
              if (isBaselineBatteryBestaand) {
                presentBaselineItems.push(`${tech.capaciteitAccu} kWh Accu`);
              }
              if (isBaselineLaadpaalBestaand) {
                presentBaselineItems.push('Laadpaal');
              }

              const huidigeSituatieLabel = presentBaselineItems.length === 0
                ? 'Huidige Situatie (Geen WP / Zonnepanelen / Accu / Laadpaal)'
                : `Huidige Situatie (Met bestaande ${presentBaselineItems.join(' + ')})`;

              let postGasM3 = remainingGasAfterInsulation;
              let postAddElektraKwh = 0;

              const wpCopInfo = getHeatpumpCopFactor(house.afgiftesysteem, tech.selectedWarmtepompModel, tech.selectedWarmtepompType);

              if (isWpBestaand) {
                // Bestaande warmtepomp: gasverbruik en stroomverbruik zijn al onderdeel van de nulmeting (houseKwh)
                postGasM3 = remainingGasAfterInsulation;
                postAddElektraKwh = 0;
              } else if (isVolledigWp) {
                postGasM3 = 0; // Gasloos! Volledige warmtepomp vervangt al het gas.
                const aeOption = liveCalcResult.heatpump?.options?.find(o => o.type === 'All-Electric');
                postAddElektraKwh = (liveCalcResult.tech?.userAnnualWp && liveCalcResult.tech.userAnnualWp > 0)
                  ? liveCalcResult.tech.userAnnualWp
                  : (remainingGasAfterInsulation === 0 ? 0 : (aeOption ? Math.round(aeOption.elecIncreaseKwh) : Math.round(remainingGasAfterInsulation * wpCopInfo.factor)));
              } else if (isHybrideWp) {
                const isAirco = liveCalcResult.tech?.selectedWarmtepompModel === 'LuchtLucht';
                const hybridRatio = isAirco ? 0.55 : 0.75;
                postGasM3 = Math.max(0, Math.round(remainingGasAfterInsulation * (1 - hybridRatio)));

                const hybridOption = liveCalcResult.heatpump?.options?.find(o => o.type.includes('Hybride') || o.type.includes('Lucht'));
                postAddElektraKwh = (liveCalcResult.tech?.userAnnualWp && liveCalcResult.tech.userAnnualWp > 0)
                  ? liveCalcResult.tech.userAnnualWp
                  : (remainingGasAfterInsulation === 0 ? 0 : (hybridOption ? Math.round(hybridOption.elecIncreaseKwh) : Math.round(remainingGasAfterInsulation * hybridRatio * wpCopInfo.factor)));
              } else {
                postGasM3 = remainingGasAfterInsulation;
                postAddElektraKwh = 0;
              }

              const postGasYr = Math.round(postGasM3 * gPrice);
              const postGasMth = Math.round(postGasYr / 12);

              const postHouseKwh = houseKwh + postAddElektraKwh;
              const postDirectSelfKwh = Math.min(postHouseKwh, (solarKwh * selfConsPct) / 100);
              const postFeedInKwh = Math.max(0, solarKwh - postDirectSelfKwh);
              const postGridImportKwh = Math.max(0, postHouseKwh - postDirectSelfKwh);

              // Grid trading or arbitrage yield if enabled and dynamic contract selected
              // CORRECTIE PUNT 6: Geen dubbeltelling met zonnestroom-opslag
              let batteryTradingYield = 0;
              if (batteryCap > 0 && liveCalcResult.tech?.typeContract === 'Dynamisch' && liveCalcResult.tech?.batteryGridTrading !== false) {
                const provider = liveCalcResult.tech.dynamicProvider || 'Zonneplan';
                const baseRatePerKwh = provider === 'Zonneplan' ? 38.25 : provider === 'Frank' ? 31.5 : provider === 'Tibber' ? 29.25 : provider === 'Anwb' ? 27.00 : 24.75;
                const solarStorageShare = solarKwh > 0 ? Math.min(0.45, (solarKwh / (batteryCap * 600))) : 0;
                const correctedRatePerKwh = baseRatePerKwh * (1 - solarStorageShare * 0.35);
                batteryTradingYield = batteryCap * correctedRatePerKwh;
              }

              let postElektraYr = 0;
              if (isVast) {
                const postSaldeerd = Math.min(solarKwh, postHouseKwh);
                const postSurplus = Math.max(0, solarKwh - postHouseKwh);
                const postImportAfterSaldering = Math.max(0, postHouseKwh - solarKwh);
                postElektraYr = Math.round((postImportAfterSaldering * vastTarief) + (postFeedInKwh * vastTerugleverkosten) - (postSurplus * vastTerugleverVergoeding));
              } else {
                postElektraYr = Math.round((postGridImportKwh * dynInkoopTarief) - (postFeedInKwh * dynTerugleverTarief) - batteryTradingYield);
              }
              const postElektraMth = Math.round(postElektraYr / 12);

              const postTotalYr = postGasYr + postElektraYr;
              const postTotalMth = Math.round(postTotalYr / 12);

              const wpElecSharePct = postHouseKwh > 0 ? Math.round((postAddElektraKwh / postHouseKwh) * 100) : 0;
              const wpElecCostYr = Math.round(postAddElektraKwh * (isVast ? vastTarief : dynInkoopTarief));
              const wpElecCostMth = Math.round(wpElecCostYr / 12);

              // Investeringskosten per technologie / maatregel (met 'bestaand' status check = €0)
              const solarInv = tech.solarStatus === 'bestaand' 
                ? 0 
                : ((solarKwh > 0 || (liveCalcResult.tech?.aantalZonnepanelen && liveCalcResult.tech.aantalZonnepanelen > 0)) 
                    ? (liveCalcResult.tech?.customZonnepanelenPrijs || getSolarInvestmentEstimate(liveCalcResult.tech?.aantalZonnepanelen || 0)) 
                    : 0);

              const batteryBruto = (liveCalcResult.tech?.customAccuPrijs !== undefined && liveCalcResult.tech.customAccuPrijs > 0)
                ? liveCalcResult.tech.customAccuPrijs
                : getBatteryInvestmentEstimate(batteryCap || 0);
              const batteryInv = tech.batteryStatus === 'bestaand'
                ? 0
                : ((batteryCap > 0 || (liveCalcResult.tech?.capaciteitAccu && liveCalcResult.tech.capaciteitAccu > 0)) 
                    ? Math.round(batteryBruto * (100 / 121)) 
                    : 0);

              let wpInv = 0;
              if (tech.heatpumpStatus === 'bestaand') {
                wpInv = 0;
              } else if (isVolledigWp) {
                const aeOption = liveCalcResult.heatpump?.options?.find(o => o.type === 'All-Electric');
                wpInv = aeOption ? aeOption.netInvestment : 0;
              } else if (isHybrideWp) {
                const hybridOption = liveCalcResult.heatpump?.options?.find(o => o.type.includes('Hybride') || o.type.includes('Lucht'));
                wpInv = hybridOption ? hybridOption.netInvestment : 0;
              }

              const wpModelId = liveCalcResult.tech?.selectedWarmtepompModel || 'Standard';
              const wpCapacityStr = wpModelId === 'Middelgroot 8kW' ? '6-8 kW' : wpModelId === 'Groot 12kW' ? '10-12 kW' : wpModelId === 'LuchtLucht' ? 'Airco multi-split' : '4-5 kW';

              const insulationInv = liveCalcResult.totals?.net || 0;
              const totalInsulationM2 = liveCalcResult.measures.reduce((s, m) => s + (m.area || 0), 0);
              const totalInvestmentInv = solarInv + batteryInv + wpInv + insulationInv;

              // Componenten van Totale Jaarbesparing (Afgerond op hele euro's)
              const isoSavingsCalculated = Math.round(liveCalcResult.totals?.savingsEuro || 0);
              const solarPanelsCount = liveCalcResult.tech?.aantalZonnepanelen || 0;
              
              let solarSavingsCalculated = 0;
              if (isVast) {
                const solarSaldeerdKwh = Math.min(solarKwh, houseKwh);
                const solarSurplusKwh = Math.max(0, solarKwh - solarSaldeerdKwh);
                solarSavingsCalculated = Math.round((solarSaldeerdKwh * vastTarief) + (solarSurplusKwh * vastTerugleverVergoeding) - (postFeedInKwh * vastTerugleverkosten));
              } else {
                solarSavingsCalculated = Math.round((postDirectSelfKwh * dynInkoopTarief) + (postFeedInKwh * dynTerugleverTarief));
              }

              const batterySavingsCalculated = Math.round(batteryTradingYield);
              const chosenWpOpt = liveCalcResult.heatpump?.options?.find(o => isVolledigWp ? o.type === 'All-Electric' : (o.type.includes('Hybride') || o.type.includes('Lucht')));
              const hasWp = (isVolledigWp || isHybrideWp) && Boolean(chosenWpOpt || wpInv > 0);
              const wpSavingsCalculated = Math.round(hasWp && chosenWpOpt ? chosenWpOpt.netSavingsEuro : Math.max(0, (currentGasYr - postGasYr) - wpElecCostYr));
              const evKm = liveCalcResult.tech?.evKilometers || 0;
              const hasEv = evKm > 0;
              const evSavingsCalculated = Math.round(hasEv ? (liveCalcResult.laadpaal?.totalSavingsEuro ?? 0) : 0);
              const totalJaarbesparingCalculated = Math.round(currentTotalYr - postTotalYr);

              // Dynamic label for Na Verduurzaming based on selected new measures/technologies
              const presentVerduurzamingItems: string[] = [];
              if (liveCalcResult.measures && liveCalcResult.measures.length > 0 && totalInsulationM2 > 0) {
                presentVerduurzamingItems.push(`Isolatie (${Math.round(totalInsulationM2)} m²)`);
              }
              if (isVolledigWp && tech.heatpumpStatus !== 'bestaand') {
                presentVerduurzamingItems.push('All-Electric WP');
              } else if (isHybrideWp && tech.heatpumpStatus !== 'bestaand') {
                const isAirco = liveCalcResult.tech?.selectedWarmtepompModel === 'LuchtLucht';
                presentVerduurzamingItems.push(isAirco ? 'Airco WP' : 'Hybride WP');
              }
              if ((liveCalcResult.tech?.aantalZonnepanelen || 0) > 0 && tech.solarStatus !== 'bestaand') {
                presentVerduurzamingItems.push(`${liveCalcResult.tech?.aantalZonnepanelen} Zonnepanelen`);
              }
              if (batteryCap > 0 && tech.batteryStatus !== 'bestaand') {
                presentVerduurzamingItems.push(`${batteryCap} kWh Accu`);
              }
              if (hasEv && tech.laadpaalStatus !== 'bestaand') {
                presentVerduurzamingItems.push('Laadpaal');
              }

              const naVerduurzamingLabel = presentVerduurzamingItems.length === 0
                ? 'Na Verduurzaming (Geen nieuwe maatregelen geselecteerd)'
                : `Na Verduurzaming (Met ${presentVerduurzamingItems.join(' + ')})`;

              return (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2 space-y-1.5 mt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <PiggyBank className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Energiekosten Jouw Woning (Gas &amp; Elektra)
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={onDownloadExcel}
                        className="text-[9.5px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Download een uitgebreide Excel-spreadsheet met alle berekeningen en gegevens"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                        <span>Spreadsheet Download (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEnergyPdfModal(true)}
                        className="text-[9.5px] text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 px-2.5 py-0.5 rounded-full font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-white" />
                        <span>PDF Berekening Rapport</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSimExplanation(!showSimExplanation)}
                        className="text-[9px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/90 px-2 py-0.5 rounded-full font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3 text-emerald-600" />
                        <span>{showSimExplanation ? 'Verberg uitleg' : 'Uitleg & Simuleren'}</span>
                      </button>
                      <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
                        Gas €{gPrice.toFixed(2)}/m³ • Elektra €{ePrice.toFixed(2)}/kWh
                      </span>
                    </div>
                  </div>

                  {/* Uitleg & Simulatietips Card */}
                  {showSimExplanation && (
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-lg p-2.5 text-[10.5px] space-y-2 font-sans text-slate-700 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Verschil tussen {huidigeSituatieLabel} &amp; {naVerduurzamingLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSimExplanation(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Uitgebreide Uitleg Totale Jaarbesparing Card - Gelijk aan Punt 1 Stijl */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-2 text-[10px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                            <PiggyBank className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Totale Jaarbesparing: Hoe komt € {totalJaarbesparingCalculated.toLocaleString('nl-NL')} / jr tot stand?
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Afgerond op hele euro's
                          </span>
                        </div>

                        <p className="text-slate-600 leading-relaxed">
                          De <strong>Totale Jaarbesparing</strong> bedraagt exact <strong className="text-emerald-700 font-extrabold font-mono text-[11px]">€ {totalJaarbesparingCalculated.toLocaleString('nl-NL')} / jaar</strong>. Dit is het netto verschil tussen wat je per jaar betaalt in je <strong>{huidigeSituatieLabel} (€ {currentTotalYr.toLocaleString('nl-NL')})</strong> en je verwachte jaarkosten <strong>{naVerduurzamingLabel} ({postTotalYr < 0 ? `-€ ${Math.abs(postTotalYr).toLocaleString('nl-NL')} (netto opbrengst)` : `€ ${postTotalYr.toLocaleString('nl-NL')}`})</strong>.
                        </p>

                        <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100/80 space-y-1 text-slate-800">
                          <p className="font-bold flex items-center gap-1 text-[10px] text-emerald-900">
                            💡 <strong>Directe Rekenformule:</strong>
                          </p>
                          <p className="text-slate-700 leading-snug">
                            Huidige jaarkosten (€ {currentTotalYr.toLocaleString('nl-NL')}) - Nieuwe jaarkosten ({postTotalYr < 0 ? `-€ ${Math.abs(postTotalYr).toLocaleString('nl-NL')}` : `€ ${postTotalYr.toLocaleString('nl-NL')}`}) = <strong className="text-emerald-700 font-mono text-[10.5px]">€ {totalJaarbesparingCalculated.toLocaleString('nl-NL')} / jaar</strong>
                          </p>
                        </div>

                        <div className="space-y-1 pt-1">
                          <span className="font-bold text-slate-800 block text-[10px]">
                            Opbouw van de besparing per maatregel:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 text-[10px] pl-0.5">
                            <li>
                              <strong>🏠 Isolatiebesparing:</strong> <span className="font-bold font-mono text-emerald-700">€ {isoSavingsCalculated.toLocaleString('nl-NL')} / jr</span>
                              {totalGasSavingsM3 > 0 ? ` (${Math.round(totalGasSavingsM3)} m³ gasbesparing × € ${gPrice.toFixed(2)}/m³)` : ' (Geen isolatie geselecteerd)'}
                            </li>
                            <li>
                              <strong>☀️ Zonnestroom Opbrengst:</strong> <span className="font-bold font-mono text-emerald-700">€ {solarSavingsCalculated.toLocaleString('nl-NL')} / jr</span>
                              {solarPanelsCount > 0 ? ` (${solarPanelsCount} panelen, ca. ${Math.round(solarKwh)} kWh/jr opbrengst)` : ' (Geen extra zonnepanelen)'}
                            </li>
                            <li>
                              <strong>🔋 Thuisbatterij Output:</strong> <span className="font-bold font-mono text-emerald-700">€ {batterySavingsCalculated.toLocaleString('nl-NL')} / jr</span>
                              {batteryCap > 0 ? ` (${batteryCap} kWh accu: verhoogt eigenverbruik naar ${selfConsPct}% + handelsrendement)` : ' (Geen thuisbatterij)'}
                            </li>
                            <li>
                              <strong>♨️ Warmtepomp Rendement:</strong> <span className="font-bold font-mono text-emerald-700">€ {wpSavingsCalculated.toLocaleString('nl-NL')} / jr</span>
                              {hasWp ? ` (Netto effect van uitgespaard gas minus extra stroomverbruik)` : ' (Geen actieve warmtepomp)'}
                            </li>
                            <li>
                              <strong>🚗 Brandstofverplaatsing (EV / Laadpaal):</strong> <span className="font-bold font-mono text-emerald-700">€ {evSavingsCalculated.toLocaleString('nl-NL')} / jr</span>
                              {hasEv ? ` (Besparing benzine/diesel t.o.v. stroom bij ${evKm.toLocaleString('nl-NL')} km/jr)` : ' (Geen EV / laadpaal)'}
                            </li>
                          </ul>
                        </div>

                        <p className="text-[9px] text-slate-500 italic pt-0.5">
                          * Alle tussentijdse en eindbedragen zijn consequent afgerond op hele euro's (zonder decimalen).
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="bg-white p-2.5 rounded border border-slate-200/80 space-y-1">
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                            1. {huidigeSituatieLabel}
                          </span>
                          <p className="text-slate-600 text-[10px] leading-relaxed">
                            Dit zijn je kosten op basis van je <strong>oorspronkelijke of werkelijke jaarverbruik</strong> ({currentGasM3} m³ gas &amp; {houseKwh} kWh stroom) en je huidige installaties.
                          </p>
                          <div className="bg-amber-50/40 p-2 rounded border border-amber-100/80 space-y-1 text-[9.5px] text-amber-950 mt-1">
                            <p className="font-bold flex items-center gap-1 text-[10px] text-amber-900">
                              💡 <strong>Wil je je uitgangssituatie / nulmeting aanpassen?</strong>
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-700 leading-snug pl-0.5">
                              <li>
                                <strong>Adres &amp; Jaarverbruik:</strong> Vul je adres in voor automatische woninggegevens of pas je werkelijke jaarnota (m³ gas &amp; kWh stroom) aan bij <em>Woning &amp; Verbruik</em>.
                              </li>
                              <li>
                                <strong>Bestaande installaties:</strong> Geef bij <em>Woning &amp; Verbruik</em> of <em>Techniek</em> aan of je al zonnepanelen, een warmtepomp of thuisbatterij hebt. Zo wordt je uitgangssituatie exact meegenomen.
                              </li>
                              <li>
                                <strong>Contracttype &amp; Slim EMS:</strong> Kies voor een <em>Vast Tarief</em> of <em>Dynamisch Tarief</em>. Met <strong>Slim EMS</strong> (standaard actief) worden batterij-arbitrage en zonne-laden automatisch geoptimaliseerd.
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded border border-slate-200/80 space-y-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                              2. {naVerduurzamingLabel}
                            </span>
                            <p className="text-slate-600 text-[10px] leading-relaxed">
                              Dit zijn je nieuwe netto energiekosten {presentVerduurzamingItems.length > 0 ? (
                                <><strong>ná verwerking van de geselecteerde maatregelen:</strong> {presentVerduurzamingItems.join(', ')}.</>
                              ) : (
                                <><strong>zodra je nieuwe maatregelen toevoegt</strong> (zoals isolatie, warmtepomp, zonnepanelen, thuisbatterij of laadpaal).</>
                              )}
                            </p>
                          </div>
                          <div className="bg-emerald-50/40 p-2 rounded border border-emerald-100/80 text-[9.5px] text-emerald-950 space-y-1 mt-1">
                            <p className="font-bold text-[10px] text-emerald-900">🎯 Resultaat &amp; Terugverdieneffect</p>
                            <p className="text-slate-700 leading-snug">
                              Door <strong>{huidigeSituatieLabel}</strong> te vergelijken met <strong>{naVerduurzamingLabel}</strong> zie je in één oogopslag je maandelijkse en jaarlijkse nettobesparing (€ {totalJaarbesparingCalculated.toLocaleString('nl-NL')}/jr) én de terugverdientijd van je totale investering.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-slate-200/80 space-y-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                          <Sliders className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          Hoe simuleer je het beste aantal zonnepanelen &amp; accu voor jouw huis?
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 text-[10px] pl-0.5">
                          <li>
                            <strong>☀️ Zonnepanelen (Aantal bepalen):</strong> Heb je nu nog geen zonnepanelen? Vul bij <em>Snel profiel</em> of onderaan bij <em>Zonnepanelen &amp; Accu</em> bijv. <strong>8, 10 of 12 zonnepanelen</strong> in. Kijk hoe de stroomkosten bij <em>{naVerduurzamingLabel}</em> direct dalen!
                          </li>
                          <li>
                            <strong>🔋 Thuisbatterij (Capaciteit bepalen):</strong> Voeg een accu toe (bijv. <strong>10 kWh</strong>). Zonder accu gebruik je maar ~35% van je zonnestroom direct. Met accu stijgt dit naar <strong>65% eigenverbruik</strong>, waardoor je in <em>{naVerduurzamingLabel}</em> aanzienlijk minder dure netstroom koopt.
                          </li>
                          <li>
                            <strong>♨️ Warmtepomp &amp; Isolatie:</strong> Vink isolatiemaatregelen aan of kies een warmtepomp om te zien hoeveel gas je bespaart en wat dit doet met je nettobedrag in <em>{naVerduurzamingLabel}</em>.
                          </li>
                          <li>
                            <strong>🚗 Laadpaal &amp; EV (Brandstofverplaatsing):</strong> Een elektrische auto verhoogt je elektraverbruik (~2.500 tot 3.500 kWh/jaar). Dit betreft mobiliteit en staat los van woningisolatie, maar <strong>vervangt wel je tankstationkosten (benzine/diesel)</strong>. Je energierekening stijgt hierdoor wel, maar je bespaart netto honderden euro's aan brandstof (zeker i.c.m. zonnepanelen of slim laden op daluren).
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 text-[9px] uppercase tracking-wider">
                          <th className="py-1 px-2">Situatie</th>
                          <th className="py-1 px-1.5 text-right text-amber-900 bg-amber-50/50">Gas / mnd</th>
                          <th className="py-1 px-1.5 text-right text-amber-950 bg-amber-50/50">Gas / jaar</th>
                          <th className="py-1 px-1.5 text-right text-sky-900 bg-sky-50/50">Elektra / mnd</th>
                          <th className="py-1 px-1.5 text-right text-sky-950 bg-sky-50/50">Elektra / jaar</th>
                          <th className="py-1 px-1.5 text-right text-emerald-950 bg-emerald-50/70 font-black">Totaal / mnd</th>
                          <th className="py-1 px-1.5 text-right text-emerald-950 bg-emerald-50/70 font-black">Totaal / jaar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 font-mono text-[10px]">
                        <tr className="bg-amber-50/20 font-bold">
                          <td className="py-1 px-2 font-sans font-bold text-amber-950 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            {huidigeSituatieLabel}
                          </td>
                          <td className="py-1 px-1.5 text-right text-amber-900 font-bold">€ {currentGasMth.toLocaleString('nl-NL')}</td>
                          <td className="py-1 px-1.5 text-right text-amber-950 font-bold">€ {currentGasYr.toLocaleString('nl-NL')}</td>
                          <td className="py-1 px-1.5 text-right text-sky-900 font-bold">
                            {currentElektraMth < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(currentElektraMth).toLocaleString('nl-NL')}</span> : `€ ${currentElektraMth.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right text-sky-950 font-bold">
                            {currentElektraYr < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(currentElektraYr).toLocaleString('nl-NL')}</span> : `€ ${currentElektraYr.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right bg-amber-100/40 text-slate-900 font-bold">
                            {currentTotalMth < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(currentTotalMth).toLocaleString('nl-NL')}</span> : `€ ${currentTotalMth.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right bg-amber-100/40 text-slate-950 font-black">
                            {currentTotalYr < 0 ? (
                              <span className="text-emerald-800 font-black bg-emerald-100/90 px-1 py-0.5 rounded text-[9.5px]">
                                € - {Math.abs(currentTotalYr).toLocaleString('nl-NL')} (Opbrengst)
                              </span>
                            ) : (
                              `€ ${currentTotalYr.toLocaleString('nl-NL')}`
                            )}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50/30 font-bold">
                          <td className="py-1 px-2 font-sans font-bold text-emerald-950 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            {naVerduurzamingLabel}
                          </td>
                          <td className="py-1 px-1.5 text-right text-amber-900 font-bold">
                            {postGasM3 === 0 ? <span className="text-emerald-700 font-extrabold bg-emerald-100/90 px-1 py-0.5 rounded text-[9px]">€ 0 (Gasloos)</span> : `€ ${postGasMth.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right text-amber-950 font-bold">
                            {postGasM3 === 0 ? <span className="text-emerald-700 font-extrabold bg-emerald-100/90 px-1 py-0.5 rounded text-[9px]">€ 0 (0 m³)</span> : `€ ${postGasYr.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right text-sky-900 font-bold">
                            {postElektraMth < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(postElektraMth).toLocaleString('nl-NL')}</span> : `€ ${postElektraMth.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right text-sky-950 font-bold">
                            {postElektraYr < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(postElektraYr).toLocaleString('nl-NL')}</span> : `€ ${postElektraYr.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right bg-emerald-100/50 text-emerald-950 font-extrabold">
                            {postTotalMth < 0 ? <span className="text-emerald-700 font-extrabold">€ - {Math.abs(postTotalMth).toLocaleString('nl-NL')}</span> : `€ ${postTotalMth.toLocaleString('nl-NL')}`}
                          </td>
                          <td className="py-1 px-1.5 text-right bg-emerald-100/50 text-emerald-950 font-black">
                            {postTotalYr < 0 ? (
                              <span className="text-emerald-800 font-black bg-emerald-200/80 px-1.5 py-0.5 rounded text-[9.5px] shadow-2xs">
                                € - {Math.abs(postTotalYr).toLocaleString('nl-NL')} (Netto Opbrengst)
                              </span>
                            ) : (
                              `€ ${postTotalYr.toLocaleString('nl-NL')}`
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-sky-50/70 border border-sky-200/50 px-2 py-1 rounded font-sans">
                    <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[10px] leading-tight">
                      <strong>Investeringen Overzicht:</strong>
                      {solarInv > 0 ? ` Zonnepanelen (${liveCalcResult.tech?.aantalZonnepanelen ? `${liveCalcResult.tech.aantalZonnepanelen} panelen · ` : ''}${Math.round(solarKwh).toLocaleString('nl-NL')} kWh): € ${Math.round(solarInv).toLocaleString('nl-NL')}` : ' Geen zonnepanelen'}
                      {batteryInv > 0 ? ` • Thuisbatterij (${batteryCap} kWh): € ${Math.round(batteryInv).toLocaleString('nl-NL')}` : ' • Geen thuisbatterij'}
                      {wpInv > 0 ? ` • Warmtepomp (${isVolledigWp ? 'All-Electric' : 'Hybride'} · ${wpCapacityStr}): € ${Math.round(wpInv).toLocaleString('nl-NL')}` : ' • Geen warmtepomp'}
                      {insulationInv > 0 ? ` • Isolatie (${totalInsulationM2} m²): € ${Math.round(insulationInv).toLocaleString('nl-NL')}` : ''}
                      {` • Totale investering: € ${Math.round(totalInvestmentInv).toLocaleString('nl-NL')}`}
                    </span>
                  </div>

                  {/* EV & Slim EMS live detailregel */}
                  <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-sans ${
                    hasEv 
                      ? 'bg-indigo-50/70 border border-indigo-200/50 text-slate-700' 
                      : 'bg-slate-50/70 border border-slate-200/50 text-slate-500'
                  }`}>
                    <Zap className={`w-3 h-3 shrink-0 ${hasEv ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="text-[10px] leading-tight">
                      {hasEv ? (
                        <>
                          <strong>Elektrisch Rijden (EV · {evKm.toLocaleString('nl-NL')} km/j):</strong> Thuis geladen ~{(liveCalcResult.laadpaal?.evAnnualDemandKwh || 0).toLocaleString('nl-NL')} kWh • Slim EMS: <strong className={liveCalcResult.tech?.slimEmsOnlySolar ? 'text-emerald-700 font-bold' : 'text-slate-700'}>{liveCalcResult.tech?.slimEmsOnlySolar ? 'AAN (100% Zonne-laden)' : 'UIT (Standaard Netstroom)'}</strong> • Zonne-aandeel: <strong>{(liveCalcResult.laadpaal?.evSolarCoverageKwh || 0).toLocaleString('nl-NL')} kWh</strong> ({(liveCalcResult.laadpaal?.evAnnualDemandKwh || 0) > 0 ? Math.round(((liveCalcResult.laadpaal?.evSolarCoverageKwh || 0) / (liveCalcResult.laadpaal?.evAnnualDemandKwh || 1)) * 100) : 0}%) • Besparing: <strong className="text-emerald-700 font-bold">€ {evSavingsCalculated.toLocaleString('nl-NL')} / jr</strong>
                        </>
                      ) : (
                        <>
                          <strong>Elektrisch Rijden (EV):</strong> Geen elektrische auto ingesteld (vul kilometers in bij 'Auto (EV)' om zonne-laden &amp; Slim EMS besparing live te berekenen).
                        </>
                      )}
                    </span>
                  </div>

                  {/* PDF Report Modal */}
                  <EnergyCostPdfModal
                    isOpen={showEnergyPdfModal}
                    onClose={() => setShowEnergyPdfModal(false)}
                    resident={resident}
                    house={house}
                    liveCalcResult={liveCalcResult}
                    gPrice={gPrice}
                    ePrice={ePrice}
                    currentGasM3={currentGasM3}
                    currentGasYr={currentGasYr}
                    currentGasMth={currentGasMth}
                    houseKwh={houseKwh}
                    currentElektraYr={currentElektraYr}
                    currentElektraMth={currentElektraMth}
                    currentTotalYr={currentTotalYr}
                    currentTotalMth={currentTotalMth}
                    postGasM3={postGasM3}
                    postGasYr={postGasYr}
                    postGasMth={postGasMth}
                    postHouseKwh={postHouseKwh}
                    postAddElektraKwh={postAddElektraKwh}
                    postElektraYr={postElektraYr}
                    postElektraMth={postElektraMth}
                    postTotalYr={postTotalYr}
                    postTotalMth={postTotalMth}
                    solarKwh={solarKwh}
                    solarInv={solarInv}
                    aantalZonnepanelen={liveCalcResult.tech?.aantalZonnepanelen || 0}
                    batteryCap={batteryCap}
                    batteryInv={batteryInv}
                    selfConsPct={selfConsPct}
                    batteryTradingYield={batteryTradingYield}
                    isVolledigWp={isVolledigWp}
                    isHybrideWp={isHybrideWp}
                    wpInv={wpInv}
                    wpCapacityStr={wpCapacityStr}
                    wpModelId={wpModelId}
                    insulationInv={insulationInv}
                    totalInsulationM2={totalInsulationM2}
                    totalGasSavingsM3={totalGasSavingsM3}
                    totalInvestmentInv={totalInvestmentInv}
                    baselineSituatieLabel={huidigeSituatieLabel}
                    naVerduurzamingLabel={naVerduurzamingLabel}
                  />
                </div>
              );
            })()}

            {/* Totaalvoorstel Verduurzaming (Alle Maatregelen Samen) - Direct onder Energiekosten */}
            {liveCalcResult && (() => {
              const gPrice = liveCalcResult.house?.gasPrijs || 1.50;
              const ePrice = liveCalcResult.house?.elektraPrijs || 0.35;
              const houseKwh = liveCalcResult.house?.verbruikKwh || 3500;

              // 1. Isolatie
              const isoNetCosts = liveCalcResult.totals?.net || 0;
              const isoSubsidies = (liveCalcResult.totals?.isde || 0) + (liveCalcResult.totals?.nip || 0);
              const isoSavings = liveCalcResult.totals?.savingsEuro || 0;
              const hasIso = (liveCalcResult.measures?.length || 0) > 0 && isoNetCosts > 0;

              // 2. Zonnepanelen
              const solarPanels = liveCalcResult.tech?.aantalZonnepanelen || 0;
              const solarYield = liveCalcResult.solar?.annualYieldKwh || 0;
              const hasSolar = solarYield > 0 || solarPanels > 0;
              const isSolarBestaand = tech.solarStatus === 'bestaand';
              const solarNetInv = isSolarBestaand 
                ? 0 
                : (hasSolar ? (liveCalcResult.tech?.customZonnepanelenPrijs || getSolarInvestmentEstimate(solarPanels)) : 0);
              const solarSaldeerd = Math.min(solarYield, houseKwh);
              const solarSurplus = Math.max(0, solarYield - solarSaldeerd);
              const solarSavings = Math.round((solarSaldeerd * ePrice) + (solarSurplus * 0.05));

              // 3. Thuisbatterij
              const batCap = liveCalcResult.tech?.capaciteitAccu || 0;
              const hasBat = batCap > 0;
              const isBatBestaand = tech.batteryStatus === 'bestaand';
              const batBruto = (liveCalcResult.tech?.customAccuPrijs !== undefined && liveCalcResult.tech.customAccuPrijs > 0)
                ? liveCalcResult.tech.customAccuPrijs
                : getBatteryInvestmentEstimate(batCap);
              const batNetInv = isBatBestaand 
                ? 0 
                : (hasBat ? Math.round(batBruto * (100 / 121)) : 0);
              const currentProvider = liveCalcResult.tech?.dynamicProvider || 'Zonneplan';
              const batEarnings = hasBat ? calculatePostSalderingEarnings(batCap, currentProvider, liveCalcResult.tech?.customAccuPrijs) : null;
              const batSavings = batEarnings ? batEarnings.totalSavings : 0;

              // 4. Warmtepomp
              const houseWpType = liveCalcResult.house?.verwarming || 'CV-ketel';
              const activeWpType = liveCalcResult.tech?.selectedWarmtepompType;
              const isWpActiveInHouse = houseWpType !== 'CV-ketel' && houseWpType !== 'Geen / Overig' && houseWpType !== 'Andere' && houseWpType !== 'CV-ketel op gas';
              const isVolledigWp = isWpActiveInHouse && (houseWpType === 'Volledige warmtepomp' || houseWpType === 'Full electric' || activeWpType === 'All-Electric');
              const isHybrideWp = isWpActiveInHouse && (houseWpType === 'Hybride warmtepomp' || activeWpType === 'Hybride');
              const isWpBestaand = tech.heatpumpStatus === 'bestaand';

              let wpInv = 0;
              if (isWpBestaand) {
                wpInv = 0;
              } else if (isVolledigWp) {
                const aeOption = liveCalcResult.heatpump?.options?.find(o => o.type === 'All-Electric');
                wpInv = aeOption ? aeOption.netInvestment : 0;
              } else if (isHybrideWp) {
                const hybridOption = liveCalcResult.heatpump?.options?.find(o => o.type.includes('Hybride') || o.type.includes('Lucht'));
                wpInv = hybridOption ? hybridOption.netInvestment : 0;
              }

              const chosenWpOpt = liveCalcResult.heatpump?.options?.find(o => isVolledigWp ? o.type === 'All-Electric' : (o.type.includes('Hybride') || o.type.includes('Lucht')));
              const hasWp = (isVolledigWp || isHybrideWp) && Boolean(chosenWpOpt || wpInv > 0);
              const wpSubsidies = (hasWp && chosenWpOpt && !isWpBestaand) ? chosenWpOpt.subsidy : 0;
              const wpSavings = hasWp && chosenWpOpt ? chosenWpOpt.netSavingsEuro : 0;

              // 5. Laadpaal (EV)
              const evKm = liveCalcResult.tech?.evKilometers || 0;
              const hasEv = evKm > 0;
              const isLaadpaalBestaand = tech.laadpaalStatus === 'bestaand';
              const evNetInv = isLaadpaalBestaand ? 0 : (hasEv ? (liveCalcResult.laadpaal?.netInvestmentEuro ?? 1200) : 0);
              const evSavings = hasEv ? (liveCalcResult.laadpaal?.totalSavingsEuro ?? 0) : 0;

              // Totalen uitgesplitst naar Nieuw (investering & nieuwe besparing) vs Bestaand (€0 investering)
              const newCombinedNetInvestment = Math.round((hasIso ? isoNetCosts : 0) + (!isSolarBestaand && hasSolar ? solarNetInv : 0) + (!isBatBestaand && hasBat ? batNetInv : 0) + (!isWpBestaand && hasWp ? wpInv : 0) + (!isLaadpaalBestaand && hasEv ? evNetInv : 0));
              const newCombinedSubsidies = Math.round((hasIso ? isoSubsidies : 0) + (!isWpBestaand && hasWp ? wpSubsidies : 0));
              const newCombinedSavingsPerYear = Math.round((hasIso ? isoSavings : 0) + (!isSolarBestaand && hasSolar ? solarSavings : 0) + (!isBatBestaand && hasBat ? batSavings : 0) + (!isWpBestaand && hasWp ? wpSavings : 0) + (!isLaadpaalBestaand && hasEv ? evSavings : 0));

              const existingSavingsPerYear = Math.round((isSolarBestaand && hasSolar ? solarSavings : 0) + (isBatBestaand && hasBat ? batSavings : 0) + (isWpBestaand && hasWp ? wpSavings : 0) + (isLaadpaalBestaand && hasEv ? evSavings : 0));
              const totalCombinedSavingsPerYear = newCombinedSavingsPerYear + existingSavingsPerYear;

              const totalCombinedTvtNum = newCombinedSavingsPerYear > 0 ? (newCombinedNetInvestment / newCombinedSavingsPerYear) : 0;
              const totalCombinedTvt = totalCombinedTvtNum > 0 && totalCombinedTvtNum < 99 ? `${totalCombinedTvtNum.toFixed(1)} jaar` : (newCombinedNetInvestment === 0 ? '€ 0 (Reeds aanwezig)' : 'N.v.t.');
              const totalCombinedRendement = newCombinedNetInvestment > 0 ? `${((newCombinedSavingsPerYear / newCombinedNetInvestment) * 100).toFixed(1)}%` : (newCombinedNetInvestment === 0 ? 'N.v.t.' : '0%');

              const hasAnyExisting = (isSolarBestaand && hasSolar) || (isBatBestaand && hasBat) || (isWpBestaand && hasWp) || (isLaadpaalBestaand && hasEv);
              const hasAnyNew = hasIso || (!isSolarBestaand && hasSolar) || (!isBatBestaand && hasBat) || (!isWpBestaand && hasWp) || (!isLaadpaalBestaand && hasEv);

              return (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2 space-y-1.5 mt-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800">
                        Totaalvoorstel Verduurzaming
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {hasAnyExisting ? 'Nieuwe Investeringen' : 'Alle Maatregelen Samen'}
                      </span>
                    </div>
                    {newCombinedSubsidies > 0 && (
                      <span className="text-[9.5px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                        € {Math.round(newCombinedSubsidies).toLocaleString('nl-NL')} Subsidie (ISDE + NIP)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white border border-slate-200 rounded-md p-2 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Netto Investering (Nieuw)</span>
                      <strong className="text-slate-900 font-extrabold text-[12px] font-mono">€ {Math.round(newCombinedNetInvestment).toLocaleString('nl-NL')}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Nieuwe Jaarbesparing</span>
                      <strong className="text-emerald-700 font-extrabold text-[12px] font-mono">€ {Math.round(newCombinedSavingsPerYear).toLocaleString('nl-NL')} / jr</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">TVT Nieuwe Investering</span>
                      <strong className="text-amber-600 font-extrabold text-[12px] font-mono">{totalCombinedTvt}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Rendement op Investering</span>
                      <strong className="text-blue-600 font-extrabold text-[12px] font-mono">{totalCombinedRendement}</strong>
                    </div>
                  </div>

                  {/* Uitsplitsing in 2 regels: Nieuw vs Reeds Bestaand */}
                  <div className="space-y-1 text-[9.5px]">
                    {/* Regel 1: Nieuwe investeringen */}
                    <div className="flex flex-wrap items-center gap-1 text-slate-700 bg-emerald-50/70 border border-emerald-200/70 px-2 py-1 rounded font-sans">
                      <span className="font-bold text-emerald-900 shrink-0">Nieuw te installeren:</span>
                      {hasIso && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-700">🏠 Isolatie (€ {isoNetCosts.toLocaleString('nl-NL')})</span>}
                      {!isSolarBestaand && hasSolar && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-700">☀️ Zonnepanelen ({solarPanels} stuks • € {solarNetInv.toLocaleString('nl-NL')})</span>}
                      {!isBatBestaand && hasBat && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-700">🔋 Thuisbatterij ({batCap} kWh • € {batNetInv.toLocaleString('nl-NL')})</span>}
                      {!isWpBestaand && hasWp && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-700">♨️ Warmtepomp ({isVolledigWp ? 'All-Electric' : 'Hybride'} • € {wpInv.toLocaleString('nl-NL')})</span>}
                      {!isLaadpaalBestaand && hasEv && <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-700">🚗 Laadpaal ({evKm.toLocaleString('nl-NL')} km/jr • € {evNetInv.toLocaleString('nl-NL')})</span>}
                      {!hasAnyNew && <span className="text-slate-400 italic">Geen nieuwe maatregelen geselecteerd</span>}
                    </div>

                    {/* Regel 2: Reeds aanwezige installaties */}
                    {hasAnyExisting && (
                      <div className="flex flex-wrap items-center gap-1 text-slate-600 bg-amber-50/60 border border-amber-200/60 px-2 py-1 rounded font-sans">
                        <span className="font-bold text-amber-900 shrink-0">Reeds aanwezig (€0 inv.):</span>
                        {isSolarBestaand && hasSolar && <span className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-medium text-amber-950">☀️ Zonnepanelen ({solarPanels} stuks)</span>}
                        {isBatBestaand && hasBat && <span className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-medium text-amber-950">🔋 Thuisbatterij ({batCap} kWh)</span>}
                        {isWpBestaand && hasWp && <span className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-medium text-amber-950">♨️ Warmtepomp ({isVolledigWp ? 'All-Electric' : 'Hybride'})</span>}
                        {isLaadpaalBestaand && hasEv && <span className="bg-white border border-amber-200 px-1.5 py-0.5 rounded font-medium text-amber-950">🚗 Laadpaal</span>}
                        <span className="text-[9px] text-amber-800 italic ml-1">
                          (Levert al € {existingSavingsPerYear.toLocaleString('nl-NL')} / jr op in je nulmeting)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 1. Bewoner & Adres (BAG API!) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">1. Bewoners &amp; Adres Gegevens</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                {resident.registratiecode || "PM-CONCEPT"}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50 space-y-3">
                <p className="text-[11px] text-emerald-800 leading-normal">
                  Vul postcode en huisnummer in. De adresgegevens, het bouwjaar, oppervlak én het <strong>Energielabel</strong> (EP-Online) worden automatisch ingeladen.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={resident.postcode}
                      onChange={(e) => updateResident({ postcode: e.target.value.toUpperCase() })}
                      onBlur={autoFetchBag}
                      placeholder="5981AD"
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 uppercase text-center"
                      id="postcode"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                      Huisnummer
                    </label>
                    <input
                      type="text"
                      value={resident.huisnummer}
                      onChange={(e) => updateResident({ huisnummer: e.target.value })}
                      onBlur={autoFetchBag}
                      placeholder="12"
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 text-center"
                      id="huisnummer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                      Toev.
                    </label>
                    <input
                      type="text"
                      value={resident.toevoeging}
                      onChange={(e) => updateResident({ toevoeging: e.target.value })}
                      onBlur={autoFetchBag}
                      placeholder="A"
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 text-center"
                      id="toev"
                    />
                  </div>
                </div>
                {fetchingBag && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                    <span>BAG en EP-Online opzoeken...</span>
                  </div>
                )}
                {bagSuccess && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" />
                    <span>Adresgegevens succesvol aangevuld!</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Aanhef
                  </label>
                  <select
                    value={resident.aanhef}
                    onChange={(e) => updateResident({ aanhef: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="aanhef"
                  >
                    <option>De heer</option>
                    <option>Mevrouw</option>
                    <option>De heer en mevrouw</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Voorletters
                  </label>
                  <input
                    type="text"
                    value={resident.voorletters}
                    onChange={(e) => updateResident(prev => ({ voorletters: e.target.value, naam: `${e.target.value} ${prev.achternaam}`.trim() }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. J."
                    id="voorletters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Achternaam
                  </label>
                  <input
                    type="text"
                    value={resident.achternaam}
                    onChange={(e) => updateResident(prev => ({ achternaam: e.target.value, naam: `${prev.voorletters} ${e.target.value}`.trim() }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. Janssen"
                    id="achternaam"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Straat
                  </label>
                  <input
                    type="text"
                    value={resident.straat}
                    onChange={(e) => updateResident({ straat: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="straat"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Kerkdorp
                  </label>
                  <select
                    value={resident.plaats}
                    onChange={(e) => updateResident({ plaats: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="plaats"
                  >
                    <option value="">-- Selecteer Kerkdorp --</option>
                    {['Baarlo', 'Beringe', 'Egchel', 'Grashoek', 'Helden', 'Kessel', 'Kessel-Eik', 'Koningslust', 'Maasbree', 'Meijel', 'Panningen'].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Telefoon / mobiel
                  </label>
                  <input
                    type="tel"
                    value={resident.telefoon}
                    onChange={(e) => updateResident({ telefoon: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="0612345678"
                    id="telefoon"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={resident.email}
                    onChange={(e) => updateResident({ email: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="naam@voorbeeld.nl"
                    id="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
                    <span>Datum opname</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Auto-update</span>
                  </label>
                  <input
                    type="date"
                    value={resident.datum || new Date().toISOString().split('T')[0]}
                    onChange={(e) => updateResident({ datum: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-medium"
                    id="datum"
                  />
                </div>
              </div>

              {/* Inkomens- & NIP-check */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">NIP-Subsidie criteria (Inkomenseis)</span>
                  <Tooltip text="Het Nationaal Isolatieprogramma (NIP) heeft in Peel en Maas een inkomenseis van maximaal €60.000 bruto gezinsinkomen per jaar OF een handmatige controle door de coach." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <span>Bruto gezinsjaarinkomen (€)</span>
                      <Tooltip text="Het gezamenlijke bruto jaarinkomen van het huishouden. Dit is relevant voor de inkomensgrens van de NIP-subsidie (maximaal €60.000)." />
                    </label>
                    <input
                      type="number"
                      value={resident.brutoGezinsinkomen || ''}
                      onChange={(e) => setResident(prev => ({ ...prev, brutoGezinsinkomen: Number(e.target.value) }))}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-mono"
                      placeholder="Bijv. 45000"
                      id="bruto_gezinsinkomen"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                      <span>Inkomensverklaring gecontroleerd?</span>
                      <Tooltip text="Geef aan of de inkomensverklaring handmatig is gecontroleerd. De bewoner kan deze gratis downloaden via Mijn Belastingdienst (Mijn gegevens > Inkomensverklaring opvragen) of bellen via 0800-0543." align="right" />
                    </label>
                    <select
                      value={house.inkomenCheck ? "Ja" : "Nee"}
                      onChange={(e) => setHouse(prev => ({ ...prev, inkomenCheck: e.target.value === "Ja" }))}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                      id="inkomen_check"
                    >
                      <option value="Nee">Nee (toetsing via inkomen &lt; €60.000)</option>
                      <option value="Ja">Ja (altijd akkoord via coach controle)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Woning Kenmerken & Installaties */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">2. Woning &amp; Huidige Installaties</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Soort woning</span>
                    <Tooltip text="Het type woning is bepalend voor de berekening van het referentieverwarmingsgas (G_ref) en de warmteverliesberekening." />
                  </label>
                  <select
                    value={house.soortWoning}
                    onChange={(e) => setHouse(prev => ({ ...prev, soortWoning: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="soort_woning"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>Vrijstaand</option>
                    <option>Twee onder een kap</option>
                    <option>Hoekwoning</option>
                    <option>Tussenwoning</option>
                    <option>Appartement</option>
                    <option>Benedenwoning</option>
                    <option>Bovenwoning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Bouwjaar</span>
                    <Tooltip text="Het bouwjaar van de woning (BAG). Dit bepaalt de initiële isolatiewaarden van de schil als er nog geen na-isolatie is toegepast." align="right" />
                  </label>
                  <input
                    type="number"
                    value={house.bouwjaar || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, bouwjaar: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 1978"
                    id="bouwjaar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Woonoppervlakte (m²)</span>
                    <Tooltip text="De totale gebruiksoppervlakte van de verwawmde zones in de woning. Dit is cruciaal voor de warmteverliesberekening en G_ref." />
                  </label>
                  <input
                    type="number"
                    value={house.woonoppervlakte || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, woonoppervlakte: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 115"
                    id="woonopp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Aantal bewoners</span>
                    <Tooltip text="Het aantal personen in het huishouden. We rekenen met een gemiddeld gasverbruik van 100 m³ per persoon per jaar voor warm tapwater." align="right" />
                  </label>
                  <input
                    type="number"
                    value={resident.aantalPersonen || ''}
                    onChange={(e) => setResident(prev => ({ ...prev, aantalPersonen: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 2"
                    id="aantal_personen"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-0.5 flex justify-between items-center gap-1">
                    <span className="flex items-center gap-1">
                      <span>WOZ-waarde (€)</span>
                      <Tooltip text="De WOZ-waarde van de woning (peildatum 2024). Voor de NIP-subsidie mag deze niet hoger zijn dan €477.000." />
                    </span>
                    <a href="#" onClick={openWoz} className="text-[10px] text-emerald-600 hover:underline shrink-0">🔗 Zoek op</a>
                  </label>
                  <input
                    type="number"
                    value={house.wozWaarde || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, wozWaarde: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 385000"
                    id="woz_waarde"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-0.5 flex justify-between items-center gap-1">
                    <span className="flex items-center gap-1">
                      <span>Energielabel</span>
                      <Tooltip text="Het geregistreerde energielabel van de woning. Voor de NIP-subsidie komen alleen woningen met label D, E, F, G of Geen label in aanmerking." align="right" />
                    </span>
                    <a href="#" onClick={openEpOnline} className="text-[10px] text-emerald-600 hover:underline shrink-0">🔗 Zoek op</a>
                  </label>
                  <select
                    value={house.energielabel}
                    onChange={(e) => setHouse(prev => ({ ...prev, energielabel: e.target.value as any }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-emerald-500"
                    id="energielabel"
                  >
                    <option value="Geen">Label Geen</option>
                    <option value="A - B - C">Label A - B - C</option>
                    <option value="D">Label D</option>
                    <option value="E">Label E</option>
                    <option value="F">Label F</option>
                    <option value="G">Label G</option>
                  </select>
                </div>
              </div>

              {/* Installaties subgrid */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Verwarming</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Hoofdverwarming types:</p>
                        <p>• <strong>CV-ketel:</strong> Traditionele gasverwarming d.m.v. aardgas.</p>
                        <p>• <strong>Hybride warmtepomp:</strong> Warmtepomp gecombineerd met een CV-ketel voor koude dagen en tapwater.</p>
                        <p>• <strong>Full electric:</strong> Volledig gasloos verwarmen op elektriciteit d.m.v. een warmtepomp.</p>
                      </div>
                    } />
                  </label>
                  <select
                    value={house.verwarming}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHouse(prev => ({ ...prev, verwarming: val }));
                      if (val === 'CV-ketel' || val === 'Geen / Overig' || val === 'Andere' || val === '') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: undefined, selectedWarmtepompModel: undefined }));
                      } else if (val === 'Hybride warmtepomp') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: 'Hybride' }));
                      } else if (val === 'Volledige warmtepomp' || val === 'Full electric') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: 'All-Electric' }));
                      }
                    }}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="verwarming"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>CV-ketel</option>
                    <option>Hybride warmtepomp</option>
                    <option>Full electric</option>
                    <option>Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Afgiftesysteem</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Type warmteafgifte:</p>
                        <p>• <strong>Radiatoren:</strong> Traditionele verwarming met een hoge watertemperatuur (65-80°C).</p>
                        <p>• <strong>Vloerverwarming / LTV:</strong> Zeer lage watertemperatuur (30-40°C), optimaal rendement voor warmtepompen.</p>
                        <p>• <strong>Airco:</strong> Verwarmen en koelen via lucht-lucht warmtepomp blaasunits.</p>
                      </div>
                    } align="right" />
                  </label>
                  <select
                    value={house.afgiftesysteem}
                    onChange={(e) => setHouse(prev => ({ ...prev, afgiftesysteem: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="afgiftesysteem"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>Radiatoren</option>
                    <option>Vloerverwarming</option>
                    <option>LTV</option>
                    <option>Airco</option>
                    <option>Andere</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Tapwater</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Warmwaterbereiding:</p>
                        <p>• <strong>CV-ketel:</strong> Warm water via de combiketel op gas.</p>
                        <p>• <strong>Warmtepompboiler:</strong> Zuinige elektrische boiler die warmte uit de binnenlucht haalt om water te verwarmen.</p>
                        <p>• <strong>Zonneboiler:</strong> Verwarmt tapwater d.m.v. zonnecollectoren op het dak.</p>
                      </div>
                    } />
                  </label>
                  <select
                    value={house.tapwater}
                    onChange={(e) => setHouse(prev => ({ ...prev, tapwater: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="tapwater"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>CV-ketel</option>
                    <option>Boiler (gas)</option>
                    <option>Boiler (elektrisch)</option>
                    <option>Zonneboiler</option>
                    <option>Warmtepompboiler</option>
                    <option>Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Koken op</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Type kookplaat:</p>
                        <p>• <strong>Gas:</strong> Koken op traditioneel aardgas.</p>
                        <p>• <strong>Inductie:</strong> Elektrisch koken met magnetische velden. Zeer veilig en energiezuinig.</p>
                        <p>• <strong>Elektrisch:</strong> Koken via keramische of gietijzeren kookplaten.</p>
                      </div>
                    } align="right" />
                  </label>
                  <select
                    value={house.koken}
                    onChange={(e) => setHouse(prev => ({ ...prev, koken: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="koken"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>Gas</option>
                    <option>Elektrisch</option>
                    <option>Inductie</option>
                    <option>Andere</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Ventilatie</span>
                    <Tooltip text={
                      <div className="space-y-1.5">
                        <p className="font-bold text-slate-200">Ventilatietypes:</p>
                        <p>• <strong>Natuurlijk (Type A):</strong> Verse lucht via ventilatieroosters of open ramen, afvoer via natuurlijke trek (schoorsteen).</p>
                        <p>• <strong>Mechanisch (Type C):</strong> Toevoer via roosters in gevel/ramen, mechanische afzuiging in vochtige ruimtes (keuken/badkamer/toilet).</p>
                        <p>• <strong>Balans (Type D / WTW):</strong> Volledig mechanische toevoer &amp; afvoer. Warmte uit de afgevoerde binnenlucht warmt de koude toevoerlucht op (WTW), wat veel stookenergie bespaart!</p>
                      </div>
                    } />
                  </label>
                  <select
                    value={house.ventilatie}
                    onChange={(e) => setHouse(prev => ({ ...prev, ventilatie: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="ventilatie"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>Natuurlijk (Type A)</option>
                    <option>Mechanisch (Type C)</option>
                    <option>Balans (Type D/WTW)</option>
                    <option>Anders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Al zonnepanelen aanwezig?</label>
                  <select
                    value={house.zonnepanelenPresent}
                    onChange={(e) => setHouse(prev => ({ ...prev, zonnepanelenPresent: e.target.value as any }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="zonnepanelen"
                  >
                    <option value="Nee">Nee</option>
                    <option value="Ja">Ja</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Energie verbruik en kosten */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">3. Energieverbruik &amp; Stookgedrag (Jaarrekening)</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Elektra (kWh)</span>
                    <Tooltip text="Het huidige jaarlijkse elektriciteitsverbruik in kWh (volgens de meest recente jaarrekening)." />
                  </label>
                  <input
                    type="number"
                    value={house.verbruikKwh || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, verbruikKwh: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="elektra_verbruik"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Prijs (€/kWh)</span>
                    <Tooltip text="Het huidige stroomtarief per kWh dat de bewoner betaalt (of het gemiddelde tarief bij een dynamisch contract)." align="right" />
                  </label>
                  <input
                    type="number"
                    value={house.elektraPrijs || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, elektraPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    step="0.01"
                    id="elektra_prijs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Gasverbruik (m³)</span>
                    <Tooltip text="Het actuele jaarlijkse gasverbruik in m³ van de woning, gebruikt voor de stookgedrag-check en warmtevraagbepaling." />
                  </label>
                  <input
                    type="number"
                    value={house.verbruikM3 || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, verbruikM3: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="gas_totaal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Gas prijs (€/m³)</span>
                    <Tooltip text="Het huidige gastarief per m³ dat de bewoner betaalt inclusief belastingen." align="right" />
                  </label>
                  <input
                    type="number"
                    value={house.gasPrijs || ''}
                    onChange={(e) => setHouse(prev => ({ ...prev, gasPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    step="0.01"
                    id="gas_prijs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Stookgedrag (Auto)</span>
                    <Tooltip text="Deze waarde vergelijkt het werkelijke gasverbruik met het gemiddelde verbruik van een gelijkwaardige woning en gezinssamenstelling." />
                  </label>
                  <input
                    type="text"
                    value={liveStookgedragBerekend || 'Vul in...'}
                    readOnly
                    className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 font-bold text-emerald-800"
                    id="stookgedrag_berekend"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Correctie / Forceer</span>
                    <Tooltip text="Laat op 'Berekend (Auto)' om het stookgedrag automatisch af te stemmen op uw werkelijke verbruik, of kies handmatig een vaste factor." align="right" />
                  </label>
                  <select
                    value={house.stookgedragOverride}
                    onChange={(e) => setHouse(prev => ({ ...prev, stookgedragOverride: e.target.value as any }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="stookgedrag_override"
                  >
                    <option value="auto">Berekend (Auto)</option>
                    <option value="normaal">Forceer: Normaal (1.0x)</option>
                    <option value="zuinig">Forceer: Zuinig (0.7x)</option>
                    <option value="minimaal">Forceer: Minimaal (0.4x)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Huidige Isolatie Status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">4. Huidige Isolatie Status</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Dakisolatie</span>
                    <Tooltip text="De huidige isolatiestatus van het dak. 'Geen/Matig' betekent dat er nog veel winst te behalen is met na-isolatie." />
                  </label>
                  <select
                    value={house.isoDak}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoDak: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_dak"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Geen</option>
                    <option value="slecht">Matig</option>
                    <option value="goed">Goed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Gevelisolatie</span>
                    <Tooltip text="De huidige isolatiestatus van de gevels of spouwmuren." align="right" />
                  </label>
                  <select
                    value={house.isoGevel}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoGevel: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_gevel"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Geen</option>
                    <option value="slecht">Spouwmuurisolatie (Oud)</option>
                    <option value="goed">Binnenisolatie</option>
                    <option value="goed">Buitenisolatie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Glas (begane grond)</span>
                    <Tooltip text="Het type glas op de begane grond (bijv. HR++ of dubbel glas)." />
                  </label>
                  <select
                    value={house.isoGlasBg}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoGlasBg: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_glas_bg"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Enkel</option>
                    <option value="slecht">Dubbel</option>
                    <option value="matig">HR</option>
                    <option value="goed">HR++</option>
                    <option value="goed">Triple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Glas (verdieping)</span>
                    <Tooltip text="Het type glas op de verdiepingen van de woning." align="right" />
                  </label>
                  <select
                    value={house.isoGlasVd}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoGlasVd: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_glas_vd"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Enkel</option>
                    <option value="slecht">Dubbel</option>
                    <option value="matig">HR</option>
                    <option value="goed">HR++</option>
                    <option value="goed">Triple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Vloer / Bodem</span>
                    <Tooltip text="De huidige isolatiestatus van de vloer of de kruipruimtebodem." />
                  </label>
                  <select
                    value={house.isoVloer}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoVloer: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_vloer"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Geen vloer</option>
                    <option value="slecht">Matig vloer</option>
                    <option value="goed">Goed vloer</option>
                    <option value="slecht">Geen bodem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Naden/kieren in orde?</span>
                    <Tooltip text="Geeft aan of er tocht of kouval aanwezig is door kieren bij ramen, deuren of kozijnen." align="right" />
                  </label>
                  <select
                    value={house.isoKieren}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoKieren: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500"
                    id="iso_kieren"
                  >
                    <option value="">-- Selecteer --</option>
                    <option>Ja, in orde</option>
                    <option>Nee, onderhoud nodig</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Ingemeten isolatie oppervlakten (m2) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">5. Ingemeten Isolatie Oppervlakten (m²)</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Vloer (onder)</span>
                    <Tooltip text="Het aantal vierkante meters te isoleren vloer aan de onderzijde (vanuit de kruipruimte). Besparing: 6,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.vloer || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, vloer: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_vloer_ond"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Bodem (chips)</span>
                    <Tooltip text="Het oppervlak van de kruipruimtebodem geschikt voor bodemisolatie (bijv. EPS-parels of isolatiechips). Besparing: 1,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.bodem || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, bodem: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_bodem"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Spouwmuur</span>
                    <Tooltip text="Het totale oppervlak van de buitenmuren (min de ramen en deuren) geschikt voor spouwmuurisolatie. Besparing: 7,0 m³/m²." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.spouw || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, spouw: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_spouw"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Zoldervloer</span>
                    <Tooltip text="Het oppervlak van de zoldervloer of vliering, zeer effectief als de zolder niet verwarmd wordt. Besparing: 6,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.zolderVliering || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, zolderVliering: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_zolder"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Dak binnen</span>
                    <Tooltip text="Het aantal vierkante meters te isoleren schuin dak aan de binnenzijde. Besparing: 9,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.dakBinnenzijde || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, dakBinnenzijde: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_dak_bin"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Gevel buiten</span>
                    <Tooltip text="Het oppervlak geschikt voor gevelisolatie aan de buitenzijde (of binnenzijde d.m.v. voorzetwanden). Besparing: 7,0 m³/m²." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.gevelBuitenzijde || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, gevelBuitenzijde: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_gev_bui"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Enkel → HR++</span>
                    <Tooltip text="Vervanging van enkel glas (U ≈ 5,1) door HR++ glas (U ≈ 1,1; isoleert 4,5x beter). Voorkomt kouval & condensatie. Komt in aanmerking voor ISDE-subsidie. Besparing: 12,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasEnkelHR || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasEnkelHR: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_glas_enk_hr"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Dubbel → HR++</span>
                    <Tooltip text="Vervanging van oud dubbel glas (U ≈ 2,8; geen edelgas/coating) door HR++ (U ≈ 1,1; argongas & HR-coating, isoleert 2,5x beter). Komt in aanmerking voor ISDE-subsidie. Besparing: 3,0 m³/m²." />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasDubbelHR || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasDubbelHR: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_glas_dub_hr"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Triple + Hout</span>
                    <Tooltip text="Vervanging door triple glas (HR+++, U ≈ 0,6) inclusief eventueel nieuwe kozijnen. Isoleert optimaal en komt in aanmerking voor ISDE-subsidie. Besparing: 12,5 m³/m²." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasTripleHout || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasTripleHout: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    id="m_glas_trip"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons under section 6 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              onClick={onWis}
              type="button"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Nieuw formulier (Wis)</span>
            </button>
            
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={onDownloadExcel}
                type="button"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Opslaan (Excel)</span>
              </button>
              <button
                onClick={onDownloadJSON}
                type="button"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Opslaan (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'zon' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Zonnepanelen Instellingen */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Zonnepanelen Instellingen</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, solarStatus: 'nieuw' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.solarStatus !== 'bestaand'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🆕 Nieuw in advies
                </button>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, solarStatus: 'bestaand' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.solarStatus === 'bestaand'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Reeds aanwezig op dak. Investering in het adviesrapport wordt op €0 gezet."
                >
                  🏠 Reeds aanwezig (€0)
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {tech.solarStatus === 'bestaand' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <span>💡 <strong>Reeds aanwezig:</strong> De opwekking van deze {tech.aantalZonnepanelen} panelen wordt meegenomen voor je stroombalans, maar de aanschafkosten staan op <strong>€0</strong> in het adviesrapport.</span>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, solarStatus: 'nieuw' }))}
                    className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 ml-2"
                  >
                    Zet op nieuw
                  </button>
                </div>
              )}
              {/* Parameters Grid (geen sliders, direct in te geven waardes) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Aantal zonnepanelen */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Aantal zonnepanelen
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tech.aantalZonnepanelen === 0 ? '' : tech.aantalZonnepanelen}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                        handleAantalZonnepanelenChange(val);
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                      placeholder="0"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">stuks</span>
                  </div>
                </div>

                {/* Vermogen per paneel (Wp) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Vermogen per paneel</span>
                    <Tooltip text="Het piekvermogen van een enkel zonnepaneel in Wattpiek (Wp). Oudere panelen hebben vaak 300-360 Wp, moderne panelen 400 tot 450 Wp." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="200"
                      max="600"
                      step="10"
                      value={tech.vermogenPerPaneel === 0 ? '' : (tech.vermogenPerPaneel !== undefined ? tech.vermogenPerPaneel : 400)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setTech(prev => ({ ...prev, vermogenPerPaneel: 0 }));
                          return;
                        }
                        const val = Number(raw);
                        setTech(prev => ({ ...prev, vermogenPerPaneel: val }));
                      }}
                      onBlur={() => {
                        setTech(prev => {
                          const current = prev.vermogenPerPaneel || 400;
                          const clamped = Math.min(600, Math.max(200, current));
                          return { ...prev, vermogenPerPaneel: clamped };
                        });
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">Wp</span>
                  </div>
                </div>

                {/* Dakoriëntatie */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Dakoriëntatie</span>
                    <Tooltip text="De oriëntatie t.o.v. het Zuiden. Zuid geeft maximale piek, Oost/West verdeelt de opbrengst beter over de dag." />
                  </label>
                  <select
                    value={tech.dakOrientatie}
                    onChange={(e) => setTech(prev => ({ ...prev, dakOrientatie: Number(e.target.value) }))}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500"
                  >
                    <option value={0}>Zuid (0° • Optimaal)</option>
                    <option value={-45}>Zuid-Oost (-45°)</option>
                    <option value={45}>Zuid-West (45°)</option>
                    <option value={-90}>Oost (-90°)</option>
                    <option value={90}>West (90°)</option>
                    <option value={180}>Noord (180°)</option>
                  </select>
                </div>

                {/* Hellingshoek */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Hellingshoek</span>
                    <Tooltip text="De hellingshoek van de zonnepanelen t.o.v. het horizontale vlak. Optimaal in NL is ~35°. Plat dak is 10-15°." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}
                      onChange={(e) => {
                        const val = Math.min(90, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, dakHellingshoek: val }));
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">°</span>
                  </div>
                </div>
              </div>

              {/* Eigen Prijsopgave & Marktconforme Richtprijzen */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium text-slate-500">Eigen Prijsopgave (€, incl. btw - optioneel)</label>
                    <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw) van de zonnepanelen in (bijv. uit een offerte). Laat leeg om te rekenen met onze marktconforme richtprijzen inclusief installatie." />
                  </div>
                  {tech.customZonnepanelenPrijs !== undefined && tech.customZonnepanelenPrijs > 0 && (
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, customZonnepanelenPrijs: undefined }))}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset naar standaard
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">€</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder={`Bijv. ${getSolarInvestmentEstimate(tech.aantalZonnepanelen || 10)} (laat leeg voor marktconforme schatting)`}
                    value={tech.customZonnepanelenPrijs !== undefined ? tech.customZonnepanelenPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customZonnepanelenPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>

                {/* Indicatieve prijsweergave & Kengetallen overzicht */}
                {tech.aantalZonnepanelen > 0 && (() => {
                  const range = getSolarInvestmentRange(tech.aantalZonnepanelen);
                  const isCustom = tech.customZonnepanelenPrijs !== undefined && tech.customZonnepanelenPrijs > 0;
                  return (
                    <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Indicatieve kosten ({tech.aantalZonnepanelen} panelen):</span>
                        </span>
                        <span className="font-extrabold text-amber-950 font-mono">
                          {isCustom 
                            ? `€ ${tech.customZonnepanelenPrijs?.toLocaleString('nl-NL')} (eigen opgave)` 
                            : `€ ${range.min.toLocaleString('nl-NL')} – € ${range.max.toLocaleString('nl-NL')}`}
                        </span>
                      </div>
                      {!isCustom && (
                        <div className="text-[11px] text-amber-800 flex justify-between pt-1 border-t border-amber-200/50">
                          <span>Gemiddelde totaalprijs: <strong>€ {range.avg.toLocaleString('nl-NL')}</strong></span>
                          <span>Prijs per paneel: <strong>~ € {range.avgPerPanel.toLocaleString('nl-NL')}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Referentietabel Zonnepanelen Richtprijzen */}
                <details className="text-xs text-slate-500 group">
                  <summary className="cursor-pointer font-medium hover:text-emerald-700 flex items-center gap-1 py-1">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bekijk de richtprijzentabel zonnepanelen (incl. installatie)</span>
                  </summary>
                  <div className="mt-2 overflow-x-auto border border-slate-200 rounded-lg bg-white p-2">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                          <th className="py-1.5 px-2">Aantal panelen</th>
                          <th className="py-1.5 px-2">Indicatieve totaalprijs</th>
                          <th className="py-1.5 px-2">Gem. prijs per paneel</th>
                          <th className="py-1.5 px-2">Verwachte opbrengst</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className={tech.aantalZonnepanelen === 2 ? 'bg-emerald-50 font-semibold' : ''}>
                          <td className="py-1 px-2">2 panelen</td>
                          <td className="py-1 px-2">€ 1.200 – € 1.600</td>
                          <td className="py-1 px-2">~ € 700</td>
                          <td className="py-1 px-2">~ 750 kWh</td>
                        </tr>
                        <tr className={tech.aantalZonnepanelen === 6 ? 'bg-emerald-50 font-semibold' : ''}>
                          <td className="py-1 px-2">6 panelen</td>
                          <td className="py-1 px-2">€ 2.500 – € 3.200</td>
                          <td className="py-1 px-2">~ € 475</td>
                          <td className="py-1 px-2">~ 2.300 kWh</td>
                        </tr>
                        <tr className={tech.aantalZonnepanelen === 10 ? 'bg-emerald-50 font-semibold' : ''}>
                          <td className="py-1 px-2">10 panelen</td>
                          <td className="py-1 px-2">€ 3.800 – € 5.100</td>
                          <td className="py-1 px-2">~ € 445</td>
                          <td className="py-1 px-2">~ 4.000 kWh</td>
                        </tr>
                        <tr className={tech.aantalZonnepanelen === 20 ? 'bg-emerald-50 font-semibold' : ''}>
                          <td className="py-1 px-2">20 panelen</td>
                          <td className="py-1 px-2">€ 7.500 – € 9.500</td>
                          <td className="py-1 px-2">~ € 425</td>
                          <td className="py-1 px-2">~ 8.200 kWh</td>
                        </tr>
                        <tr className={tech.aantalZonnepanelen === 36 ? 'bg-emerald-50 font-semibold' : ''}>
                          <td className="py-1 px-2">36 panelen</td>
                          <td className="py-1 px-2">€ 13.500 – € 16.000</td>
                          <td className="py-1 px-2">~ € 410</td>
                          <td className="py-1 px-2">~ 14.500 kWh</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <span>Berekend direct eigen verbruik</span>
                      <Tooltip position="bottom" text="Het percentage zonnestroom dat direct in huis wordt verbruikt op het moment dat de zon schijnt (bijv. door wasmachine, warmtepomp, EV). Dit percentage is vooraf berekend op basis van je jaarverbruik en zonne-opbrengst, maar kun je hieronder handmatig aanpassen." />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tech.aantalZonnepanelen > 0 
                        ? `Vooraf berekend op basis van je jaarverbruik (${house.verbruikKwh || 3500} kWh) en zonne-opbrengst (${localAnnualYieldKwh} kWh).`
                        : "Vul het aantal zonnepanelen in om het eigen verbruik te berekenen."}
                    </p>
                  </div>
                  {tech.aantalZonnepanelen > 0 && (
                    <span className="text-lg font-extrabold text-emerald-600 font-mono bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 shrink-0">
                      {tech.huidigDirectVerbruik}%
                    </span>
                  )}
                </div>

                {tech.aantalZonnepanelen > 0 && (
                  <div className="space-y-4">
                    {/* Teruglevering & Direct Verbruik Inputs (Geen sliders) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                      {/* Left Column: Teruglevering aan het net (kWh) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1" htmlFor="zon_teruglevering">
                          <span>Teruglevering aan het net</span>
                          <Tooltip text="De hoeveelheid zonnestroom (in kWh) die je jaarlijks teruglevert aan het elektriciteitsnet." />
                        </label>
                        <div className="relative">
                          <input
                            id="zon_teruglevering"
                            type="number"
                            value={house.elektraTeruglevering || ''}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setHouse(prev => ({ ...prev, elektraTeruglevering: val }));
                              if (localAnnualYieldKwh > 0) {
                                const directSolarConsumption = Math.max(0, localAnnualYieldKwh - val);
                                const calculatedPercent = Math.min(100, Math.max(0, Math.round((directSolarConsumption / localAnnualYieldKwh) * 100)));
                                setTech(prev => ({ ...prev, huidigDirectVerbruik: calculatedPercent }));
                              }
                            }}
                            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                            placeholder="2000"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">kWh</span>
                        </div>
                      </div>

                      {/* Right Column: Direct eigen verbruik (%) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1" htmlFor="zon_direct_verbruik">
                          <span>Direct eigen verbruik</span>
                          <Tooltip text="Het percentage zonnestroom dat direct in huis wordt verbruikt. Als je dit aanpast, wordt de teruglevering automatisch herberekenend op basis van je jaaropbrengst." />
                        </label>
                        <div className="relative">
                          <input
                            id="zon_direct_verbruik"
                            type="number"
                            min="0"
                            max="100"
                            value={tech.huidigDirectVerbruik}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value)));
                              setTech(prev => ({ ...prev, huidigDirectVerbruik: val }));
                              if (localAnnualYieldKwh > 0) {
                                const calculatedTeruglevering = Math.max(0, Math.round(localAnnualYieldKwh * (1 - val / 100)));
                                setHouse(prev => ({ ...prev, elektraTeruglevering: calculatedTeruglevering }));
                              }
                            }}
                            className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar visualizer */}
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${tech.huidigDirectVerbruik}%` }}
                        title={`Direct eigen verbruik: ${tech.huidigDirectVerbruik}%`}
                      />
                      <div 
                        className="bg-amber-400 h-full transition-all duration-500" 
                        style={{ width: `${100 - tech.huidigDirectVerbruik}%` }}
                        title={`Teruglevering aan het net: ${100 - tech.huidigDirectVerbruik}%`}
                      />
                    </div>

                    <div className="flex flex-wrap justify-between text-[10px] font-semibold text-slate-500 gap-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Direct verbruik: {Math.max(0, localAnnualYieldKwh - (house.elektraTeruglevering || 0))} kWh ({tech.huidigDirectVerbruik}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        Teruglevering: {house.elektraTeruglevering || 0} kWh ({100 - tech.huidigDirectVerbruik}%)
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 italic text-center">
                      * Pas de teruglevering direct aan via het invoerveld hierboven, of gebruik de percentage-schuifregelaar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gegevenscontrole & Consistentie Check Widget */}
          {(() => {
            const zonnepanelenYield = localAnnualYieldKwh;
            const verbruikElectra = house.verbruikKwh || 0;
            const terugleveringElectra = house.elektraTeruglevering || 0;
            const aantalZonnepanelen = tech.aantalZonnepanelen;

            let validationSeverity: 'success' | 'warning' | 'danger' = 'success';
            let validationTitle = 'Gegevens zijn consistent';
            let validationMessage = '';
            let validationAction = '';
            let selfConsumptionPercent = 0;
            let displayTotalConsumption = verbruikElectra;
            let isNettoAfnameMode = false;

            if (aantalZonnepanelen === 0) {
              if (terugleveringElectra > 0) {
                validationSeverity = 'danger';
                validationTitle = 'Kritieke onduidelijkheid: Teruglevering zonder panelen';
                validationMessage = `Je hebt ingesteld dat je 0 zonnepanelen hebt, maar wel een teruglevering van ${terugleveringElectra} kWh per jaar bij je woninggegevens hebt staan.`;
                validationAction = 'Zet het aantal panelen omhoog of pas de teruglevering aan naar 0 kWh in het tabblad "Woning".';
              } else {
                validationSeverity = 'success';
                validationTitle = 'Geen zonnestroom ingevoerd';
                validationMessage = 'Je hebt momenteel geen zonnepanelen en geen teruglevering ingesteld. Dit klopt logisch met elkaar.';
                validationAction = 'Verhoog het aantal zonnepanelen om een zonnestroom-advies te simuleren.';
              }
            } else {
              // We have solar panels
              const directSolarConsumption = Math.max(0, zonnepanelenYield - terugleveringElectra);

              if (terugleveringElectra > zonnepanelenYield) {
                validationSeverity = 'danger';
                validationTitle = 'Kritieke onduidelijkheid: Te hoge teruglevering';
                validationMessage = `Je opgegeven teruglevering (${terugleveringElectra} kWh) is groter dan je berekende zonne-opwekking (${zonnepanelenYield} kWh). Dit is natuurkundig onmogelijk.`;
                validationAction = 'Controleer je jaarrekening. Heb je per ongeluk je verbruik en teruglevering omgewisseld op de Woning-pagina, of is je ingestelde paneelvermogen/aantal panelen te laag?';
              } else if (terugleveringElectra === 0) {
                validationSeverity = 'warning';
                validationTitle = 'Aandachtspunt: Teruglevering staat op 0';
                validationMessage = `Je hebt ${aantalZonnepanelen} panelen die samen naar schatting ${zonnepanelenYield} kWh opwekken, maar je teruglevering staat op 0 kWh. Dit is in de praktijk zeldzaam zonder zero-export of enorme thuisaccu.`;
                validationAction = `Pas je teruglevering aan op de Woning-pagina. Gemiddeld is je teruglevering zonder batterij zo'n 70% tot 75% van je opwekking, oftewel ca. ${Math.round(zonnepanelenYield * 0.72)} kWh.`;
              } else if (terugleveringElectra < (zonnepanelenYield - verbruikElectra) && zonnepanelenYield > verbruikElectra) {
                // EXCELLENT INSIGHT: The user entered their grid import (net afname) as stroomverbruik!
                isNettoAfnameMode = true;
                selfConsumptionPercent = Math.min(100, Math.max(0, Math.round((directSolarConsumption / zonnepanelenYield) * 100)));
                displayTotalConsumption = Math.round(verbruikElectra + directSolarConsumption);

                validationSeverity = 'success';
                validationTitle = 'Gegevens consistent (Netto Afname gedetecteerd)';
                validationMessage = `We hebben je gegevens geanalyseerd. Je stroomverbruik van ${verbruikElectra} kWh staat voor je netto afname (grid import) van het net. Samen met je opwekking (${zonnepanelenYield} kWh) en teruglevering (${terugleveringElectra} kWh) verbruik je naar schatting ${Math.round(directSolarConsumption)} kWh (${selfConsumptionPercent}%) direct zelf. Je totale werkelijke stroomverbruik van de woning is dus ${displayTotalConsumption} kWh per jaar (inclusief direct verbruikte zonnestroom). Dit is een uitstekend sluitende balans!`;
                validationAction = 'We hanteren dit totale werkelijke verbruik van de woning in al onze verdere berekeningen.';
              } else {
                // Consistent! Let's calculate estimated direct self-consumption
                selfConsumptionPercent = Math.min(100, Math.max(0, Math.round((directSolarConsumption / zonnepanelenYield) * 100)));
                displayTotalConsumption = verbruikElectra;

                if (selfConsumptionPercent > 95) {
                  validationSeverity = 'warning';
                  validationTitle = 'Opvallend: Zeer hoog direct eigen verbruik';
                  validationMessage = `Volgens je invoer verbruik je maar liefst ${selfConsumptionPercent}% of je opgewekte stroom direct zelf (${Math.round(directSolarConsumption)} kWh). Dit is extreem hoog (gemiddeld is dit 30% zonder batterij).`;
                  validationAction = 'Controleer of je teruglevering klopt met je werkelijke jaarrekening. Als je een laadpaal of warmtepomp overdag gebruikt, kan dit percentage wel kloppen!';
                } else {
                  validationSeverity = 'success';
                  validationTitle = 'Gegevens zijn logisch consistent!';
                  validationMessage = `Op basis van je ingevoerde verbruik (${verbruikElectra} kWh) en teruglevering (${terugleveringElectra} kWh) verbruik je naar schatting ${selfConsumptionPercent}% van je opgewekte zonnestroom direct zelf. Dit is een gezonde verhouding.`;
                  validationAction = 'Gebruik de onderstaande interactieve schuifregelaars om te zien hoe een thuisaccu of dynamisch contract dit beïnvloedt.';
                }
              }
            }

            // Define styling colors based on severity
            const config = {
              success: {
                bg: 'bg-emerald-50/60 border-emerald-100 text-emerald-950',
                iconColor: 'text-emerald-500',
                icon: CheckCircle2,
                badge: 'bg-emerald-100 text-emerald-800'
              },
              warning: {
                bg: 'bg-amber-50/60 border-amber-150 text-amber-950',
                iconColor: 'text-amber-500',
                icon: Info,
                badge: 'bg-amber-100 text-amber-800'
              },
              danger: {
                bg: 'bg-rose-50/60 border-rose-150 text-rose-950',
                iconColor: 'text-rose-500',
                icon: AlertTriangle,
                badge: 'bg-rose-100 text-rose-800'
              }
            }[validationSeverity];

            const SeverityIcon = config.icon;

            // Monthly solar distribution data
            const monthlyDistribution = [
              { name: 'Jan', percentage: 3 },
              { name: 'Feb', percentage: 5 },
              { name: 'Mrt', percentage: 8 },
              { name: 'Apr', percentage: 12 },
              { name: 'Mei', percentage: 15 },
              { name: 'Jun', percentage: 17 },
              { name: 'Jul', percentage: 16 },
              { name: 'Aug', percentage: 13 },
              { name: 'Sep', percentage: 10 },
              { name: 'Okt', percentage: 6 },
              { name: 'Nov', percentage: 3 },
              { name: 'Dec', percentage: 2 }
            ];

            const monthlySolarData = monthlyDistribution.map(item => ({
              name: item.name,
              'Zonnestroom (kWh)': Math.round((zonnepanelenYield * item.percentage) / 100)
            }));

            return (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4" id="data-consistency-card">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-700 font-sans">Gegevenscontrole &amp; Consistentie</h3>
                  </div>
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${config.badge}`}>
                    {validationSeverity === 'success' ? (isNettoAfnameMode ? 'Gecorrigeerd' : 'Correct') : validationSeverity === 'warning' ? 'Controleer' : 'Fout'}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We controleren de ingevoerde gegevens uit het tabblad <strong className="text-slate-700">Woning</strong> (elektraverbruik en teruglevering) met de berekende zonne-opwekking op basis van je zonnepanelen om te zien of deze gegevens logisch met elkaar kloppen.
                  </p>

                  {/* Verification alert box */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${config.bg}`}>
                    <SeverityIcon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                    <div className="space-y-1 text-xs">
                      <h4 className="font-bold">{validationTitle}</h4>
                      <p className="leading-relaxed opacity-90">{validationMessage}</p>
                      {validationAction && (
                        <p className="font-medium text-[11px] mt-1.5 border-t border-slate-200/40 pt-1.5 opacity-95">
                          <strong className="underline">Geadviseerde actie:</strong> {validationAction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detailed metrics table */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium flex items-center gap-1">
                        <span>Opwekking</span>
                        <Tooltip text={`Verwachte zonne-opwekking op jaarbasis op basis van ${aantalZonnepanelen} panelen à ${tech.vermogenPerPaneel || 400} Wp en de oriëntatie.`} />
                      </span>
                      <strong className="text-slate-700 text-sm font-mono">{zonnepanelenYield} kWh</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium flex items-center gap-1">
                        <span>Netto Afname</span>
                        <Tooltip text="De stroom die je netto van je energieleverancier hebt afgenomen (ingevuld onder Elektra)." />
                      </span>
                      <strong className="text-slate-700 text-sm font-mono">{verbruikElectra} kWh</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium flex items-center gap-1">
                        <span>Teruglevering</span>
                        <Tooltip text="De zonnestroom die je overschot is en teruggaat naar het energienet (zoals ingevuld in het tabblad Woning)." />
                      </span>
                      <strong className="text-slate-700 text-sm font-mono">{terugleveringElectra} kWh</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium flex items-center gap-1">
                        <span>Totaal verbruik</span>
                        <Tooltip text="Jouw totale werkelijke elektriciteitsverbruik in huis, berekend als: Afname + (Opwekking - Teruglevering)." />
                      </span>
                      <strong className="text-slate-700 text-sm font-mono">
                        {aantalZonnepanelen > 0 ? `${displayTotalConsumption} kWh` : `${verbruikElectra} kWh`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Dynamisch Contract & Omslagpunt widget */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700 font-sans">Dynamisch Contract & Omslagpunt</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Slimme Tool</span>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Context text in simple wording */}
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>
                  Bij een dynamisch contract betaal je bij negatieve spotprijzen om stroom terug te leveren. 
                  Maar wanneer precies is het omslagpunt? Dat hangt af van je opwek, verbruik, en de opslagen van je leverancier. 
                  Deze tool berekent je persoonlijke break-even punt en geeft realtime advies.
                </p>
              </div>

              {/* Controls Grid: Leverancier opslag & Spotprijs simulator side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Left Column: Leverancier Opslag / Inkoopkosten */}
                <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center">
                        <span>Leverancier opslag / inkoopkosten</span>
                        <Tooltip text="De extra kosten of marge die je energieleverancier per kWh rekent bij een dynamisch contract. Dit ligt meestal tussen €0,01 en €0,05 per kWh." />
                      </label>
                      <span className="text-xs font-bold text-slate-700 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        € {opslagLeverancier.toFixed(4)} / kWh
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.000"
                      max="0.080"
                      step="0.0001"
                      value={opslagLeverancier}
                      onChange={(e) => setTech(prev => ({ ...prev, opslagLeverancier: Number(e.target.value) }))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  {/* Supplier presets */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Snelkeuze energieleverancier:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { name: 'Zonneplan', val: 0.0218, desc: 'Populair, vaste inkoopkosten' },
                        { name: 'Tibber', val: 0.0202, desc: 'Slim laden, lage opslag' },
                        { name: 'ANWB', val: 0.0224, desc: 'Samen naar duurzamer' },
                        { name: 'Frank', val: 0.0240, desc: 'Volledig transparant' }
                      ].map((provider) => {
                        const isSelected = Math.abs(opslagLeverancier - provider.val) < 0.0002;
                        return (
                          <button
                            key={provider.name}
                            type="button"
                            onClick={() => setTech(prev => ({ ...prev, opslagLeverancier: provider.val }))}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-all ${
                              isSelected 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm font-bold' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                            }`}
                            title={`${provider.name}: €${provider.val.toFixed(4)}/kWh (${provider.desc})`}
                          >
                            {provider.name} (€{provider.val.toFixed(3)})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Spotprijs Simulator */}
                <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Interactieve Spotprijs Simulator</span>
                        <Tooltip text="Schuif met de beursstroomprijs om direct te zien wat het effect is op je netto kosten/opbrengst en wat het EMS adviseert." />
                      </label>
                      <span className="text-xs font-bold text-slate-700 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        € {simulatedSpotPrice.toFixed(2)} / kWh
                      </span>
                    </div>
                    
                    <input
                      type="range"
                      min="-0.25"
                      max="0.25"
                      step="0.01"
                      value={simulatedSpotPrice}
                      onChange={(e) => setSimulatedSpotPrice(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                      <span>-€0.25 (Extreem)</span>
                      <span>€0.00</span>
                      <span>€0.25 (Hoog)</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 italic">
                    💡 Test hoe de adviesmelding hieronder reageert bij positieve en negatieve beursstroomprijzen.
                  </div>
                </div>
              </div>

              {/* Personal break-even results dashboard */}
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Verwachte jaaropwekking</span>
                  <strong className="text-slate-700 text-sm font-mono">{localAnnualYieldKwh} kWh / jaar</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Jaarlijks stroomverbruik</span>
                  <strong className="text-slate-700 text-sm font-mono">{house.verbruikKwh || 0} kWh / jaar</strong>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Jouw persoonlijke Teruglever-omslagpunt:</span>
                    <Tooltip text="Zodra de beursstroomprijs onder dit punt daalt, is je netto terugleververgoeding negatief en betaal je dus effectief om terug te leveren." />
                  </div>
                  <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded font-mono text-center shrink-0">
                    Minder dan € {breakEvenFeedIn.toFixed(3)} / kWh
                  </span>
                </div>
              </div>

              {/* Real-time feedback box */}
              <div className={`p-3.5 rounded-xl border transition-all duration-300 ${adviceColor}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-4 h-4 shrink-0" />
                  <h5 className="font-bold text-xs">{adviceTitle}</h5>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">
                  {adviceText}
                </p>
              </div>


            </div>
          </div>
        </div>
      )}

      {activeTab === 'accu' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fadeIn">
          {/* Thuisbatterij Instellingen */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Thuisbatterij Instellingen</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, batteryStatus: 'nieuw' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.batteryStatus !== 'bestaand'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🆕 Nieuw in advies
                </button>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, batteryStatus: 'bestaand' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.batteryStatus === 'bestaand'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Reeds aanwezig. Investering in het adviesrapport wordt op €0 gezet."
                >
                  🏠 Reeds aanwezig (€0)
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {tech.batteryStatus === 'bestaand' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <span>💡 <strong>Reeds aanwezig:</strong> De opslag en opbrengst van deze {tech.capaciteitAccu} kWh accu wordt berekend, maar de aanschafkosten staan op <strong>€0</strong> in het adviesrapport.</span>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, batteryStatus: 'nieuw' }))}
                    className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 ml-2"
                  >
                    Zet op nieuw
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Capaciteit accu */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Capaciteit accu</span>
                    <Tooltip text="Bepaalt de maximale opslagcapaciteit van je thuisbatterij. Stem de grootte af op je zonne-opwekking en nachtverbruik." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={tech.capaciteitAccu}
                      onChange={(e) => {
                        const val = Math.min(50, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, capaciteitAccu: val }));
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                      placeholder="10"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">kWh</span>
                  </div>
                </div>

                {/* Omzettingsverliezen */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span>Omzettingsverlies</span>
                    <Tooltip text="Laden en ontladen geeft warmte en energieverlies door de omvormer. Standaard is 20%." />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={tech.omzettingsverliezen}
                      onChange={(e) => setTech(prev => ({ ...prev, omzettingsverliezen: Number(e.target.value) }))}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 font-mono"
                      placeholder="20"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">%</span>
                  </div>
                </div>
              </div>

              {/* Eigen Prijsopgave & Marktconforme Richtprijzen */}
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium text-slate-500">Eigen Prijsopgave (€, incl. 21% btw - optioneel)</label>
                    <Tooltip text="Vul hier de totale kosten (incl. btw) van de thuisbatterij in (bijv. uit een offerte). De 21% btw-teruggave (mogelijk bij een dynamisch contract) wordt automatisch verrekend om de netto terugverdientijd te berekenen. Laat leeg voor marktconforme schatting." />
                  </div>
                  {tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 && (
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, customAccuPrijs: undefined }))}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset naar standaard
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">€</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder={`Bijv. ${getBatteryInvestmentEstimate(tech.capaciteitAccu || 10)} (laat leeg voor marktconforme schatting)`}
                    value={tech.customAccuPrijs !== undefined ? tech.customAccuPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customAccuPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                    id="custom_accu_prijs_input_main"
                  />
                </div>
                {tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                    <span>Netto investering (excl. 21% btw na teruggave):</span>
                    <strong className="font-mono font-extrabold text-emerald-900">
                      € {Math.round(tech.customAccuPrijs * (100 / 121)).toLocaleString('nl-NL')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Indicatieve prijsweergave & Kengetallen overzicht thuisaccu */}
              {tech.capaciteitAccu > 0 && (() => {
                const range = getBatteryInvestmentRange(tech.capaciteitAccu);
                const isCustom = tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0;
                return (
                  <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                        <Battery className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Indicatieve kosten ({tech.capaciteitAccu} kWh):</span>
                      </span>
                      <span className="font-extrabold text-blue-950 font-mono">
                        {isCustom 
                          ? `€ ${tech.customAccuPrijs?.toLocaleString('nl-NL')} (eigen opgave)` 
                          : `€ ${range.min.toLocaleString('nl-NL')} – € ${range.max.toLocaleString('nl-NL')}`}
                      </span>
                    </div>
                    {!isCustom && (
                      <div className="text-[11px] text-blue-800 space-y-1 pt-1 border-t border-blue-200/50">
                        <div className="flex justify-between">
                          <span>Gemiddelde totaalprijs: <strong>€ {range.avg.toLocaleString('nl-NL')}</strong></span>
                          <span>Prijs per kWh: <strong>~ € {range.avgPerKwh.toLocaleString('nl-NL')} / kWh</strong></span>
                        </div>
                        {range.application && (
                          <div className="text-[10px] text-blue-700 italic">
                            💡 <strong>Toepassing:</strong> {range.application}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Referentietabel Thuisaccu Richtprijzen */}
              <details className="text-xs text-slate-500 group">
                <summary className="cursor-pointer font-medium hover:text-emerald-700 flex items-center gap-1 py-1">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bekijk de richtprijzentabel thuisaccu's (incl. installatie)</span>
                </summary>
                <div className="mt-2 overflow-x-auto border border-slate-200 rounded-lg bg-white p-2">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-50">
                        <th className="py-1.5 px-2">Capaciteit (kWh)</th>
                        <th className="py-1.5 px-2">Indicatieve totaalprijs (incl. installatie)</th>
                        <th className="py-1.5 px-2">Prijs per kWh capaciteit</th>
                        <th className="py-1.5 px-2">Toepassing / Doelgroep</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className={tech.capaciteitAccu > 0 && tech.capaciteitAccu <= 2 ? 'bg-emerald-50 font-semibold text-emerald-950' : ''}>
                        <td className="py-1.5 px-2 font-bold font-mono">2 kWh</td>
                        <td className="py-1.5 px-2">€ 1.500 – € 2.500</td>
                        <td className="py-1.5 px-2">€ 750 – € 1.250</td>
                        <td className="py-1.5 px-2">Appartementen, klein verbruik, opslaan van een middagje zon.</td>
                      </tr>
                      <tr className={tech.capaciteitAccu > 2 && tech.capaciteitAccu <= 5 ? 'bg-emerald-50 font-semibold text-emerald-950' : ''}>
                        <td className="py-1.5 px-2 font-bold font-mono">5 kWh</td>
                        <td className="py-1.5 px-2">€ 3.500 – € 5.000</td>
                        <td className="py-1.5 px-2">€ 700 – € 1.000</td>
                        <td className="py-1.5 px-2">Gemiddeld huishouden, overbruggen van de avonduren.</td>
                      </tr>
                      <tr className={tech.capaciteitAccu > 5 && tech.capaciteitAccu <= 10 ? 'bg-emerald-50 font-semibold text-emerald-950' : ''}>
                        <td className="py-1.5 px-2 font-bold font-mono">10 kWh</td>
                        <td className="py-1.5 px-2">€ 6.000 – € 8.500</td>
                        <td className="py-1.5 px-2">€ 600 – € 850</td>
                        <td className="py-1.5 px-2">Groot huishouden, warmtepomp, elektrische auto opgeladen via de accu.</td>
                      </tr>
                      <tr className={tech.capaciteitAccu > 10 && tech.capaciteitAccu <= 20 ? 'bg-emerald-50 font-semibold text-emerald-950' : ''}>
                        <td className="py-1.5 px-2 font-bold font-mono">20 kWh</td>
                        <td className="py-1.5 px-2">€ 10.500 – € 14.500</td>
                        <td className="py-1.5 px-2">€ 525 – € 725</td>
                        <td className="py-1.5 px-2">Zeer groot verbruik, (semi-)off-grid, kleinzakelijk.</td>
                      </tr>
                      <tr className={tech.capaciteitAccu > 20 ? 'bg-emerald-50 font-semibold text-emerald-950' : ''}>
                        <td className="py-1.5 px-2 font-bold font-mono">30 kWh</td>
                        <td className="py-1.5 px-2">€ 14.000 – € 20.000</td>
                        <td className="py-1.5 px-2">€ 465 – € 665</td>
                        <td className="py-1.5 px-2">Combinatie met 36 zonnepanelen, agrarisch, kleinzakelijk gebruik.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>

          {/* MEEST GESCHIKTE ACCU & CONTRACT ADVIEREN */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Geadviseerde Thuisbatterij &amp; Contract
              </h4>
            </div>

            {/* Contract type selection right in this tab */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-500">
                1. Kies je energiecontract type:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast', batteryGridTrading: false }))}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                    tech.typeContract === 'Vast'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold">Vast / Variabel</span>
                  <span className="text-[9px] font-normal opacity-75">Vaste tarieven &amp; salderen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch', batteryGridTrading: true }))}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                    tech.typeContract === 'Dynamisch'
                      ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold">Dynamisch tarief</span>
                  <span className="text-[9px] font-normal opacity-75">Beursprijzen per uur</span>
                </button>
              </div>
            </div>

            {/* Suitable battery size recommendation */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Geadviseerde Accugrootte</span>
                  {tech.aantalZonnepanelen === 0 ? (
                    <span className="text-sm font-bold text-slate-600 block">Zonnepanelen vereist</span>
                  ) : (
                    <span className="text-base font-extrabold text-slate-800 block">
                      {localAnnualYieldKwh < 3500 ? '5 kWh (Klein)' : localAnnualYieldKwh < 7500 ? '10 kWh (Middelgroot)' : '15 kWh (Groot)'}
                    </span>
                  )}
                </div>
                <div className="bg-emerald-500 text-white font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                  {tech.aantalZonnepanelen === 0 ? '0 kWh' : localAnnualYieldKwh < 3500 ? '5 kWh' : localAnnualYieldKwh < 7500 ? '10 kWh' : '15 kWh'}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                {tech.aantalZonnepanelen === 0 ? (
                  "Een thuisbatterij is financieel minder bruikbaar als er geen zonnestroom is om op te slaan. We adviseren om eerst zonnepanelen te leggen."
                ) : localAnnualYieldKwh < 3500 ? (
                  `Met een jaaropbrengst van ${localAnnualYieldKwh} kWh is een compacte batterij van 5 kWh ideaal om je avondverbruik af te dekken.`
                ) : localAnnualYieldKwh < 7500 ? (
                  `Met een jaaropbrengst van ${localAnnualYieldKwh} kWh is een 10 kWh accu perfect gedimensioneerd voor een gemiddeld gezin.`
                ) : (
                  `Met een hoge jaaropbrengst van ${localAnnualYieldKwh} kWh is een grotere accu van 15 kWh uitstekend om de zonnepieken volledig op te slaan.`
                )}
              </p>

              {tech.aantalZonnepanelen > 0 && tech.capaciteitAccu !== (localAnnualYieldKwh < 3500 ? 5 : localAnnualYieldKwh < 7500 ? 10 : 15) && (
                <button
                  type="button"
                  onClick={() => {
                    const recSize = localAnnualYieldKwh < 3500 ? 5 : localAnnualYieldKwh < 7500 ? 10 : 15;
                    setTech(prev => ({ ...prev, capaciteitAccu: recSize }));
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition shadow-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Stel accu in op geadviseerde {localAnnualYieldKwh < 3500 ? '5' : localAnnualYieldKwh < 7500 ? '10' : '15'} kWh
                </button>
              )}
            </div>

            {/* Financial feasibility note based on contract */}
            <div className="text-[11px] leading-relaxed p-3.5 rounded-xl border">
              {tech.typeContract === 'Vast' ? (
                <div className="space-y-1.5 text-rose-800 bg-rose-50/50 border-rose-100">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    Financieel Rendement met Vast Contract:
                  </span>
                  <p className="text-[10px] text-slate-600">
                    Onder de salderingsregeling (tot 2027) levert een thuisbatterij met een vast contract weinig extra besparing op, omdat je stroom 1-op-1 mag wegstrepen. 
                    <button 
                      type="button" 
                      onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch' }))}
                      className="text-blue-600 underline font-bold ml-1 hover:text-blue-800"
                    >
                      Schakel over naar een dynamisch contract
                    </button> om te zien hoe de terugverdientijd direct daalt door arbitrage sturing.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 text-blue-800 bg-blue-50/50 border-blue-100">
                  <span className="font-bold flex items-center gap-1 text-blue-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Rendement geoptimaliseerd met Dynamisch contract!
                  </span>
                  <p className="text-[10px] text-slate-600">
                    Door de wisselende uurprijzen van een dynamisch contract kan je accu stroom opslaan bij negatieve of lage prijzen (of windenergie) en ontladen op dure piekmomenten. Dit levert extra winst op (arbitrage-trading), ook als er geen zon schijnt!
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic provider selector for dynamic contracts */}
            {tech.typeContract === 'Dynamisch' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 animate-fadeIn">
                <span className="block text-xs font-bold text-slate-700">
                  2. Kies je dynamische energieaanbieder:
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Zonneplan' as const, name: 'Zonneplan', subtitle: 'Dynamisch' },
                    { id: 'Tibber' as const, name: 'Tibber', subtitle: 'Smart API' },
                    { id: 'Frank' as const, name: 'Frank Energie', subtitle: 'Slim Handelen' },
                    { id: 'Anwb' as const, name: 'ANWB Energie', subtitle: 'Slim Laden' }
                  ].map((provider) => {
                    const isSelected = tech.dynamicProvider === provider.id || (!tech.dynamicProvider && provider.id === 'Zonneplan');
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setTech(prev => ({ ...prev, dynamicProvider: provider.id }))}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-300 text-blue-900 ring-2 ring-blue-100'
                            : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="font-extrabold text-xs">{provider.name}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{provider.subtitle}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Specific provider explanation box */}
                <div className="p-3 bg-blue-50/30 border border-blue-100/60 rounded-xl text-[11px] leading-relaxed">
                  {(!tech.dynamicProvider || tech.dynamicProvider === 'Zonneplan') && (
                    <div>
                      <span className="font-bold text-blue-950 block">⚡ Zonneplan Dynamisch:</span>
                      <p className="text-slate-600 mt-1">
                        Geautomatiseerde sturing van de thuisaccu op basis van dynamische stroomtarieven en de stroommarkt.
                      </p>
                    </div>
                  )}
                  {tech.dynamicProvider === 'Tibber' && (
                    <div>
                      <span className="font-bold text-blue-950 block">🔌 Tibber Smart API &amp; Integraties:</span>
                      <p className="text-slate-600 mt-1">
                        Tibber staat bekend om hun open API en uitstekende integratie met Home Assistant of slimme laadpalen. Uitermate geschikt voor tech-savvy gebruikers die de accu via eigen domotica willen optimaliseren op basis van de EPEX spotprijzen.
                      </p>
                    </div>
                  )}
                  {tech.dynamicProvider === 'Frank' && (
                    <div>
                      <span className="font-bold text-blue-950 block">🍂 Frank Energie "Slim Handelen":</span>
                      <p className="text-slate-600 mt-1">
                        Frank Energie biedt de "Slim Handelen" service. De software kiest de goedkoopste uren van de dag om de thuisaccu op te laden (bijvoorbeeld bij stormachtig weer met veel windstroom) en ontlaadt deze tijdens dure uren, geheel ontzorgd.
                      </p>
                    </div>
                  )}
                  {tech.dynamicProvider === 'Anwb' && (
                    <div>
                      <span className="font-bold text-blue-950 block">🚗 ANWB Energie Slimme Combinaties:</span>
                      <p className="text-slate-600 mt-1">
                        ANWB Energie combineert slimme sturing van de accu uitstekend met hun ANWB Slim Laden app voor elektrische auto's. De software kijkt naar je gezamenlijke profiel (zonneopbrengst, accu en EV-laadbehoefte) voor optimaal voordeel.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'saldering' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Energiecontract & Saldering */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Contract &amp; Tarieven</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="block text-xs font-medium text-slate-500">Type Energiecontract</label>
                  <Tooltip text="Met een vast contract mag je stroom 1-op-1 salderen (tot 2027). Met een dynamisch contract wijzigen stroomprijzen elk uur, wat kansen biedt voor arbitrage-trading met een thuisaccu." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast', batteryGridTrading: false }))}
                    className={`py-2 px-1 text-xs font-medium rounded-lg border text-center transition ${
                      tech.typeContract === 'Vast'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Vast contract
                  </button>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch', batteryGridTrading: true }))}
                    className={`py-2 px-1 text-xs font-medium rounded-lg border text-center transition ${
                      tech.typeContract === 'Dynamisch'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Dynamisch contract
                  </button>
                </div>
              </div>

              {tech.typeContract === 'Vast' ? (
                <div className="space-y-3 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>📄 Vaste Tarieven &amp; Terugleverkosten (2024–2026)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Salderen + Boetes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-xs font-medium text-slate-600">Leveringstarief afname (€/kWh)</label>
                        <Tooltip text="Het vaste tarief dat je betaalt voor elke kWh stroom die je van het net afneemt." />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={house.elektraPrijs}
                        onChange={(e) => setHouse(prev => ({ ...prev, elektraPrijs: Number(e.target.value) }))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-xs font-medium text-slate-600">Terugleverkosten (€/kWh)</label>
                        <Tooltip text="De kosten / boete die energieleveranciers (bijv. Vattenfall, Eneco, Essent) tegenwoordig in rekening brengen per teruggeleverde kWh. Gemiddeld circa € 0,11/kWh." />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={tech.vastTerugleverkosten !== undefined ? tech.vastTerugleverkosten : 0.11}
                        onChange={(e) => setTech(prev => ({ ...prev, vastTerugleverkosten: Number(e.target.value) }))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-xs font-medium text-slate-600">Terugleververgoeding overschot (€/kWh)</label>
                        <Tooltip text="De netto vergoeding die je ontvangt voor zonnestroom die je méér opwekt dan je totale jaarverbruik (overschot na saldering)." />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={tech.vastTerugleverVergoeding !== undefined ? tech.vastTerugleverVergoeding : 0.05}
                        onChange={(e) => setTech(prev => ({ ...prev, vastTerugleverVergoeding: Number(e.target.value) }))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 <strong>Waarom terugleverkosten belangrijk zijn:</strong> Bij veel zonnepanelen (zoals 36 panelen met ~14.500 kWh opwek) lever je ~11.000 à 13.000 kWh terug aan het net. Bij een vast contract kost dit alleen al aan terugleverkosten ruim <strong>€ 1.200 tot € 1.400 per jaar</strong>!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <span>⚡ Dynamische Uurtarieven (Geen Terugleverkosten)</span>
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">€0 Boetes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-xs font-medium text-slate-600">Gemiddeld inkooptarief afname (€/kWh)</label>
                        <Tooltip text="Het gemiddelde dynamische inkooptarief inclusief energiebelasting en btw (gemiddeld circa € 0,25/kWh bij dynamische aanbieders)." />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={tech.dynamischStroomTarief !== undefined ? tech.dynamischStroomTarief : 0.25}
                        onChange={(e) => setTech(prev => ({ ...prev, dynamischStroomTarief: Number(e.target.value) }))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-xs font-medium text-slate-600">Gemiddeld teruglevertarief zonne-uren (€/kWh)</label>
                        <Tooltip text="Het gemiddelde markttarief op uren dat zonnepanelen stroom terugleveren. Bij dynamisch betaal je €0 terugleverboete." />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={tech.dynamischTerugleverTarief !== undefined ? tech.dynamischTerugleverTarief : 0.09}
                        onChange={(e) => setTech(prev => ({ ...prev, dynamischTerugleverTarief: Number(e.target.value) }))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ⚡ <strong>Voordeel van dynamisch bij zonnepanelen:</strong> Je betaalt <strong>€ 0 terugleverboetes</strong>. De stroom wordt direct afgerekend tegen de uurprijzen op de day-ahead beurs (EPEX).
                  </p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">Let op: Afschaffing Salderingsregeling</span>
                Vanaf <strong>1 januari 2027</strong> wordt de salderingsregeling in Nederland volledig afgeschaft. Dit betekent dat teruggeleverde stroom direct minder oplevert en direct eigen verbruik én thuisbatterijen cruciaal worden voor het rendement!
              </div>
            </div>
          </div>

          {/* Batterij Verdienmodel & Vergelijker Post-Saldering */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="saldering-accu-verdienmodel">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Accu &amp; Leverancier Opbrengst (Vanaf 2027)</h3>
              </div>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Post-Saldering</span>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="text-xs text-slate-600 leading-relaxed flex items-start gap-1">
                <span>
                  Als de salderingsregeling per 2027 vervalt, kun je met een thuisbatterij en een dynamisch contract stroom opslaan bij lage (of negatieve) prijzen en gebruiken of terugleveren tijdens dure piekuren (<strong>arbitrage-trading</strong>).
                </span>
                <Tooltip text="Arbitrage-trading is het slim inzetten van een batterij om stroom in te kopen bij lage of negatieve prijzen (bijvoorbeeld bij veel wind/zon) en deze te verbruiken of terug te leveren tijdens dure piekuren. Dit verhoogt je rendement aanzienlijk na afschaffing van de saldering." />
              </div>

              {/* Direct controls for battery and supplier within this card */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Jouw selectie aanpassen:</span>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-600">Zelfgekozen Accucapaciteit:</span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">{tech.capaciteitAccu || 0} kWh</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={tech.capaciteitAccu}
                      onChange={(e) => setTech(prev => ({ ...prev, capaciteitAccu: Number(e.target.value) }))}
                      className="w-full accent-emerald-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                      <span>0 kWh (Geen)</span>
                      <span>10 kWh</span>
                      <span>20 kWh</span>
                      <span>30 kWh</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-600 block mb-1.5">Zelfgekozen Energieleverancier:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                      {[
                        { id: 'Zonneplan', name: 'Zonneplan', subtitle: 'Dynamisch' },
                        { id: 'Tibber', name: 'Tibber', subtitle: 'Smart API' },
                        { id: 'Frank', name: 'Frank', subtitle: 'Slim Handelen' },
                        { id: 'Anwb', name: 'ANWB', subtitle: 'Slim Laden' }
                      ].map((provider) => {
                        const isSelected = tech.dynamicProvider === provider.id || (!tech.dynamicProvider && provider.id === 'Zonneplan');
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setTech(prev => ({ ...prev, dynamicProvider: provider.id as any, typeContract: 'Dynamisch' }))}
                            className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-100'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[10px] font-bold block">{provider.name}</span>
                            <span className="text-[8px] opacity-75">{provider.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thuisaccu Sturing Mode Toggle */}
                  <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="batteryGridTradingInput"
                        checked={tech.batteryGridTrading || false}
                        onChange={(e) => setTech(prev => ({ ...prev, batteryGridTrading: e.target.checked }))}
                        className="accent-purple-600 w-4 h-4 rounded border-slate-300 cursor-pointer shrink-0"
                      />
                      <label htmlFor="batteryGridTradingInput" className="block text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5 flex-wrap">
                        <span>Thuisaccu Sturing Mode: Slim EMS Nethandel &amp; Arbitrage</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          tech.batteryGridTrading 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {tech.batteryGridTrading ? 'Aan (Nethandel Actief)' : 'Uit (100% Zonne-focus)'}
                        </span>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-sans pl-6">
                      {tech.batteryGridTrading ? (
                        <>Ingeschakeld: Het intelligente EMS benut de accu optimaal door zowel zonnestroom op te slaan als <strong>volautomatisch te handelen op de dynamische energiemarkt</strong> (EPEX &amp; Onbalans) voor extra jaarrendement.</>
                      ) : (
                        <>Uitgeschakeld (standaard): De accu slaat <strong>uitsluitend zonnestroom van eigen panelen</strong> op voor later huishoudelijk gebruik. Er vindt geen nethandel plaats op de energiemarkt (pure arbitrage-opbrengst = €0/jaar).</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings with chosen config */}
              {tech.capaciteitAccu > 0 ? (() => {
                const currentProvider = tech.dynamicProvider || 'Zonneplan';
                const { directSavings, arbitrageYield, totalSavings, investment, tvt } = calculatePostSalderingEarnings(tech.capaciteitAccu, currentProvider, tech.customAccuPrijs);
                
                return (
                  <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/60 space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-emerald-100/40 pb-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">Jouw Verwachte Opbrengst (Post-Saldering):</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-50 shadow-sm">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Besparing Eigen Verbruik</span>
                          <Tooltip text="De extra stroom die je dankzij je accu overdag opslaat en 's avonds/'s nachts zelf verbruikt, in plaats van terug te leveren tegen een minimaal tarief (geschat op €0,06)." />
                        </div>
                        <span className="text-sm font-extrabold text-slate-700 font-mono">€{Math.round(directSavings)} / jr</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-50 shadow-sm">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Opbrengst Arbitrage-trading</span>
                          <Tooltip text="De extra inkomsten die je vergaart door volautomatisch te handelen op de dynamische energiemarkt (opladen bij lage/negatieve stroomprijzen en ontladen/terugleveren bij hoge prijzen)." />
                        </div>
                        <span className="text-sm font-extrabold text-slate-700 font-mono">€{Math.round(arbitrageYield).toLocaleString('nl-NL')} / jr</span>
                      </div>
                    </div>

                    <div className="bg-emerald-600 text-white rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="text-[9px] font-bold opacity-85 block uppercase tracking-wider">Totale Jaaropbrengst</span>
                        <span className="text-lg font-black">€{Math.round(totalSavings)} / jaar</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold opacity-85 block uppercase tracking-wider">Terugverdientijd (TVT)</span>
                        <span className="text-lg font-black">{tvt < 99 ? `${tvt.toFixed(1)} jaar` : 'Geen'}</span>
                      </div>
                    </div>
                    
                    <span className="text-[9px] text-slate-400 block text-center leading-relaxed italic">
                      Investeringsschatting {tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 ? '(op basis van eigen prijsopgave' : '(op basis van marktgemiddelde'}{' '}- netto na btw-teruggave): €{Math.round(investment).toLocaleString('nl-NL')}. Arbitrage is berekend op basis van de specifieke sturingssoftware van {currentProvider}.
                    </span>
                  </div>
                );
              })() : (
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 text-xs text-slate-500">
                  ⚠️ Kies hierboven een accucapaciteit groter dan 0 kWh om de opbrengst van jouw eigen thuisbatterij te berekenen.
                </div>
              )}

              {/* Comparison Matrix Table */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">
                  Vergelijkingstabel: Accugrootte vs. Leverancier (Opbrengst &amp; TVT):
                </span>
                <p className="text-[10px] text-slate-400 leading-normal">
                  In onderstaand overzicht zie je de post-saldering opbrengst per jaar en de geschatte terugverdientijd (TVT) tussen de haakjes voor de drie standaard batterijgroottes.
                </p>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-2.5 font-bold flex items-center gap-1">
                          <span>Leverancier</span>
                          <Tooltip text="De geselecteerde dynamische energieleverancier stuurt de batterij volautomatisch aan. Verschillende leveranciers gebruiken eigen algoritmes (bijv. de onbalansmarkt van Zonneplan of de EPEX spotmarkt van Tibber/Frank), wat resulteert in verschillende jaarlijkse opbrengsten." />
                        </th>
                        {(() => {
                          const baseCaps = [5, 10, 15];
                          const capacitiesToDisplay = (tech.capaciteitAccu > 0 && !baseCaps.includes(tech.capaciteitAccu))
                            ? [...baseCaps, tech.capaciteitAccu]
                            : baseCaps;
                          return capacitiesToDisplay.map(capCol => (
                            <th key={capCol} className="p-2.5 font-bold text-center">
                              {capCol} kWh {capCol === tech.capaciteitAccu ? '(Jouw instelling)' : ''}
                            </th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'Zonneplan', name: 'Zonneplan Dynamisch' },
                        { id: 'Frank', name: 'Frank Energie' },
                        { id: 'Tibber', name: 'Tibber Smart API' },
                        { id: 'Anwb', name: 'ANWB Energie' }
                      ].map((provRow) => {
                        const baseCaps = [5, 10, 15];
                        const capacitiesToDisplay = (tech.capaciteitAccu > 0 && !baseCaps.includes(tech.capaciteitAccu))
                          ? [...baseCaps, tech.capaciteitAccu]
                          : baseCaps;

                        return (
                          <tr key={provRow.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 transition">
                            <td className="p-2.5 font-bold text-slate-800">{provRow.name}</td>
                            {capacitiesToDisplay.map((capacityCol) => {
                              const isActive = (tech.capaciteitAccu === capacityCol) && 
                                (tech.dynamicProvider === provRow.id || (!tech.dynamicProvider && provRow.id === 'Zonneplan'));
                              const stats = calculatePostSalderingEarnings(
                                capacityCol, 
                                provRow.id as any, 
                                isActive ? tech.customAccuPrijs : undefined
                              );
                              
                              return (
                                <td 
                                  key={capacityCol} 
                                  className={`p-2.5 text-center transition-colors ${
                                    isActive 
                                      ? 'bg-blue-50/85 font-black text-blue-900 border-2 border-blue-300' 
                                      : ''
                                  }`}
                                >
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="flex items-center gap-0.5">
                                      <span className="font-bold">€{Math.round(stats.totalSavings)}</span>
                                      <Tooltip text={`Totale jaaropbrengst (€${Math.round(stats.totalSavings)}): €${Math.round(stats.arbitrageYield).toLocaleString('nl-NL')} Arbitrage/Handel + €${Math.round(stats.directSavings)} Besparing Eigen Verbruik`} />
                                    </div>
                                    <span className="block text-[9px] text-slate-400 font-medium font-mono">({stats.tvt.toFixed(1)}j)</span>
                                    <span className="block text-[8px] text-sky-700 font-medium">Arbitrage: €{Math.round(stats.arbitrageYield).toLocaleString('nl-NL')}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'warmtepomp' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Warmtepomp & Verwarming */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Verwarming &amp; Gas Parameters</h3>
              </div>
              {house.verwarming !== 'CV-ketel' && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Status:</span>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, heatpumpStatus: 'nieuw' }))}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      tech.heatpumpStatus !== 'bestaand'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🆕 Nieuw in advies
                  </button>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, heatpumpStatus: 'bestaand' }))}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      tech.heatpumpStatus === 'bestaand'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Warmtepomp is reeds aanwezig. Investering en ISDE in het adviesrapport worden op €0 gezet."
                  >
                    🏠 Reeds aanwezig (€0)
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              {house.verwarming !== 'CV-ketel' && tech.heatpumpStatus === 'bestaand' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <span>💡 <strong>Reeds aanwezig:</strong> De gasbesparing en het stroomverbruik van de warmtepomp worden meegenomen, maar de aanschafkosten en subsidie staan op <strong>€0</strong> in het adviesrapport.</span>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, heatpumpStatus: 'nieuw' }))}
                    className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 ml-2"
                  >
                    Zet op nieuw
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Verwarming Type</label>
                  <select
                    value={house.verwarming}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHouse(prev => ({ ...prev, verwarming: val }));
                      if (val === 'CV-ketel' || val === 'Geen / Overig' || val === 'Andere' || val === '') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: undefined, selectedWarmtepompModel: undefined }));
                      } else if (val === 'Hybride warmtepomp') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: 'Hybride' }));
                      } else if (val === 'Volledige warmtepomp' || val === 'Full electric') {
                        setTech(prev => ({ ...prev, selectedWarmtepompType: 'All-Electric' }));
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
                    <option>CV-ketel</option>
                    <option>Hybride warmtepomp</option>
                    <option>Full electric</option>
                    <option>Andere</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500">Afgiftesysteem</label>
                    {(() => {
                      const cop = getHeatpumpCopFactor(house.afgiftesysteem, tech.selectedWarmtepompModel, tech.selectedWarmtepompType);
                      return (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          SCOP {cop.scop.toFixed(1)} (~{cop.factor.toFixed(2)} kWh/m³)
                        </span>
                      );
                    })()}
                  </div>
                  <select
                    value={house.afgiftesysteem}
                    onChange={(e) => setHouse(prev => ({ ...prev, afgiftesysteem: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-medium"
                  >
                    <option>Radiatoren</option>
                    <option>Vloerverwarming</option>
                    <option>LTV</option>
                    <option>Airco</option>
                    <option>Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gasverbruik (m³)</label>
                  <input
                    type="number"
                    value={house.verbruikM3}
                    onChange={(e) => setHouse(prev => ({ ...prev, verbruikM3: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gas prijs (€/m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={house.gasPrijs}
                    onChange={(e) => setHouse(prev => ({ ...prev, gasPrijs: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Eigen Prijsopgave warmtepomp - direct onder de parameters */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-semibold text-slate-600 font-sans">
                      Eigen Prijsopgave warmtepomp (€, bruto incl. btw - optioneel):
                    </label>
                    <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw, bruto vóór subsidie) van de warmtepomp in (bijv. uit een offerte). De rekentool trekt hier automatisch de geselecteerde ISDE-subsidie vanaf om de netto investering en terugverdientijd te berekenen. Laat leeg om met onze modelraming te rekenen." />
                  </div>
                  {tech.customWarmtepompPrijs !== undefined && tech.customWarmtepompPrijs > 0 && (
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, customWarmtepompPrijs: undefined }))}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset naar standaard
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">€</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Bijv. 7500 (laat leeg voor raming van geselecteerde model)"
                    value={tech.customWarmtepompPrijs !== undefined ? tech.customWarmtepompPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customWarmtepompPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 leading-relaxed">
                <span className="font-bold">💡 Waarom deze gasgegevens?</span> Op basis van je gasverbruik en afgiftesysteem berekent onze tool direct de haalbaarheid van een warmtepomp, benodigde capaciteit, besparingen en ISDE-subsidies.
              </div>
            </div>
          </div>

          {/* Universele Warmtepomp-Model Vergelijker & Dimensionering */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm" id="offerte-analysator-card">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700 font-sans">Warmtepomp Model &amp; Dimensionering Vergelijker</h3>
              </div>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Universele Raming</span>
            </div>

            <div className="p-5 space-y-6">
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>
                  Als gecertificeerd EP-adviseur kijken we altijd naar het juiste vermogen voor jouw woning om 'pendelen' (veelvuldig aan- en uitschakelen) te voorkomen. 
                  Hieronder kun je direct een realistisch Nederlands vermogensmodel selecteren om de invloed op de benodigde investering, subsidies (ISDE) en terugverdientijd door te rekenen!
                </p>
              </div>

              {/* Interactive Selector Buttons */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block flex items-center gap-1">
                  <span>Selecteer een warmtepomp-capaciteitsmodel:</span>
                  <Tooltip text="Kies een specifiek vermogensmodel om de berekeningen in het adviesrapport aan te passen naar de specifieke Nederlandse praktijkkengetallen." />
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Hybride uitvoering */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        Hybride Uitvoering
                      </h4>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-55 px-2 py-0.5 rounded-full border border-blue-100">Met behoud van CV-ketel</span>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        {
                          id: 'Standard' as const,
                          name: 'Hybride model (4 - 5 kW)',
                          tagline: 'Lichte capaciteit',
                          specs: 'Ideaal voor tussen- of hoekwoningen',
                          cop: 'Normaal rendement (SCOP ~4.2)',
                          investment: 'Vanaf € 4.800 netto'
                        },
                        {
                          id: 'Middelgroot 8kW' as const,
                          name: 'Hybride model (6 - 8 kW)',
                          tagline: 'Middelgrote capaciteit',
                          specs: 'Ideaal voor 2-onder-1-kap en vrijstaand',
                          cop: 'Hoog rendement (SCOP ~4.5)',
                          investment: 'Vanaf € 5.200 netto'
                        },
                        {
                          id: 'Groot 12kW' as const,
                          name: 'Hybride model (10 - 12 kW)',
                          tagline: 'Grote capaciteit',
                          specs: 'Voor grotere of minder geïsoleerde woningen',
                          cop: 'Solide prestaties bij lage temp (SCOP ~4.3)',
                          investment: 'Vanaf € 6.425 netto'
                        },
                        {
                          id: 'LuchtLucht' as const,
                          name: 'Lucht-lucht model (Airco)',
                          tagline: 'Kamer-specifieke oplossing',
                          specs: 'Snel verwarmen & koelen per zone',
                          cop: 'Uiterst hoge SCOP (~4.5) | Geen ISDE',
                          investment: 'Vanaf € 3.800 netto'
                        }
                      ].map((model) => {
                        const currentModel = tech.selectedWarmtepompModel || 'Standard';
                        const currentType = tech.selectedWarmtepompType || 'Hybride';
                        const isSelected = currentModel === model.id && currentType === 'Hybride';
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setTech(prev => ({ ...prev, selectedWarmtepompModel: model.id, selectedWarmtepompType: 'Hybride' }));
                              setHouse(prev => ({ ...prev, verwarming: 'Hybride warmtepomp' }));
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[175px] h-auto ${
                              isSelected 
                                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' 
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="space-y-1 w-full">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="warmtepomp-model-hybrid"
                                  checked={isSelected}
                                  readOnly
                                  className="accent-emerald-600 w-4 h-4 shrink-0"
                                />
                                <span className="font-bold text-xs text-slate-800">{model.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block italic leading-tight pl-6">{model.tagline}</span>
                              <div className="text-[10px] text-slate-600 space-y-0.5 pt-1.5 border-t border-slate-100 mt-2 pl-6">
                                <p>• {model.specs}</p>
                                <p>• {model.cop}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center w-full pl-6">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kostenindicatie</span>
                              <span className="text-[11px] font-extrabold text-emerald-700">{model.investment}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: All Electric */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        All-Electric Uitvoering
                      </h4>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-55 px-2 py-0.5 rounded-full border border-indigo-100">Volledig gasloos</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          id: 'Standard' as const,
                          name: 'All-Electric model (4 - 5 kW)',
                          tagline: 'Lichte capaciteit & standalone',
                          specs: 'Volledig gasloos incl. 150L tapwaterboiler',
                          cop: 'SCOP ~4.2 | Zeer geschikt voor rijtjeshuizen',
                          investment: 'Vanaf € 8.100 netto'
                        },
                        {
                          id: 'Middelgroot 8kW' as const,
                          name: 'All-Electric model (6 - 8 kW)',
                          tagline: 'Middelgrote capaciteit & standalone',
                          specs: 'Volledig gasloos incl. 180L tapwaterboiler',
                          cop: 'SCOP ~4.5 | Perfect voor 2-onder-1-kap',
                          investment: 'Vanaf € 9.725 netto'
                        },
                        {
                          id: 'Groot 12kW' as const,
                          name: 'All-Electric model (10 - 12 kW)',
                          tagline: 'Grote capaciteit & standalone',
                          specs: 'Volledig gasloos incl. 230L tapwaterboiler',
                          cop: 'SCOP ~4.4 | Voor grote of vrijstaande woningen',
                          investment: 'Vanaf € 12.450 netto'
                        },
                        {
                          id: 'LuchtLucht' as const,
                          name: 'All-Electric equivalent (Multi-split)',
                          tagline: 'Verwarmen & koelen per kamer',
                          specs: 'Volledig gasloos via 4 actieve binnenunits',
                          cop: 'Uiterst efficiënt (SCOP ~4.5) | Geen boiler',
                          investment: 'Vanaf € 7.500 netto'
                        }
                      ].map((model) => {
                        const currentModel = tech.selectedWarmtepompModel || 'Standard';
                        const currentType = tech.selectedWarmtepompType || 'Hybride';
                        const isSelected = currentModel === model.id && currentType === 'All-Electric';
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setTech(prev => ({ ...prev, selectedWarmtepompModel: model.id, selectedWarmtepompType: 'All-Electric' }));
                              setHouse(prev => ({ ...prev, verwarming: 'Volledige warmtepomp', tapwater: 'Warmtepompboiler' }));
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[175px] h-auto ${
                              isSelected 
                                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' 
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="space-y-1 w-full">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="warmtepomp-model-ae"
                                  checked={isSelected}
                                  readOnly
                                  className="accent-emerald-600 w-4 h-4 shrink-0"
                                />
                                <span className="font-bold text-xs text-slate-800">{model.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block italic leading-tight pl-6">{model.tagline}</span>
                              <div className="text-[10px] text-slate-600 space-y-0.5 pt-1.5 border-t border-slate-100 mt-2 pl-6">
                                <p>• {model.specs}</p>
                                <p>• {model.cop}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center w-full pl-6">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kostenindicatie</span>
                              <span className="text-[11px] font-extrabold text-emerald-700">{model.investment}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert learnings from the dimensions */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Wat zijn de Nederlandse praktijkregels voor warmtepompen?</span>
                </h4>
                
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <div className="space-y-1.5">
                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1">
                      <span>1. Propaan (R290) koudemiddel is de nieuwe norm</span>
                      <Tooltip text="R290 heeft een Global Warming Potential (GWP) van slechts 3, vergeleken met 2088 voor ouderwetse koudemiddelen zoals R410A." />
                    </h5>
                    <p>
                      Moderne propaan-warmtepompen (met het natuurlijke koudemiddel R290) zijn een enorme technologische stap vooruit! Het is niet alleen uiterst milieuvriendelijk, maar hiermee kunnen deze warmtepompen ook moeiteloos warm water tot <strong>70-75°C</strong> leveren. Hierdoor zijn ze uitstekend geschikt voor bestaande woningen met <strong>traditionele radiatoren</strong>; je hoeft dus niet direct overal vloerverwarming te installeren!
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1">
                      <span>2. Het grote gevaar van overdimensionering (Capacity matching)</span>
                      <Tooltip text="Een warmtepomp die te groot is voor de werkelijke warmtevraag gaat pendelen, wat leidt tot een lagere COP en snellere slijtage van de compressor." />
                    </h5>
                    <p>
                      Kies nooit een te grote warmtepomp! Een model met te veel vermogen gaat bij milde buitentemperaturen 'pendelen' (veelvuldig aan- en uitschakelen). Dit verlaagt de efficiëntie (COP) aanzienlijk en zorgt dat de compressor veel sneller slijt. Een lagere capaciteit (zoals 4, 6 of 8 kW) dekt in de Nederlandse praktijk vaak 80% tot 95% van de totale warmtevraag af, waarbij de cv-ketel of een elektrisch element alleen tijdens extreme vrieskou bijspringt.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1">
                      <span>3. Trias Energetica en de thermische schil</span>
                    </h5>
                    <p>
                      De Trias Energetica schrijft voor: focus eerst op het verminderen van de warmtevraag door de schil te isoleren en kieren te dichten. Dit elimineert tocht en kouval binnenshuis, waarna een veel kleinere en stillere warmtepomp volstaat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'laadpaal' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Laadpaal & Elektrisch Rijden */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Elektrisch Rijden &amp; Laadpaal</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, laadpaalStatus: 'nieuw' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.laadpaalStatus !== 'bestaand'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🆕 Nieuw in advies
                </button>
                <button
                  type="button"
                  onClick={() => setTech(prev => ({ ...prev, laadpaalStatus: 'bestaand' }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    tech.laadpaalStatus === 'bestaand'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Laadpaal is reeds aanwezig. Investering in het adviesrapport wordt op €0 gezet."
                >
                  🏠 Reeds aanwezig (€0)
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {tech.laadpaalStatus === 'bestaand' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <span>💡 <strong>Reeds aanwezig:</strong> Het laadverbruik en de besparing ten opzichte van benzine/openbaar laden worden berekend, maar de aanschafkosten van de laadpaal staan op <strong>€0</strong> in het adviesrapport.</span>
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, laadpaalStatus: 'nieuw' }))}
                    className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 ml-2"
                  >
                    Zet op nieuw
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jaarkilometrage EV (km)</label>
                  <input
                    type="number"
                    value={tech.evKilometers ?? 15000}
                    onChange={(e) => setTech(prev => ({ ...prev, evKilometers: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                    placeholder="Bijv. 15000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center">
                    <span>Verbruik (kWh/100km)</span>
                    <Tooltip text="Het gemiddelde verbruik van de elektrische auto. Een gemiddelde EV verbruikt tussen de 15 en 20 kWh per 100 kilometer." />
                  </label>
                  <input
                    type="number"
                    value={tech.evVerbruik ?? 18}
                    onChange={(e) => setTech(prev => ({ ...prev, evVerbruik: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-mono"
                    placeholder="Bijv. 18"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center">
                    <span>Thuis geladen (%)</span>
                    <Tooltip text="Het percentage van de totale laadbeurten dat thuis op de eigen oprit wordt gedaan, in plaats van openbaar laden of snelladen." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tech.evThuisLaden ?? 75}
                    onChange={(e) => setTech(prev => ({ ...prev, evThuisLaden: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-emerald-500 font-mono"
                    placeholder="Bijv. 75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Laadvermogen (kW)</label>
                  <select
                    value={tech.laadvermogen ?? 11}
                    onChange={(e) => setTech(prev => ({ ...prev, laadvermogen: Number(e.target.value) }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
                    <option value="3.7">3.7 kW (1-fase 16A)</option>
                    <option value="7.4">7.4 kW (1-fase 32A)</option>
                    <option value="11">11 kW (3-fase 16A)</option>
                    <option value="22">22 kW (3-fase 32A)</option>
                  </select>
                </div>
              </div>

              {/* Slim EMS Toggle */}
              <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="slimEmsOnlySolar"
                  checked={tech.slimEmsOnlySolar || false}
                  onChange={(e) => setTech(prev => ({ ...prev, slimEmsOnlySolar: e.target.checked }))}
                  className="mt-1 accent-amber-500 w-4 h-4 rounded border-slate-300 cursor-pointer shrink-0"
                />
                <div className="space-y-1">
                  <label htmlFor="slimEmsOnlySolar" className="block text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5 flex-wrap">
                    <span>Laadpaal Sturing Mode: Slim EMS Alleen Laden op Zonnestroom (100% Zonne-focus)</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      tech.slimEmsOnlySolar 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-indigo-100 text-indigo-900'
                    }`}>
                      {tech.slimEmsOnlySolar ? 'AAN (100% Zonne-focus)' : 'UIT (Standaard Netstroom)'}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                    {tech.slimEmsOnlySolar ? (
                      <>Ingeschakeld: De laadpaal pauzeert automatisch als er onvoldoende zon is en laadt de EV uitsluitend op gratis zonnestroom. Tekorten worden niet via het net geladen.</>
                    ) : (
                      <>Uitgeschakeld (standaard): De auto laadt direct op zodra ingeplugd. Als er geen zon is, wordt de laadsessie automatisch aangevuld vanuit het stroomnet.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Eigen Prijsopgave (Optioneel) */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-600 font-sans">Eigen Prijsopgave laadpaal (€, incl. btw - optioneel):</span>
                    <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw) van de laadpaal in (bijv. uit een offerte). Laat leeg om met onze marktgemiddelde schatting te rekenen (€1.200)." />
                  </div>
                  {tech.customLaadpaalPrijs !== undefined && tech.customLaadpaalPrijs > 0 && (
                    <button
                      type="button"
                      onClick={() => setTech(prev => ({ ...prev, customLaadpaalPrijs: undefined }))}
                      className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset naar standaard
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">€</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Bijv. 1200 (laat leeg voor standaard schatting)"
                    value={tech.customLaadpaalPrijs !== undefined ? tech.customLaadpaalPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customLaadpaalPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-[11px] text-emerald-800 leading-relaxed space-y-2">
                <div>
                  <span className="font-bold block mb-1">Rendement van een Eigen Laadpaal</span>
                  Thuis laden is aanzienlijk goedkoper dan openbaar laden (gemiddeld € 0,25 - € 0,30 per kWh thuis versus € 0,45 - € 0,60 openbaar). Bovendien kun je met zonnepanelen overdag nagenoeg gratis laden! De rekentool toont in de resultaten direct je besparingen en terugverdientijd.
                </div>
                <div className="border-t border-emerald-200/50 pt-2 font-medium">
                  <span className="font-bold text-emerald-950 block mb-1">🎁 Extra inkomsten via ERE-vergoeding (circa € 0,12 / kWh)</span>
                  Bovenop alles wat je al bespaart, verdien je ook nog eens geld terug! Voor elke kWh die je thuis laadt, zijn oliemaatschappijen zoals Shell en BP wettelijk verplicht een vergoeding te betalen van circa <strong>€ 0,12 per kWh</strong>. Deze vergoeding, de ERE, kun je eenvoudig claimen via gespecialiseerde partijen zoals <strong>Zonneplan</strong>, <strong>Laadpaal App</strong> of <strong>EREclaim.nl</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
