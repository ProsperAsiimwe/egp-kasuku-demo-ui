export type KasukuApp = {
  id: number;
  slug: string;
  code: string;
  title: string;
  short_name: string;
  desc: string;
  collection: string;
  data_focus: string;
  representative_cards: string[];
};

export function initials(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return title.slice(0, 2).toUpperCase();
}
