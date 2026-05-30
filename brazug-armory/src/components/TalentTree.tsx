import React from 'react';
import TalentNode from './TalentNode';

interface TalentTreeProps {
  specialization: any;
}

export default function TalentTree({ specialization }: TalentTreeProps) {
  const points = specialization.talents?.reduce((acc: number, t: any) => acc + (t.talent_rank || 1), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-zinc-800">
        <span className="text-xs font-black uppercase text-zinc-400">{specialization.specialization_name}</span>
        <span className="text-xs font-bold text-gold">{points} pts</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {specialization.talents?.map((t: any) => (
          <TalentNode key={t.talent.id} talent={t} />
        ))}
      </div>
    </div>
  );
}
