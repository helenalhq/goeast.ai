"use client";

import { useState } from "react";
import { TRIGRAMS } from "@/lib/types";

// Later Heaven (King Wen) arrangement: S=Li, W=Dui, N=Kan, E=Zhen, NW=Qian, NE=Gen, SE=Xun, SW=Kun
const LATER_HEAVEN_ORDER = ["li", "kun", "xun", "dui", "qian", "kan", "gen", "zhen"];

export default function TrigramChart() {
  const [selected, setSelected] = useState<string | null>(null);

  const getPosition = (index: number) => {
    const positions = [
      { x: 50, y: 15 },  // N - Kan (top)
      { x: 85, y: 50 },  // E - Zhen (right)
      { x: 50, y: 85 },  // S - Li (bottom)
      { x: 15, y: 50 },  // W - Dui (left)
      { x: 85, y: 15 },  // NE - Gen
      { x: 15, y: 85 },  // SW - Kun
      { x: 85, y: 85 },  // SE - Xun
      { x: 15, y: 15 },  // NW - Qian
    ];
    return positions[index];
  };

  const orderedTrigrams = LATER_HEAVEN_ORDER.map((name) => TRIGRAMS.find((t) => t.name.toLowerCase() === name)!);
  const selectedTrigram = selected ? TRIGRAMS.find((t) => t.name === selected) : null;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      {/* Center circle */}
      <div className="absolute inset-[30%] rounded-full border-2 border-sand bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-ink">太极</p>
          <p className="text-xs text-warm">Taiji · Supreme Ultimate</p>
        </div>
      </div>

      {/* Trigram nodes */}
      {orderedTrigrams.map((trigram, index) => {
        const pos = getPosition(index);
        const isSelected = selected === trigram.name;
        return (
          <button
            key={trigram.name}
            onClick={() => setSelected(isSelected ? null : trigram.name)}
            className={`absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 transition-all cursor-pointer ${
              isSelected
                ? "border-china-red bg-china-red/10 scale-110 shadow-lg"
                : "border-sand bg-white hover:border-warm hover:scale-105"
            }`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xl">{trigram.symbol}</span>
              <span className="text-xs text-warm">{trigram.name_zh}</span>
            </div>
          </button>
        );
      })}

      {/* Selected detail */}
      {selectedTrigram && (
        <div className="mt-4 p-4 bg-cream rounded-lg border border-sand text-center">
          <p className="text-lg font-bold text-ink">
            {selectedTrigram.symbol} {selectedTrigram.name} ({selectedTrigram.name_zh})
          </p>
          <p className="text-sm text-warm">
            Nature: {selectedTrigram.nature} ({selectedTrigram.nature_zh})
          </p>
          <p className="text-sm text-warm">
            Attribute: {selectedTrigram.attribute} ({selectedTrigram.attribute_zh})
          </p>
          <p className="text-sm text-warm/60">
            Image: {selectedTrigram.image} ({selectedTrigram.image_zh})
          </p>
        </div>
      )}
    </div>
  );
}
