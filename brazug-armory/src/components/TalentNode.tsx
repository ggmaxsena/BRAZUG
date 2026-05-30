import React from 'react';

interface TalentNodeProps {
  talent: any;
}

export default function TalentNode({ talent }: TalentNodeProps) {
  const isMax = talent.talent_rank === (talent.spell_tooltip?.spell?.max_rank || 5);
  const borderClass = isMax ? 'border-gold' : 'border-zinc-700';
  const iconUrl = talent.talent.icon ? `https://render.worldofwarcraft.com/classic1x-us/icons/56/${talent.talent.icon}.jpg` : null;

  return (
    <div className={`relative w-12 h-12 border-2 ${borderClass} rounded bg-zinc-950 flex items-center justify-center`}>
      {iconUrl ? (
        <img src={iconUrl} alt={talent.spell_tooltip.spell.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[8px] text-zinc-600">?</span>
      )}
      <div className={`absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${isMax ? 'bg-gold text-black' : 'bg-zinc-800 text-white'}`}>
        {talent.talent_rank}
      </div>
    </div>
  );
}
