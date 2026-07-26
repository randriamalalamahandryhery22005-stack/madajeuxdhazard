// Seeded PRNG for deterministic results based on inputs
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  between(min: number, max: number): number { return min + this.next() * (max - min); }
  intBetween(min: number, max: number): number { return Math.floor(this.between(min, max + 1)); }
  pick<T>(arr: T[]): T { return arr[this.intBetween(0, arr.length - 1)]; }
}

const makeSeed = (a: number, b: number, c: number) =>
  Math.abs(((a * 2654435761) ^ (b * 2246822519) ^ (c * 3266489917)) % 2147483647) || 1;

export interface DetailedPrediction {
  halfTime1X2: string;
  doubleChance: string;
  halfTimeDoubleChance: string;
  exactScore: string;
  halfTimeCleanSheet: string;
  overUnder: { label: string; value: string; prob: number }[];
  htft: string;
  totalGoals: number;
  goalNoGoal: string;
  btts: string;
  bttsFirstHalf: string;
  combinations: { label: string; value: string; prob: number }[];
  homeTotal: { label: string; value: string; prob: number }[];
  topScores: { score: string; prob: number; outcome: "home" | "draw" | "away" }[];
}

export interface VirtuelMatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  htHomeScore: number;
  htAwayScore: number;
  winner: "home" | "away" | "draw";
  winnerName: string;
  confidence: number;
  homeOdd: number;
  awayOdd: number;
  drawOdd: number;
  analysisNotes: string[];
  homeProb: number;
  awayProb: number;
  drawProb: number;
  bookmakerMargin: number;
  detailed: DetailedPrediction;
}

export interface League {
  id: string;
  name: string;
  shortName: string;
  color: string;
  colorBg: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  teams: string[];
}

export const LEAGUES: League[] = [
  {
    id: "english", name: "English League", shortName: "ENG",
    color: "text-red-400", colorBg: "bg-red-500/10", borderColor: "border-red-500/25",
    gradientFrom: "from-red-500/20", gradientTo: "to-red-900/10", icon: "🏴",
    teams: ["Leeds", "Newcastle", "Manchester Blue", "Brentford", "London Reds", "Manchester Red", "Liverpool", "Brighton", "Crystal Palace", "Everton", "Bournemouth", "Burnley", "Aston Villa", "Spurs", "Nottingham Forest", "Sunderland", "London Blues", "Fulham", "Wolverhampton", "West Ham"],
  },
  {
    id: "africa", name: "Coupe d'Afrique", shortName: "CAF",
    color: "text-yellow-400", colorBg: "bg-yellow-500/10", borderColor: "border-yellow-500/25",
    gradientFrom: "from-yellow-500/20", gradientTo: "to-yellow-900/10", icon: "🌍",
    teams: ["Ivory Coast", "Comoros", "Equatorial Guinea", "Sudan", "Benin", "Cameroon", "Morocco", "South Africa", "DR Congo", "Egypt", "Mali", "Zimbabwe", "Nigeria", "Zambia", "Burkina Faso", "Botswana", "Mozambique", "Uganda", "Senegal", "Tunisia", "Tanzania", "Gabon", "Algeria", "Angola"],
  },
  {
    id: "champions", name: "Champions League", shortName: "UCL",
    color: "text-blue-400", colorBg: "bg-blue-500/10", borderColor: "border-blue-500/25",
    gradientFrom: "from-blue-500/20", gradientTo: "to-blue-900/10", icon: "⭐",
    teams: ["Aston Villa", "Liverpool", "Lisboa Green", "Eindhoven", "Bologna", "Lisboa Red", "Donetsk", "Bern", "Zagreb", "Barca", "Leverkusen", "Graz", "Dortmund", "Belgrade", "Atalanta", "Leipzig", "Atletico Madrid", "Turin", "Feyenoord", "Brest", "Bratislava", "Bruges", "Stuttgart", "Munich", "Celtic", "London Reds", "Manchester Blue", "Girona", "Salzburg", "Monaco", "Lille", "Milan Blues", "Milan Reds", "Paris SG", "Real Madrid", "Prague"],
  },
  {
    id: "italian", name: "Italian League", shortName: "ITA",
    color: "text-green-400", colorBg: "bg-green-500/10", borderColor: "border-green-500/25",
    gradientFrom: "from-green-500/20", gradientTo: "to-green-900/10", icon: "🇮🇹",
    teams: ["Como", "Genoa", "Verona", "Udinese", "Fiorentina", "Atalanta", "Pisa", "Napoli", "Milan Reds", "Cremonese", "Lecce", "Turin", "Roma", "Sassuolo", "Cagliari", "Torino", "Bologna", "Milan Blues", "Lazio", "Parma"],
  },
  {
    id: "spanish", name: "Spanish League", shortName: "ESP",
    color: "text-orange-400", colorBg: "bg-orange-500/10", borderColor: "border-orange-500/25",
    gradientFrom: "from-orange-500/20", gradientTo: "to-orange-900/10", icon: "🇪🇸",
    teams: ["Rayo Vallecano", "Real Madrid", "Villarreal", "Sevilla", "Elche", "Getafe", "Atletico Madrid", "Mallorca", "Valencia", "Betis", "Osasuna", "Bilbao", "Vigo", "Levante", "Real Oviedo", "Girona", "Alavés", "Real Sociedad", "Barca", "Espanyol"],
  },
  {
    id: "french", name: "French League", shortName: "FRA",
    color: "text-sky-400", colorBg: "bg-sky-500/10", borderColor: "border-sky-500/25",
    gradientFrom: "from-sky-500/20", gradientTo: "to-sky-500/10", icon: "🇫🇷",
    teams: ["Nantes", "Monaco", "Angers", "Auxerre", "Metz", "Paris SG", "Lens", "Lyon", "Rennes", "Toulouse", "Brest", "Le Havre", "Lorient", "Marseille", "Nice", "Paris FC", "Strasbourg", "Lille"],
  },
  {
    id: "german", name: "German League", shortName: "GER",
    color: "text-amber-400", colorBg: "bg-amber-500/10", borderColor: "border-amber-500/25",
    gradientFrom: "from-amber-500/20", gradientTo: "to-amber-900/10", icon: "🇩🇪",
    teams: ["Berlin", "Munich", "Dortmund", "Hambourg", "Heidenheim", "Hoffenheim", "Leverkusen", "Frankfurt", "Freiburg", "Koln", "Augsburg", "Wolfsburg", "Bremen", "Pauli", "Leipzig", "Mainz", "Stuttgart", "Mönchengladbach"],
  },
  {
    id: "portuguese", name: "Portuguese League", shortName: "POR",
    color: "text-emerald-400", colorBg: "bg-emerald-500/10", borderColor: "border-emerald-500/25",
    gradientFrom: "from-emerald-500/20", gradientTo: "to-emerald-900/10", icon: "🇵🇹",
    teams: ["Estrela", "Tondela", "Arouca", "Lisboa Green", "Moreirense", "Braga", "Alverca", "Guimaraes", "Lisboa Red", "Nacional", "Rio Ave", "Porto", "Gil Vicente", "Casa Pia", "AFS", "Santa Clara", "Estoril", "Famalicão"],
  },
];

const confLabel = (prob: number): string => prob >= 70 ? "Sûr" : prob >= 50 ? "Moyen" : "Risqué";

export const generateVirtuelPrediction = (
  homeTeam: string, awayTeam: string,
  homeOdd: number, awayOdd: number, drawOdd: number
): VirtuelMatchResult => {
  const seed = makeSeed(Math.round(homeOdd * 100), Math.round(awayOdd * 100), Math.round(drawOdd * 100));
  const rng = new SeededRandom(seed);

  const totalProb = 1 / homeOdd + 1 / awayOdd + 1 / drawOdd;
  const homeProb = (1 / homeOdd) / totalProb;
  const awayProb = (1 / awayOdd) / totalProb;
  const drawProb = (1 / drawOdd) / totalProb;
  const bookmakerMargin = (totalProb - 1) * 100;

  const roll = rng.next();
  let winner: "home" | "away" | "draw";
  if (roll < homeProb) winner = "home";
  else if (roll < homeProb + drawProb) winner = "draw";
  else winner = "away";

  let homeScore: number, awayScore: number;
  if (winner === "home") { homeScore = rng.intBetween(1, 4); awayScore = rng.intBetween(0, homeScore - 1); }
  else if (winner === "away") { awayScore = rng.intBetween(1, 4); homeScore = rng.intBetween(0, awayScore - 1); }
  else { homeScore = rng.intBetween(0, 3); awayScore = homeScore; }

  const htHomeScore = Math.min(homeScore, rng.intBetween(0, homeScore));
  const htAwayScore = Math.min(awayScore, rng.intBetween(0, awayScore));

  const maxProb = Math.max(homeProb, awayProb, drawProb);
  const confidence = Math.min(95, Math.floor(maxProb * 100 + rng.between(-5, 10)));

  const ht1x2 = htHomeScore > htAwayScore ? "1" : htHomeScore < htAwayScore ? "2" : "X";
  const ft1x2 = winner === "home" ? "1" : winner === "away" ? "2" : "X";

  const dc = winner === "draw" ? (rng.next() > 0.5 ? "1X" : "X2") : winner === "home" ? (rng.next() > 0.3 ? "1X" : "12") : (rng.next() > 0.3 ? "X2" : "12");
  const htDc = ht1x2 === "X" ? (rng.next() > 0.5 ? "1X" : "X2") : ht1x2 === "1" ? "1X" : "X2";

  const totalGoals = homeScore + awayScore;
  const btts = homeScore > 0 && awayScore > 0;
  const bttsHT = htHomeScore > 0 && htAwayScore > 0;
  const htClean = htHomeScore === 0 || htAwayScore === 0;

  const htftMap = `${ht1x2}/${ft1x2}`;

  const overUnder = [
    { label: "+0.5", value: totalGoals > 0 ? "OUI" : "NON", prob: Math.min(95, Math.floor(rng.between(65, 95))) },
    { label: "+1.5", value: totalGoals > 1 ? "OUI" : "NON", prob: Math.min(90, Math.floor(rng.between(55, 88))) },
    { label: "+2.5", value: totalGoals > 2 ? "OUI" : "NON", prob: Math.min(85, Math.floor(rng.between(40, 80))) },
    { label: "+3.5", value: totalGoals > 3 ? "OUI" : "NON", prob: Math.min(75, Math.floor(rng.between(25, 65))) },
  ];

  const combinations = [
    { label: "1X2 & +1.5", value: `${ft1x2} & ${totalGoals > 1 ? "OUI" : "NON"}`, prob: Math.floor(rng.between(45, 80)) },
    { label: "1X2 & +2.5", value: `${ft1x2} & ${totalGoals > 2 ? "OUI" : "NON"}`, prob: Math.floor(rng.between(35, 72)) },
    { label: "1X2 & +3.5", value: `${ft1x2} & ${totalGoals > 3 ? "OUI" : "NON"}`, prob: Math.floor(rng.between(25, 60)) },
    { label: "1X2 & G/NG", value: `${ft1x2} & ${btts ? "G" : "NG"}`, prob: Math.floor(rng.between(40, 75)) },
  ];

  const homeTotal = [
    { label: "Dom +0.5", value: homeScore > 0 ? "OUI" : "NON", prob: Math.floor(rng.between(55, 90)) },
    { label: "Dom +1.5", value: homeScore > 1 ? "OUI" : "NON", prob: Math.floor(rng.between(30, 70)) },
  ];

  // Top 3 scores probables (côte à côte)
  // Le score principal + 2 alternatives plausibles selon le résultat
  const mainProbPct = Math.min(48, Math.floor(15 + confidence * 0.35));
  const altScores: { score: string; prob: number; outcome: "home" | "draw" | "away" }[] = [];
  altScores.push({ score: `${homeScore}-${awayScore}`, prob: mainProbPct, outcome: winner });
  // Alt 1 : variation +/- 1 but pour l'équipe gagnante
  if (winner === "home") {
    const a = Math.max(0, awayScore + (rng.next() > 0.5 ? 1 : 0));
    const h = Math.max(a + 1, homeScore + (rng.next() > 0.5 ? 1 : -1));
    altScores.push({ score: `${h}-${a}`, prob: Math.max(12, mainProbPct - 12), outcome: "home" });
  } else if (winner === "away") {
    const h = Math.max(0, homeScore + (rng.next() > 0.5 ? 1 : 0));
    const a = Math.max(h + 1, awayScore + (rng.next() > 0.5 ? 1 : -1));
    altScores.push({ score: `${h}-${a}`, prob: Math.max(12, mainProbPct - 12), outcome: "away" });
  } else {
    const v = Math.min(3, homeScore + 1);
    altScores.push({ score: `${v}-${v}`, prob: Math.max(12, mainProbPct - 10), outcome: "draw" });
  }
  // Alt 2 : score "secours" basé sur la 2ème probabilité
  const probs = [
    { o: "home" as const, p: homeProb, s: `${Math.max(1, homeScore)}-${Math.max(0, homeScore - 1 - rng.intBetween(0, 1))}` },
    { o: "draw" as const, p: drawProb, s: `1-1` },
    { o: "away" as const, p: awayProb, s: `${Math.max(0, awayScore - 1)}-${Math.max(1, awayScore)}` },
  ].sort((a, b) => b.p - a.p);
  const second = probs.find(p => p.o !== winner) || probs[1];
  altScores.push({ score: second.s, prob: Math.max(8, Math.floor(second.p * 100 * 0.4)), outcome: second.o });

  const detailed: DetailedPrediction = {
    halfTime1X2: ht1x2,
    doubleChance: dc,
    halfTimeDoubleChance: htDc,
    exactScore: `${homeScore}-${awayScore}`,
    halfTimeCleanSheet: htClean ? "OUI" : "NON",
    overUnder,
    htft: htftMap,
    totalGoals,
    goalNoGoal: btts ? "G" : "NG",
    btts: btts ? "OUI" : "NON",
    bttsFirstHalf: bttsHT ? "OUI" : "NON",
    combinations,
    homeTotal,
    topScores: altScores,
  };

  const notes: string[] = [];
  if (homeProb > 0.5) notes.push(`${homeTeam} largement favori (${(homeProb * 100).toFixed(0)}%)`);
  else if (awayProb > 0.5) notes.push(`${awayTeam} largement favori (${(awayProb * 100).toFixed(0)}%)`);
  else notes.push("Match très serré selon les cotes");
  if (drawProb > 0.3) notes.push("Probabilité de match nul élevée");
  if (bookmakerMargin > 10) notes.push(`Marge bookmaker élevée (${bookmakerMargin.toFixed(1)}%)`);

  return {
    homeTeam, awayTeam, homeScore, awayScore, htHomeScore, htAwayScore,
    winner, winnerName: winner === "home" ? homeTeam : winner === "away" ? awayTeam : "Match Nul",
    confidence, homeOdd, awayOdd, drawOdd,
    analysisNotes: notes,
    homeProb: Math.round(homeProb * 100), awayProb: Math.round(awayProb * 100), drawProb: Math.round(drawProb * 100),
    bookmakerMargin: Math.round(bookmakerMargin * 10) / 10,
    detailed,
  };
};

export const makeAviatorSeed = (h: number, m: number, coeff: number) =>
  makeSeed(h, m, Math.round(coeff * 100));
