export interface ResidentData {
  naam: string;
  registratiecode: string;
  brutoGezinsinkomen: number;
  coach: string;
  datum: string;
  aanhef: string;
  voorletters: string;
  achternaam: string;
  straat: string;
  huisnummer: string;
  toevoeging: string;
  postcode: string;
  plaats: string;
  aantalPersonen: number;
  telefoon: string;
  email: string;
  akkoord: boolean;
}

export interface HouseData {
  wozWaarde: number;
  energielabel: 'A - B - C' | 'D' | 'E' | 'F' | 'G' | 'Geen';
  verbruikKwh: number;
  verbruikM3: number;
  soortWoning: string;
  bouwjaar: number;
  woonoppervlakte: number;
  verwarming: string;
  afgiftesysteem: string;
  tapwater: string;
  koken: string;
  ventilatie: string;
  zonnepanelenPresent: 'Ja' | 'Nee';
  elektraPrijs: number;
  elektraTeruglevering: number;
  gasPrijs: number;
  stookgedragOverride: 'auto' | 'normaal' | 'zuinig' | 'minimaal';
  stookgedragBerekend: string;
  stookgedragFactor: number;
  isoDak: string;
  isoGevel: string;
  isoGlasBg: string;
  isoGlasVd: string;
  isoVloer: string;
  isoKieren: string;
  inkomenCheck: boolean;
}

export interface InsulationData {
  vloer: number;
  bodem: number;
  spouw: number;
  zolderVliering: number;
  dakBinnenzijde: number;
  gevelBuitenzijde: number;
  glasEnkelHR: number;
  glasDubbelHR: number;
  glasTripleHout: number;
}

export interface TechData {
  aantalZonnepanelen: number;
  vermogenPerPaneel?: number; // peak power per panel in Wp (e.g. 400 or 430)
  dakOrientatie: number; // degrees relative to South (0 is South, -90 East, 90 West, 180 North)
  dakHellingshoek?: number; // degrees (0 flat, 90 vertical, default 35)
  huidigDirectVerbruik: number; // % (0-100)
  solarStatus?: 'nieuw' | 'bestaand'; // 'nieuw' = include investment; 'bestaand' = already installed (€0 investment, full yield)
  capaciteitAccu: number; // kWh
  omzettingsverliezen: number; // % (0-100)
  batteryStatus?: 'nieuw' | 'bestaand'; // 'nieuw' = include investment; 'bestaand' = already installed (€0 investment)
  typeContract: 'Vast' | 'Dynamisch';
  dynamicProvider?: 'Zonneplan' | 'Tibber' | 'Frank' | 'Anwb';
  vastTerugleverkosten?: number; // €/kWh terugleverkosten bij vast contract (standaard € 0.11/kWh)
  vastTerugleverVergoeding?: number; // €/kWh terugleververgoeding overschot na salderen (standaard € 0.05/kWh)
  dynamischStroomTarief?: number; // €/kWh gemiddeld dynamisch inkooptarief (standaard € 0.25/kWh)
  dynamischTerugleverTarief?: number; // €/kWh gemiddeld dynamisch teruglevertarief op zonne-uren (standaard € 0.09/kWh)
  evKilometers?: number;
  evVerbruik?: number;
  evThuisLaden?: number;
  laadvermogen?: number;
  laadpaalStatus?: 'nieuw' | 'bestaand'; // 'nieuw' = include investment; 'bestaand' = already installed (€0 investment)
  opslagLeverancier?: number; // €/kWh dynamic contract surcharge
  selectedWarmtepompModel?: 'Standard' | 'Middelgroot 8kW' | 'Groot 12kW' | 'LuchtLucht';
  selectedWarmtepompType?: 'Hybride' | 'All-Electric';
  heatpumpStatus?: 'nieuw' | 'bestaand'; // 'nieuw' = include investment & ISDE; 'bestaand' = already installed (€0 investment & €0 ISDE)
  customAccuPrijs?: number; // Custom installation/purchase cost for the battery
  customZonnepanelenPrijs?: number; // Custom installation/purchase cost for solar panels
  customWarmtepompPrijs?: number; // Custom installation/purchase cost for heat pump
  customLaadpaalPrijs?: number; // Custom installation/purchase cost for EV charger
  userAnnualSolar?: number; // Custom user override for annual solar yield
  userAnnualWp?: number; // Custom user override for annual heat pump consumption
  userAnnualLp?: number; // Custom user override for annual EV laadpaal consumption
  slimEmsOnlySolar?: boolean; // Smart EMS: charge EV only on surplus solar energy
  batteryGridTrading?: boolean; // Smart EMS: active grid trading / arbitrage on EPEX & imbalance markets
  pvCurtailmentMode?: boolean; // Smart EMS: automatically curtail solar inverter on negative electricity prices
}

export interface CalculatedMeasure {
  id: keyof InsulationData;
  name: string;
  area: number;
  brutoCosts: number;
  isdeSubsidy: number;
  nipSubsidy: number;
  netCosts: number;
  savingM3: number;
  savingEuro: number;
  tvt: number; // Payback time in years
  priority: number; // Net investment / savings
}

export interface SolarPrognose {
  annualYieldKwh: number;
  orientationFactor: number;
  selfConsumptionWithBattery: number; // %
  selfConsumptionBase: number; // %
  absoluteSelfConsumptionBaseKwh: number;
  absoluteSelfConsumptionWithBatteryKwh: number;
  gridFeedBaseKwh: number;
  gridFeedWithBatteryKwh: number;
  disclaimer: string;
}

export interface BatteryOption {
  capacityKwh: number;
  label: string;
  brutoInvestment: number;
  btwRefund: number;
  netInvestment: number;
  efficiencyIncrease: number; // % absolute increase in self consumption
  selfConsumptionWithBattery: number;
  annualSavingsVastPre2027: number;
  annualSavingsVastPost2027: number;
  annualSavingsDynamisch: number; // dynamically traded savings (arbitrage)
  tvtPre2027: number;
  tvtPost2027: number;
  tvtDynamisch: number;
  bestSuited: boolean;
  recommendation: string;
}

export interface BatteryImpact {
  efficiencyIncrease: number; // % absolute increase in self consumption
  costSavingsPre2027: number;
  costSavingsPost2027: number;
  contractSavingsVast: number;
  contractSavingsDynamisch: number;
  options: BatteryOption[];
}

export interface HeatpumpOption {
  type: 'Hybride' | 'All-Electric' | 'Lucht-lucht (Airco)';
  brutoInvestment: number;
  subsidy: number;
  netInvestment: number;
  gasSavingsM3: number;
  gasSavingsEuro: number;
  elecIncreaseKwh: number;
  elecCostEuro: number;
  solarCoverageKwh?: number;
  gridImportKwh?: number;
  fixedGasSavingsEuro: number; // Saving fixed gas costs (vastrecht) by removing gas connection
  netSavingsEuro: number;
  tvt: number; // Payback time in years
  isFeasible: boolean;
  feasibilityReason: string;
}

export interface HeatpumpCheck {
  isInsulatedSufficiently: boolean;
  remainingGasM3: number;
  isRecommended: boolean;
  estimatedInvestment: number;
  estimatedSavingsEuro: number;
  explanation: string;
  options: HeatpumpOption[];
}

export interface CalculationResult {
  resident: ResidentData;
  house: HouseData;
  insulation: InsulationData;
  tech: TechData;
  eligibleNip: boolean;
  nipExplanation: string;
  measures: CalculatedMeasure[];
  optimalMeasures: CalculatedMeasure[];
  addedMeasureForOptimization: string | null;
  totals: {
    bruto: number;
    isde: number;
    nip: number;
    net: number;
    savingsEuro: number;
    tvt: number;
  };
  totalsOptimal: {
    bruto: number;
    isde: number;
    nip: number;
    net: number;
    savingsEuro: number;
    tvt: number;
  };
  solar: SolarPrognose;
  battery: BatteryImpact;
  heatpump: HeatpumpCheck;
  laadpaal?: {
    evAnnualDemandKwh: number;
    evSolarCoverageKwh: number;
    evGridImportKwh: number;
    evSavingsEuro: number;
    ereRevenueEuro: number;
    totalSavingsEuro: number;
    netInvestmentEuro: number;
    tvt: number;
  };
  opmerkingenOffertes: string;
  opmerkingen: string;
}
