import React from 'react';
import { 
  Battery, Search, SlidersHorizontal, Info, Sparkles, Check, CheckCircle2, 
  HelpCircle, ChevronDown, ChevronUp, Star, Award, TrendingUp, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface BatteryMarketOverviewProps {
  dynamicProvider?: string;
  typeContract?: string;
  capaciteitAccu?: number;
  solarYield?: number;
}

export interface BatteryBrand {
  brand: string;
  model: string;
  type: 'Stekkerklaar' | 'Modulair' | 'All-in-one';
  priceKwhMin: number;
  priceKwhMax: number;
  installation: string;
  capacity: string;
  power: string;
  warranty: string;
  noodstroom: string;
  connection: string;
  chemistry: 'LFP' | 'NMC';
  description: string;
  origin: string;
  isBestPriceKwh?: boolean;
}

const batteryDatabase: BatteryBrand[] = [
  {
    brand: "Datouboss",
    model: "48V LiFePO4 rack-accu",
    type: "Stekkerklaar",
    priceKwhMin: 240,
    priceKwhMax: 400,
    installation: "Zelfbouw — omvormer + montage apart",
    capacity: "~5 – 15 kWh",
    power: "Afh. omvormer",
    warranty: "Onzeker",
    noodstroom: "Afh. omvormer",
    connection: "Zelfbouw (48V, omvormer apart)",
    chemistry: "LFP",
    description: "Kale cellen zijn spotgoedkoop (forum-favoriet ~€100/kWh), maar omvormer + installatie komen erbij en garantie/support zijn onzeker — 'goedkoop is duurkoop'-risico. Alleen voor ervaren doe-het-zelvers.",
    origin: "AliExpress / Amazon · China",
    isBestPriceKwh: true
  },
  {
    brand: "Indevolt",
    model: "PowerFlex 2000",
    type: "Stekkerklaar",
    priceKwhMin: 250,
    priceKwhMax: 400,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2 – 8 kWh (stapelbaar)",
    power: "~0,8 – 2 kW",
    warranty: "~5 – 10 jaar",
    noodstroom: "Nee",
    connection: "Plug-in (stapelbaar)",
    chemistry: "LFP",
    description: "Goedkope stapelbare plug-in; scherpe instap, maar minder bekend — beoordeel garantie en support kritisch.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Marstek",
    model: "Venus E / Jupiter",
    type: "Stekkerklaar",
    priceKwhMin: 280,
    priceKwhMax: 400,
    installation: "Zelf te plaatsen (€0)",
    capacity: "2,5 – 5,12 kWh",
    power: "~0,8 – 2,5 kW",
    warranty: "~5 – 10 jaar",
    noodstroom: "Nee",
    connection: "Plug-in (stopcontact)",
    chemistry: "LFP",
    description: "Waardekampioen plug-in (aanbiedingen ~€300–335/kWh, juli 2026): lage instap, korte terugverdientijd mits klein gedimensioneerd — niet opschalen.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Deye",
    model: "SE-F16-C / AI-W5.1",
    type: "Modulair",
    priceKwhMin: 300,
    priceKwhMax: 450,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 30+ kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Ja",
    connection: "AC (Deye-omvormer) / open ecosysteem",
    chemistry: "LFP",
    description: "Populair in de doe-het-zelvers scene: eigen LFP-lijn én open ecosysteem (ook third-party accu's), scherp geprijsd; vereist kennis.",
    origin: "Installateur / zelfbouw · China"
  },
  {
    brand: "Growatt",
    model: "ARK / APX",
    type: "Modulair",
    priceKwhMin: 300,
    priceKwhMax: 450,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "2,5 – 25 kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Veelgebruikt budget-modulair, breed compatibel met hybride omvormers. Check de support/garantieafhandeling.",
    origin: "Installateur · China"
  },
  {
    brand: "Jackery",
    model: "Plug-In Thuisbatterij",
    type: "Stekkerklaar",
    priceKwhMin: 300,
    priceKwhMax: 400,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2 – 5 kWh (uitbreidbaar)",
    power: "~0,8 – 1,5 kW",
    warranty: "10 jaar",
    noodstroom: "Ja (tot ~1.500 W)",
    connection: "Plug-in (stopcontact)",
    chemistry: "LFP",
    description: "Plug-in met ongebruikelijk sterke 10 jaar garantie én noodstroom (tot ~1.500 W); let op het lage vermogen.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Pylontech",
    model: "Force H2 / US5000",
    type: "Modulair",
    priceKwhMin: 300,
    priceKwhMax: 500,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "4,8 kWh per module",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Prijs-kwaliteitwinnaar: A-merk LFP-cellen voor een B-merk prijs, mits de installateur het merk kent.",
    origin: "Installateur · China"
  },
  {
    brand: "Anker",
    model: "SOLIX Solarbank",
    type: "Stekkerklaar",
    priceKwhMin: 350,
    priceKwhMax: 450,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~5 – 7 kWh (uitbreidbaar)",
    power: "~2,4 – 3,6 kW",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "Plug-in (AC-gekoppeld)",
    chemistry: "LFP",
    description: "Stevige plug-in met goede app en uitbreidbaarheid; scherpere prijs/kWh dan de meeste stekkeraccu's.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Bluetti",
    model: "EP-serie / plug-in",
    type: "Stekkerklaar",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2 – 10 kWh (uitbreidbaar)",
    power: "~1,2 – 3 kW",
    warranty: "~5 jaar",
    noodstroom: "Sommige modellen",
    connection: "Plug-in (AC-gekoppeld)",
    chemistry: "LFP",
    description: "Veel via Amazon met scherpe stuntprijzen; controleer of de actie-prijs/kWh écht laag is en de garantie/support deugt.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Dyness",
    model: "Powerbox G2 / Pro",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "3,5 – 100+ kWh (stapelbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Flexibel en sterk uitbreidbaar budget-LFP, breed compatibel; beoordeel vooral op support en garantieafhandeling.",
    origin: "Installateur · China"
  },
  {
    brand: "EcoFlow",
    model: "STREAM / Delta",
    type: "Stekkerklaar",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2 – 10 kWh (uitbreidbaar)",
    power: "~1,2 – 3,6 kW",
    warranty: "~5 jaar",
    noodstroom: "Sommige modellen",
    connection: "Plug-in (AC-gekoppeld)",
    chemistry: "LFP",
    description: "Breed assortiment van klein tot uitbreidbaar; let op kortere garantie dan de installatie-merken.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "Fox ESS",
    model: "EQ / EP-serie",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 550,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 20+ kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Budgetvriendelijk modulair, groeiend in NL; beoordeel op support en garantieafhandeling.",
    origin: "Installateur · China"
  },
  {
    brand: "GoodWe",
    model: "Lynx Home",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 30 kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Solide middenmoter, breed compatibel. Weinig opvallend — beoordeel vooral op offerteprijs per kWh.",
    origin: "Installateur · China"
  },
  {
    brand: "SAJ",
    model: "B-serie (HS2)",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 20 kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "Hybride",
    chemistry: "LFP",
    description: "Groeiend budget-merk; nog weinig bekend, dus beoordeel vooral op garantie en support van de installateur.",
    origin: "Installateur · China"
  },
  {
    brand: "SolaX",
    model: "Triple Power (T30/T58)",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "3 – 23 kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar / 6.000 cycli",
    noodstroom: "Optioneel",
    connection: "Hybride (SolaX-omvormer)",
    chemistry: "LFP",
    description: "Sterke prijs-kwaliteit (vaak 15-20% onder high-end), modulair en goed bij lage temperaturen; logisch bij een SolaX-omvormer.",
    origin: "Installateur · China"
  },
  {
    brand: "Victron Energy",
    model: "ESS (MultiPlus + accu)",
    type: "Modulair",
    priceKwhMin: 350,
    priceKwhMax: 600,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 48 kWh",
    power: "2,4 – 18 kW",
    warranty: "~5 – 10 jaar (per component)",
    noodstroom: "Ja (sterk in off-grid)",
    connection: "AC (MultiPlus/Quattro)",
    chemistry: "LFP",
    description: "Nederlands en extreem flexibel, sterk voor off-grid en noodstroom; meer een bouwpakket dan plug-and-play — vereist kennis.",
    origin: "Installateur / zelfbouw · Nederland"
  },
  {
    brand: "Zendure",
    model: "SolarFlow / Hyper 2000",
    type: "Stekkerklaar",
    priceKwhMin: 350,
    priceKwhMax: 500,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2 – 8 kWh (uitbreidbaar)",
    power: "~1,2 – 2,4 kW",
    warranty: "10 jaar",
    noodstroom: "Nee",
    connection: "Plug-in (AC-gekoppeld)",
    chemistry: "LFP",
    description: "Flexibel en uitbreidbaar plug-in-systeem; populair bij doe-het-zelvers met dynamisch contract.",
    origin: "Webshop / Amazon · China"
  },
  {
    brand: "AlphaESS",
    model: "SMILE-serie",
    type: "Modulair",
    priceKwhMin: 400,
    priceKwhMax: 550,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 30+ kWh (uitbreidbaar)",
    power: "Afh. systeem",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Compleet systeem met eigen omvormer-opties; veel in NL geïnstalleerd. Middensegment qua prijs.",
    origin: "Installateur · China"
  },
  {
    brand: "BYD",
    model: "Battery-Box Premium HVS/HVM",
    type: "Modulair",
    priceKwhMin: 400,
    priceKwhMax: 650,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5,1 – 22,1 kWh (uitbreidbaar)",
    power: "Tot ~5 kW",
    warranty: "10 jaar / 60%",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Bestverkochte batterij van NL: bewezen, breed ondersteund. Let op de populariteitspremie t.o.v. Pylontech.",
    origin: "Installateur · China"
  },
  {
    brand: "HomeWizard",
    model: "Plug-In Battery",
    type: "Stekkerklaar",
    priceKwhMin: 440,
    priceKwhMax: 500,
    installation: "Zelf te plaatsen (€0)",
    capacity: "~2,7 kWh per unit",
    power: "~0,8 kW",
    warranty: "~5 jaar",
    noodstroom: "Nee",
    connection: "Plug-in (P1-gestuurd)",
    chemistry: "LFP",
    description: "Mooie integratie met de HomeWizard P1-meter, maar laag vermogen en beperkte capaciteit per unit.",
    origin: "Webshop / Amazon · NL-merk / China"
  },
  {
    brand: "Huawei",
    model: "LUNA2000",
    type: "Modulair",
    priceKwhMin: 450,
    priceKwhMax: 650,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 15 kWh (uitbreidbaar)",
    power: "Tot ~5 kW",
    warranty: "10 jaar",
    noodstroom: "Optioneel (Backup Box)",
    connection: "Hybride (eigen omvormer)",
    chemistry: "LFP",
    description: "Slimste app/optimalisatie, maar werkt het best binnen het Huawei-ecosysteem — één voorbehoud dat kopers verrast.",
    origin: "Installateur · China"
  },
  {
    brand: "Sungrow",
    model: "SBR-serie",
    type: "Modulair",
    priceKwhMin: 450,
    priceKwhMax: 650,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "6,4 – 25,6 kWh (3,2 kWh-modules)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "Hybride (Sungrow-omvormer)",
    chemistry: "LFP",
    description: "Grote, betrouwbare fabrikant (ook zakelijk); solide hoogspanning-modulair met eigen omvormer.",
    origin: "Installateur · China"
  },
  {
    brand: "LG",
    model: "RESU Prime (10H/16H)",
    type: "Modulair",
    priceKwhMin: 500,
    priceKwhMax: 700,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "9,3 – 16 kWh",
    power: "5 – 7 kW (11 kW piek)",
    warranty: "10 jaar / 6.000 cycli",
    noodstroom: "Optioneel",
    connection: "Hybride (aparte omvormer)",
    chemistry: "NMC",
    description: "Bekende naam met hoog vermogen (NMC), maar LG bouwt residentiële opslag grotendeels af — let op toekomstige support en levertijd.",
    origin: "Installateur · Zuid-Korea"
  },
  {
    brand: "Sigenergy",
    model: "SigenStor",
    type: "Modulair",
    priceKwhMin: 500,
    priceKwhMax: 700,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "5 – 48 kWh (uitbreidbaar)",
    power: "Tot ~10+ kW",
    warranty: "10 jaar",
    noodstroom: "Ja",
    connection: "Hybride (all-in-one)",
    chemistry: "LFP",
    description: "Nieuw, modulair all-in-one met omvormer, EV-laden en noodstroom in één. Veel functies, hoger prijssegment.",
    origin: "Installateur · China"
  },
  {
    brand: "Zonneplan",
    model: "Thuisbatterij",
    type: "All-in-one",
    priceKwhMin: 500,
    priceKwhMax: 700,
    installation: "~€0 – €500 (via Zonneplan)",
    capacity: "~6 – 12 kWh",
    power: "~2,5 kW",
    warranty: "10 jaar",
    noodstroom: "Nee",
    connection: "AC (eigen omvormer)",
    chemistry: "LFP",
    description: "All-in-one mét automatische handel op de dynamische markt; je zit wel vast aan hun dienst/contract.",
    origin: "Via Zonneplan · China (NL-merk)"
  },
  {
    brand: "Tesla",
    model: "Powerwall 3",
    type: "All-in-one",
    priceKwhMin: 540,
    priceKwhMax: 800,
    installation: "~€800 – €2.000 (installatie)",
    capacity: "13,5 kWh (uitbreidbaar tot ~40+)",
    power: "11,5 kW continu",
    warranty: "10 jaar / 70%",
    noodstroom: "Ja (met Gateway)",
    connection: "Hybride (eigen omvormer)",
    chemistry: "LFP",
    description: "Krachtig, sterke noodstroom en app, ingebouwde omvormer. Hoge totaalprijs en alleen in 13,5 kWh-stappen.",
    origin: "Gecertificeerd installateur · VS / China-cellen"
  },
  {
    brand: "Qcells",
    model: "Q.HOME Core / Q.SAVE",
    type: "Modulair",
    priceKwhMin: 550,
    priceKwhMax: 750,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "6 – 20 kWh (uitbreidbaar)",
    power: "Afh. systeem",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "Hybride (Q.HOME-omvormer)",
    chemistry: "LFP",
    description: "Bekend zonnemerk (Hanwha) met eigen LFP-opslag; degelijk en compleet systeem, prijs in het middensegment.",
    origin: "Installateur · Zuid-Korea (Hanwha)"
  },
  {
    brand: "Sessy",
    model: "Sessy",
    type: "All-in-one",
    priceKwhMin: 600,
    priceKwhMax: 800,
    installation: "~€0 – €500 (deels zelf te plaatsen)",
    capacity: "5 kWh per unit (stapelbaar)",
    power: "~2,2 kW",
    warranty: "10 jaar",
    noodstroom: "Nee",
    connection: "AC (stekkerklaar)",
    chemistry: "LFP",
    description: "Nederlands, plug-and-play, dynamisch handelen ingebouwd. Relatief laag vermogen per unit; prijs/kWh aan de hoge kant.",
    origin: "Webshop / installateur · Nederland"
  },
  {
    brand: "SolarEdge",
    model: "Home Battery",
    type: "Modulair",
    priceKwhMin: 600,
    priceKwhMax: 800,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "9,7 kWh per unit",
    power: "~5 kW",
    warranty: "10 jaar / 70%",
    noodstroom: "Optioneel (Home Backup)",
    connection: "Hybride (SolarEdge-omvormer)",
    chemistry: "NMC",
    description: "Logische keuze als u al een SolarEdge-omvormer heeft; als losse keuze prijzig per kWh.",
    origin: "Installateur · Israël / VS"
  },
  {
    brand: "Solarwatt",
    model: "Battery flex",
    type: "Modulair",
    priceKwhMin: 600,
    priceKwhMax: 850,
    installation: "~€2.000 – €5.000 (omvormer + installatie)",
    capacity: "4,8 – 30 kWh (uitbreidbaar)",
    power: "Afh. omvormer",
    warranty: "10 jaar",
    noodstroom: "Optioneel",
    connection: "AC of hybride",
    chemistry: "LFP",
    description: "Duits premium met sterke garantie en kwaliteit; hoge prijs/kWh drukt de terugverdientijd.",
    origin: "Installateur · Duitsland"
  },
  {
    brand: "Enphase",
    model: "IQ Battery 5P",
    type: "All-in-one",
    priceKwhMin: 700,
    priceKwhMax: 900,
    installation: "~€800 – €2.000 (installatie)",
    capacity: "5 kWh per unit (stapelbaar)",
    power: "3,84 kW continu",
    warranty: "15 jaar / 6.000 cycli",
    noodstroom: "Ja (met System Controller)",
    connection: "AC (micro-omvormers)",
    chemistry: "LFP",
    description: "Lange garantie (15 jaar) en sterke noodstroom; populair bij bestaande Enphase-installaties, maar prijzig per kWh.",
    origin: "Installateur · VS (cellen China)"
  },
  {
    brand: "Sonnen",
    model: "sonnenBatterie",
    type: "All-in-one",
    priceKwhMin: 800,
    priceKwhMax: 1100,
    installation: "AC (eigen omvormer)",
    capacity: "5 – 20 kWh",
    power: "Tot ~4,6 kW",
    warranty: "10 jaar / 10.000 cycli",
    noodstroom: "Optioneel",
    connection: "AC (eigen omvormer)",
    chemistry: "LFP",
    description: "Premium en compleet (incl. energiediensten), maar de hoge prijs/kWh maakt de terugverdientijd lastig.",
    origin: "Installateur · Duitsland"
  }
];

export default function BatteryMarketOverview({ 
  dynamicProvider = 'Zonneplan', 
  typeContract = 'Dynamisch',
  capaciteitAccu = 10,
  solarYield = 5000
}: BatteryMarketOverviewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<'All' | 'Stekkerklaar' | 'Modulair' | 'All-in-one'>('All');
  const [selectedChemistry, setSelectedChemistry] = React.useState<'All' | 'LFP' | 'NMC'>('All');
  const [showAll, setShowAll] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('table');

  // Filter & sort database (always pre-sorted by price per kWh low to high as requested)
  const filteredBatteries = React.useMemo(() => {
    return batteryDatabase.filter(battery => {
      const matchesSearch = 
        battery.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        battery.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        battery.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        battery.origin.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'All' || battery.type === selectedType;
      const matchesChemistry = selectedChemistry === 'All' || battery.chemistry === selectedChemistry;

      return matchesSearch && matchesType && matchesChemistry;
    });
  }, [searchTerm, selectedType, selectedChemistry]);

  const displayedBatteries = showAll ? filteredBatteries : filteredBatteries.slice(0, 8);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-8 shadow-sm mt-8" id="battery-market-overview-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
            Marktvergelijking
          </span>
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Battery className="w-5 h-5 text-blue-500" />
            Welke Thuisbatterij Kiezen?
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Reëel marktoverzicht van 32 thuisaccu's in Nederland, gesorteerd van laagste naar hoogste hardware-richtprijs per kWh.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('table')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Tabel-lijst
          </button>
          <button 
            onClick={() => setViewMode('grid')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Uitgebreide kaarten
          </button>
        </div>
      </div>

      {/* Interactive Search & Filters */}
      <div className="bg-slate-50 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Zoek op merk, model of kenmerk (bijv. 'Tesla', 'Plug-in', 'Nederlands')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="bg-transparent focus:outline-none text-slate-600 font-medium cursor-pointer pr-1"
              >
                <option value="All">Alle types</option>
                <option value="Stekkerklaar">Stekkerklaar / Plug-in</option>
                <option value="Modulair">Modulair / Systeem</option>
                <option value="All-in-one">All-in-one</option>
              </select>
            </div>

            {/* Chemistry Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select 
                value={selectedChemistry}
                onChange={(e) => setSelectedChemistry(e.target.value as any)}
                className="bg-transparent focus:outline-none text-slate-600 font-medium cursor-pointer pr-1"
              >
                <option value="All">Alle chemie</option>
                <option value="LFP">LFP (Veilig, lange levensduur)</option>
                <option value="NMC">NMC (Hoge dichtheid/vermogen)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
          <span>
            Laatste prijscontrole: <strong>3 juli 2026</strong> · {filteredBatteries.length} modellen gevonden
          </span>
          <span className="hidden sm:inline">
            Richtprijzen per kWh zijn exclusief installatie/omvormer (behalve stekkerklaar).
          </span>
        </div>
      </div>

      {/* View Mode: Table List (Responsive) */}
      {viewMode === 'table' ? (
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Merk &amp; Model</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Richtprijs / kWh</th>
                  <th className="px-5 py-3">Capaciteit &amp; Garantie</th>
                  <th className="px-5 py-3">Aansluiting &amp; Chemie</th>
                  <th className="px-5 py-3">Installatie / Kenmerk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                {displayedBatteries.map((b) => (
                  <tr key={`${b.brand}-${b.model}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        {b.brand}
                        {b.isBestPriceKwh && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wider">
                            <Star className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                            Beste prijs
                          </span>
                        )}
                        {b.brand === 'Zonneplan' && dynamicProvider === 'Zonneplan' && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Match
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{b.model}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{b.origin}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.type === 'Stekkerklaar' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : b.type === 'All-in-one' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-800">
                        €{b.priceKwhMin} – €{b.priceKwhMax}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">per kWh (kaal)</div>
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      <div className="font-bold text-slate-600">{b.capacity}</div>
                      <div className="text-[10px] flex items-center gap-1 text-slate-500">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        Garantie: {b.warranty}
                      </div>
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      <div className="text-slate-600 font-medium">{b.connection}</div>
                      <div className="text-[10px] text-slate-400">
                        Chemie: <strong>{b.chemistry}</strong>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 leading-normal line-clamp-2 md:line-clamp-none hover:line-clamp-none">
                        {b.description}
                      </p>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        + {b.installation}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBatteries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-medium">
                      Geen thuisbatterijen gevonden die voldoen aan je zoekcriteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode: Bento Grid */
        <div className="grid md:grid-cols-2 gap-4">
          {displayedBatteries.map((b) => (
            <div 
              key={`${b.brand}-${b.model}`}
              className="border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex flex-col justify-between bg-white relative"
            >
              {b.isBestPriceKwh && (
                <div className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Beste prijs/kWh
                </div>
              )}

              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5 ${
                    b.type === 'Stekkerklaar' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : b.type === 'All-in-one' 
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {b.type}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Battery className="w-4 h-4 text-blue-500 shrink-0" />
                    {b.brand} <span className="text-slate-500 font-normal">{b.model}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.origin}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Richtprijs / kWh</span>
                    <span className="text-lg font-black text-slate-800">€{b.priceKwhMin} – €{b.priceKwhMax}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">kaal hardwaretarief</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Capaciteit</span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">{b.capacity}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vermogen:</span>
                    <span className="font-bold">{b.power}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Garantie:</span>
                    <span className="font-bold">{b.warranty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Noodstroom:</span>
                    <span className="font-bold">{b.noodstroom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aansluiting:</span>
                    <span className="font-bold text-right truncate max-w-[150px]">{b.connection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chemie:</span>
                    <span className="font-bold">{b.chemistry} (LFP)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
                  {b.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
                <span>+ {b.installation}</span>
                <span className="text-blue-500 font-semibold cursor-pointer hover:underline">Lees review →</span>
              </div>
            </div>
          ))}
          {filteredBatteries.length === 0 && (
            <div className="col-span-2 px-5 py-12 text-center text-slate-400 font-medium">
              Geen thuisbatterijen gevonden die voldoen aan je zoekcriteria.
            </div>
          )}
        </div>
      )}

      {/* Show more toggle */}
      {filteredBatteries.length > 8 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Minder modellen tonen
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Toon alle {filteredBatteries.length} modellen (volledig overzicht)
              </>
            )}
          </button>
        </div>
      )}

      {/* Explanation banner */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-[11px] text-slate-500 leading-relaxed space-y-1.5">
        <p>
          <strong>Toelichting op prijzen:</strong> De richtprijs per kWh is de kale hardwareprijs (zonder installatie) — de eerlijkste maat om merken naast elkaar te leggen. De installatiekosten staan per model apart vermeld. 
        </p>
        <p>
          <strong>Voorbeeld:</strong> een 10 kWh modulair systeem kost ≈ €3.000 – €5.000 batterij + €2.000 – €5.000 omvormer &amp; installatie = €5.000 – €10.000 totaal. Een all-in-one (met ingebouwde omvormer) of stekkeraccu is fors goedkoper op installatie. Een stekkeraccu plaatst u zelf, dus daar is de kale hardwareprijs direct uw totale investering. Alle bedragen zijn indicatief en laatst gecontroleerd op <strong>3 juli 2026</strong>.
        </p>
      </div>
    </div>
  );
}
