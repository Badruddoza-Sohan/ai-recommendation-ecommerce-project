import { create } from "zustand";

export interface VoiceProductItem {
  id: number;
  name: string;
  slug: string;
  price: string;
  index: number;
}

interface VoiceStoreState {
  currentProducts: VoiceProductItem[];
  setVoiceProducts: (products: any[]) => void;
  clearVoiceProducts: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  currentProducts: [],
  setVoiceProducts: (products: any[]) => {
    const voiceItems = products.map((p, index) => {
      let priceText = "BDT 1,000";
      if (p.price) {
        priceText = typeof p.price === 'number' ? `BDT ${p.price.toLocaleString()}` : `BDT ${p.price}`;
      }
      return {
        id: p.id,
        name: p.name || `Product ${p.id}`,
        slug: p.slug || `item-${p.id}`,
        price: priceText,
        index: index + 1,
      };
    });
    set({ currentProducts: voiceItems });
  },
  clearVoiceProducts: () => set({ currentProducts: [] }),
}));
