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
  dakOrientatie: number; // degrees relative to South (0 is South, -90 East, 90 West, 180 North)
  huidigDirectVerbruik: number; // % (0-100)
  capaciteitAccu: number; // kWh
  omzettingsverliezen: number; // % (0-100)
  typeContract: 'Vast' | 'Dynamisch';
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
  type: 'Hybride' | 'All-Electric';
  brutoInvestment: number;
  subsidy: number;
  netInvestment: number;
  gasSavingsM3: number;
  gasSavingsEuro: number;
  elecIncreaseKwh: number;
  elecCostEuro: number;
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
  opmerkingenOffertes: string;
  opmerkingen: string;
}
