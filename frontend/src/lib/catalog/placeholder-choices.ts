import type { Variable } from "./types";

// UI editing suggestions, not source-author options or model capability claims.
// Exact token keys avoid guessing the meaning of unknown CMS variables.
const colors = ["soft blue", "sage green", "warm ivory", "deep burgundy"];
const outfits = ["linen shirt and tailored trousers", "simple black dress", "denim jacket and white T-shirt"];
const hair = ["shoulder-length dark curls", "a short auburn bob", "long straight black hair"];
const suggestions: Record<string, readonly string[]> = {
  PROJECT_BRIEF: ["a portfolio for a ceramic artist", "a launch page for a new camera", "a travel journal about coastal towns"],
  MOTION_ASSETS: ["a title reveal and a short process clip per section", "a product close-up and a looping background per section"],
  FINISHING_EFFECTS: ["subtle film grain and warm color tints", "soft shadows, light leaks, and a gentle vignette"],
  LEFT_OUTFIT_COLOR: colors, RIGHT_OUTFIT_COLOR: colors, TOP_COLOR: colors,
  SHORTS_COLOR: colors, PACKAGING_COLOR: colors, BACKGROUND_COLOR: colors,
  PHONE: ["black smartphone", "silver flip phone", "compact white smartphone"],
  CAFE_NAME: ["DAYBREAK", "MOSS", "SUNDAY"],
  FOOD: ["croissant", "strawberry tart", "sandwich"],
  OUTFIT: outfits, CLOTHING: outfits,
  SUBJECT: ["fashion model", "dancer", "traveler"],
  LOCATION: ["courtyard in Lisbon", "city square in Paris", "seaside promenade in Nice"],
  EYE_COLOR: ["hazel", "green", "dark brown"],
  IRIS_COLOR: ["green irises", "hazel irises", "dark brown irises"],
  STUDIO: ["sunlit rehearsal studio", "industrial dance studio", "minimal white studio"],
  DANCER_OUTFITS: ["white T-shirts and charcoal trousers", "matching navy tracksuits", "grey tank tops and black joggers"],
  CITY: ["Tokyo", "Lisbon", "Paris"],
  SHIRT_PATTERN: ["subtle blue pinstripe pattern", "small black polka-dot pattern", "green gingham pattern"],
  ROOM_SCULPTURES: ["two white ceramic sculptures", "three small bronze sculptures", "two carved wooden sculptures"],
  HAIR_COLOR: ["chestnut brown", "auburn with copper highlights", "jet black"],
  HAIR: hair,
  LANDSCAPE: ["rolling green hills", "a misty pine forest", "a sunlit desert landscape"],
  BUILDING_DETAIL: ["a tiny paper balcony", "a folded paper lantern", "a tiny paper window frame"],
  STUDIO_WINDOW: ["a tall arched studio window", "a wide frosted studio window", "a small round studio window"],
  "INSERT LOCATION": ["coastal cafe", "old-town street", "neighborhood bakery"],
  "INSERT DESCRIPTION": ["baker wearing a flour-dusted apron", "traveler wearing a linen shirt", "artist wearing a paint-stained jacket"],
  "INSERT WALL/BUILDING": ["weathered brick cafe wall", "stone bakery facade", "wooden storefront"],
  POSE: ["Sitting naturally", "Standing with one hand in a pocket", "Leaning casually against the wall"],
  PROP_1: ["Vintage Vespa", "Classic bicycle", "Small metal cafe table"],
  PROP_2: ["Pizza and wine", "Croissant and coffee", "Bread and cheese"],
  TEAM: ["Portugal", "Japan", "Brazil"],
  PLAYER_NAME: ["Alex", "Sam", "Robin"],
  JERSEY_NUMBER: ["10", "11", "23"],
  OFFICE: ["a bright coworking meeting room", "a compact design studio office", "a glass-walled conference room"],
  FIRST_TOPIC: ["Creative brainstorming.", "Design systems.", "Visual storytelling."],
  NEXT_TOPIC: ["Building a storyboard.", "Choosing a color palette.", "Testing a prototype."],
  PAJAMAS: ["striped cotton pajama set", "plain linen pajama set", "soft navy pajama set"],
  BEDROOM: ["a cozy attic bedroom", "a minimal sunlit bedroom", "a small bedroom with wooden furniture"],
  EXPRESSION: ["calm and reflective", "warm, relaxed smile", "curious and attentive"],
  TOP: ["white linen button-up shirt", "soft grey crew-neck sweater", "navy cotton T-shirt"],
  PILLOW: ["striped linen pillow", "soft velvet pillow", "small knitted pillow"],
  KEEPSAKE: ["small ceramic figurine", "folded handwritten letter", "vintage postcard"],
  VENUE: ["museum foyer", "indoor music venue", "gallery opening"],
  DRESS: ["sleeveless linen dress", "long floral dress", "simple navy wrap dress"],
  SHIRT: ["blue linen button-up shirt", "plain white cotton shirt", "black short-sleeved shirt"],
  RACE_TERRAIN: ["sandy hillside", "rocky mountain trail", "muddy forest slope"],
  EXHAUST_COLOR: ["orange flames", "violet flames", "white flames"],
  CAR: ["dark green vintage coupe", "silver 1980s hatchback", "navy classic station wagon"],
  LICENSE_PLATE: ["NOVA", "DAY01", "COAST"],
  TOWN: ["quiet hillside village", "colorful fishing town", "old riverside town"],
  COFFEE_ORDER: ["a hot cappuccino", "an espresso", "a cold brew"],
  CABINET_TEXT: ["NEON RACER", "MIDNIGHT ARCADE", "PLAY AGAIN"],
  SIGN_TEXT: ["Game On", "One More Round", "Press Start"],
  CUP: ["blue ceramic coffee cup", "clear glass coffee mug", "reusable stainless-steel coffee cup"],
  POSTER_TEXT: ["NOVA", "AFTER HOURS", "ECHO"],
  BACKGROUND_GRADIENT: ["warm peach to coral", "deep blue to turquoise", "soft lavender to midnight blue"],
  COLOR_PALETTE: ["navy, cream, and rust", "teal, coral, and warm white", "sage green, sand, and charcoal"],
  CITY_SCENE: ["a quiet rain-soaked city street", "a sunlit avenue lined with trees", "a narrow street glowing with neon signs"],
  ATMOSPHERE: ["Quiet and contemplative", "Warm and nostalgic", "Dreamlike and serene"],
  ROOM: ["Minimal loft with large windows and exposed brick", "Cozy room with wooden furniture and warm light", "Bright studio with white walls and linen curtains"],
  WALL_TEXT: ["STAY CURIOUS", "DAYDREAM", "MAKE SOMETHING"],
  WALL_POSTER: ["an astronaut", "a mountain climber", "a fictional comic-book hero"],
  LIP_COLOR: ["soft coral", "muted rose", "warm peach"],
  PENDANT_STONE: ["clear quartz stone", "deep green stone", "pale blue stone"],
  EMBROIDERED_TEXT: ["NOVA", "STUDIO", "SUNDAY"],
  GARMENT: ["linen jumpsuit", "ribbed bodysuit", "simple cotton dress"],
  SKIRT: ["flowing navy midi skirt", "pleated cream skirt", "soft green wrap skirt"],
  VILLA: ["quiet Mediterranean villa", "sunlit hillside villa", "rustic coastal villa"],
  DRESS_PATTERN: ["blue-and-white gingham", "small ivory floral", "green-and-cream stripe"],
  EARRINGS: ["small gold hoop earrings", "pearl drop earrings", "silver stud earrings"],
  BOOK: ["illustrated art book", "worn paperback novel", "clothbound poetry book"],
  "PRODUCT NAME": ["a ceramic travel mug", "a glass perfume bottle", "a pair of wireless headphones"],
  "BRAND / PREMIUM / LUXURY / TECH / BEAUTY / FOOD / DRINK": ["Premium", "Luxury", "Tech", "Beauty", "Food"],
  DEVICE: ["a slim laptop", "a compact tablet", "a flagship smartphone"],
  "DEVICE-WEBSITE": ["a minimalist electronics brand's", "a premium computer maker's", "a modern technology retailer's"],
  COUNTRY: ["Japan", "Italy", "Brazil", "France"],
};

/** Keeps canonical choices/defaults intact; suggestions only fill variables without options. */
export function placeholderChoices(variable: Variable): string[] {
  const clean = (values: readonly string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];
  const existing = clean(variable.options);
  const defaults = clean([variable.defaultValue]);
  if (existing.length) return clean([...defaults, ...existing]);
  const key = variable.token.replace(/^\[|\]$/g, "").trim().toUpperCase();
  let suggested = suggestions[key] ?? [];
  // The same token can replace either just a color or a whole noun phrase.
  if (key === "EYE_COLOR" && /\beyes\b/i.test(variable.defaultValue)) suggested = suggested.map(value => `${value} eyes`);
  if (key === "LANDSCAPE" && /^miniature\b/i.test(variable.defaultValue)) suggested = ["miniature hills", "miniature forests", "miniature waterfalls"];
  return clean([...defaults, ...suggested]).slice(0, 5);
}
