import {
  ResidentData,
  HouseData,
  InsulationData,
  TechData,
  CalculatedMeasure,
  SolarPrognose,
  BatteryImpact,
  HeatpumpCheck,
  HeatpumpOption,
  BatteryOption,
  CalculationResult
} from '../types';

export const ELEC_PRICE = 0.25; // €/kWh

// Key figures from prompt / Pilot HTML
export const COEFFS = {
  bodem: { saving: 1.0, cost: 30, isde1: 3, isde2: 6, cat: 'vloer', name: 'Bodemisolatie' },
  zolderVliering: { saving: 6.0, cost: 30, isde1: 4, isde2: 8, cat: 'dak', name: 'Zolder-/vlieringvloerisolatie' },
  spouw: { saving: 7.0, cost: 30, isde1: 5.25, isde2: 10.5, cat: 'gevel', name: 'Spouwmuurisolatie' },
  glasEnkelHR: { saving: 12.0, cost: 250, isde1: 25, isde2: 50, cat: 'glas', name: 'Glasisolatie (enkel → HR++)' },
  glasTripleHout: { saving: 12.5, cost: 950, isde1: 111, isde2: 222, cat: 'glas', name: 'Glasisolatie (triple + hout)' },
  dakBinnenzijde: { saving: 9.0, cost: 50, isde1: 16.25, isde2: 32.5, cat: 'dak', name: 'Dakisolatie (binnenzijde)' },
  vloer: { saving: 6.0, cost: 50, isde1: 5.5, isde2: 11, cat: 'vloer', name: 'Vloerisolatie (onderkant)' },
  gevelBuitenzijde: { saving: 7.0, cost: 200, isde1: 20.25, isde2: 40.5, cat: 'gevel', name: 'Gevelisolatie (buitenzijde)' },
  glasDubbelHR: { saving: 3.0, cost: 250, isde1: 25, isde2: 50, cat: 'glas', name: 'Glasisolatie (dubbel → HR++)' },
};

/**
 * Indicatieve prijsberekening zonnepanelen (inclusief installatie):
 * 2 panelen:  € 1.200 – € 1.600 (~ € 700 / paneel, ~ 750 kWh)
 * 6 panelen:  € 2.500 – € 3.200 (~ € 475 / paneel, ~ 2.300 kWh)
 * 10 panelen: € 3.800 – € 5.100 (~ € 445 / paneel, ~ 4.000 kWh)
 * 20 panelen: € 7.500 – € 9.500 (~ € 425 / paneel, ~ 8.200 kWh)
 * 36 panelen: € 13.500 – € 16.000 (~ € 410 / paneel, ~ 14.500 kWh)
 */
export function getSolarInvestmentEstimate(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) {
    return Math.round(count * 700);
  }
  if (count <= 6) {
    const ratio = (count - 2) / (6 - 2);
    return Math.round(1400 + ratio * (2850 - 1400));
  }
  if (count <= 10) {
    const ratio = (count - 6) / (10 - 6);
    return Math.round(2850 + ratio * (4450 - 2850));
  }
  if (count <= 20) {
    const ratio = (count - 10) / (20 - 10);
    return Math.round(4450 + ratio * (8500 - 4450));
  }
  if (count <= 36) {
    const ratio = (count - 20) / (36 - 20);
    return Math.round(8500 + ratio * (14760 - 8500));
  }
  return Math.round(14760 + (count - 36) * 410);
}

export function getSolarInvestmentRange(count: number): { min: number; max: number; avg: number; avgPerPanel: number } {
  if (count <= 0) return { min: 0, max: 0, avg: 0, avgPerPanel: 0 };

  let min = 0;
  let max = 0;

  if (count <= 2) {
    min = Math.round(count * 600);
    max = Math.round(count * 800);
  } else if (count <= 6) {
    const ratio = (count - 2) / 4;
    min = Math.round(1200 + ratio * (2500 - 1200));
    max = Math.round(1600 + ratio * (3200 - 1600));
  } else if (count <= 10) {
    const ratio = (count - 6) / 4;
    min = Math.round(2500 + ratio * (3800 - 2500));
    max = Math.round(3200 + ratio * (5100 - 3200));
  } else if (count <= 20) {
    const ratio = (count - 10) / 10;
    min = Math.round(3800 + ratio * (7500 - 3800));
    max = Math.round(5100 + ratio * (9500 - 5100));
  } else if (count <= 36) {
    const ratio = (count - 20) / 16;
    min = Math.round(7500 + ratio * (13500 - 7500));
    max = Math.round(9500 + ratio * (16000 - 9500));
  } else {
    min = Math.round(13500 + (count - 36) * 375);
    max = Math.round(16000 + (count - 36) * 440);
  }

  const avg = getSolarInvestmentEstimate(count);
  const avgPerPanel = Math.round(avg / count);

  return { min, max, avg, avgPerPanel };
}

/**
 * Indicatieve prijsberekening thuisbatterijen / accu's (inclusief installatie & btw):
 * 2 kWh:  € 1.500 – € 2.500 (€ 750 – € 1.250 / kWh)  - Appartementen, klein verbruik, opslaan van een middagje zon.
 * 5 kWh:  € 3.500 – € 5.000 (€ 700 – € 1.000 / kWh)  - Gemiddeld huishouden, overbruggen van de avonduren.
 * 10 kWh: € 6.000 – € 8.500 (€ 600 – € 850 / kWh)    - Groot huishouden, warmtepomp, elektrische auto opgeladen via de accu.
 * 20 kWh: € 10.500 – € 14.500 (€ 525 – € 725 / kWh)  - Zeer groot verbruik, (semi-)off-grid, kleinzakelijk.
 * 30 kWh: € 14.000 – € 20.000 (€ 465 – € 665 / kWh)  - Combinatie met 36 zonnepanelen, agrarisch, kleinzakelijk gebruik.
 */
export function getBatteryInvestmentEstimate(capacityKwh: number): number {
  if (capacityKwh <= 0) return 0;
  if (capacityKwh <= 2) {
    const ratio = capacityKwh / 2;
    return Math.round(ratio * 2000);
  }
  if (capacityKwh <= 5) {
    const ratio = (capacityKwh - 2) / 3;
    return Math.round(2000 + ratio * (4250 - 2000));
  }
  if (capacityKwh <= 10) {
    const ratio = (capacityKwh - 5) / 5;
    return Math.round(4250 + ratio * (7250 - 4250));
  }
  if (capacityKwh <= 20) {
    const ratio = (capacityKwh - 10) / 10;
    return Math.round(7250 + ratio * (12500 - 7250));
  }
  if (capacityKwh <= 30) {
    const ratio = (capacityKwh - 20) / 10;
    return Math.round(12500 + ratio * (17000 - 12500));
  }
  return Math.round(17000 + (capacityKwh - 30) * 550);
}

export function getBatteryInvestmentRange(capacityKwh: number): {
  min: number;
  max: number;
  avg: number;
  minPerKwh: number;
  maxPerKwh: number;
  avgPerKwh: number;
  application: string;
} {
  if (capacityKwh <= 0) {
    return { min: 0, max: 0, avg: 0, minPerKwh: 0, maxPerKwh: 0, avgPerKwh: 0, application: '' };
  }

  let min = 0;
  let max = 0;
  let application = '';

  if (capacityKwh <= 2) {
    const ratio = capacityKwh / 2;
    min = Math.round(ratio * 1500);
    max = Math.round(ratio * 2500);
    application = 'Appartementen, klein verbruik, opslaan van een middagje zon.';
  } else if (capacityKwh <= 5) {
    const ratio = (capacityKwh - 2) / 3;
    min = Math.round(1500 + ratio * (3500 - 1500));
    max = Math.round(2500 + ratio * (5000 - 2500));
    application = 'Gemiddeld huishouden, overbruggen van de avonduren.';
  } else if (capacityKwh <= 10) {
    const ratio = (capacityKwh - 5) / 5;
    min = Math.round(3500 + ratio * (6000 - 3500));
    max = Math.round(5000 + ratio * (8500 - 5000));
    application = 'Groot huishouden, warmtepomp, elektrische auto opgeladen via de accu.';
  } else if (capacityKwh <= 20) {
    const ratio = (capacityKwh - 10) / 10;
    min = Math.round(6000 + ratio * (10500 - 6000));
    max = Math.round(8500 + ratio * (14500 - 8500));
    application = 'Zeer groot verbruik, (semi-)off-grid, kleinzakelijk.';
  } else if (capacityKwh <= 30) {
    const ratio = (capacityKwh - 20) / 10;
    min = Math.round(10500 + ratio * (14000 - 10500));
    max = Math.round(14500 + ratio * (20000 - 14500));
    application = 'Combinatie met 36 zonnepanelen, agrarisch, kleinzakelijk gebruik.';
  } else {
    min = Math.round(14000 + (capacityKwh - 30) * 450);
    max = Math.round(20000 + (capacityKwh - 30) * 650);
    application = 'Grootschalige opslag, zakelijk / agrarisch.';
  }

  const avg = getBatteryInvestmentEstimate(capacityKwh);
  const avgPerKwh = Math.round(avg / capacityKwh);
  const minPerKwh = Math.round(min / capacityKwh);
  const maxPerKwh = Math.round(max / capacityKwh);

  return { min, max, avg, minPerKwh, maxPerKwh, avgPerKwh, application };
}

export function calculateAll(
  resident: ResidentData,
  house: HouseData,
  insulation: InsulationData,
  tech: TechData
): CalculationResult {
  // --- STOOKGEDRAG BEREKENING ---
  let calculatedFactor = 1.0;
  let calculatedLabel = 'Normaal (1.0x)';

  const { aantalPersonen } = resident;
  const { verbruikM3, woonoppervlakte, bouwjaar, stookgedragOverride, gasPrijs } = house;

  if (aantalPersonen > 0 && verbruikM3 > 0 && woonoppervlakte > 0 && bouwjaar > 0) {
    let normFactor = 11;
    if (bouwjaar >= 1975 && bouwjaar <= 1991) normFactor = 9;
    else if (bouwjaar >= 1992 && bouwjaar <= 2005) normFactor = 6.5;
    else if (bouwjaar >= 2006 && bouwjaar <= 2015) normFactor = 4.5;
    else if (bouwjaar > 2015) normFactor = 2.5;

    const verwachtVerwarmingsGas = DeNormalizeOpp(woonoppervlakte) * normFactor;
    const tapwaterGas = aantalPersonen * 100;
    const werkelijkVerwarmingsGas = Math.max(0, verbruikM3 - tapwaterGas);

    const ratio = werkelijkVerwarmingsGas / verwachtVerwarmingsGas;
    const roundedFactor = Math.round(ratio * 10) / 10;
    // Bound factor between 0.1 and 2.5 for stability
    calculatedFactor = Math.max(0.1, Math.min(2.5, roundedFactor));

    let labelCategory = 'Normaal';
    if (calculatedFactor >= 1.2) {
      labelCategory = 'Hoog';
    } else if (calculatedFactor >= 0.9) {
      labelCategory = 'Normaal';
    } else if (calculatedFactor >= 0.6) {
      labelCategory = 'Zuinig';
    } else {
      labelCategory = 'Minimaal';
    }

    calculatedLabel = `${labelCategory} (${calculatedFactor.toFixed(1)}x)`;
  } else {
    calculatedLabel = 'Vul in...';
  }

  // Handle manual override
  let finalStookFactor = calculatedFactor;
  let activeStookLabel = calculatedLabel;

  if (stookgedragOverride === 'normaal') {
    finalStookFactor = 1.0;
    activeStookLabel = 'Geforceerd: Normaal (1.0x)';
  } else if (stookgedragOverride === 'zuinig') {
    finalStookFactor = 0.7;
    activeStookLabel = 'Geforceerd: Zuinig (0.7x)';
  } else if (stookgedragOverride === 'minimaal') {
    finalStookFactor = 0.4;
    activeStookLabel = 'Geforceerd: Minimaal (0.4x)';
  } else {
    activeStookLabel = calculatedLabel;
  }

  const updatedHouse: HouseData = {
    ...house,
    stookgedragBerekend: activeStookLabel,
    stookgedragFactor: finalStookFactor,
  };

  // 1. Identify active keys
  const activeKeys = (Object.keys(insulation) as Array<keyof InsulationData>).filter(
    (key) => insulation[key] > 0
  );

  // Grouping rules for ISDE categories:
  // - Dak + Zolder/Vliering count as "dak"
  // - Vloer + Bodem count as "vloer"
  // - Glas is "glas"
  // - Spouw is "gevel" (or spouw)
  // - Gevel is "gevel"
  const catsFound = new Set<string>();
  let totalGlassArea = 0;

  activeKeys.forEach((key) => {
    const coeff = COEFFS[key];
    catsFound.add(coeff.cat);
    if (coeff.cat === 'glas') {
      totalGlassArea += insulation[key];
    }
  });

  const isdeCategoryCount = catsFound.size;
  const isMultiMeasure = isdeCategoryCount >= 2;

  // Helper to calculate a single measure
  const calcMeasure = (key: keyof InsulationData, area: number, multiTier: boolean): CalculatedMeasure => {
    const coeff = COEFFS[key];
    const brutoCosts = area * coeff.cost;
    
    // Saving takes stookgedrag factor into account
    const savingM3 = area * coeff.saving * finalStookFactor;
    const savingEuro = savingM3 * gasPrijs;

    // ISDE calculation
    let isdeSubsidy = 0;
    const isdeRate = multiTier ? coeff.isde2 : coeff.isde1;

    if (coeff.cat === 'glas') {
      // Glass ISDE rule: total glass area must be >= 8m²
      if (totalGlassArea >= 8) {
        // Capped at 45m² total glass
        const effectiveArea = totalGlassArea > 45 ? (area / totalGlassArea) * 45 : area;
        isdeSubsidy = effectiveArea * isdeRate;
      }
    } else if (key === 'spouw') {
      // Spouwmuur ISDE rule: minimum 10m²
      if (area >= 10) {
        isdeSubsidy = area * isdeRate;
      }
    } else {
      isdeSubsidy = area * isdeRate;
    }

    // Ensure subsidy does not exceed bruto costs
    isdeSubsidy = Math.min(brutoCosts, isdeSubsidy);

    return {
      id: key,
      name: coeff.name,
      area,
      brutoCosts,
      isdeSubsidy,
      nipSubsidy: 0,
      netCosts: brutoCosts - isdeSubsidy,
      savingM3,
      savingEuro,
      tvt: 0,
      priority: 0,
    };
  };

  // Calculate base measures
  let measures = activeKeys.map((key) => calcMeasure(key, insulation[key], isMultiMeasure));

  // Determine NIP eligibility
  // NIP (Gemeentelijke Subsidie €2.900) criteria:
  // - WOZ-waarde <= €477.000 (peildatum 2024) per updated guidelines in HTML
  // - Energielabel D, E, F, G or Geen
  // - Income < €60.000 or customer checked the declaration box
  // - At least 2 active categories (based on active categories)
  const satisfiesWoz = house.wozWaarde > 0 && house.wozWaarde <= 477000;
  const satisfiesLabel = ['D', 'E', 'F', 'G', 'Geen'].includes(house.energielabel);
  const satisfiesIncome = (resident.brutoGezinsinkomen < 60000) || house.inkomenCheck;
  const satisfiesNipMeasuresCount = isdeCategoryCount >= 2;

  const eligibleNip = satisfiesWoz && satisfiesLabel && satisfiesIncome && satisfiesNipMeasuresCount;

  let nipExplanation = '';
  if (house.wozWaarde === 0) nipExplanation += 'WOZ-waarde is nog niet ingevuld. ';
  else if (!satisfiesWoz) nipExplanation += 'WOZ-waarde is hoger dan €477.000 (peildatum 2024). ';
  if (!satisfiesLabel) nipExplanation += 'Energielabel is A, B of C (enkel D t/m G of geen label komen in aanmerking). ';
  if (!satisfiesIncome) nipExplanation += 'Bruto gezinsjaarinkomen is €60.000 of hoger en de inkomensverklaring is niet gecontroleerd. ';
  if (!satisfiesNipMeasuresCount) nipExplanation += 'Er zijn minder dan 2 actieve isolatiecategorieën ingevuld. ';
  
  if (eligibleNip) {
    nipExplanation = 'Je voldoet aan alle criteria voor de gemeentelijke NIP-subsidie van €2.900!';
  } else {
    nipExplanation = 'Voldoet (nog) niet aan alle NIP-subsidie-eisen wegens: ' + (nipExplanation || 'onbekende reden.');
  }

  // Allocate NIP subsidy if eligible
  // NIP covers remaining costs after ISDE, capped at €2,900.
  // Priority order: maatregelen met de hoogste besparing per m² (en hoogste totale besparing in €/jr) krijgen als eerste NIP subsidie
  if (eligibleNip) {
    let remainingNipPool = 2900;
    const sortedForNip = [...measures].sort((a, b) => {
      const savPerM2A = a.area > 0 ? a.savingEuro / a.area : 0;
      const savPerM2B = b.area > 0 ? b.savingEuro / b.area : 0;
      if (Math.abs(savPerM2B - savPerM2A) > 0.0001) {
        return savPerM2B - savPerM2A;
      }
      return b.savingEuro - a.savingEuro;
    });

    sortedForNip.forEach((m) => {
      const remainingCost = m.brutoCosts - m.isdeSubsidy;
      const nipAmount = Math.min(remainingCost, remainingNipPool);
      m.nipSubsidy = nipAmount;
      m.netCosts = remainingCost - nipAmount;
      remainingNipPool -= nipAmount;
    });
  }

  // Calculate TVT and priority for each base measure
  measures = measures.map((m) => {
    const priority = m.savingM3 > 0 ? m.netCosts / m.savingM3 : 99999;
    const tvt = m.savingEuro > 0 ? m.netCosts / m.savingEuro : 0;
    return {
      ...m,
      priority,
      tvt,
    };
  });

  // Calculate Totals for base scenario
  const totals = {
    bruto: measures.reduce((sum, m) => sum + m.brutoCosts, 0),
    isde: measures.reduce((sum, m) => sum + m.isdeSubsidy, 0),
    nip: measures.reduce((sum, m) => sum + m.nipSubsidy, 0),
    net: measures.reduce((sum, m) => sum + m.netCosts, 0),
    savingsEuro: measures.reduce((sum, m) => sum + m.savingEuro, 0),
    tvt: 0,
  };
  totals.tvt = totals.savingsEuro > 0 ? totals.net / totals.savingsEuro : 0;

  // --- OPTIMIZATION ALGORITHM (Beste scenario) ---
  let optimalMeasures = [...measures];
  let addedMeasureForOptimization: string | null = null;

  if (isdeCategoryCount === 1) {
    // Try to find a second measure to double the ISDE rate and unlock NIP!
    const candidates = (Object.keys(COEFFS) as Array<keyof typeof COEFFS>).filter((key) => {
      const coeff = COEFFS[key];
      return coeff.cat !== Array.from(catsFound)[0]; // must be different category
    });

    let bestAddedKey: keyof typeof COEFFS | null = null;
    let minNetTotalCost = totals.net;
    let bestTestMeasures: CalculatedMeasure[] = [];

    for (const key of candidates) {
      let testArea = 15; // m2
      if (COEFFS[key].cat === 'glas') {
        testArea = 8; // min 8m² for glass
      }

      const testInsulation = { ...insulation, [key]: testArea };
      const testActiveKeys = (Object.keys(testInsulation) as Array<keyof InsulationData>).filter(
        (k) => testInsulation[k] > 0
      );

      // Re-evaluate with isMultiMeasure = true
      const testMeasures = testActiveKeys.map((k) => {
        // Calculate with multi-measure rates
        const coeff = COEFFS[k];
        const area = testInsulation[k];
        const brutoCosts = area * coeff.cost;
        const savingM3 = area * coeff.saving * finalStookFactor;
        const savingEuro = savingM3 * gasPrijs;

        let isdeSubsidy = 0;
        const isdeRate = coeff.isde2; // multi-tier

        if (coeff.cat === 'glas') {
          // total glass is testArea since we only added glass
          const totalTestGlass = (k === 'glasEnkelHR' || k === 'glasDubbelHR' || k === 'glasTripleHout') ? area : 0;
          if (totalTestGlass >= 8) {
            isdeSubsidy = area * isdeRate;
          }
        } else if (k === 'spouw') {
          if (area >= 10) isdeSubsidy = area * isdeRate;
        } else {
          isdeSubsidy = area * isdeRate;
        }

        isdeSubsidy = Math.min(brutoCosts, isdeSubsidy);

        return {
          id: k,
          name: coeff.name,
          area,
          brutoCosts,
          isdeSubsidy,
          nipSubsidy: 0,
          netCosts: brutoCosts - isdeSubsidy,
          savingM3,
          savingEuro,
          tvt: 0,
          priority: 0,
        };
      });

      // Allocate NIP if satisfies criteria
      const testEligibleNip = satisfiesWoz && satisfiesLabel && satisfiesIncome && true; // true count is now 2
      if (testEligibleNip) {
        let remainingNipPool = 2900;
        const sortedTestForNip = [...testMeasures].sort((a, b) => {
          const savPerM2A = a.area > 0 ? a.savingEuro / a.area : 0;
          const savPerM2B = b.area > 0 ? b.savingEuro / b.area : 0;
          if (Math.abs(savPerM2B - savPerM2A) > 0.0001) {
            return savPerM2B - savPerM2A;
          }
          return b.savingEuro - a.savingEuro;
        });

        sortedTestForNip.forEach((m) => {
          const remainingCost = m.brutoCosts - m.isdeSubsidy;
          const nipAmount = Math.min(remainingCost, remainingNipPool);
          m.nipSubsidy = nipAmount;
          m.netCosts = remainingCost - nipAmount;
          remainingNipPool -= nipAmount;
        });
      }

      const testNetTotalCost = testMeasures.reduce((sum, m) => sum + m.netCosts, 0);

      // Is it a direct optimization?
      if (testNetTotalCost < minNetTotalCost) {
        minNetTotalCost = testNetTotalCost;
        bestAddedKey = key;
        bestTestMeasures = testMeasures;
      }
    }

    if (bestAddedKey) {
      const areaText = COEFFS[bestAddedKey].cat === 'glas' ? '8' : '15';
      addedMeasureForOptimization = `${COEFFS[bestAddedKey].name} (toegevoegd: ${areaText} m² voor subsidie-optimalisatie)`;

      optimalMeasures = bestTestMeasures.map((m) => {
        const priority = m.savingM3 > 0 ? m.netCosts / m.savingM3 : 0;
        const tvt = m.savingEuro > 0 ? m.netCosts / m.savingEuro : 0;
        return { ...m, priority, tvt };
      });
    }
  }

  // Calculate Totals for optimal scenario
  const totalsOptimal = {
    bruto: optimalMeasures.reduce((sum, m) => sum + m.brutoCosts, 0),
    isde: optimalMeasures.reduce((sum, m) => sum + m.isdeSubsidy, 0),
    nip: optimalMeasures.reduce((sum, m) => sum + m.nipSubsidy, 0),
    net: optimalMeasures.reduce((sum, m) => sum + m.netCosts, 0),
    savingsEuro: optimalMeasures.reduce((sum, m) => sum + m.savingEuro, 0),
    tvt: 0,
  };
  totalsOptimal.tvt = totalsOptimal.savingsEuro > 0 ? totalsOptimal.net / totalsOptimal.savingsEuro : 0;

  // --- MODULE 2: ZONNEPANELEN ---
  const orientRad = (tech.dakOrientatie * Math.PI) / 180;
  const cosOrient = Math.cos(orientRad);
  let orientationFactor = 1.0;
  if (cosOrient >= 0) {
    orientationFactor = 0.85 + 0.15 * cosOrient;
  } else {
    orientationFactor = 0.85 + 0.30 * cosOrient;
  }

  // Tilt/inclination factor (optimal is 35 degrees)
  const tilt = tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35;
  const tiltFactor = Math.max(0.5, 1 - 0.0001 * Math.pow(tilt - 35, 2));

  const paneelVermogen = tech.vermogenPerPaneel || 400;
  const totalWp = tech.aantalZonnepanelen * paneelVermogen;
  
  // Apply persistent user override if present
  const annualYieldKwh = (tech.userAnnualSolar !== undefined && tech.userAnnualSolar !== null && Number(tech.userAnnualSolar) > 0)
    ? Number(tech.userAnnualSolar)
    : (totalWp / 1000) * 900 * orientationFactor * tiltFactor;

  const selfConsumptionBase = tech.huidigDirectVerbruik;

  // --- MODULE 3: THUISACCU & SALDERINGSREGELING ---
  const avgDailyProductionKwh = annualYieldKwh / 365;
  let efficiencyIncrease = 0;
  if (tech.capaciteitAccu > 0 && annualYieldKwh > 0) {
    const ratio = tech.capaciteitAccu / avgDailyProductionKwh;
    const rawIncrease = 40 * (1 - Math.exp(-0.7 * ratio));
    efficiencyIncrease = rawIncrease * (1 - tech.omzettingsverliezen / 100);
  }

  const selfConsumptionWithBattery = Math.min(100, selfConsumptionBase + efficiencyIncrease);
  const absoluteSelfConsumptionBaseKwh = (annualYieldKwh * selfConsumptionBase) / 100;
  const absoluteSelfConsumptionWithBatteryKwh = (annualYieldKwh * selfConsumptionWithBattery) / 100;

  const gridFeedBaseKwh = annualYieldKwh - absoluteSelfConsumptionBaseKwh;
  const gridFeedWithBatteryKwh = annualYieldKwh - absoluteSelfConsumptionWithBatteryKwh;

  const costSavingsPre2027 = annualYieldKwh * (updatedHouse.elektraPrijs - 0.05);

  const savingsVastBase = absoluteSelfConsumptionBaseKwh * updatedHouse.elektraPrijs;
  const savingsVastWithBattery = absoluteSelfConsumptionWithBatteryKwh * updatedHouse.elektraPrijs;

  // Dynamisch teruglevertarief gebaseerd op het eerste halfjaar (Zonneplan gemiddelde ~ € 0,1049 per kWh)
  const returnRateDynamisch = 0.1049;
  const savingsDynamischBase = (absoluteSelfConsumptionBaseKwh * updatedHouse.elektraPrijs) + (gridFeedBaseKwh * returnRateDynamisch);
  const savingsDynamischWithBattery = (absoluteSelfConsumptionWithBatteryKwh * updatedHouse.elektraPrijs) + (gridFeedWithBatteryKwh * returnRateDynamisch);

  const contractSavingsVast = savingsVastWithBattery - savingsVastBase;
  const contractSavingsDynamisch = savingsDynamischWithBattery - savingsDynamischBase;

  const costSavingsPost2027 = tech.typeContract === 'Vast' ? contractSavingsVast : contractSavingsDynamisch;

  // Generate comparison options for home batteries (5 kWh, 10 kWh, 15 kWh, and optionally 30 kWh)
  const batteryCapacities = [5, 10, 15];
  if (tech.capaciteitAccu === 30 && !batteryCapacities.includes(30)) {
    batteryCapacities.push(30);
  }

  const batteryOptions: BatteryOption[] = batteryCapacities.map(cap => {
    const isBest = tech.capaciteitAccu === cap 
      ? true 
      : (annualYieldKwh > 0 
          ? (cap === 5 && annualYieldKwh < 3500) ||
            (cap === 10 && annualYieldKwh >= 3500 && annualYieldKwh < 7500) ||
            (cap === 15 && annualYieldKwh >= 7500 && annualYieldKwh < 12000) ||
            (cap === 30 && annualYieldKwh >= 12000)
          : cap === 10);

    let bruto = getBatteryInvestmentEstimate(cap);
    if (tech.capaciteitAccu === cap && tech.customAccuPrijs !== undefined && tech.customAccuPrijs > 0) {
      bruto = tech.customAccuPrijs;
    }
    // In the Netherlands, 21% VAT can often be reclaimed (Btw-teruggave voor thuisaccu's bij dynamisch contract/handelen)
    const btwRefund = bruto * (21 / 121);
    const net = bruto - btwRefund;

    let optEffIncrease = 0;
    if (annualYieldKwh > 0) {
      const ratio = cap / avgDailyProductionKwh;
      const rawIncrease = 40 * (1 - Math.exp(-0.7 * ratio));
      optEffIncrease = rawIncrease * (1 - tech.omzettingsverliezen / 100);
    }

    const optSelfConsumption = Math.min(100, selfConsumptionBase + optEffIncrease);
    const optAbsSelfConsumptionKwh = (annualYieldKwh * optSelfConsumption) / 100;
    const optGridFeedKwh = annualYieldKwh - optAbsSelfConsumptionKwh;

    // Vast pre-2027 has almost no yield under saldering, but dynamic allows active trading (arbitrage)
    const optVastSavingsPre2027 = cap * 10; // small self-consumption advantage pre-2027 under saldering
    
    // Vast post-2027 (saldering turned off)
    const optSavingsVastWithBattery = optAbsSelfConsumptionKwh * updatedHouse.elektraPrijs;
    const optContractSavingsVast = Math.max(0, optSavingsVastWithBattery - savingsVastBase);

    // Dynamisch contract (arbitrage trading on imbalances & peak shaving)
    let arbitragePerKwh = 55 * 0.45;
    const provider = tech.dynamicProvider || 'Zonneplan';
    if (provider === 'Zonneplan') {
      arbitragePerKwh = 85 * 0.45; // Powerplay onbalansopbrengst per kWh accu (45% van oorspronkelijk)
    } else if (provider === 'Frank') {
      arbitragePerKwh = 70 * 0.45; // Slim Handelen EPEX-arbitrage
    } else if (provider === 'Tibber') {
      arbitragePerKwh = 65 * 0.45; // Smart API arbitrage/Bliq/Home Assistant
    } else if (provider === 'Anwb') {
      arbitragePerKwh = 60 * 0.45; // EV Slim laden & basis arbitrage
    }
    const arbitrageYield = tech.batteryGridTrading ? cap * arbitragePerKwh : 0;
    const optSavingsDynamischWithBattery = (optAbsSelfConsumptionKwh * updatedHouse.elektraPrijs) + (optGridFeedKwh * returnRateDynamisch);
    const optContractSavingsDynamisch = Math.max(0, optSavingsDynamischWithBattery - savingsDynamischBase);
    const optDynamischTotalSavings = optContractSavingsDynamisch + arbitrageYield;

    const tvtPre = optVastSavingsPre2027 > 0 ? net / optVastSavingsPre2027 : 99;
    const tvtPost = optContractSavingsVast > 0 ? net / optContractSavingsVast : 99;
    const tvtDyn = optDynamischTotalSavings > 0 ? net / optDynamischTotalSavings : 99;

    let rec = '';
    if (cap === 5) {
      rec = 'Ideaal voor kleinere huishoudens of woningen met een kleiner PV-systeem (< 10 panelen). Uitstekend voor basis peak-shaving.';
    } else if (cap === 10) {
      rec = 'Biedt de perfecte balans voor een gemiddeld huishouden met zonnepanelen. Optimale verhouding tussen investering en dagelijkse bruikbaarheid.';
    } else if (cap === 15) {
      rec = 'Zeer geschikt voor woningen met een hoge stroomvraag, een warmtepomp, elektrische auto of bij een actieve dynamic-trading strategie.';
    } else {
      rec = 'Uiterst krachtige opstelling met geïntegreerde Home Automation (Smart EMS) en actieve onbalanssturing (nul-op-de-meter). Maximale autonomie en optimaal rendement door actieve net-arbitrage.';
    }

    return {
      capacityKwh: cap,
      label: cap === 5 ? 'Kleine Thuisbatterij' : cap === 10 ? 'Middelgrote Thuisbatterij' : cap === 15 ? 'Grote Thuisbatterij' : 'Praktijk Thuisbatterij (Smart EMS)',
      brutoInvestment: bruto,
      btwRefund,
      netInvestment: net,
      efficiencyIncrease: optEffIncrease,
      selfConsumptionWithBattery: optSelfConsumption,
      annualSavingsVastPre2027: optVastSavingsPre2027,
      annualSavingsVastPost2027: optContractSavingsVast,
      annualSavingsDynamisch: optDynamischTotalSavings,
      tvtPre2027: tvtPre,
      tvtPost2027: tvtPost,
      tvtDynamisch: tvtDyn,
      bestSuited: isBest,
      recommendation: rec
    };
  });

  // --- MODULE 3.5: ELECTRIC VEHICLE & LAADPAAL ---
  const evKm = tech.evKilometers !== undefined && tech.evKilometers !== null ? tech.evKilometers : 15000;
  const evCons = (tech.evVerbruik !== undefined && tech.evVerbruik > 0) ? tech.evVerbruik : 18;
  const evHome = (tech.evThuisLaden !== undefined && tech.evThuisLaden > 0) 
    ? tech.evThuisLaden 
    : (evKm > 0 ? 75 : 0);
  const evAnnualDemandKwh = (evKm / 100) * evCons * (evHome / 100);

  // Hoeveel van deze stroom kan uit eigen zonnepanelen gedekt worden?
  // We schatten dit op maximaal 50% van het laadvolume of de beschikbare teruglevering (overtollige zonnestroom)
  // Bij een slim EMS systeem dat alleen op zonne-energie laadt is dit maximaal 100% (geen kunstmatig maximum van 50%)
  const evMaxSolarFraction = tech.slimEmsOnlySolar ? 1.00 : 0.50;
  const evSolarCoverageBaseKwh = annualYieldKwh > 0 ? Math.min(evAnnualDemandKwh * evMaxSolarFraction, gridFeedBaseKwh) : 0;
  const evSolarCoverageWithBatteryKwh = annualYieldKwh > 0 ? Math.min(evAnnualDemandKwh * evMaxSolarFraction, gridFeedWithBatteryKwh) : 0;

  const evGridImportBaseKwh = tech.slimEmsOnlySolar ? 0 : Math.max(0, evAnnualDemandKwh - evSolarCoverageBaseKwh);
  const evGridImportWithBatteryKwh = tech.slimEmsOnlySolar ? 0 : Math.max(0, evAnnualDemandKwh - evSolarCoverageWithBatteryKwh);

  const isBatteryActive = tech.capaciteitAccu > 0;
  const chosenEvSolarCoverageKwh = isBatteryActive ? evSolarCoverageWithBatteryKwh : evSolarCoverageBaseKwh;
  const chosenEvGridImportKwh = isBatteryActive ? evGridImportWithBatteryKwh : evGridImportBaseKwh;

  const evSolarChargingSavingsEuro = chosenEvSolarCoverageKwh * (0.50 - 0.05); // zonnestroom 'kost' ons de misgelopen terugleververgoeding
  const evGridChargingSavingsEuro = chosenEvGridImportKwh * (0.50 - updatedHouse.elektraPrijs); // netstroom laden bespaart het verschil tussen openbaar (€0,50) en thuisnet
  const evSavingsEuro = Math.round(evSolarChargingSavingsEuro + evGridChargingSavingsEuro);

  const actualHomeChargedKwh = chosenEvSolarCoverageKwh + chosenEvGridImportKwh;
  const ereRevenueEuro = Math.round(actualHomeChargedKwh * 0.12);
  const totalEvSavingsEuro = evSavingsEuro + ereRevenueEuro;

  let laadpaalInvestment = 1200;
  if (tech.customLaadpaalPrijs !== undefined && tech.customLaadpaalPrijs > 0) {
    laadpaalInvestment = tech.customLaadpaalPrijs;
  }
  const laadpaalTvt = totalEvSavingsEuro > 0 ? laadpaalInvestment / totalEvSavingsEuro : 99;

  const laadpaalResult = {
    evAnnualDemandKwh: Math.round(evAnnualDemandKwh),
    evSolarCoverageKwh: Math.round(chosenEvSolarCoverageKwh),
    evGridImportKwh: Math.round(chosenEvGridImportKwh),
    evSavingsEuro,
    ereRevenueEuro,
    totalSavingsEuro: totalEvSavingsEuro,
    netInvestmentEuro: laadpaalInvestment,
    tvt: laadpaalTvt
  };

  const solar: SolarPrognose = {
    annualYieldKwh,
    orientationFactor,
    selfConsumptionBase,
    selfConsumptionWithBattery,
    absoluteSelfConsumptionBaseKwh,
    absoluteSelfConsumptionWithBatteryKwh,
    // De auto verbruikt zonnestroom, waardoor deze niet meer teruggeleverd kan worden aan het net!
    gridFeedBaseKwh: Math.max(0, gridFeedBaseKwh - evSolarCoverageBaseKwh),
    gridFeedWithBatteryKwh: Math.max(0, gridFeedWithBatteryKwh - evSolarCoverageWithBatteryKwh),
    disclaimer: 'Dit is een prognose. De werkelijke opbrengst hangt af van lokale beschaduwing, vervuiling en omvormerverliezen.',
  };

  const battery: BatteryImpact = {
    efficiencyIncrease,
    costSavingsPre2027,
    costSavingsPost2027,
    contractSavingsVast,
    contractSavingsDynamisch,
    options: batteryOptions,
  };

  // --- MODULE 4: WARMTEPOMP CHECK ---
  const totalGasSaved = measures.reduce((sum, m) => sum + m.savingM3, 0);
  const remainingGasM3 = Math.max(0, verbruikM3 - totalGasSaved);

  // New smart thermal envelope heuristic based on house type, size (woonoppervlakte), and gas consumption
  const opp = (updatedHouse.woonoppervlakte && updatedHouse.woonoppervlakte > 0) ? updatedHouse.woonoppervlakte : 120;
  const soort = (updatedHouse.soortWoning || 'Tussenwoning').toLowerCase();
  
  // Benchmark standard gas consumption per m2 (moderately/uninsulated baseline)
  let benchmarkIntensity = 12.0; // default (m3 per m2 per year)
  let targetIntensity = 9.0;     // target intensity for heat-pump readiness
  
  if (soort.includes('vrijstaand')) {
    benchmarkIntensity = 15.0;
    targetIntensity = 11.0;
  } else if (soort.includes('twee-onder-een-kap') || soort.includes('2-onder-1-kap') || soort.includes('twee onder') || soort.includes('helft van')) {
    benchmarkIntensity = 12.5;
    targetIntensity = 9.5;
  } else if (soort.includes('hoekwoning')) {
    benchmarkIntensity = 12.0;
    targetIntensity = 9.0;
  } else if (soort.includes('tussenwoning')) {
    benchmarkIntensity = 10.0;
    targetIntensity = 7.5;
  } else if (soort.includes('appartement')) {
    benchmarkIntensity = 9.0;
    targetIntensity = 6.5;
  }

  const benchmarkGas = Math.round(opp * benchmarkIntensity);
  const targetGas = Math.round(opp * targetIntensity);
  
  const isLabelSufficient = ['A', 'B', 'C'].some(lbl => 
    (updatedHouse.energielabel || '').toUpperCase().includes(lbl)
  );
  
  // Sufficiently insulated is defined as either label A, B, C, OR remaining gas <= targetGas, OR remaining gas is low overall (< 800m3)
  const isInsulatedSufficiently = isLabelSufficient || remainingGasM3 <= targetGas || remainingGasM3 < 800;

  let isRecommended = false;
  let estimatedInvestment = 0;
  let estimatedSavingsEuro = 0;
  let explanation = '';

  // Detailed Heat Pump Options
  // Dynamische warmtepomp model parameters op basis van selectie
  let hybridBruto = 7200;
  let hybridSubsidy = 2400;
  let hybridCOPFactor = 2.2; // kWh per m3 gas saved

  let aeBruto = 10800;
  let aeSubsidy = 2700;
  let aeCOPFactor = 2.2; // kWh per m3 gas saved

  const selectedModel = tech.selectedWarmtepompModel || 'Standard';

  if (selectedModel === 'Middelgroot 8kW') {
    hybridBruto = 7900;
    hybridSubsidy = 2700;
    hybridCOPFactor = 2.0; // very efficient propane monobloc

    aeBruto = 12800;
    aeSubsidy = 3075;
    aeCOPFactor = 2.15;
  } else if (selectedModel === 'Groot 12kW') {
    hybridBruto = 9500;
    hybridSubsidy = 3075;
    hybridCOPFactor = 2.4; // high temp radiators

    aeBruto = 16200;
    aeSubsidy = 3750;
    aeCOPFactor = 2.60;
  } else if (selectedModel === 'LuchtLucht') {
    hybridBruto = 3800;
    hybridSubsidy = 0; // Geen ISDE subsidie voor lucht-lucht warmtepomp / airco
    hybridCOPFactor = 1.9; // Zeer efficiënt gerichte verwarming (SCOP ~4.3)

    aeBruto = 13500;
    aeSubsidy = 3300;
    aeCOPFactor = 2.4;
  }

  // Override bruto prices with custom price from quote if supplied
  const selectedType = tech.selectedWarmtepompType || 'Hybride';
  if (tech.customWarmtepompPrijs !== undefined && tech.customWarmtepompPrijs > 0) {
    if (selectedType === 'All-Electric') {
      aeBruto = tech.customWarmtepompPrijs;
    } else {
      hybridBruto = tech.customWarmtepompPrijs;
    }
  }

  // 1. Hybride option (or Lucht-lucht Airco)
  const hybridNet = hybridBruto - hybridSubsidy;
  const hybridGasSaved = remainingGasM3 * (selectedModel === 'LuchtLucht' ? 0.55 : 0.75);
  const hybridGasSavingEuro = hybridGasSaved * gasPrijs;
  
  // Use user overridden annual heat pump electricity consumption if active and this is a Hybrid
  const hybridElecUsed = (tech.userAnnualWp !== undefined && tech.userAnnualWp !== null && Number(tech.userAnnualWp) > 0 && selectedType !== 'All-Electric')
    ? Number(tech.userAnnualWp)
    : hybridGasSaved * hybridCOPFactor;
  
  // If they have excess solar generation (gridFeedBaseKwh), they can offset some or all of the heat pump electricity!
  // The cost of that offset solar electricity is the missed feed-in return tariff (opportunity cost), 
  // while the remaining electricity is bought from the grid at standard price.
  // NOTE: We subtract the solar energy already consumed by the EV (evSolarCoverageBaseKwh) because you can't use the same solar energy twice!
  const returnTariff = 0.05; // fixed feed-in return rate (€/kWh)
  const gridFeedAvailableForHybridWp = Math.max(0, gridFeedBaseKwh - evSolarCoverageBaseKwh);
  const hybridSolarCoverage = Math.min(hybridElecUsed, gridFeedAvailableForHybridWp);
  const hybridGridImport = Math.max(0, hybridElecUsed - hybridSolarCoverage);
  const hybridElecCostEuro = (hybridSolarCoverage * returnTariff) + (hybridGridImport * updatedHouse.elektraPrijs);

  const hybridNetSavings = Math.max(0, hybridGasSavingEuro - hybridElecCostEuro);
  const hybridTvt = hybridNetSavings > 0 ? hybridNet / hybridNetSavings : 99;
  const hybridFeasible = selectedModel === 'LuchtLucht' ? true : isInsulatedSufficiently;
  const hybridFeasibilityReason = selectedModel === 'LuchtLucht'
    ? `Uitstekend geschikt! Een lucht-lucht warmtepomp (airco) verwarmt direct via lucht-blaasunits. Hierdoor is dit systeem ook bij een matig of slecht geïsoleerde woning direct uiterst effectief en rendabel, zonder dat er vloerverwarming of nieuwe radiatoren nodig zijn.`
    : (isInsulatedSufficiently 
        ? `Je woning is voldoende geïsoleerd voor een hybride warmtepomp. Je resterende gasverbruik (${Math.round(remainingGasM3)} m³) ligt onder de streefwaarde van ${targetGas} m³ voor een ${updatedHouse.soortWoning || 'woning'} van ${opp} m².`
        : `Niet aanbevolen: De isolatie is nog onvoldoende. Voor een ${updatedHouse.soortWoning || 'woning'} van ${opp} m² is de streefwaarde maximaal ${targetGas} m³ gas per jaar (momenteel ${Math.round(remainingGasM3)} m³). Verbeter eerst de thermische schil door te isoleren.`);

  // 2. All-Electric option
  const aeNet = aeBruto - aeSubsidy;
  const aeGasSaved = remainingGasM3;
  const aeGasSavingEuro = aeGasSaved * gasPrijs;

  // Use user overridden annual heat pump electricity consumption if active and this is All-Electric
  const aeElecUsed = (tech.userAnnualWp !== undefined && tech.userAnnualWp !== null && Number(tech.userAnnualWp) > 0 && selectedType === 'All-Electric')
    ? Number(tech.userAnnualWp)
    : aeGasSaved * aeCOPFactor;
  
  const gridFeedAvailableForAeWp = Math.max(0, gridFeedBaseKwh - evSolarCoverageBaseKwh);
  const aeSolarCoverage = Math.min(aeElecUsed, gridFeedAvailableForAeWp);
  const aeGridImport = Math.max(0, aeElecUsed - aeSolarCoverage);
  const aeElecCostEuro = (aeSolarCoverage * returnTariff) + (aeGridImport * updatedHouse.elektraPrijs);

  const aeFixedGasSaving = remainingGasM3 > 0 ? 280 : 0; // Complete removal of gas connection saves ~€280/year in vastrecht
  const aeNetSavings = Math.max(0, aeGasSavingEuro + aeFixedGasSaving - aeElecCostEuro);
  const aeTvt = aeNetSavings > 0 ? aeNet / aeNetSavings : 99;
  
  // All-electric is feasible if highly insulated or remaining gas is quite low
  const aeFeasible = isInsulatedSufficiently && (isLabelSufficient || remainingGasM3 < targetGas * 0.8 || remainingGasM3 < 1000);
  const aeFeasibilityReason = aeFeasible
    ? `Zeer geschikt! Je resterende gasverbruik (${Math.round(remainingGasM3)} m³) ligt ruim onder de All-Electric grens. Gasloos wonen is technisch en financieel uitstekend haalbaar!`
    : `Beperkt geschikt: All-Electric vereist een uiterst lage warmtevraag. Met een resterend verbruik van ${Math.round(remainingGasM3)} m³ is een hybride warmtepomp nu een verstandigere stap, tenzij je extra isolatiemaatregelen doorvoert.`;

  const options: HeatpumpOption[] = [
    {
      type: selectedModel === 'LuchtLucht' ? 'Lucht-lucht (Airco)' : 'Hybride',
      brutoInvestment: hybridBruto,
      subsidy: hybridSubsidy,
      netInvestment: hybridNet,
      gasSavingsM3: hybridGasSaved,
      gasSavingsEuro: hybridGasSavingEuro,
      elecIncreaseKwh: hybridElecUsed,
      elecCostEuro: hybridElecCostEuro,
      solarCoverageKwh: hybridSolarCoverage,
      gridImportKwh: hybridGridImport,
      fixedGasSavingsEuro: 0,
      netSavingsEuro: hybridNetSavings,
      tvt: hybridTvt,
      isFeasible: hybridFeasible,
      feasibilityReason: hybridFeasibilityReason
    },
    {
      type: 'All-Electric',
      brutoInvestment: aeBruto,
      subsidy: aeSubsidy,
      netInvestment: aeNet,
      gasSavingsM3: aeGasSaved,
      gasSavingsEuro: aeGasSavingEuro,
      elecIncreaseKwh: aeElecUsed,
      elecCostEuro: aeElecCostEuro,
      solarCoverageKwh: aeSolarCoverage,
      gridImportKwh: aeGridImport,
      fixedGasSavingsEuro: aeFixedGasSaving,
      netSavingsEuro: aeNetSavings,
      tvt: aeTvt,
      isFeasible: aeFeasible,
      feasibilityReason: aeFeasibilityReason
    }
  ];

  const wpChosenNet = selectedType === 'All-Electric' ? aeNet : hybridNet;
  const wpChosenSavings = selectedType === 'All-Electric' ? aeNetSavings : hybridNetSavings;

  if (!isInsulatedSufficiently) {
    if (selectedModel === 'LuchtLucht') {
      isRecommended = true;
      estimatedInvestment = wpChosenNet;
      estimatedSavingsEuro = wpChosenSavings;
      explanation = `Positief advies: Een lucht-lucht warmtepomp (airco) is uitstekend geschikt voor jouw woning! Omdat deze verwarmt via lucht-blaasunits, is een hoge mate van isolatie of vloerverwarming niet dwingend vereist om direct fors op gas te besparen. Met deze optie kun je de belangrijkste leefruimtes snel en efficiënt verwarmen. De bestaande CV-ketel blijft behouden voor warm tapwater en eventuele bijverwarming.`;
    } else {
      explanation = `Isolatie nog onvoldoende: Een warmtepomp is momenteel niet direct rendabel of technisch aanbevolen. Het gemiddelde gasverbruik voor een ${updatedHouse.soortWoning || 'woning'} van ${opp} m² is circa ${benchmarkGas} m³ per jaar. Om klaar te zijn voor een warmtepomp adviseren we om het resterende gasverbruik door isolatie te verlagen tot onder de streefwaarde van ${targetGas} m³ (resterend gasverbruik is momenteel ${Math.round(remainingGasM3)} m³). We raden dringend aan eerst de aanbevolen isolatiemaatregelen (zoals spouw- of vloerisolatie en HR++ glas) uit te voeren.`;
    }
  } else {
    isRecommended = remainingGasM3 > 500;
    estimatedInvestment = wpChosenNet;
    estimatedSavingsEuro = wpChosenSavings;
    
    if (isRecommended) {
      if (selectedModel === 'LuchtLucht') {
        explanation = `Positief advies: Een lucht-lucht warmtepomp (airco) is een slimme en snelle manier om op gas te besparen. Je woning is goed geïsoleerd, wat het rendement nog verder verhoogt. Je kunt hiermee heel gericht de woonkamer en/of andere verblijfsruimten verwarmen, terwijl de CV-ketel alleen nog voor tapwater en koude badkamers zorgt.`;
      } else if (aeFeasible && aeTvt < hybridTvt + 3) {
        explanation = `Positief advies: Je woning is uitstekend geïsoleerd met een laag resterend gasverbruik van ${Math.round(remainingGasM3)} m³ (ruim onder de streefwaarde van ${targetGas} m³ voor een ${updatedHouse.soortWoning || 'woning'} van ${opp} m²). Een volledig elektrische warmtepomp (All-Electric) is hier zeer interessant! Hiermee ga je volledig gasloos en bespaar je tevens de vaste gaskosten. Een hybride warmtepomp is ook een veilige en rendabele optie.`;
      } else {
        explanation = `Positief advies: Je woning is goed geïsoleerd. Je resterende gasverbruik van ${Math.round(remainingGasM3)} m³ ligt netjes onder de streefwaarde van ${targetGas} m³ voor een ${updatedHouse.soortWoning || 'woning'} van ${opp} m². Een hybride warmtepomp is hier de meest financieel rendabele optie en zal je gasverbruik met circa 75% verminderen!`;
      }
    } else {
      if (selectedModel === 'LuchtLucht') {
        explanation = `Technisch mogelijk, maar beperkt rendabel: Je resterende gasverbruik is door isolatie al extreem laag (${Math.round(remainingGasM3)} m³). Een lucht-lucht warmtepomp (airco) kan handig zijn voor extra comfort of gerichte koeling in de zomer, maar de extra gasbesparing zal klein zijn.`;
      } else {
        explanation = `Technisch mogelijk, maar beperkt rendabel: Je resterende gasverbruik is door isolatie al extreem laag (${Math.round(remainingGasM3)} m³). Een warmtepomp heeft hierdoor een langere terugverdientijd. Volledig elektrisch gaan is wellicht een betere stap om de gaskraan definitief te sluiten.`;
      }
    }
  }

  const heatpump: HeatpumpCheck = {
    isInsulatedSufficiently,
    remainingGasM3,
    isRecommended,
    estimatedInvestment,
    estimatedSavingsEuro,
    explanation,
    options,
  };

  return {
    resident,
    house: updatedHouse,
    insulation,
    tech,
    eligibleNip,
    nipExplanation,
    measures,
    optimalMeasures,
    addedMeasureForOptimization,
    totals,
    totalsOptimal,
    solar,
    battery,
    heatpump,
    laadpaal: laadpaalResult,
    opmerkingenOffertes: '',
    opmerkingen: '',
  };
}

function DeNormalizeOpp(val: any): number {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

// Highly accurate, calibrated monthly battery simulation data points
export function getBatterySimulationData(
  annualSolar: number,
  annualDemand: number,
  capacity: number,
  omzettingsverliezen: number,
  selfConsumptionBase: number,
  absoluteSelfConsumptionBaseKwh: number,
  dynamicProvider?: string,
  batteryGridTrading?: boolean
) {
  const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  const solarDistribution = [1.2, 4.6, 8.0, 12.0, 14.5, 16.0, 15.5, 12.5, 9.0, 4.5, 1.1, 1.1];
  const demandDistribution = [11.5, 10.0, 9.0, 8.0, 7.0, 6.5, 6.5, 7.0, 7.5, 8.5, 9.0, 9.5];

  // We map months and adjust them for the Smart EMS and dynamic home automation (calibrated with 30 kWh practice data)
  const rawMonthsData = months.map((month, idx) => {
    let solarM = (annualSolar * solarDistribution[idx]) / 100;
    let demandM = (annualDemand * demandDistribution[idx]) / 100;

    if (capacity === 30) {
      if (month === 'Apr') {
        demandM = (annualDemand / 2400) * 156;
        solarM = demandM + (annualSolar / 7000) * 840;
      } else if (month === 'Mei') {
        demandM = (annualDemand / 2400) * 191;
        solarM = demandM + (annualSolar / 7000) * 872;
      } else if (month === 'Jun') {
        demandM = (annualDemand / 2400) * 104;
        solarM = demandM + (annualSolar / 7000) * 891;
      }
    }

    const days = 30.4;
    const solarD = solarM / days;
    const demandD = demandM / days;

    const ratio = solarD / (demandD + 0.1);
    const selfUseFractionBase = Math.min(0.90, 1 - Math.exp(-0.35 * (ratio + 0.1)));
    const directBaseD = solarD * selfUseFractionBase;

    const excessD = Math.max(0, solarD - directBaseD);
    const nightDemandD = demandD - directBaseD;
    const storedD = Math.min(capacity * 0.85, excessD, nightDemandD);

    return {
      month,
      solarM,
      demandM,
      directBaseM: directBaseD * days,
      directWithBatteryM: (directBaseD + storedD) * days,
      storedM: storedD * days
    };
  });

  // Scale monthly base values to match total annual base direct consumption
  const sumDirectBaseM = rawMonthsData.reduce((acc, d) => acc + d.directBaseM, 0);
  const targetDirectBaseY = absoluteSelfConsumptionBaseKwh || 0;
  const baseScale = sumDirectBaseM > 0 ? targetDirectBaseY / sumDirectBaseM : 1;

  // Estimate addition for this specific chosen capacity
  const avgDailyProductionKwh = annualSolar / 365;
  let efficiencyIncrease = 0;
  if (capacity > 0 && annualSolar > 0) {
    const r = capacity / avgDailyProductionKwh;
    const rawIncrease = 40 * (1 - Math.exp(-0.7 * r));
    efficiencyIncrease = rawIncrease * (1 - (omzettingsverliezen || 20) / 100);
  }
  const targetSelfConsumptionWithBattery = Math.min(100, (selfConsumptionBase || 30) + efficiencyIncrease);
  const targetDirectWithBatteryY = (annualSolar * targetSelfConsumptionWithBattery) / 100;
  const targetBatteryAdditionY = Math.max(0, targetDirectWithBatteryY - targetDirectBaseY);

  const sumBatteryAdditionM = rawMonthsData.reduce((acc, d) => acc + (d.directWithBatteryM - d.directBaseM), 0);
  const additionScale = sumBatteryAdditionM > 0 ? targetBatteryAdditionY / sumBatteryAdditionM : 1;

  // Provider rate per kWh capacity for dynamic contract trading yield
  const provider = dynamicProvider || 'Zonneplan';
  let ratePerKwh = 24.75;
  if (provider === 'Zonneplan') ratePerKwh = 38.25;
  else if (provider === 'Frank') ratePerKwh = 31.50;
  else if (provider === 'Tibber') ratePerKwh = 29.25;
  else if (provider === 'Anwb') ratePerKwh = 27.00;

  const annualArbitrage = (batteryGridTrading !== false && capacity > 0) ? capacity * ratePerKwh : 0;

  // Calculate volumes first to compute total annual arbitrage volume
  const monthlyVolumes = rawMonthsData.map(d => {
    const isWinter = ['Jan', 'Feb', 'Nov', 'Dec'].includes(d.month);
    return isWinter 
      ? Math.min(capacity * 18.2, d.demandM * 0.65) 
      : Math.min(capacity * 5, d.demandM * 0.15);
  });

  return rawMonthsData.map((d, idx) => {
    const finalDirectBase = Math.min(d.solarM, d.demandM, d.directBaseM * baseScale);

    let finalDirectWithBattery = 0;
    let finalAddition = 0;

    if (capacity === 30) {
      if (['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(d.month)) {
        finalDirectWithBattery = d.demandM;
      } else {
        finalDirectWithBattery = Math.max(finalDirectBase, Math.min(d.solarM * 0.96, d.demandM * 0.90));
      }
      finalAddition = finalDirectWithBattery - finalDirectBase;
    } else if (capacity > 0) {
      const smartScalingFactor = Math.min(1.0, capacity / 30);
      const rawAddition = d.directWithBatteryM - d.directBaseM;
      const baseDirectWithBattery = finalDirectBase + Math.min(
        Math.max(0, d.solarM - finalDirectBase), 
        Math.max(0, d.demandM - finalDirectBase), 
        rawAddition * additionScale
      );
      
      const emsDirectWithBattery = ['Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep'].includes(d.month)
        ? Math.max(baseDirectWithBattery, d.demandM * smartScalingFactor)
        : Math.max(baseDirectWithBattery, Math.min(d.solarM * 0.96, d.demandM * 0.90) * smartScalingFactor);

      finalDirectWithBattery = Math.min(d.solarM, d.demandM, emsDirectWithBattery);
      finalAddition = finalDirectWithBattery - finalDirectBase;
    } else {
      finalDirectWithBattery = finalDirectBase;
      finalAddition = 0;
    }

    const netGridFeedWithBattery = Math.max(0, d.solarM - finalDirectWithBattery);
    const netGridFeedWithoutBattery = Math.max(0, d.solarM - finalDirectBase);

    const arbitrageVolume = monthlyVolumes[idx];

    // Seasonal breakdown strictly matching annualArbitrage (capacity * ratePerKwh)
    const isWinter = ['Jan', 'Feb', 'Nov', 'Dec'].includes(d.month);
    const isSpringAutumn = ['Mrt', 'Apr', 'Sep', 'Okt'].includes(d.month);

    let pureArbitrageEuro = 0;
    let eigenZonEvEuro = 0;

    if (capacity > 0) {
      if (isWinter) {
        pureArbitrageEuro = Math.round((105.75 / 1071) * annualArbitrage);
        eigenZonEvEuro = Math.round(finalAddition * 0.22);
      } else if (isSpringAutumn) {
        pureArbitrageEuro = Math.round((85.50 / 1071) * annualArbitrage);
        eigenZonEvEuro = Math.round(finalAddition * 0.22);
      } else {
        // Summer (Mei, Jun, Jul, Aug)
        pureArbitrageEuro = Math.round((76.50 / 1071) * annualArbitrage);
        eigenZonEvEuro = Math.round(finalAddition * 0.22);
      }
    }

    const totalMaandEuro = pureArbitrageEuro + eigenZonEvEuro;

    return {
      name: d.month,
      'Zonnestroom opwek (kWh)': Math.round(d.solarM),
      'Stroomverbruik (kWh)': Math.round(d.demandM),
      'Direct verbruik (zonder accu) (kWh)': Math.round(finalDirectBase),
      'Extra verbruik via accu (kWh)': Math.round(finalAddition),
      'Totaal direct verbruik (met accu) (kWh)': Math.round(finalDirectWithBattery),
      'Teruglevering naar net (met accu) (kWh)': Math.round(netGridFeedWithBattery),
      'Teruglevering naar net (zonder accu) (kWh)': Math.round(netGridFeedWithoutBattery),
      'Arbitrage stroomverschuiving (kWh)': Math.round(arbitrageVolume),
      'Pure Arbitrage Handel (€)': pureArbitrageEuro,
      'Eigen Zon & Slim Laden (€)': eigenZonEvEuro,
      'Totaal Maandvoordeel (€)': totalMaandEuro,
      'Arbitrage opbrengst (€)': pureArbitrageEuro // Backwards compatible alias
    };
  });
}
