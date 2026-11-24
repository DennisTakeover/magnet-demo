import type { PersonaId } from './types';

/**
 * Audience insights per example business. In production these come from:
 * - Instagram Insights (aggregated follower demographics, active times, per-post results; available from 100 followers),
 * - MAGNET's own data (which posts start conversations, which Lead Flows convert, Grow results),
 * - an AI summary that groups the audience into personas.
 * Everything is aggregated: no individual people are profiled, and no sensitive traits are inferred.
 */

export interface AgeBand { band: string; women: number; men: number }
export interface Place { name: string; share: number }
export interface FormatStat { format: 'Reel' | 'Carousel' | 'Post' | 'Story'; reach: number; saves: number; dms: number }
export interface TopicStat { topic: string; engagement: number; leads: number }
export interface TopPost { title: string; format: 'Reel' | 'Carousel' | 'Post'; reach: number; saves: number; conversations: number }
export interface AudiencePersona {
  id: string;
  name: string;
  share: number;
  age: string;
  where: string;
  summary: string;
  cares: string[];
  asks: string[];
  bestContent: string;
  bestTime: string;
  topic: string;
  postIdea: { title: string; format: 'Reel' | 'Carousel' | 'Post'; caption: string };
  color: string;
  /** Icon key for the persona avatar */
  icon: 'briefcase' | 'plane' | 'heart' | 'repeat' | 'search' | 'gift' | 'bike' | 'mountain' | 'baby';
}
export interface Recommendation { title: string; body: string; action: 'post' | 'topic' | 'flow' | 'time'; persona?: string }

export interface AudienceInsights {
  followers: number;
  reach28: number;
  engagementRate: number;
  matchShare: number;
  ages: AgeBand[];
  cities: Place[];
  countries: Place[];
  /** 7 days × 6 time slots, relative activity 0–100 */
  activity: number[][];
  formats: FormatStat[];
  topics: TopicStat[];
  topPosts: TopPost[];
  personas: AudiencePersona[];
  recommendations: Recommendation[];
}

export const SLOTS = ['06–09', '09–12', '12–15', '15–18', '18–21', '21–24'];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLORS = ['#5B35F5', '#2F6FE8', '#E1622C'];

export const INSIGHTS: Record<PersonaId, AudienceInsights> = {
  coach: {
    followers: 11432,
    reach28: 48600,
    engagementRate: 4.8,
    matchShare: 71,
    ages: [
      { band: '18–24', women: 4, men: 3 },
      { band: '25–34', women: 14, men: 17 },
      { band: '35–44', women: 16, men: 21 },
      { band: '45–54', women: 8, men: 9 },
      { band: '55+', women: 3, men: 5 },
    ],
    cities: [{ name: 'Amsterdam', share: 14 }, { name: 'London', share: 11 }, { name: 'Rotterdam', share: 7 }, { name: 'Berlin', share: 5 }, { name: 'Utrecht', share: 4 }],
    countries: [{ name: 'Netherlands', share: 41 }, { name: 'United Kingdom', share: 23 }, { name: 'Germany', share: 12 }, { name: 'Belgium', share: 7 }],
    activity: [
      [72, 38, 46, 30, 58, 64], [76, 40, 44, 32, 60, 62], [70, 36, 48, 28, 56, 66],
      [74, 42, 50, 34, 62, 60], [60, 34, 40, 36, 44, 38], [30, 52, 46, 40, 48, 34], [28, 58, 50, 42, 70, 56],
    ],
    formats: [
      { format: 'Reel', reach: 100, saves: 62, dms: 48 },
      { format: 'Carousel', reach: 64, saves: 100, dms: 100 },
      { format: 'Post', reach: 38, saves: 30, dms: 22 },
      { format: 'Story', reach: 46, saves: 0, dms: 64 },
    ],
    topics: [
      { topic: 'Short workouts', engagement: 100, leads: 64 },
      { topic: 'Business travel', engagement: 82, leads: 100 },
      { topic: 'Energy & sleep', engagement: 70, leads: 52 },
      { topic: 'Client stories', engagement: 58, leads: 88 },
      { topic: 'Nutrition', engagement: 46, leads: 30 },
    ],
    topPosts: [
      { title: '5 habits for busy founders', format: 'Carousel', reach: 9400, saves: 812, conversations: 24 },
      { title: 'Q&A: your top 3 questions', format: 'Reel', reach: 14100, saves: 390, conversations: 9 },
      { title: 'Hotel room workout in 15 minutes', format: 'Reel', reach: 12800, saves: 655, conversations: 14 },
    ],
    personas: [
      {
        id: 'p1', name: 'The busy founder', share: 42, age: '30–44', where: 'Amsterdam, London', color: COLORS[0], icon: 'briefcase',
        summary: 'Runs a company, trains when the calendar allows. Wants results without spending an hour a day.',
        cares: ['Short workouts that fit between meetings', 'Energy for long workdays', 'Proof it works for people like them'],
        asks: ['“Does this work with 3 hours a week?”', '“What does the programme cost?”'],
        bestContent: 'Saveable carousels with a clear checklist', bestTime: 'Weekdays 06:00–09:00', topic: 'Founder health',
        postIdea: { title: 'The 20-minute founder workout', format: 'Carousel', caption: 'No time? Five moves, twenty minutes, done before your first call. Save this for tomorrow morning.' },
      },
      {
        id: 'p2', name: 'The travelling consultant', share: 27, age: '28–40', where: 'London, Berlin', color: COLORS[1], icon: 'plane',
        summary: 'Often on the road for clients. Struggles to stay consistent in hotels and airports.',
        cares: ['Hotel room workouts', 'Eating well on the road', 'Routines that survive a busy week'],
        asks: ['“Can I follow it while travelling?”', '“Do you have a travel version?”'],
        bestContent: 'Quick Reels you can follow along with', bestTime: 'Sunday evening 18:00–21:00', topic: 'Business travel',
        postIdea: { title: 'Airport-proof routine in 3 steps', format: 'Reel', caption: 'Three things I tell every travelling client. Comment TRAVEL and I’ll send you the full checklist.' },
      },
      {
        id: 'p3', name: 'The restarting parent', share: 19, age: '35–49', where: 'Rotterdam, Utrecht', color: COLORS[2], icon: 'heart',
        summary: 'Wants to get fit again after a few busy years. Needs encouragement and a realistic start.',
        cares: ['A gentle, realistic start', 'Stories from people who did it', 'Workouts at home'],
        asks: ['“Is it okay to start from zero?”', '“How soon will I notice a difference?”'],
        bestContent: 'Client stories and before/after routines', bestTime: 'Weekdays 21:00–24:00', topic: 'Fitness after a break',
        postIdea: { title: 'How Mark restarted after 4 years', format: 'Post', caption: 'From zero to three sessions a week, without a gym. Here’s what made the difference.' },
      },
    ],
    recommendations: [
      { title: 'Post carousels on weekday mornings', body: 'Your carousels get the most saves and DMs, and your audience is most active 06:00–09:00 on weekdays.', action: 'time' },
      { title: 'Turn “business travel” into a Lead Flow', body: 'Travel posts bring in the most leads per view. A keyword like TRAVEL with a checklist could capture them.', action: 'flow', persona: 'p2' },
      { title: 'Add “founder health” to your Grow topics', body: 'Your largest persona engages most with this, and it isn’t one of your Grow topics yet.', action: 'topic', persona: 'p1' },
    ],
  },
  webshop: {
    followers: 8960,
    reach28: 61200,
    engagementRate: 5.6,
    matchShare: 77,
    ages: [
      { band: '18–24', women: 19, men: 3 },
      { band: '25–34', women: 33, men: 5 },
      { band: '35–44', women: 21, men: 3 },
      { band: '45–54', women: 10, men: 1 },
      { band: '55+', women: 4, men: 1 },
    ],
    cities: [{ name: 'Amsterdam', share: 12 }, { name: 'Antwerp', share: 8 }, { name: 'Rotterdam', share: 7 }, { name: 'The Hague', share: 6 }, { name: 'Ghent', share: 5 }],
    countries: [{ name: 'Netherlands', share: 58 }, { name: 'Belgium', share: 27 }, { name: 'Germany', share: 6 }, { name: 'France', share: 3 }],
    activity: [
      [24, 30, 52, 40, 70, 82], [26, 32, 50, 42, 72, 80], [22, 30, 54, 38, 68, 84],
      [28, 34, 56, 44, 74, 86], [20, 28, 48, 46, 60, 66], [30, 58, 62, 50, 64, 58], [36, 64, 60, 52, 76, 72],
    ],
    formats: [
      { format: 'Reel', reach: 100, saves: 54, dms: 40 },
      { format: 'Carousel', reach: 70, saves: 100, dms: 72 },
      { format: 'Post', reach: 44, saves: 38, dms: 30 },
      { format: 'Story', reach: 52, saves: 0, dms: 100 },
    ],
    topics: [
      { topic: 'Morning routine', engagement: 100, leads: 80 },
      { topic: 'Ingredients explained', engagement: 84, leads: 100 },
      { topic: 'Before & after', engagement: 76, leads: 62 },
      { topic: 'Gift sets', engagement: 48, leads: 70 },
      { topic: 'Behind the scenes', engagement: 40, leads: 18 },
    ],
    topPosts: [
      { title: 'My 3-step morning routine', format: 'Reel', reach: 18200, saves: 1240, conversations: 31 },
      { title: 'Niacinamide vs vitamin C', format: 'Carousel', reach: 11600, saves: 1580, conversations: 27 },
      { title: 'Gift set for under €40', format: 'Post', reach: 6400, saves: 310, conversations: 19 },
    ],
    personas: [
      {
        id: 'p1', name: 'The routine builder', share: 46, age: '25–34', where: 'Amsterdam, Rotterdam', color: COLORS[0], icon: 'repeat',
        summary: 'Wants a simple routine that works. Buys once she trusts it suits her skin type.',
        cares: ['Simple 3-step routines', 'Which product for which skin type', 'Real results over time'],
        asks: ['“Which serum fits dry skin?”', '“Can I combine these two?”'],
        bestContent: 'Short routine Reels', bestTime: 'Evenings 21:00–24:00', topic: 'Skincare routine',
        postIdea: { title: 'Evening routine for dry skin', format: 'Reel', caption: 'Three steps, two minutes. Comment ROUTINE and I’ll send you the full guide for your skin type.' },
      },
      {
        id: 'p2', name: 'The ingredient checker', share: 31, age: '22–34', where: 'Antwerp, Ghent', color: COLORS[1], icon: 'search',
        summary: 'Reads every label. Values clear explanations and honest claims.',
        cares: ['What each ingredient does', 'Clean, honest claims', 'Comparisons between products'],
        asks: ['“Is this fragrance-free?”', '“What percentage of niacinamide?”'],
        bestContent: 'Explainer carousels', bestTime: 'Weekdays 12:00–15:00', topic: 'Skincare ingredients',
        postIdea: { title: 'Retinol: what it does and doesn’t do', format: 'Carousel', caption: 'Save this before you buy your next serum.' },
      },
      {
        id: 'p3', name: 'The gift shopper', share: 15, age: '30–49', where: 'The Hague, Utrecht', color: COLORS[2], icon: 'gift',
        summary: 'Looks for a thoughtful gift. Decides quickly when the price and packaging are clear.',
        cares: ['Gift sets with clear prices', 'Nice packaging', 'Fast delivery'],
        asks: ['“Can you gift-wrap it?”', '“Will it arrive before Friday?”'],
        bestContent: 'Product posts with price and delivery info', bestTime: 'Weekends 09:00–12:00', topic: 'Gift ideas',
        postIdea: { title: '3 gift sets under €40', format: 'Post', caption: 'Wrapped and delivered within two days. Which one would you give?' },
      },
    ],
    recommendations: [
      { title: 'Post routine Reels in the evening', body: 'Your audience is most active 21:00–24:00, and routine Reels get your highest reach.', action: 'time' },
      { title: 'Turn ingredient questions into a Lead Flow', body: 'Ingredient explainers bring in the most leads. A keyword like INGREDIENTS with a guide could capture them.', action: 'flow', persona: 'p2' },
      { title: 'Add “gift ideas” to your Grow topics', body: 'Gift shoppers convert fast and the season is coming. It isn’t one of your Grow topics yet.', action: 'topic', persona: 'p3' },
    ],
  },
  store: {
    followers: 4120,
    reach28: 19800,
    engagementRate: 6.3,
    matchShare: 82,
    ages: [
      { band: '18–24', women: 4, men: 9 },
      { band: '25–34', women: 9, men: 18 },
      { band: '35–44', women: 11, men: 21 },
      { band: '45–54', women: 7, men: 12 },
      { band: '55+', women: 3, men: 6 },
    ],
    cities: [{ name: 'Utrecht', share: 46 }, { name: 'Houten', share: 9 }, { name: 'Zeist', share: 7 }, { name: 'Nieuwegein', share: 6 }, { name: 'Amersfoort', share: 4 }],
    countries: [{ name: 'Netherlands', share: 93 }, { name: 'Belgium', share: 3 }, { name: 'Germany', share: 2 }, { name: 'Other', share: 2 }],
    activity: [
      [64, 30, 34, 40, 66, 40], [62, 28, 32, 42, 64, 38], [60, 30, 36, 40, 62, 42],
      [66, 32, 34, 44, 68, 40], [58, 34, 40, 48, 50, 30], [40, 72, 66, 48, 36, 24], [30, 70, 58, 44, 40, 28],
    ],
    formats: [
      { format: 'Reel', reach: 100, saves: 48, dms: 56 },
      { format: 'Carousel', reach: 58, saves: 100, dms: 62 },
      { format: 'Post', reach: 52, saves: 40, dms: 100 },
      { format: 'Story', reach: 40, saves: 0, dms: 74 },
    ],
    topics: [
      { topic: 'Repair tips', engagement: 100, leads: 70 },
      { topic: 'Winter check-up', engagement: 74, leads: 100 },
      { topic: 'E-bikes', engagement: 68, leads: 84 },
      { topic: 'Kids’ bikes', engagement: 52, leads: 60 },
      { topic: 'Weekend rides', engagement: 44, leads: 22 },
    ],
    topPosts: [
      { title: 'Fix a flat in 5 minutes', format: 'Reel', reach: 7600, saves: 540, conversations: 12 },
      { title: 'Winter check-up: what we look at', format: 'Carousel', reach: 4300, saves: 410, conversations: 21 },
      { title: 'New: kids’ bikes in stock', format: 'Post', reach: 3900, saves: 120, conversations: 17 },
    ],
    personas: [
      {
        id: 'p1', name: 'The daily commuter', share: 48, age: '25–44', where: 'Utrecht', color: COLORS[0], icon: 'bike',
        summary: 'Rides to work every day. Needs the bike to just work and hates losing a day to repairs.',
        cares: ['Fast repairs', 'Booking a slot easily', 'Keeping the bike reliable in winter'],
        asks: ['“Can you fix it today?”', '“What does a service cost?”'],
        bestContent: 'Quick repair tips and booking reminders', bestTime: 'Weekdays 06:00–09:00', topic: 'Bike commuting',
        postIdea: { title: '3 checks before your winter commute', format: 'Carousel', caption: 'Lights, brakes, tyres. Comment SERVICE to book a winter check-up.' },
      },
      {
        id: 'p2', name: 'The weekend rider', share: 29, age: '35–54', where: 'Utrecht, Zeist', color: COLORS[1], icon: 'mountain',
        summary: 'Rides for fun and fitness. Interested in upgrades, e-bikes and routes.',
        cares: ['E-bikes and upgrades', 'Local routes', 'Advice from enthusiasts'],
        asks: ['“Can I test-ride this e-bike?”', '“Which model for longer rides?”'],
        bestContent: 'Reels about bikes and routes', bestTime: 'Saturday 09:00–12:00', topic: 'E-bikes',
        postIdea: { title: 'Test-ride our new e-bikes this Saturday', format: 'Reel', caption: 'Three models, one morning. Book your test ride in the DMs.' },
      },
      {
        id: 'p3', name: 'The family with kids’ bikes', share: 16, age: '30–44', where: 'Houten, Nieuwegein', color: COLORS[2], icon: 'baby',
        summary: 'Buys and maintains bikes for the whole family. Practical and price-aware.',
        cares: ['Kids’ bikes that grow along', 'Clear prices', 'A trade-in option'],
        asks: ['“Do you take old bikes in?”', '“Which size for a 7-year-old?”'],
        bestContent: 'Posts with prices and stock', bestTime: 'Weekdays 18:00–21:00', topic: 'Kids’ bikes',
        postIdea: { title: 'Which bike size for which age?', format: 'Carousel', caption: 'Save this size chart. Questions? Send us a DM.' },
      },
    ],
    recommendations: [
      { title: 'Post repair tips on weekday mornings', body: 'Commuters are your largest group and most active 06:00–09:00 on weekdays.', action: 'time' },
      { title: 'Use “winter check-up” as a Lead Flow', body: 'Winter check-up posts bring in the most bookings. A SERVICE keyword could capture them automatically.', action: 'flow', persona: 'p1' },
      { title: 'Add “kids’ bikes” to your Grow topics', body: 'Families convert well locally and it isn’t one of your Grow topics yet.', action: 'topic', persona: 'p3' },
    ],
  },
};
