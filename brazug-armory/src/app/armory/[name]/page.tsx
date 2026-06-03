import { characterService } from '@/services/character.service';
import Image from 'next/image';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{
    name: string;
  }>;
}

export default async function BrazugArmoryPage({ params }: Props) {
  const { name } = await params;
  const region = 'us';
  const realm = 'doomhowl';
  const character = await characterService.getCharacter(name, realm, region);

  if (!character) {
    notFound();
  }

  const rarityColors: any = {
    'POOR': '#9d9d9d',
    'COMMON': '#ffffff',
    'UNCOMMON': '#1eff00',
    'RARE': '#0070dd',
    'EPIC': '#a335ee',
    'LEGENDARY': '#ff8000',
    'ARTIFACT': '#e6cc80',
    'HEIRLOOM': '#00ccff'
  };

  const slots = [
    'HEAD', 'NECK', 'SHOULDER', 'SHIRT', 'CHEST', 'WAIST', 'LEGS', 'FEET', 'WRIST',
    'HANDS', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2', 'BACK', 'MAIN_HAND', 'OFF_HAND', 'RANGED', 'TABARD'
  ];

  const getItemBySlot = (slot: string) => character.items.find(i => i.slot === slot);

  // Lógica para determinar a Spec Ativa no Classic (baseado em pontos)
  const getActiveSpecName = () => {
    if (character.spec) return character.spec;
    const groups = character.extraData?.specializations?.specialization_groups || [];
    if (groups.length === 0) return 'Unspecialized';
    
    let maxPoints = -1;
    let bestSpec = 'Unspecialized';
    
    groups.forEach((g: any) => {
        g.specializations?.forEach((s: any) => {
            const points = s.talents?.reduce((acc: number, t: any) => acc + (t.talent_rank || 1), 0) || 0;
            if (points > maxPoints) {
                maxPoints = points;
                bestSpec = s.specialization_name;
            }
        });
    });
    
    return maxPoints > 0 ? bestSpec : 'Unspecialized';
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#ccc] font-sans selection:bg-gold selection:text-black">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="flex gap-2 text-xs uppercase tracking-widest text-zinc-500 mb-8">
            <a href="/" className="hover:text-gold transition-colors">Brazug</a>
            <span>/</span>
            <span className="text-zinc-300">Armory</span>
            <span>/</span>
            <span className="text-gold">{character.name}</span>
        </nav>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-center gap-10 mb-16">
          {/* ... (keep profile pic) */}
...
            <h1 className="text-7xl font-black tracking-tighter text-white uppercase leading-none mb-4 italic">
              {character.name}
            </h1>
            <p className="text-2xl font-light text-zinc-400">
              Level <span className="text-white font-bold">{character.level}</span> {character.race} <span className="text-white font-medium">{character.class}</span>
            </p>
            <div className="flex gap-4 mt-6">
                <p className="text-blue-400 font-black uppercase tracking-widest text-sm">
                    {character.guild ? `<${character.guild}>` : 'No Guild'}
                </p>
                <span className="text-zinc-700">|</span>
                <a href={`https://brazug.com/personagem.html?name=${character.name}`} className="text-gold hover:text-white transition-colors text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    Back to Lore <span className="text-[10px]">→</span>
                </a>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Layout: Gear & Stats */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Gear Section */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 flex items-center gap-4">
                Equipment <div className="h-[1px] flex-1 bg-zinc-900" />
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {slots.map(slot => {
                  const item = getItemBySlot(slot);
                  const color = (item && item.quality) ? rarityColors[item.quality] : '#1a1a1a';
                  const iconUrl = item?.icon ? `https://render.worldofwarcraft.com/classic1x-us/icons/56/${item.icon}.jpg` : null;
                  
                  return (
                    <a 
                        key={slot} 
                        href={item ? `https://www.wowhead.com/classic/item=${item.itemId}` : '#'}
                        data-wowhead={item ? `item=${item.itemId}&domain=classic` : ''}
                        className="group relative flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg shrink-0 border border-zinc-800 bg-black flex items-center justify-center relative overflow-hidden"
                        style={{ boxShadow: item ? `inset 0 0 10px ${color}22` : 'none' }}
                      >
                         {iconUrl ? (
                            <img src={iconUrl} alt={item?.name || ''} className="w-full h-full object-cover" />
                         ) : (
                            <span className="text-[8px] font-black text-zinc-800 uppercase">{slot.substring(0, 4)}</span>
                         )}
                         {item && <div className="absolute inset-0 border-2 opacity-20" style={{ borderColor: color }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-zinc-600 uppercase leading-none mb-1">{slot.replace('_', ' ')}</p>
                        <p className="text-sm font-bold truncate leading-tight" style={{ color: item ? color : '#333' }}>
                          {item ? item.name : 'Empty Slot'}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>


            {/* Stats & Talents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Stats */}
                <section>
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 flex items-center gap-4">
                        Attributes <div className="h-[1px] flex-1 bg-zinc-900" />
                    </h2>
                    <div className="space-y-3">
                        {[
                            { label: 'Health', value: character.extraData?.statistics?.health, color: 'text-green-500' },
                            { label: 'Power', value: character.extraData?.statistics?.power, color: 'text-blue-500' },
                            { label: 'Strength', value: character.extraData?.statistics?.strength?.effective },
                            { label: 'Agility', value: character.extraData?.statistics?.agility?.effective },
                            { label: 'Intellect', value: character.extraData?.statistics?.intellect?.effective },
                            { label: 'Stamina', value: character.extraData?.statistics?.stamina?.effective },
                            { label: 'Expertise', value: character.extraData?.statistics?.main_hand_expertise?.value || character.extraData?.statistics?.expertise?.value, color: 'text-gold' },
                        ].map(stat => (
                            <div key={stat.label} className="flex justify-between items-center py-2 border-b border-zinc-900">
                                <span className="text-xs font-bold text-zinc-500 uppercase">{stat.label}</span>
                                <span className={`text-lg font-black italic ${stat.color || 'text-white'}`}>{stat.value || '--'}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Talents */}
                <section>
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 flex items-center gap-4">
                        Talent Trees <div className="h-[1px] flex-1 bg-zinc-900" />
                    </h2>
                    <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-zinc-500 text-[10px] font-black uppercase mb-1 tracking-widest">Active Specialization</p>
                                <p className="text-3xl font-black italic text-white uppercase">{getActiveSpecName()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-500 text-[10px] font-black uppercase mb-1 tracking-widest">Build</p>
                                <p className="text-xl font-black text-gold">
                                    {character.extraData?.specializations?.specialization_groups ? 
                                        character.extraData.specializations.specialization_groups.flatMap((g: any) => 
                                            g.specializations.map((s: any) => 
                                                s.talents?.reduce((acc: number, t: any) => acc + (t.talent_rank || 1), 0) || 0
                                            )
                                        ).join(' / ') : '0 / 0 / 0'
                                    }
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {character.extraData?.specializations?.specialization_groups?.flatMap((g: any) => g.specializations).map((s: any) => {
                                const points = s.talents?.reduce((acc: number, t: any) => acc + (t.talent_rank || 1), 0) || 0;
                                return (
                                    <div key={s.specialization_name} className="space-y-2">
                                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-zinc-800">
                                            <span className="text-[10px] font-black uppercase text-zinc-400">{s.specialization_name}</span>
                                            <span className="text-xs font-bold text-gold">{points} pts</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {s.talents?.map((t: any) => {
                                                const isMax = t.talent_rank === (t.spell_tooltip?.spell?.max_rank || 5);
                                                const spellId = t.spell_tooltip?.spell?.id;
                                                return (
                                                    <li key={t.talent.id}>
                                                        <a 
                                                            href={`https://www.wowhead.com/classic/spell=${spellId}`}
                                                            data-wowhead={`spell=${spellId}&domain=classic`}
                                                            className="text-[10px] text-zinc-500 flex justify-between bg-zinc-950 p-1 rounded border border-zinc-900/50 hover:border-zinc-700 transition-colors"
                                                        >
                                                            <span className={isMax ? "text-gold font-bold" : "text-zinc-400"}>{t.talent.name}</span>
                                                            <span className={`font-mono ml-2 ${isMax ? "text-gold font-bold" : "text-zinc-600"}`}>
                                                                ({t.talent_rank}/{t.spell_tooltip?.spell?.max_rank || '?'})
                                                            </span>
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                            {!s.talents || s.talents.length === 0 && (
                                                <li className="text-[10px] text-zinc-700 italic">No points</li>
                                            )}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
          </div>

          {/* Sidebar: Reputations & Achievements */}
          <div className="lg:col-span-4 space-y-12">
             {/* Reputations */}
             <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 flex items-center gap-4">
                    Reputations <div className="h-[1px] flex-1 bg-zinc-900" />
                </h2>
                <div className="space-y-4">
                    {character.extraData?.reputations?.reputations?.slice(0, 8).map((r: any) => (
                        <div key={r.faction.id} className="group cursor-default">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">{r.faction.name}</span>
                                <span className="text-[10px] font-black uppercase text-blue-500">{r.standing.name}</span>
                            </div>
                            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 opacity-50" style={{ width: `${(r.standing.raw / r.standing.max) * 100}%` }} />
                            </div>
                        </div>
                    )) || <p className="text-zinc-600 text-sm italic">No records found.</p>}
                </div>
             </section>

             {/* Achievements */}
             <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 flex items-center gap-4">
                    Legacy <div className="h-[1px] flex-1 bg-zinc-900" />
                </h2>
                <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                        <span className="text-3xl font-black text-gold italic">{character.extraData?.achievements?.total_quantity || 0}</span>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">Achievement Points</h3>
                    <p className="text-zinc-500 text-xs">A testament to this hero's journey through Azeroth.</p>
                </div>
             </section>

             {/* Professions */}
             <section>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 flex items-center gap-4">
                    Professions <div className="h-[1px] flex-1 bg-zinc-900" />
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {character.professions.map((prof) => (
                        <div key={prof.id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black uppercase text-zinc-400">{prof.name}</span>
                                <span className="text-xs font-bold text-white">{prof.skillPoints} / {prof.maxSkillPoints}</span>
                            </div>
                            <div className="h-1.5 bg-black rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gold opacity-70" 
                                    style={{ width: `${(prof.skillPoints / prof.maxSkillPoints) * 100}%` }} 
                                />
                            </div>
                        </div>
                    ))}
                    {character.professions.length === 0 && (
                        <p className="text-zinc-600 text-sm italic">No active professions found.</p>
                    )}
                </div>
             </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 pt-8 border-t border-zinc-900 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-700">
            <span>Brazug Armory v1.0</span>
            <div className="flex gap-6">
                <a href="#" className="hover:text-gold transition-colors">Lore</a>
                <a href="#" className="hover:text-gold transition-colors">Support</a>
            </div>
        </footer>
      </div>
    </div>
  );
}
