import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialize Gemini client on the server side
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in the Settings menu.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Helper function to generate content with exponential backoff and model fallbacks
async function generateContentWithRetry(contents: any, initialModel = 'gemini-3.5-flash') {
  const modelsToTry = [
    { name: initialModel, delay: 0 },
    { name: 'gemini-3.1-flash-lite', delay: 1000 },
    { name: 'gemini-flash-latest', delay: 2000 },
    { name: 'gemini-3.1-flash-lite', delay: 3000 }
  ];

  let lastError: any = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const item = modelsToTry[i];
    if (item.delay > 0) {
      console.log(`[Gemini API] Waiting ${item.delay}ms before attempt ${i + 1} with model ${item.name}...`);
      await new Promise(resolve => setTimeout(resolve, item.delay));
    }
    try {
      console.log(`[Gemini API] Attempt ${i + 1}/${modelsToTry.length} using model: ${item.name}`);
      const aiInstance = getAiClient();
      const response = await aiInstance.models.generateContent({
        model: item.name,
        contents: contents,
      });
      if (response && response.text) {
        console.log(`[Gemini API] Success using model: ${item.name}`);
        return response;
      }
    } catch (err: any) {
      console.error(`[Gemini API] Attempt ${i + 1} failed (${item.name}):`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("Mislukt om advies te genereren na meerdere pogingen.");
}

// API route first
app.post('/api/generate-advice', async (req, res) => {
  try {
    const { calculation } = req.body;

    if (!calculation) {
      return res.status(400).json({ error: 'Geen berekeningsgegevens geleverd.' });
    }

    const {
      resident = {},
      house = {},
      eligibleNip = false,
      nipExplanation = '',
      measures = [],
      optimalMeasures = [],
      addedMeasureForOptimization = null,
      totals = {},
      totalsOptimal = {},
      solar = {},
      battery = {},
      heatpump = {},
      opmerkingenOffertes = '',
      opmerkingen = ''
    } = calculation || {};

    const safeNum = (val: any, fallback: any = 0) => (typeof val === 'number' && !isNaN(val)) ? val : fallback;
    const safeStr = (val: any, fallback = '') => typeof val === 'string' ? val : fallback;

    // Build the prompt for Gemini
    const systemPrompt = `
Je bent een energiecoach (NTA 8800 methodiek) gespecialiseerd in bestaande woningen in Nederland (met een focus op de regio Limburg). Je bent werkzaam bij de 'Energieplanner Peel en Maas'.
Je geeft een uiterst vakkundig, onafhankelijk en deskundig adviesrapport in helder, begrijpelijk Nederlands om de bewoner te helpen maximale energie- en gasbesparing te realiseren met een minimale eigen bijdrage.
Je past strikt de ISSO-publicaties toe, rekent volgens Nederlandse praktijkregels en adviseert conform nationale kwaliteitsplatforms zoals Verbeterjehuis.nl, de Rijksdienst voor Ondernemend Nederland (RVO), het Nationaal Isolatieprogramma (NIP) en de ISDE-subsidieregeling.

🔑 FUNDAMENTELE ADVIESREGELS:
1. De Trias Energetica is leidend: focus ALTIJD eerst op de thermische schil (isolatie + ventilatie) om de tocht en kouval te elimineren en de warmtevraag drastisch te verminderen.
2. Maak daarna pas lage temperatuur verwarming haalbaar door het afgiftesysteem te optimaliseren (waterzijdig inregelen, hydraulische balans, aanvoertemperatuur verlagen).
3. Bepaal daarna pas de warmteopwekker (warmtepomp). Geef NOOIT direct een warmtepompadvies of specifieke modelaanbeveling zonder een gedegen warmteverlies-inschatting op basis van het resterende gasverbruik na isolatie!
4. Optimaliseer ten slotte de elektrificatie (zonnepanelen, thuisbatterij, laadpaal) en de financiële haalbaarheid (ISDE en NIP-subsidies).
5. Gebruik uitsluitend realistische Nederlandse aannames.
6. STRIKTE TAALEIS: Gebruik GEEN Engelse termen in de hoofdstukken, titels of de tekst! Vertaal termen zoals "Quick scan", "No-regret", "Netcheck", "Realiteitscheck", "Dimensioning", "2027+ scenario", "Financial model", "Strategic scenarios", "Expert explanation", "Advice report" volledig naar professioneel Nederlands (zie de 9-fase structuur hieronder).

Hier zijn de EXACTE berekende en ingevoerde gegevens voor deze bewoner/berekening die je verplicht moet gebruiken:
- Berekeningstype: ${safeStr(resident.coach, 'Online Zelfscan')}
- Datum van berekening: ${safeStr(resident.datum, 'Onbekend')}
- Bewoner: ${safeStr(resident.aanhef, '')} ${safeStr(resident.voorletters, '')} ${safeStr(resident.achternaam, 'Onbekend')}
- Adres: ${safeStr(resident.straat, '')} ${safeStr(resident.huisnummer, '')} ${safeStr(resident.toevoeging, '')}, ${safeStr(resident.postcode, '')} ${safeStr(resident.plaats, '')}
- Registratiecode: ${safeStr(resident.registratiecode, 'Onbekend')}
- Telefoon: ${safeStr(resident.telefoon, 'Onbekend')}
- E-mailadres: ${safeStr(resident.email, 'Onbekend')}
- Bruto gezinsjaarinkomen: €${safeNum(resident.brutoGezinsinkomen, 0).toLocaleString('nl-NL')} (Inkomensverklaring gecontroleerd: ${(safeNum(resident.brutoGezinsinkomen, 0) < 60000 || house.inkomenCheck) ? 'Ja' : 'Nee'})

Woning details & kenmerken (STRIKT OVERNEMEN):
- Soort woning: ${safeStr(house.soortWoning, 'Onbekend')}
- Bouwjaar: ${safeNum(house.bouwjaar, 'Onbekend')}
- Woonoppervlakte: ${safeNum(house.woonoppervlakte, 0)} m²
- Aantal personen in huishouden: ${safeNum(resident.aantalPersonen, 1)}
- WOZ-waarde: €${safeNum(house.wozWaarde, 0).toLocaleString('nl-NL')}
- Energielabel: ${safeStr(house.energielabel, 'Geen')}

Huidige Installaties:
- Verwarming: ${safeStr(house.verwarming, 'Onbekend')}
- Afgiftesysteem: ${safeStr(house.afgiftesysteem, 'Onbekend')}
- Tapwater: ${safeStr(house.tapwater, 'Onbekend')}
- Koken: ${safeStr(house.koken, 'Onbekend')}
- Ventilatie: ${safeStr(house.ventilatie, 'Onbekend')}
- Reeds Zonnepanelen: ${safeStr(house.zonnepanelenPresent, 'Nee')}

Huidige Isolatie Status:
- Dak: ${house.isoDak === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Gevel: ${house.isoGevel === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Glas (begane grond): ${house.isoGlasBg === 'slecht' ? 'Slecht (Enkel/Dubbel)' : house.isoGlasBg === 'matig' ? 'Matig (HR)' : 'Goed (HR++/Triple)'}
- Glas (verdieping): ${house.isoGlasVd === 'slecht' ? 'Slecht (Enkel/Dubbel)' : house.isoGlasVd === 'matig' ? 'Matig (HR)' : 'Goed (HR++/Triple)'}
- Vloer / Bodem: ${house.isoVloer === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Naden en kieren: ${safeStr(house.isoKieren, 'Onbekend')}

Huidig Energieverbruik & Kosten:
- Jaarlijks gasverbruik (G_tot): ${safeNum(house.verbruikM3, 0)} m³ (Gasprijs: €${safeNum(house.gasPrijs, 1.30).toFixed(2)} / m³)
- Jaarlijks elektraverbruik: ${safeNum(house.verbruikKwh, 0)} kWh (Elektraprijs: €${safeNum(house.elektraPrijs, 0.30).toFixed(2)} / kWh)
- Jaarlijke teruglevering elektra: ${safeNum(house.elektraTeruglevering, 0)} kWh
- Berekend stookgedrag: ${safeStr(house.stookgedragBerekend, 'Normaal (1.0x)')} (Factor: ${safeNum(house.stookgedragFactor, 1.0)}x)
- Handmatige correctie / override: ${house.stookgedragOverride === 'auto' ? 'Geen (automatisch berekend)' : safeStr(house.stookgedragOverride, '')}

Isolatiemaatregelen (Basis scenario op basis van ingemeten m²):
${measures.map((m: any) => `- ${m.name}: ${m.area} m² | Bruto: €${m.brutoCosts} | ISDE: €${m.isdeSubsidy} | NIP: €${m.nipSubsidy} | Netto: €${m.netCosts} | Besparing: ${safeNum(m.savingM3, 0).toFixed(1)} m³ / €${safeNum(m.savingEuro, 0).toFixed(2)} | TVT: ${safeNum(m.tvt, 0).toFixed(1)} jr`).join('\n')}

NIP Subsidie status: ${eligibleNip ? 'In aanmerking (€2.900)' : 'Niet in aanmerking. ' + safeStr(nipExplanation, '')}

Beste Scenario (Optimale combinatie van maatregelen):
${addedMeasureForOptimization ? `Er is een extra maatregel voorgesteld voor optimalisatie: ${addedMeasureForOptimization}` : 'Geen extra maatregel voorgesteld.'}
Optimalisatie Maatregelen:
${optimalMeasures.map((m: any) => `- ${m.name}: ${m.area} m² | Bruto: €${m.brutoCosts} | ISDE: €${m.isdeSubsidy} | NIP: €${m.nipSubsidy} | Netto: €${m.netCosts} | Besparing: ${safeNum(m.savingM3, 0).toFixed(1)} m³ / €${safeNum(m.savingEuro, 0).toFixed(2)} | TVT: ${safeNum(m.tvt, 0).toFixed(1)} jr`).join('\n')}

Zonnepanelen Prognose:
- Aantal panelen in simulatie: ${safeNum(calculation.tech?.aantalZonnepanelen, 0)}
- Oriëntatie: ${safeNum(calculation.tech?.dakOrientatie, 0)} graden t.o.v. het Zuiden (Factor: ${safeNum(solar.orientationFactor, 1.0).toFixed(2)})
- Hellingshoek (Tilt): ${safeNum(calculation.tech?.dakHellingshoek, 35)} graden
- Jaarlijkse extra opbrengst: ${safeNum(solar.annualYieldKwh, 0).toFixed(0)} kWh
- Direct eigen verbruik percentage (Berekend op basis van bewonersprofiel): ${safeNum(solar.selfConsumptionBase, 0)}% (${safeNum(solar.absoluteSelfConsumptionBaseKwh, 0).toFixed(0)} kWh)
- Met Thuisbatterij (${safeNum(calculation.tech?.capaciteitAccu, 0)} kWh): ${safeNum(solar.selfConsumptionWithBattery, 0).toFixed(0)}% (${safeNum(solar.absoluteSelfConsumptionWithBatteryKwh, 0).toFixed(0)} kWh)

Thuisbatterij & Saldering Post-2027:
- Contracttype: ${safeStr(calculation.tech?.typeContract, 'Vast')}
- Stijging direct verbruik met accu: +${safeNum(battery.efficiencyIncrease, 0).toFixed(1)}%
- Post-2027 Jaarlijkse financiële besparing met batterij: €${safeNum(battery.costSavingsPost2027, 0).toFixed(2)}
- Vast contract besparing: €${safeNum(battery.contractSavingsVast, 0).toFixed(2)}
- Dynamisch contract besparing: €${safeNum(battery.contractSavingsDynamisch, 0).toFixed(2)}

Laadpaal & Elektrisch Rijden Prognose (indien van toepassing):
- Jaarkilometrage EV: ${safeNum(calculation.tech?.evKilometers, 15000)} km
- Verbruik EV: ${safeNum(calculation.tech?.evVerbruik, 18)} kWh/100km
- Aandeel thuis geladen: ${safeNum(calculation.tech?.evThuisLaden, 70)}%
- Elektraprijs thuis: €${safeNum(house.elektraPrijs, 0.30).toFixed(2)} / kWh

Warmtepomp Adviesgegevens:
- Geselecteerd warmtepomp-capaciteitsmodel: ${safeStr(calculation.tech?.selectedWarmtepompModel, 'Standard')} (Standard = Hybride 5 kW, WeHeat 8kW = Hybride 8 kW, Panasonic 12kW = All-Electric 10-12 kW, LuchtLucht = Lucht-lucht Airco)
- Voldoende geïsoleerd (NTA 8800): ${heatpump.isInsulatedSufficiently ? 'Ja' : 'Nee'}
- Resterend gasverbruik na isolatie: ${safeNum(heatpump.remainingGasM3, 0).toFixed(0)} m³
- Warmtepomp aanbevolen: ${heatpump.isRecommended ? 'Ja' : 'Nee'}
- Investering (netto na subsidie): €${safeNum(heatpump.estimatedInvestment, 0)}
- Verwachte jaarlijkse extra besparing door warmtepomp: €${safeNum(heatpump.estimatedSavingsEuro, 0).toFixed(2)}
- Advies verklaring: ${safeStr(heatpump.explanation, '')}

Opmerkingen & Notities:
- Opmerkingen voor de isolatiebedrijven: ${opmerkingenOffertes || 'Geen'}
- Algemene bijzonderheden: ${opmerkingen || 'Geen'}

9-FASE RAPPORTAGE STRUCTUUR (STRIKT EN DWINGEND VOLGEN):
Schrijf het rapport exact volgens deze 9 opeenvolgende genummerde fasen. Gebruik uitsluitend de onderstaande Nederlandse titels.

### Fase 1: Snelle Inspectie & Directe Optimalisaties (Zonder Spijt)
- Voer een analyse uit van eenvoudige optimalisaties aan de warmteopwekking.
- Bespreek de CV-aanvoertemperatuur '50 graden test' om te controleren of de woning op lage temperaturen warm te krijgen is.
- Analyseer het 'pendelgedrag' van de ketel (veelvuldig aan- en uitschakelen bij te grote capaciteit) en adviseer over het verlagen van het cv-vermogen.
- Bespreek het belang van waterzijdig inregelen (het hydraulisch balanceren van radiatoren) conform ISSO-praktijkrichtlijnen om warmte gelijkmatig te verdelen en 10-15% gas te besparen zonder isolatiewerk.

### Fase 2: Gegevensverzameling & Analyse Thermische Kwaliteit Woning
- Vermeld de datum van de zelfscan, de unieke registratiecode (in HOOFDLETTERS direct achter de naam van de bewoner, in het formaat: *[Naam bewoner] - Registratiecode [CODE]*).
- Geef aan dat dit een onafhankelijk online zelfservice rapport is.
- Bespreek de kenmerken van de woning (bouwjaar, type woning, energielabel, m²).
- Beoordeel de thermische schil (dak, gevel, vloer, ramen, kieren) op basis van de huidige isolatiestatus. Analyseer tocht en kouval en de specifieke risico's voor de regio Limburg.

### Fase 3: Warmtevraag & Praktische Realiteitstoets (Stookgedrag-check)
- Voer de Nederlandse 'Realiteitscheck' of 'Stookgedrag-check' uit op een zeer begrijpelijke, menselijke en toegankelijke manier.
- STRIKTE WAARSCHUWING: Gebruik ABSOLUUT GEEN complexe wiskundige formules, Griekse letters, LaTeX-notatie (zoals $$, \frac, \text of subscripts zoals G_tot, G_tap, G_ref). Dit schrikt de bewoner af en is onbegrijpelijk! Leg de berekening in plaats daarvan uit in eenvoudige stappen met gewone Nederlandse woorden.
- Leg de berekening als volgt stap voor stap uit:
  1. **Jouw actuele verwarmingsgas**: Neem je totale gasverbruik van ${safeNum(house.verbruikM3, 0)} m³. Trek daar het gasverbruik voor warm tapwater en koken van af (we rekenen met 100 m³ per persoon per jaar voor warm water, dus ${safeNum(resident.aantalPersonen, 1)} personen * 100 m³ = ${safeNum(resident.aantalPersonen, 1) * 100} m³, plus 40 m³ voor koken op gas indien van toepassing, anders 0 m³). Wat overblijft is het gas dat je echt gebruikt om je woning te verwarmen. Toon deze aftreksom expliciet!
  2. **Verwacht standaardverbruik**: Wat verbruikt een gemiddelde, vergelijkbaar goed geïsoleerde woning van jouw omvang (${safeNum(house.woonoppervlakte, 0)} m²) aan verwarmingsgas? Dit berekenen we door jouw woonoppervlakte te vermenigvuldigen met een realistische kwaliteitsfactor die hoort bij een goed geïsoleerde schil (zoals label B, factor 10). Dus: ${safeNum(house.woonoppervlakte, 0)} m² * 10 = ${safeNum(house.woonoppervlakte, 0) * 10} m³.
  3. **Jouw Stookgedrag-percentage**: Deel jouw actuele verwarmingsgas door dit verwachte standaardverbruik. Toon deze eenvoudige deling en de uitkomst als een percentage (bijvoorbeeld: 0,52 of 52%).
- Analyseer en bespreek de betekenis van dit percentage op een geruststellende en heldere toon:
  - Indien lager dan 80% (0.8): Leg uit dat de bewoner uitzonderlijk zuinig stookt of dat de woning al heel efficiënt warmte vasthoudt. Toon aan dat ze al bijna de helft (of het specifieke percentage) minder verbruiken dan een gemiddelde woning van dit formaat! Waarschuw op een vriendelijke manier dat hierdoor theoretische besparingen uit nieuwe isolatiemaatregelen in de praktijk wat lager kunnen uitvallen (omdat er simpelweg al heel weinig verspild wordt), maar dat het comfort er wel door toeneemt.
  - Indien tussen 80% en 120% (0.8 - 1.2): Leg uit dat dit een keurig gemiddeld stookgedrag is, waardoor de berekende besparingen en terugverdientijden in dit rapport uiterst betrouwbaar zijn.
  - Indien hoger dan 120% (1.2): Leg uit dat het gasverbruik aan de hoge kant is voor een woning van deze omvang. Geef aan dat er hierdoor extra grote winsten te behalen zijn, zowel door isolatie als door slimme gedragsveranderingen of temperatuurinstellingen.

### Fase 4: Capaciteitsbepaling & Dimensionering Warmteopwekking
- Geef NOOIT direct een warmtepompadvies zonder deze warmteverlies-inschatting!
- Bepaal de warmteverlies-inschatting en de benodigde capaciteit op basis van het resterende gasverbruik na isolatie (${safeNum(heatpump.remainingGasM3, 0)} m³).
- Evalueer de geselecteerde warmtepomp-capaciteit:
  - Indien 'Standard': Hybride warmtepomp (lichte capaciteit, 4-5 kW).
  - Indien 'WeHeat 8kW': Hybride warmtepomp (middelgrote capaciteit, 6-8 kW).
  - Indien 'Panasonic 12kW': All-Electric warmtepomp (grote capaciteit, 10-12 kW).
- Waarschuw expliciet voor de risico's van overdimensionering (te groot vermogen leidt tot schadelijk en inefficiënt pendelgedrag van de warmtepomp). Leg uit hoe een goed gedimensioneerde warmtepomp (bijvoorbeeld 4 of 6 kW) in de Nederlandse praktijk uitstekend functioneert.
- **TACTVOLLE COMFORT- EN WAARDE-PERSPECTIEF (DE AUTO-ANALOGIE)**: Leg op een uiterst overtuigende en tactvolle manier uit dat we bij verduurzaming vaak blindstaren op de 'terugverdientijd' (TVT), terwijl we dat bij andere grote uitgaven in ons leven nooit doen. Gebruik de vergelijking met een auto: *Niemand vraagt bij de aanschaf van een nieuwe auto, een moderne designkeuken of een luxe badkamer naar de 'terugverdientijd'.* Dit zijn investeringen in dagelijks comfort, betrouwbaarheid, woningwaarde en plezier. Een warmtepomp is precies hetzelfde: het is de modernisering van het hart van je woning. Het brengt een heerlijk constante binnentemperatuur (zonder koude zones of tocht), een gezonder binnenklimaat en onafhankelijkheid van stijgende gasbelastingen. Het is een upgrade van je woongenot die – in tegenstelling tot een auto of keuken – elke maand direct geld oplevert in plaats van afschrijft! Formuleer dit met passie voor comfort en toekomstbestendigheid.

### Fase 5: Netwerkcontrole & Elektrische Aansluiting
- Controleer de elektrische netwerkaansluiting van de woning. Bespreek of de meterkast geschikt is voor een warmtepomp, laadpaal of zonnepanelen (1x25A of upgrade naar 3x25A vereist?).
- Integreer de laadpaalprognose (indien kilometergegevens bekend zijn). Bespreek het financiële voordeel van thuis laden.
- **BELANGRIJK - ERE-VERGOEDING**: Leg expliciet uit dat oliemaatschappijen (zoals Shell, BP, etc.) in Nederland wettelijk verplicht zijn om CO2-reductie in het vervoer te realiseren. Hierdoor kunnen bezitters van een laadpaal thuis een zogeheten ERE-vergoeding (Energie voor Vervoer) claimen van circa € 0,12 per kWh voor elke thuis geladen kWh stroom! Leg uit dat ze dit geld direct kunnen claimen bij gespecialiseerde Nederlandse partijen zoals EREclaim.nl, Zonneplan of de Laadpaal App. Dit verlaagt de effectieve stroomprijs voor elektrisch rijden aanzienlijk!

### Fase 6: Prognose Scenario 2027+ (Thuisbatterij & Salderingsafbouw)
- Bespreek de invloed van de salderingsafbouw vanaf 2027 op zonnepanelen.
- Evalueer het berekende direct eigen verbruik percentage (${safeNum(solar.selfConsumptionBase, 0)}%) en hoe dit toeneemt met een thuisbatterij naar ${safeNum(solar.selfConsumptionWithBattery, 0)}%.
- Geef een financieel oordeel over de thuisbatterij op basis van de berekende post-2027 jaarlijkse besparing van €${safeNum(battery.costSavingsPost2027, 0).toFixed(2)}. Vergelijk de besparingen bij een vast contract (met eventuele terugleverboetes) versus een dynamisch energiecontract (zoals Tibber, Zonneplan of ANWB Energie) waarbij de batterij slim kan laden tijdens goedkope uren en ontladen tijdens dure uren.

### Fase 7: Financieel Model (ISDE-subsidie & Nationaal Isolatieprogramma)
- Geef aan of de bewoner in aanmerking komt voor het Nationaal Isolatieprogramma (NIP) met een extra subsidie van € 2.900 (inkomensverklaring gecontroleerd op basis van bruto gezinsinkomen van €${safeNum(resident.brutoGezinsinkomen, 0).toLocaleString('nl-NL')}).
- Leg de ISDE-subsidievoorwaarden uit (bijvoorbeeld de verdubbeling van de ISDE-subsidie bij het nemen van 2 of meer maatregelen binnen 24 maanden).
- Genereer een overzichtelijke Markdown-tabel met EXACT deze kolommen en de berekende waarden uit de calculator:
  \`Maatregel\` | \`Aantal M2\` | \`Bruto kosten\` | \`Subsidie ISDE\` | \`Subsidie NIP\` | \`Netto Kosten\` | \`Jaarlijkse Besparing\` | \`TVT (jaar)\`
  (Vul de tabel in met de individuele maatregelen uit de calculator. Toon onderaan de tabel de totalen van de bruto kosten, subsidies en netto kosten conform het beste scenario!)
  *Let op: Toon NOOIT de geheime technische kengetallen van de rekenbasis in de tabel! Alleen de netto m², kosten, subsidies en besparingen.*

### Fase 8: Strategische Besparingspaden & Uitvoeringsvolgorde
- Geef een concreet, chronologisch stappenplan voor de uitvoering van de geadviseerde maatregelen, strikt volgens de Trias Energetica.
- Geef prioriteit aan de schilmaatregelen met de kortste terugverdientijd en de grootste thermische verbetering.
- Leg uit hoe de bewoner offertes kan opvragen en waar hij/zij op moet letten bij isolatiebedrijven (bijvoorbeeld de opmerkingen voor de isolatiebedrijven: "${opmerkingenOffertes || 'Geen'}").

### Fase 9: Officiële Deskundigenverklaring conform NTA 8800
- Sluit af met een formele, geruststellende verklaring in de rol van de Energiecoach van de 'Energieplanner Peel en Maas'.
- Bevestig dat dit rapport is opgesteld conform de vigerende NTA 8800 methodologie en ISSO-richtlijnen en onderteken het rapport met: "Getekend, Energiecoach Peel en Maas".

Schrijf direct en persoonlijk tot de bewoner ("je/jij"). Wees to-the-point, professioneel en vermijd pop-ups, meta-verwijzingen of AI-clichés. Zorg dat alle berekende getallen exact overeenkomen met de input!
`;

    const response = await generateContentWithRetry([
      {
        text: systemPrompt,
      },
    ]);

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error('Fout bij genereren van advies:', error);
    res.status(500).json({ error: error.message || 'Interne serverfout bij het genereren van advies.' });
  }
});

// API endpoint to send advice report to the resident's email
app.post('/api/send-email', async (req, res) => {
  try {
    const { email, clientName, reportText } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mailadres is verplicht.' });
    }

    console.log(`[Email API] Verzoek om rapport te verzenden naar: ${email} voor klant: ${clientName}`);

    // Fetch SMTP settings from environment variables
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@energieplanner.peelenmaas.nl';

    let sent = false;
    let messageId = '';
    let isSimulated = true;

    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      const info = await transporter.sendMail({
        from: `"Energieplanner Peel en Maas" <${from}>`,
        to: email,
        subject: `Jouw Energieplanner Peel en Maas Adviesrapport - ${clientName || 'Bewoner'}`,
        text: reportText || 'Hierbij ontvangt u uw adviesrapport.',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Energieplanner Peel en Maas</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Jouw persoonlijke verduurzamingsadvies</p>
            </div>
            <div style="padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Beste <strong>${clientName || 'bewoner'}</strong>,</p>
              <p>Bedankt voor het invullen van de Energieplanner Peel en Maas. Op basis van jouw ingevoerde gegevens hebben we een onafhankelijk en deskundig adviesrapport opgesteld om je te helpen besparen op gas en elektriciteit en maximaal te profiteren van beschikbare subsidies zoals het NIP en ISDE.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; font-size: 14px; color: #475569;">
                <strong>Verwachte resultaten:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  <li>Onafhankelijk stappenplan specifiek voor jouw woning</li>
                  <li>Overzicht van isolatiesubsidies (ISDE + NIP tot wel €2.900)</li>
                  <li>Inzicht in zonnepanelen, saldering en warmtepomp-mogelijkheden</li>
                </ul>
              </div>

              <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Jouw Persoonlijke Adviesrapport:</h3>
              <div style="background-color: #fafafa; border: 1px solid #f1f5f9; padding: 15px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #334155; max-height: 400px; overflow-y: auto;">
                ${reportText}
              </div>

              <p style="margin-top: 25px;">Heb je vragen over dit rapport of wil je hulp bij de vervolgstappen? Neem gerust contact op met de Energiecoaches van Peel en Maas.</p>
              
              <p style="margin-bottom: 0;">Met vriendelijke groet,<br><strong>Energieplanner Peel en Maas</strong></p>
            </div>
            <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; padding: 10px;">
              Dit is een automatisch gegenereerd rapport opgesteld door de Energieplanner Peel en Maas zelfscan.
            </div>
          </div>
        `
      });

      sent = true;
      messageId = info.messageId;
      isSimulated = false;
      console.log(`[Email API] Echte e-mail succesvol verzonden naar ${email}. Message ID: ${messageId}`);
    } else {
      sent = true;
      isSimulated = true;
      console.log(`[Email API] SIMULATIE MODUS: E-mail succesvol opgesteld en gelogd voor ${email}.`);
    }

    res.json({ success: true, isSimulated, email, messageId });
  } catch (error: any) {
    console.error('Fout bij verzenden van e-mail:', error);
    res.status(500).json({ error: error.message || 'Fout bij het verzenden van de e-mail.' });
  }
});

// Serve static files in production or use Vite dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Serve index.html for any requests not handled by API or static files
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
