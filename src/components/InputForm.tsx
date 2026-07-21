import React, { useEffect, useState } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { 
  User, Home, Layers, Battery, Sun, HelpCircle, 
  Sparkles, RefreshCw, Calendar, CheckCircle2, Zap, Info,
  TrendingDown, Gauge, AlertTriangle, Trash2, Download
} from 'lucide-react';
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
import { calculateAll } from '../utils/calculator';

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

function Tooltip({ text, align = 'left' }: { text: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  // Use left-0 or right-0 to keep tooltip text completely within the narrow screen column
  let alignClasses = 'left-0 translate-x-0';
  let arrowClasses = 'left-3';

  if (align === 'center') {
    alignClasses = 'left-1/2 -translate-x-1/2';
    arrowClasses = 'left-1/2 -translate-x-1/2';
  } else if (align === 'right') {
    alignClasses = 'right-0 translate-x-0';
    arrowClasses = 'right-3';
  }

  return (
    <span className="group relative inline-block text-slate-400 hover:text-slate-600 cursor-help ml-1.5 align-middle shrink-0 z-30 hover:z-[9999]">
      <HelpCircle className="w-3.5 h-3.5" />
      <span className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover:block w-64 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl z-[9999] font-normal leading-relaxed normal-case text-left ${alignClasses}`}>
        {text}
        <span className={`absolute top-full border-4 border-transparent border-t-slate-900 ${arrowClasses}`} />
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

  // Calculate local solar yield and break-even points for the 'zon' tab (declared at top so available to all hooks)
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

  // Automatically calculate feed-in (teruglevering) based on solar yield and direct self-consumption percentage when solar parameters change
  useEffect(() => {
    if (tech.aantalZonnepanelen === 0) {
      if ((house.elektraTeruglevering || 0) > 0) {
        setHouse(prev => ({ ...prev, elektraTeruglevering: 0 }));
      }
    } else if (localAnnualYieldKwh > 0) {
      const calculatedTeruglevering = Math.max(0, Math.round(localAnnualYieldKwh * (1 - tech.huidigDirectVerbruik / 100)));
      if (house.elektraTeruglevering !== calculatedTeruglevering) {
        setHouse(prev => ({ ...prev, elektraTeruglevering: calculatedTeruglevering }));
      }
    }
  }, [localAnnualYieldKwh, tech.aantalZonnepanelen]);

  // Handle change in number of solar panels
  const handleAantalZonnepanelenChange = (newVal: number) => {
    if (tech.aantalZonnepanelen === newVal) return;

    // Estimate yield for newVal panels to calculate new direct self-consumption default
    const singlePanelYield = 400 * 0.90; // approx Wp yield factor
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
    const omzettingsverliezen = tech.omzettingsverliezen !== undefined ? tech.omzettingsverliezen : 10;
    const effIncrease = rawIncrease * (1 - omzettingsverliezen / 100);
    const optSelfConsumption = Math.min(100, tech.huidigDirectVerbruik + effIncrease);
    
    const baseSelfConsumptionKwh = (localAnnualYieldKwh * tech.huidigDirectVerbruik) / 100;
    const optSelfConsumptionKwh = (localAnnualYieldKwh * optSelfConsumption) / 100;
    
    // Direct savings on increased self-consumption: replacing grid purchase (house.elektraPrijs) instead of feeding back (assumed 0.06 return rate)
    const directSavings = (optSelfConsumptionKwh - baseSelfConsumptionKwh) * (house.elektraPrijs - 0.06);

    // Arbitrage trading based on provider
    let arbitragePerKwh = 55;
    if (prov === 'Zonneplan') {
      arbitragePerKwh = 85;
    } else if (prov === 'Frank') {
      arbitragePerKwh = 70;
    } else if (prov === 'Tibber') {
      arbitragePerKwh = 65;
    } else if (prov === 'Anwb') {
      arbitragePerKwh = 60;
    }
    const arbitrageYield = cap * arbitragePerKwh;
    const totalSavings = directSavings + arbitrageYield;

    // Investment estimation (with VAT reclamation: net = bruto * 100/121)
    let bruto = cap <= 5 ? cap * 840 : cap <= 10 ? 4200 + (cap - 5) * 660 : 7500 + (cap - 10) * 600;
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
  const applyPreset = (type: '70s' | '90s' | 'modern') => {
    if (type === '70s') {
      setResident({
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
      });
      setHouse({
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
      });
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
      setTech({
        aantalZonnepanelen: 4,
        dakOrientatie: 45, // South-West
        huidigDirectVerbruik: 30,
        capaciteitAccu: 0,
        omzettingsverliezen: 10,
        typeContract: 'Vast',
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
      });
    } else if (type === '90s') {
      setResident({
        naam: 'Familie Smeets',
        registratiecode: 'PM-90HW-42',
        brutoGezinsinkomen: 72000,
        coach: 'Online Zelfscan',
        datum: '2026-04-24',
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
      setHouse({
        wozWaarde: 410000,
        energielabel: 'D',
        verbruikKwh: 3800,
        verbruikM3: 1200,
        soortWoning: 'Vrijstaand',
        bouwjaar: 1994,
        woonoppervlakte: 160,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Radiatoren',
        tapwater: 'CV-ketel',
        koken: 'Inductie',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.28,
        elektraTeruglevering: 1500,
        gasPrijs: 1.30,
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
      });
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
      setTech({
        aantalZonnepanelen: 10,
        dakOrientatie: 0, // South
        huidigDirectVerbruik: 35,
        capaciteitAccu: 5,
        omzettingsverliezen: 8,
        typeContract: 'Dynamisch',
        evKilometers: 10000,
        evVerbruik: 18,
        evThuisLaden: 60,
        laadvermogen: 11,
      });
    } else if (type === 'modern') {
      setResident({
        naam: 'Anouk de Vries',
        registratiecode: 'PM-20VS-11',
        brutoGezinsinkomen: 58000,
        coach: 'Online Zelfscan',
        datum: '2026-04-24',
        aanhef: 'Mevrouw',
        voorletters: 'A.',
        achternaam: 'de Vries',
        straat: 'Maasstraat',
        huisnummer: '8',
        toevoeging: '',
        postcode: '5995XH',
        plaats: 'Kessel',
        aantalPersonen: 1,
        telefoon: '0655443322',
        email: 'anouk@devries.nl',
        akkoord: true
      });
      setHouse({
        wozWaarde: 510000,
        energielabel: 'A - B - C',
        verbruikKwh: 2800,
        verbruikM3: 400,
        soortWoning: 'Hoekwoning',
        bouwjaar: 2012,
        woonoppervlakte: 110,
        verwarming: 'Hybride warmtepomp',
        afgiftesysteem: 'Vloerverwarming',
        tapwater: 'Warmtepompboiler',
        koken: 'Inductie',
        ventilatie: 'Balans (Type D/WTW)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.25,
        elektraTeruglevering: 3000,
        gasPrijs: 1.30,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Zuinig (0.7x)',
        stookgedragFactor: 0.7,
        isoDak: 'goed',
        isoGevel: 'goed',
        isoGlasBg: 'goed',
        isoGlasVd: 'goed',
        isoVloer: 'goed',
        isoKieren: 'Ja, in orde',
        inkomenCheck: true
      });
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 0,
        glasTripleHout: 0,
      });
      setTech({
        aantalZonnepanelen: 14,
        dakOrientatie: -90, // East
        huidigDirectVerbruik: 40,
        capaciteitAccu: 10,
        omzettingsverliezen: 5,
        typeContract: 'Dynamisch',
        evKilometers: 20000,
        evVerbruik: 16,
        evThuisLaden: 80,
        laadvermogen: 11,
      });
    }
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
    <div className="space-y-6" id="input-form">
      {/* 6-Tab Navigation Bar matching user design */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 grid grid-cols-3 xl:grid-cols-6 gap-1" id="panelTabbar">
        {[
          { id: 'isolatie', label: 'Isolatie', icon: Layers },
          { id: 'zon', label: 'Zon', icon: Sun },
          { id: 'accu', label: 'Accu', icon: Battery },
          { id: 'saldering', label: 'Saldering', icon: RefreshCw },
          { id: 'warmtepomp', label: 'Warmtepomp', icon: Zap },
          { id: 'laadpaal', label: 'Laadpaal', icon: Zap },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-[10px] md:text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-md border-b-2 border-emerald-500 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
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
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Snel Woning-profiel Laden
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyPreset('70s')}
                className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-orange-100 bg-orange-50/40 text-orange-800 rounded-xl hover:bg-orange-50 transition"
                id="preset-70s-btn"
              >
                <span className="font-bold">Jaren &apos;70</span>
                <span className="text-[10px] text-orange-600/85">Label E • Matig</span>
              </button>
              <button
                onClick={() => applyPreset('90s')}
                className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-amber-100 bg-amber-50/40 text-amber-800 rounded-xl hover:bg-amber-50 transition"
                id="preset-90s-btn"
              >
                <span className="font-bold">Jaren &apos;90</span>
                <span className="text-[10px] text-amber-600/85">Label D • Gemiddeld</span>
              </button>
              <button
                onClick={() => applyPreset('modern')}
                className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-emerald-100 bg-emerald-50/40 text-emerald-800 rounded-xl hover:bg-emerald-50 transition"
                id="preset-modern-btn"
              >
                <span className="font-bold">Nieuwer</span>
                <span className="text-[10px] text-emerald-600/85">Label A • Goed</span>
              </button>
            </div>
          </div>

          {/* 1. Berekening & Metadata */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">1. Berekeningsgegevens</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={resident.datum}
                    onChange={(e) => setResident(prev => ({ ...prev, datum: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500"
                    id="datum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Berekeningswijze
                  </label>
                  <input
                    type="text"
                    value="Online Zelfscan (NTA 8800)"
                    disabled
                    className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed font-medium"
                    id="coach"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Bewoner & Adres (BAG API!) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">2. Bewoners &amp; Adres Gegevens</h3>
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
                      onChange={(e) => setResident(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
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
                      onChange={(e) => setResident(prev => ({ ...prev, huisnummer: e.target.value }))}
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
                      onChange={(e) => setResident(prev => ({ ...prev, toevoeging: e.target.value }))}
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
                    onChange={(e) => setResident(prev => ({ ...prev, aanhef: e.target.value }))}
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
                    onChange={(e) => setResident(prev => ({ ...prev, voorletters: e.target.value, naam: `${e.target.value} ${prev.achternaam}`.trim() }))}
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
                    onChange={(e) => setResident(prev => ({ ...prev, achternaam: e.target.value, naam: `${prev.voorletters} ${e.target.value}`.trim() }))}
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
                    onChange={(e) => setResident(prev => ({ ...prev, straat: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="straat"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Plaats
                  </label>
                  <select
                    value={resident.plaats}
                    onChange={(e) => setResident(prev => ({ ...prev, plaats: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="plaats"
                  >
                    <option value="">-- Selecteer Kern --</option>
                    {['Baarlo', 'Beringe', 'Egchel', 'Grashoek', 'Helden', 'Kessel', 'Kessel-Eik', 'Koningslust', 'Maasbree', 'Meijel', 'Panningen'].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Telefoon / mobiel
                  </label>
                  <input
                    type="tel"
                    value={resident.telefoon}
                    onChange={(e) => setResident(prev => ({ ...prev, telefoon: e.target.value }))}
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
                    onChange={(e) => setResident(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="naam@voorbeeld.nl"
                    id="email"
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

          {/* 3. Woning Kenmerken & Installaties */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">3. Woning &amp; Huidige Installaties</h3>
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
                    onChange={(e) => setHouse(prev => ({ ...prev, verwarming: e.target.value }))}
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

          {/* 4. Energie verbruik en kosten */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">4. Energieverbruik &amp; Stookgedrag (Jaarrekening)</h3>
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
                    <Tooltip text="Vergelijkt gasverbruik met het theoretische verbruik op basis van de NTA 8800." />
                  </label>
                  <input
                    type="text"
                    value={house.stookgedragBerekend || 'Vul in...'}
                    readOnly
                    className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 font-bold text-emerald-800"
                    id="stookgedrag_berekend"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Correctie / Forceer</span>
                    <Tooltip text="Laat op 'Berekend (Auto)' om de stookgedrag-check automatisch te laten bepalen op basis van het werkelijke verbruik, of forceer een stookgedragfactor." align="right" />
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

          {/* 5. Huidige Isolatie Status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">5. Huidige Isolatie Status</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Dakisolatie</span>
                    <Tooltip text="De huidige isolatiestatus van het dak. 'Geen/Matig' betekent dat er nog veel winst te behalen is met na-isolatie." />
                  </label>
                  <select
                    value={house.isoDak}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoDak: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
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
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    id="iso_gevel"
                  >
                    <option value="">-- Selecteer --</option>
                    <option value="slecht">Geen</option>
                    <option value="slecht">Spouwmuurisolatie (Oud)</option>
                    <option value="goed">Binnenisolatie</option>
                    <option value="goed">Buitenisolatie</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Glas (begane grond)</span>
                    <Tooltip text="Het type glas op de begane grond (bijv. HR++ of dubbel glas)." />
                  </label>
                  <select
                    value={house.isoGlasBg}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoGlasBg: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
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
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <span>Vloer / Bodem</span>
                    <Tooltip text="De huidige isolatiestatus van de vloer of de kruipruimtebodem." />
                  </label>
                  <select
                    value={house.isoVloer}
                    onChange={(e) => setHouse(prev => ({ ...prev, isoVloer: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
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
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
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

          {/* 6. Ingemeten isolatie oppervlakten (m2) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">6. Ingemeten Isolatie Oppervlakten (m²)</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Vloer (onder)</span>
                    <Tooltip text="Het aantal vierkante meters te isoleren vloer aan de onderzijde (vanuit de kruipruimte)." />
                  </label>
                  <input
                    type="number"
                    value={insulation.vloer || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, vloer: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_vloer_ond"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Bodem (chips)</span>
                    <Tooltip text="Het oppervlak van de kruipruimtebodem geschikt voor bodemisolatie (bijv. EPS-parels of isolatiechips)." />
                  </label>
                  <input
                    type="number"
                    value={insulation.bodem || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, bodem: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_bodem"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Spouwmuur</span>
                    <Tooltip text="Het totale oppervlak van de buitenmuren (min de ramen en deuren) geschikt voor spouwmuurisolatie." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.spouw || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, spouw: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_spouw"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Zoldervloer</span>
                    <Tooltip text="Het oppervlak van de zoldervloer of vliering, zeer effectief als de zolder niet verwarmd wordt." />
                  </label>
                  <input
                    type="number"
                    value={insulation.zolderVliering || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, zolderVliering: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_zolder"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Dak binnen</span>
                    <Tooltip text="Het aantal vierkante meters te isoleren schuin dak aan de binnenzijde." />
                  </label>
                  <input
                    type="number"
                    value={insulation.dakBinnenzijde || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, dakBinnenzijde: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_dak_bin"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Gevel buiten</span>
                    <Tooltip text="Het oppervlak geschikt voor gevelisolatie aan de buitenzijde (of binnenzijde d.m.v. voorzetwanden)." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.gevelBuitenzijde || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, gevelBuitenzijde: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_gev_bui"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Enkel → HR++</span>
                    <Tooltip text="Het oppervlak aan enkel glas dat vervangen gaat worden door hoogrendementsglas (HR++)." />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasEnkelHR || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasEnkelHR: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_glas_enk_hr"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Dubbel → HR++</span>
                    <Tooltip text="Het oppervlak aan oud dubbel glas dat vervangen gaat worden door HR++ glas." />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasDubbelHR || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasDubbelHR: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                    id="m_glas_dub_hr"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5 flex items-center justify-center gap-0.5">
                    <span>Triple + Hout</span>
                    <Tooltip text="Het oppervlak aan glas dat vervangen wordt door triple glas (HR+++) inclusief eventuele nieuwe kozijnen." align="right" />
                  </label>
                  <input
                    type="number"
                    value={insulation.glasTripleHout || ''}
                    onChange={(e) => setInsulation(prev => ({ ...prev, glasTripleHout: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Zonnepanelen Instellingen</h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500">Aantal zonnepanelen</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="36"
                      value={tech.aantalZonnepanelen}
                      onChange={(e) => {
                        const val = Math.min(36, Math.max(0, Number(e.target.value)));
                        handleAantalZonnepanelenChange(val);
                      }}
                      className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-semibold">stuks</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="1"
                  value={tech.aantalZonnepanelen}
                  onChange={(e) => handleAantalZonnepanelenChange(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              {/* Vermogen per paneel field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Vermogen per paneel (Wp)</span>
                    <Tooltip text="Het piekvermogen van een enkel zonnepaneel in Wattpiek (Wp). Oudere panelen hebben vaak een lager vermogen (300-360 Wp), moderne panelen leveren vaak 400 tot 450 Wp. Standaard staat dit op 400 Wp." />
                  </label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      min="300"
                      max="550"
                      step="10"
                      value={tech.vermogenPerPaneel !== undefined ? tech.vermogenPerPaneel : 400}
                      onChange={(e) => {
                        const val = Math.min(550, Math.max(300, Number(e.target.value)));
                        setTech(prev => ({ ...prev, vermogenPerPaneel: val }));
                      }}
                      className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Wp</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="300"
                  max="550"
                  step="10"
                  value={tech.vermogenPerPaneel !== undefined ? tech.vermogenPerPaneel : 400}
                  onChange={(e) => setTech(prev => ({ ...prev, vermogenPerPaneel: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                
                {/* Panel presets */}
                <div className="flex gap-1.5 mt-2">
                  {[370, 400, 430, 450].map((wpVal) => {
                    const currentWp = tech.vermogenPerPaneel !== undefined ? tech.vermogenPerPaneel : 400;
                    const isSelected = currentWp === wpVal;
                    return (
                      <button
                        key={wpVal}
                        type="button"
                        onClick={() => setTech(prev => ({ ...prev, vermogenPerPaneel: wpVal }))}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-500 border-emerald-500 text-white font-bold shadow-sm' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 font-medium'
                        }`}
                      >
                        {wpVal} Wp {wpVal === 400 ? '(Standaard)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Dakoriëntatie t.o.v. Zuiden</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Richting van het dak:</p>
                        <p>De oriëntatie beïnvloedt de dagelijkse opbrengstcurve van je zonnepanelen.</p>
                        <p>• <strong>0° (Zuid):</strong> Maximale opbrengst rond het middaguur.</p>
                        <p>• <strong>-90° (Oost) of 90° (West):</strong> Meer opbrengst in de ochtend of namiddag, wat gunstig is om direct in huis te verbruiken.</p>
                      </div>
                    } />
                  </label>
                  <span className="text-sm font-bold text-slate-700">
                    {tech.dakOrientatie}° {tech.dakOrientatie === 0 ? '(Zuid)' : tech.dakOrientatie === -90 ? '(Oost)' : tech.dakOrientatie === 90 ? '(West)' : tech.dakOrientatie === 180 ? '(Noord)' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="15"
                  value={tech.dakOrientatie}
                  onChange={(e) => setTech(prev => ({ ...prev, dakOrientatie: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>-90° (Oost)</span>
                  <span>0° (Zuid)</span>
                  <span>90° (West)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Hellingshoek (°)</span>
                    <Tooltip text="De hellingshoek van de zonnepanelen t.o.v. het horizontale vlak. Optimaal in Nederland is circa 35 graden. Platte daken liggen vaak onder 10-15 graden." />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}
                      onChange={(e) => {
                        const val = Math.min(90, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, dakHellingshoek: val }));
                      }}
                      className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-semibold">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}
                  onChange={(e) => setTech(prev => ({ ...prev, dakHellingshoek: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0° (Plat dak)</span>
                  <span>35° (Optimaal)</span>
                  <span>90° (Verticaal)</span>
                </div>
              </div>

              {/* Eigen Prijsopgave (Optioneel) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium text-slate-500">Eigen Prijsopgave (€, incl. btw - optioneel)</label>
                    <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw) van de zonnepanelen in (bijv. uit een offerte). Laat leeg om met onze standaard schatting te rekenen (€500 per paneel)." />
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
                    placeholder="Bijv. 4200 (laat leeg voor standaard schatting)"
                    value={tech.customZonnepanelenPrijs !== undefined ? tech.customZonnepanelenPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customZonnepanelenPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <span>Berekend direct eigen verbruik</span>
                      <Tooltip text="Het percentage zonnestroom dat direct in huis wordt verbruikt op het moment dat de zon schijnt (bijv. door wasmachine, warmtepomp, EV). Dit percentage is vooraf berekend op basis van je jaarverbruik en zonne-opbrengst, maar kun je hieronder handmatig aanpassen." />
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
                    {/* Teruglevering & Direct Verbruik Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1" htmlFor="zon_teruglevering">
                          <span>Teruglevering aan het net (kWh)</span>
                          <Tooltip text="De hoeveelheid zonnestroom (in kWh) die je jaarlijks teruglevert aan het elektriciteitsnet. Vul hier de waarde van je jaarrekening in, of pas hem aan om je direct eigen verbruik te berekenen." />
                        </label>
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
                          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                          placeholder="Bijv. 2000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1" htmlFor="zon_direct_verbruik">
                          <span>Direct eigen verbruik (%)</span>
                          <Tooltip text="Het percentage zonnestroom dat direct in huis wordt verbruikt. Als je dit aanpast, wordt de teruglevering automatisch herberekenend op basis van je jaaropbrengst." />
                        </label>
                        <div className="flex items-center gap-1.5">
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
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold font-mono"
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={tech.huidigDirectVerbruik}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTech(prev => ({ ...prev, huidigDirectVerbruik: val }));
                          if (localAnnualYieldKwh > 0) {
                            const calculatedTeruglevering = Math.max(0, Math.round(localAnnualYieldKwh * (1 - val / 100)));
                            setHouse(prev => ({ ...prev, elektraTeruglevering: calculatedTeruglevering }));
                          }
                        }}
                        className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                        <span>10% (Weinig thuis)</span>
                        <span>30% (Standaard NL)</span>
                        <span>60% (Met EV/Warmtepomp)</span>
                        <span>90% (Thuisbatterij)</span>
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
                
                {/* Statistic highlight box */}
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
                  <TrendingDown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold">Sterke marktverandering:</span> In 2025 waren er maar liefst <strong className="text-amber-700">107 dagen</strong> met minstens één kwartier een negatieve spotprijs. 
                    Dat is <strong className="text-amber-700">vier keer meer</strong> dan in 2022! Dit maakt slim omgaan met je zonnestroom steeds belangrijker.
                  </div>
                </div>
              </div>

              {/* Surcharge setting */}
              <div className="pt-2 border-t border-slate-50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Leverancier opslag / inkoopkosten (€/kWh)</span>
                    <Tooltip text="De extra kosten of marge die je energieleverancier per kWh rekent bij een dynamisch contract. Dit ligt meestal tussen €0,01 en €0,05 per kWh." />
                  </label>
                  <span className="text-sm font-bold text-slate-700 font-mono">
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
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                
                {/* Supplier presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Snelkeuze energieleverancier:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Zonneplan', val: 0.0218, desc: 'Populair, vaste inkoopkosten' },
                      { name: 'Tibber', val: 0.0202, desc: 'Slim laden, lage opslag' },
                      { name: 'ANWB Energie', val: 0.0224, desc: 'Samen naar duurzamer' },
                      { name: 'Frank Energie', val: 0.0240, desc: 'Volledig transparant' }
                    ].map((provider) => {
                      const isSelected = Math.abs(opslagLeverancier - provider.val) < 0.0002;
                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, opslagLeverancier: provider.val }))}
                          className={`text-[10px] px-2.5 py-1 rounded-md font-medium border transition-all ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
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

              {/* Real-time Simulator section */}
              <div className="space-y-3 pt-2 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>Interactieve Spotprijs Simulator & Advies</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    Beursstroomprijs: € {simulatedSpotPrice.toFixed(2)} / kWh
                  </span>
                </div>
                
                <input
                  type="range"
                  min="-0.25"
                  max="0.25"
                  step="0.01"
                  value={simulatedSpotPrice}
                  onChange={(e) => setSimulatedSpotPrice(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                
                <div className="flex justify-between text-[10px] text-slate-400 px-1">
                  <span>-€0.25 (Extreem negatief)</span>
                  <span>€0.00</span>
                  <span>€0.25 (Hoog tarief)</span>
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
        </div>
      )}

      {activeTab === 'accu' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Thuisbatterij Instellingen */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Thuisbatterij Instellingen</h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Capaciteit accu (kWh)</span>
                    <Tooltip text="Bepaalt de maximale opslagcapaciteit van je thuisbatterij. Stem de grootte af op je zonne-opwekking en nachtverbruik." />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={tech.capaciteitAccu}
                      onChange={(e) => {
                        const val = Math.min(30, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, capaciteitAccu: val }));
                      }}
                      className="w-16 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500">kWh</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={tech.capaciteitAccu}
                  onChange={(e) => setTech(prev => ({ ...prev, capaciteitAccu: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0 kWh (Geen)</span>
                  <span>10 kWh</span>
                  <span>20 kWh</span>
                  <span>30 kWh</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                  <span>Omzettingsverliezen (%)</span>
                  <Tooltip text="Laden en ontladen geeft warmte en energieverlies door de omvormer. Standaard is 10% tot 15%." />
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={tech.omzettingsverliezen}
                  onChange={(e) => setTech(prev => ({ ...prev, omzettingsverliezen: Number(e.target.value) }))}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <span>Eigen Prijsopgave/Kosten (€, incl. btw - optioneel)</span>
                    <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw) van de thuisbatterij in (bijv. uit een offerte). Laat leeg om met onze marktgemiddelde schatting te rekenen." />
                  </label>
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
                    placeholder="Bijv. 4500 (laat leeg voor standaard schatting)"
                    value={tech.customAccuPrijs !== undefined ? tech.customAccuPrijs : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      setTech(prev => ({ ...prev, customAccuPrijs: val }));
                    }}
                    className="w-full pl-7 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                    id="custom_accu_prijs_input_main"
                  />
                </div>
              </div>
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
                  onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast' }))}
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
                  onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch' }))}
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
                    { id: 'Zonneplan' as const, name: 'Zonneplan', subtitle: 'Powerplay' },
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
                      <span className="font-bold text-blue-950 block">⚡ Zonneplan Powerplay integratie:</span>
                      <p className="text-slate-600 mt-1">
                        Zonneplan Powerplay stuurt de batterij volledig automatisch aan op de onbalansmarkt (tenneT). Dit levert aanzienlijk hogere vergoedingen op dan pure dag/nacht arbitrage. Ze claimen een rendement tot wel €80 - €100 per kWh opslag per jaar.
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
                    onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast' }))}
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
                    onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch' }))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-500">Elektra prijs (€/kWh)</label>
                    <Tooltip text="De prijs die je betaalt per afgenomen kWh van het net. Na afschaffing van de saldering is dit het tarief dat je direct bespaart bij eigen verbruik uit je zonnepanelen of thuisaccu." />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={house.elektraPrijs}
                    onChange={(e) => setHouse(prev => ({ ...prev, elektraPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teruglevering (kWh)</label>
                  <div className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-500 font-bold font-mono">
                    {house.elektraTeruglevering || 0} kWh
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block italic">Automatisch berekend via tabblad zon</span>
                </div>
              </div>

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
                        { id: 'Zonneplan', name: 'Zonneplan', subtitle: 'Powerplay' },
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

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-slate-600">Eigen Prijsopgave (€, incl. 21% btw - optioneel):</span>
                        <Tooltip text="Vul hier de totale aanschaf- en installatiekosten (inclusief btw) van de thuisbatterij in (bijv. uit een offerte). De 21% btw-teruggave (mogelijk bij een dynamisch contract) wordt automatisch verrekend om de netto terugverdientijd te berekenen. Laat leeg om met onze marktgemiddelde schatting te rekenen." />
                      </div>
                      {tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0 && (
                        <button
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, customAccuPrijs: undefined }))}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
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
                        placeholder="Bijv. 4500 (laat leeg voor standaard schatting)"
                        value={tech.customAccuPrijs !== undefined ? tech.customAccuPrijs : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          setTech(prev => ({ ...prev, customAccuPrijs: val }));
                        }}
                        className="w-full pl-7 pr-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-emerald-500 font-mono"
                      />
                    </div>
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
                        <span className="text-sm font-extrabold text-slate-700 font-mono">€{Math.round(arbitrageYield)} / jr</span>
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
                          <Tooltip text="De geselecteerde dynamische energieleverancier stuurt de batterij volautomatisch aan. Verschillende leveranciers gebruiken eigen algoritmes (bijv. de onbalansmarkt van Zonneplan Powerplay of de EPEX spotmarkt van Tibber/Frank), wat resulteert in verschillende jaarlijkse opbrengsten." />
                        </th>
                        <th className="p-2.5 font-bold text-center">5 kWh</th>
                        <th className="p-2.5 font-bold text-center">10 kWh</th>
                        <th className="p-2.5 font-bold text-center">15 kWh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'Zonneplan', name: 'Zonneplan Powerplay' },
                        { id: 'Frank', name: 'Frank Energie' },
                        { id: 'Tibber', name: 'Tibber Smart API' },
                        { id: 'Anwb', name: 'ANWB Energie' }
                      ].map((provRow) => {
                        return (
                          <tr key={provRow.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 transition">
                            <td className="p-2.5 font-bold text-slate-800">{provRow.name}</td>
                            {[5, 10, 15].map((capacityCol) => {
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
                                  <span className="block font-bold">€{Math.round(stats.totalSavings)}</span>
                                  <span className="block text-[9px] text-slate-400 font-medium font-mono">({stats.tvt.toFixed(1)}j)</span>
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
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 rounded-t-2xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Verwarming &amp; Gas Parameters</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Verwarming Type</label>
                  <select
                    value={house.verwarming}
                    onChange={(e) => setHouse(prev => ({ ...prev, verwarming: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
                    <option>CV-ketel</option>
                    <option>Hybride warmtepomp</option>
                    <option>Full electric</option>
                    <option>Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Afgiftesysteem</label>
                  <select
                    value={house.afgiftesysteem}
                    onChange={(e) => setHouse(prev => ({ ...prev, afgiftesysteem: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  >
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gasverbruik (m³)</label>
                  <input
                    type="number"
                    value={house.verbruikM3}
                    onChange={(e) => setHouse(prev => ({ ...prev, verbruikM3: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gas prijs (€/m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={house.gasPrijs}
                    onChange={(e) => setHouse(prev => ({ ...prev, gasPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[11px] text-blue-800 leading-relaxed">
                <span className="font-bold block mb-1">Waarom deze gasgegevens?</span>
                Op basis van je huidige gasverbruik en afgiftesysteem berekent onze rekentool direct de haalbaarheid van een warmtepomp, de benodigde capaciteit, de jaarlijkse besparingen en de netto ISDE-subsidies!
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
                            onClick={() => setTech(prev => ({ ...prev, selectedWarmtepompModel: model.id, selectedWarmtepompType: 'Hybride' }))}
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
                            onClick={() => setTech(prev => ({ ...prev, selectedWarmtepompModel: model.id, selectedWarmtepompType: 'All-Electric' }))}
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

              {/* Eigen Prijsopgave (Optioneel) */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-600 font-sans">Eigen Prijsopgave warmtepomp (€, bruto incl. btw - optioneel):</span>
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
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Elektrisch Rijden &amp; Laadpaal</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Jaarkilometrage EV (km)</label>
                  <input
                    type="number"
                    value={tech.evKilometers ?? 15000}
                    onChange={(e) => setTech(prev => ({ ...prev, evKilometers: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                    placeholder="Bijv. 15000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Verbruik EV (kWh/100km)</span>
                    <Tooltip text="Het gemiddelde verbruik van de elektrische auto. Een gemiddelde EV verbruikt tussen de 15 en 20 kWh per 100 kilometer." />
                  </label>
                  <input
                    type="number"
                    value={tech.evVerbruik ?? 18}
                    onChange={(e) => setTech(prev => ({ ...prev, evVerbruik: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 18"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Aandeel thuis geladen (%)</span>
                    <Tooltip text="Het percentage van de totale laadbeurten dat thuis op de eigen oprit wordt gedaan, in plaats van openbaar laden of snelladen." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tech.evThuisLaden ?? 70}
                    onChange={(e) => setTech(prev => ({ ...prev, evThuisLaden: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Laadvermogen laadpaal (kW)</label>
                  <select
                    value={tech.laadvermogen ?? 11}
                    onChange={(e) => setTech(prev => ({ ...prev, laadvermogen: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
                    <option value="3.7">3.7 kW (1-fase 16A)</option>
                    <option value="7.4">7.4 kW (1-fase 32A)</option>
                    <option value="11">11 kW (3-fase 16A • Standaard)</option>
                    <option value="22">22 kW (3-fase 32A)</option>
                  </select>
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

      {/* Grote actieknop */}
      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        id="generate-coach-report-btn"
      >
        {loading ? (
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
  );
}
