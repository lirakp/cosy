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

// Automatisch: Frühling, Sommer, Herbst, Winter – je zwei Spieltage
export const AUTO = 'jahreszeiten';
export const SEASONS = ['kirschbluete', 'bergland', 'herbst', 'winter'];
export const DAYS_PER_SEASON = 2;

export const theme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

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
