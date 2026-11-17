import { PAL } from './palette.js';

// Landschaften: jede überschreibt einige Farben der Palette, legt fest, was im
// Hintergrund liegt (Berge oder Meer) und welches Wetter fällt.

const BASE = JSON.parse(JSON.stringify(PAL)); // Bergland = Ausgangspalette

export const THEMES = [
  {
    id: 'bergland',
    name: 'Bergland',
    terrain: 'peaks',
    weather: null,
    palette: {},
  },
  {
    id: 'kirschbluete',
    name: 'Kirschblütental',
    terrain: 'peaks',
    weather: 'petals',
    palette: {
      grass: '#5fa85a', grassLight: '#9ad07a', grassDark: '#4a8a50', grassDeep: '#33604a',
      leaf: '#e88ab0', leafLight: '#f8c0d8', leafDark: '#b85a88',
      hillBack: '#5a7a8a', pineBack: '#4a6a7a', hillFront: '#4a8a68', pineFront: '#3a6a58',
      mountainFar: '#b8889a', mountainNear: '#8a6a9a', haze: '#f0b0b8',
      mountainFarDay: '#a0b0d8', mountainNearDay: '#8094c4', hazeDay: '#e4d8ee',
      flowers: ['#fff6d8', '#f2a0b0', '#f8c0d8'],
    },
  },
  {
    id: 'herbst',
    name: 'Herbstwald',
    terrain: 'peaks',
    weather: 'leaves',
    palette: {
      grass: '#8a8a40', grassLight: '#c0a850', grassDark: '#6a6a38', grassDeep: '#4a4a30',
      leaf: '#d0702a', leafLight: '#f0a040', leafDark: '#9a4028',
      hillBack: '#6a5a6a', pineBack: '#4a4a5a', hillFront: '#7a6a3a', pineFront: '#5a4a38',
      mountainFarDay: '#9aa0c0', mountainNearDay: '#7a80a8', hazeDay: '#d0d4e4',
      flowers: ['#f0a040', '#d0702a', '#ffd978'],
    },
  },
  {
    id: 'winter',
    name: 'Winterland',
    terrain: 'peaks',
    snowcaps: true,
    weather: 'snow',
    palette: {
      grass: '#e4ecf6', grassLight: '#ffffff', grassDark: '#c8d4e8', grassDeep: '#a8b8d0',
      leaf: '#e4ecf6', leafLight: '#ffffff', leafDark: '#9aa8c4',
      hillBack: '#c8d4e8', pineBack: '#3d4f6b', hillFront: '#dce6f2', pineFront: '#2c5450',
      mountainFar: '#9a8ab0', mountainNear: '#6f6a98', haze: '#e0c8d8',
      mountainFarDay: '#98aed0', mountainNearDay: '#7890bc', hazeDay: '#dce8f6',
      path: '#b0a090', pathDark: '#908070',
      flowers: ['#ffffff', '#e4ecf6', '#c8d4e8'],
      snow: true,
    },
  },
  {
    id: 'kueste',
    name: 'Küste',
    terrain: 'sea',
    weather: null,
    palette: {
      grass: '#7ab060', grassLight: '#a8d080', grassDark: '#5a9058', grassDeep: '#3a7058',
      hillBack: '#d8c090', pineBack: '#4a8a6a', hillFront: '#c8b080', pineFront: '#3a7a5a',
      path: '#e8d098', pathDark: '#c8b078',
      flowers: ['#fff6d8', '#ffd978', '#9be8e0'],
    },
  },
];

// Portalwelten (nicht wählbar – sie gelten automatisch hinter dem Portal)
export const REALM_THEMES = [
  {
    id: 'hoelle',
    name: 'Hölle',
    realm: true,
    terrain: 'peaks',
    weather: 'embers',
    skies: {
      night: ['#120408', '#1e0608', '#2c080a', '#40100c', '#5a1a10', '#7a2a14'],
      dawn: ['#2a0a10', '#5a1414', '#8a2a18', '#c0441c', '#e8702a', '#ffa040'],
      day: ['#3a0c10', '#6a1a14', '#9a2c18', '#c8461c', '#e86a26', '#ff9a3a'],
      dusk: ['#2a0a10', '#5a1414', '#8a2a18', '#c0441c', '#e8702a', '#ffa040'],
    },
    clouds: { night: ['#2a1418', '#3a1c20'], dawn: ['#5a2a28', '#7a3a30'], day: ['#4a2a2a', '#6a3a34'], dusk: ['#5a2a28', '#7a3a30'] },
    palette: {
      grass: '#5a2420', grassLight: '#8a3a24', grassDark: '#40181a', grassDeep: '#2a1016',
      path: '#6a4036', pathDark: '#4a2a26',
      leaf: '#5a1a1a', leafLight: '#a8301c', leafDark: '#2a0c10',
      hillBack: '#3a1418', pineBack: '#2a0c10', hillFront: '#4a1c1c', pineFront: '#2c0e10',
      mountainFar: '#5a1a1c', mountainNear: '#3a1014', haze: '#c0441c',
      mountainFarDay: '#6a2020', mountainNearDay: '#4a1418', hazeDay: '#e8702a',
      wall: '#5a4a4a', wallShade: '#3a2e30', roof: '#2a1a1e', roofDark: '#1a1014', roofLight: '#ff6a2a',
      wood: '#4a2a24', woodLight: '#6a3a2c', woodDark: '#2a1418',
      stone: '#3a2e34', stoneLight: '#5a4a50', brick: '#5a1a1a',
      magic: '#ff8a3a', star: '#ffb070', moon: '#ff9a6a', moonShade: '#c8604a',
      firefly: '#ff8a3a',
      flowers: ['#ff6a2a', '#ffb03a', '#c0301c'],
    },
  },
  {
    id: 'himmel',
    name: 'Himmel',
    realm: true,
    terrain: 'peaks',
    weather: 'feathers',
    skies: {
      night: ['#1c2050', '#2a3070', '#3a4490', '#5060b0', '#7080c8', '#98a8e0'],
      dawn: ['#9ab8f0', '#b8cef6', '#f0d8f0', '#ffe0d0', '#fff0c8', '#fffbe6'],
      day: ['#7ab8f8', '#98cafa', '#b6dafc', '#d0e8fe', '#e8f4ff', '#fffbe6'],
      dusk: ['#a8a0e8', '#c8b0f0', '#f0c0e0', '#ffd0c0', '#ffe8b8', '#fff6d8'],
    },
    clouds: { night: ['#5060a8', '#7080c0'], dawn: ['#ffffff', '#fff6e6'], day: ['#ffffff', '#ffffff'], dusk: ['#ffe8f0', '#ffffff'] },
    palette: {
      grass: '#eef0ff', grassLight: '#ffffff', grassDark: '#d4daf4', grassDeep: '#b8c0e8',
      path: '#f0d890', pathDark: '#d8b860',
      leaf: '#f4f0ff', leafLight: '#ffffff', leafDark: '#c8c8ec',
      hillBack: '#dce4fa', pineBack: '#c0ccf0', hillFront: '#eef2ff', pineFront: '#d0d8f6',
      mountainFar: '#e0c8e8', mountainNear: '#c8b8e8', haze: '#fff0f6',
      mountainFarDay: '#d8e6fc', mountainNearDay: '#c0d4f6', hazeDay: '#ffffff',
      wall: '#fffaf0', wallShade: '#e8dcc0', roof: '#e8b830', roofDark: '#c8961c', roofLight: '#ffe070',
      wood: '#e8d8b0', woodLight: '#fff4d8', woodDark: '#b8a070',
      stone: '#d8d4e8', stoneLight: '#f4f2ff', brick: '#e8c8a0',
      magic: '#ffe070',
      flowers: ['#ffe070', '#ffffff', '#f8c0d8'],
      snow: true,
    },
  },
];

// Automatisch: Frühling, Sommer, Herbst, Winter – je zwei Spieltage
export const AUTO = 'jahreszeiten';
export const SEASONS = ['kirschbluete', 'bergland', 'herbst', 'winter'];
export const DAYS_PER_SEASON = 2;

export const theme = (id) => THEMES.find((t) => t.id === id) || REALM_THEMES.find((t) => t.id === id) || THEMES[0];

// Welche Landschaft gerade gilt (bei „Jahreszeiten“ abhängig vom Spieltag)
export function resolve(choice, dayCount = 0) {
  if (choice === AUTO) return SEASONS[Math.floor(dayCount / DAYS_PER_SEASON) % SEASONS.length];
  return theme(choice).id;
}

// Setzt die Palette auf die Landschaft; alle danach gezeichneten Bilder nutzen sie.
export function apply(id) {
  const t = theme(id);
  for (const key of Object.keys(PAL)) if (!(key in BASE)) delete PAL[key];
  Object.assign(PAL, JSON.parse(JSON.stringify(BASE)), t.palette);
  return t;
}
