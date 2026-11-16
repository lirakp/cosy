import { state } from './state.js';

// Bezahlen mit Duplikaten: Verbesserungen kosten einen Betrag, der mit
// überzähligen Sammelstücken (gerechnet in ihrem Verkaufswert) beglichen wird.

export const dupValue = (items) => items.reduce((sum, item) => sum + state.duplicates(item.id) * item.sell, 0);

export function payWithDuplicates(items, cost) {
  if (dupValue(items) < cost) return false;

  // Die günstigsten Duplikate zuerst nehmen …
  const pool = items.filter((c) => state.duplicates(c.id)).sort((a, b) => a.tier - b.tier);
  const used = [];
  let sum = 0;
  for (const c of pool) {
    for (let i = 0; i < state.duplicates(c.id) && sum < cost; i++) {
      used.push(c);
      sum += c.sell;
    }
  }
  // … und wieder zurücklegen, was am Ende doch nicht gebraucht wird.
  for (let i = 0; i < used.length; ) {
    if (sum - used[i].sell >= cost) {
      sum -= used[i].sell;
      used.splice(i, 1);
    } else i++;
  }
  for (const c of used) state.useDuplicate(c.id);
  // Ein Überschuss wird wie ein Verkauf in Gold ausgezahlt, damit nichts verloren geht.
  state.addGold(sum - cost);
  return true;
}
