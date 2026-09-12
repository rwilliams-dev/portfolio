export const PRESETS = {
  "nyama-choma": {
    label: "Nyama choma / grill",
    theme: { accent: "#8C3A2B", bg: "#F7F1E8", font: "serif" },
    sample: {
      en: {
        tagline: "Slow-fired over open coals",
        heroUrl: "images/hero-choma.jpg",
        hours: "Mon–Thu 12pm–10pm\nFri–Sun 12pm–midnight",
        menu: [
          { name: "Goat ribs, half kilo", price: "$14" },
          { name: "Beef choma platter", price: "$18" },
          { name: "Ugali & sukuma", price: "$5" },
          { name: "Kachumbari", price: "$3" },
        ],
      },
      sw: {
        tagline: "Choma ya moto wa makaa",
        heroUrl: "images/hero-choma.jpg",
        hours: "Jumatatu–Alhamisi 12pm–10pm\nIjumaa–Jumapili 12pm–usiku",
        menu: [
          { name: "Mbuzi choma, nusu kilo", price: "KSh 900" },
          { name: "Nyama ya ng'ombe, sahani", price: "KSh 1,200" },
          { name: "Ugali na sukuma", price: "KSh 200" },
          { name: "Kachumbari", price: "KSh 150" },
        ],
      },
    },
  },

  samaki: {
    label: "Fish / lakeside",
    theme: { accent: "#1F6F63", bg: "#F2F6F4", font: "sans" },
    sample: {
      en: {
        tagline: "From the lake, same morning",
        heroUrl: "images/hero-samaki.jpg",
        hours: "Tue–Sun 11am–9pm\nClosed Mondays",
        menu: [
          { name: "Whole fried tilapia", price: "$16" },
          { name: "Grilled nile perch", price: "$19" },
          { name: "Fish stew & rice", price: "$12" },
          { name: "Chapati", price: "$2" },
        ],
      },
      sw: {
        tagline: "Samaki fresh kutoka ziwani",
        heroUrl: "images/hero-samaki.jpg",
        hours: "Jumanne–Jumapili 11am–9pm\nJumatatu imefungwa",
        menu: [
          { name: "Ngege mzima wa kukaanga", price: "KSh 800" },
          { name: "Mbuta wa kuchoma", price: "KSh 1,000" },
          { name: "Mchuzi wa samaki na wali", price: "KSh 500" },
          { name: "Chapati", price: "KSh 50" },
        ],
      },
    },
  },

  usiku: {
    label: "Bar / late night",
    theme: { accent: "#C9A227", bg: "#14131A", font: "sans" },
    sample: {
      en: {
        tagline: "Cold drinks, hot plates, late hours",
        heroUrl: "images/hero-usiku.jpg",
        hours: "Wed–Thu 5pm–1am\nFri–Sat 5pm–3am\nSun 4pm–midnight",
        menu: [
          { name: "Grilled wings, 6 pc", price: "$9" },
          { name: "Smoked sausage plate", price: "$11" },
          { name: "Chips masala", price: "$6" },
          { name: "Tusker, cold", price: "$4" },
        ],
      },
      sw: {
        tagline: "Vinywaji baridi, chakula cha moto, hadi usiku",
        heroUrl: "images/hero-usiku.jpg",
        hours: "Jumatano–Alhamisi 5pm–1am\nIjumaa–Jumamosi 5pm–3am\nJumapili 4pm–usiku",
        menu: [
          { name: "Mabawa ya kuchoma, 6", price: "KSh 550" },
          { name: "Soseji ya kuvuta", price: "KSh 700" },
          { name: "Chipsi masala", price: "KSh 350" },
          { name: "Tusker baridi", price: "KSh 250" },
        ],
      },
    },
  },
};

export function applyPreset(data, key, lang = data.lang) {
  const preset = PRESETS[key];
  if (!preset) return data;

  const sample = preset.sample[lang === "sw" ? "sw" : "en"];
  const menuIsEmpty = !data.menu?.some(i => i.name || i.price);

  return {
    ...data,
    theme: { ...data.theme, ...preset.theme },
    tagline: data.tagline || sample.tagline,
    heroUrl: data.heroUrl || sample.heroUrl,
    hours: data.hours || sample.hours,
    menu: menuIsEmpty ? sample.menu.map(i => ({ ...i })) : data.menu,
  };
}