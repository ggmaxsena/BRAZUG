import { characterService } from '@/services/character.service';
import SyncButton from '@/components/SyncButton';
import TalentTree from '@/components/TalentTree';
import Image from 'next/image';

interface Props {
  params: Promise<{
    name: string;
  }>;
}

export default async function CharacterPage({ params }: Props) {
  const { name } = await params;
  const region = 'us';
  const realm = 'doomhowl';

  const character = await characterService.getCharacter(name, realm, region);

  if (!character) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Character Not Found</h1>
          <p className="mt-4 text-gray-600 dark:text-zinc-400 max-w-md">
            This character hasn't been synced to the Armory or created on the website yet.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <SyncButton name={name} realm={realm} region={region} label="Fetch from Blizzard" />
            <p className="text-sm text-zinc-400">ou</p>
            <a href="https://brazug.com/perfil.html" className="text-blue-500 hover:underline">Criar ficha manual no site</a>
          </div>
        </div>
      </div>
    );
  }

  const profile = character?.profiles?.[0];
  const isManualOnly = (character as any).isManualOnly;

  // Guild restriction logic
  const isInBrazug = character?.guild?.toUpperCase() === 'BRAZUG';
  const isDead = profile?.isDead;

  // If character exists but is not in the guild and not dead
  if (!isInBrazug && !isManualOnly && !isDead) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-zinc-950">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-red-600">Access Restricted</h1>
          <p className="mt-4 text-gray-600 dark:text-zinc-400">
            This character is not currently a member of the <strong>BRAZUG</strong> guild.
          </p>
          <p className="mt-2 text-gray-600 dark:text-zinc-400">
            Please verify if your character is still in the guild or if it has perished (Hardcore).
          </p>
          <div className="mt-8">
            <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Search</a>
          </div>
        </div>
      </div>
     );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* 1. Hero/Header */}
        <section className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {character.avatarUrl && character.avatarUrl.startsWith('http') ? (
                <Image 
                  src={character.avatarUrl} 
                  alt={character.name} 
                  fill 
                  sizes="(max-width: 96px) 100vw, 96px"
                  className="object-cover" 
                />
              ) : (
                <span className="text-3xl font-bold text-zinc-400">{character.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-black uppercase text-zinc-900 dark:text-white">{character.name}</h1>
              <p className="text-lg text-zinc-500 dark:text-zinc-400">Level {character.level} {character.race} {character.class}</p>
            </div>
            {!isManualOnly && <SyncButton name={name} realm={realm} region={region} label="Refresh" />}
          </div>
        </section>

        {/* 2. Quick Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 uppercase">Spec</p>
            <p className="font-bold">{character.spec || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 uppercase">Status</p>
            <p className="font-bold">{profile?.isDead ? 'DECEASED' : 'Alive'}</p>
          </div>
        </section>

        {/* 3. Equipment Visual */}
        {character.items.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold mb-4">Equipment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {character.items.map((item) => {
                const rarityColors: any = {
                  'POOR': 'text-gray-400',
                  'COMMON': 'text-white',
                  'UNCOMMON': 'text-green-500',
                  'RARE': 'text-blue-500',
                  'EPIC': 'text-purple-500',
                  'LEGENDARY': 'text-orange-500',
                  'ARTIFACT': 'text-yellow-600',
                  'HEIRLOOM': 'text-blue-300'
                };
                const colorClass = rarityColors[item.quality] || 'text-zinc-400';
                
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                    <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-700 shrink-0 flex items-center justify-center">
                       {/* Placeholder for icon if available */}
                       <span className="text-[10px] text-zinc-500">{item.slot.substring(0, 2)}</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] uppercase text-zinc-500 leading-none mb-1">{item.slot}</p>
                      <p className={`font-bold truncate ${colorClass}`}>{item.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Character Stats (Refined) */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-4">Character Stats</h2>
          {character.extraData?.statistics ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Health</span>
                 <span className="font-medium">{character.extraData.statistics.health || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Power</span>
                 <span className="font-medium">{character.extraData.statistics.power || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Strength</span>
                 <span className="font-medium">{character.extraData.statistics.strength?.effective || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Agility</span>
                 <span className="font-medium">{character.extraData.statistics.agility?.effective || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Intellect</span>
                 <span className="font-medium">{character.extraData.statistics.intellect?.effective || 'N/A'}</span>
               </div>
               <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                 <span className="text-zinc-400">Stamina</span>
                 <span className="font-medium">{character.extraData.statistics.stamina?.effective || 'N/A'}</span>
               </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Stats data not currently available for this character.</p>
          )}
        </section>

        {/* 5. Specializations & Talents */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-4">Specialization & Talents</h2>
          {character.extraData?.specializations?.specialization_groups ? (
            <div className="space-y-6">
              <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">
                Active Spec: {character.spec || 'None'} | Build: {
                    character.extraData.specializations.specialization_groups.flatMap((g: any) => 
                        g.specializations.map((s: any) => 
                            s.talents?.reduce((acc: number, t: any) => acc + (t.talent_rank || 1), 0) || 0
                        )
                    ).join(' / ')
                }
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {character.extraData.specializations.specialization_groups.flatMap((g: any) => g.specializations).map((s: any) => (
                    <TalentTree key={s.specialization_name} specialization={s} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{character.spec || 'No specialization data available.'}</p>
          )}
        </section>

        {/* 5b. Reputations */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-4">Reputations (Top 5)</h2>
          {character.extraData?.reputations?.reputations ? (
            <div className="space-y-2">
              {character.extraData.reputations.reputations.slice(0, 5).map((r: any) => (
                <div key={r.faction.id} className="flex justify-between text-sm items-center border-b border-zinc-50 dark:border-zinc-800 pb-1">
                  <span className="text-zinc-400">{r.faction.name}</span>
                  <span className="font-bold text-blue-500">{r.standing.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No reputation data found.</p>
          )}
        </section>

        {/* 6. Professions */}
        {(character.professions.length > 0 || profile?.prof1Name || profile?.prof2Name) && (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold mb-4">Professions</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Armory Professions */}
              {character.professions.map((prof) => (
                <div key={prof.id} className="text-sm">
                  <p className="text-zinc-400 uppercase text-xs">{prof.name}</p>
                  <p className="font-bold">{prof.skillPoints} / {prof.maxSkillPoints}</p>
                </div>
              ))}
              
              {/* Fallback to Manual Professions if Armory list is empty */}
              {character.professions.length === 0 && (
                <>
                  {profile?.prof1Name && (
                    <div className="text-sm">
                      <p className="text-zinc-400 uppercase text-xs">{profile.prof1Name} (Manual)</p>
                      <p className="font-bold">{profile.prof1Lvl || 0} / 300</p>
                    </div>
                  )}
                  {profile?.prof2Name && (
                    <div className="text-sm">
                      <p className="text-zinc-400 uppercase text-xs">{profile.prof2Name} (Manual)</p>
                      <p className="font-bold">{profile.prof2Lvl || 0} / 300</p>
                    </div>
                  )}
                </>
              )}

              {/* Secondary Professions (Manual Fallback) */}
              {character.professions.length === 0 && (
                <>
                  {profile?.profCookingLvl && profile.profCookingLvl > 0 && (
                    <div className="text-sm">
                      <p className="text-zinc-400 uppercase text-xs">Cooking</p>
                      <p className="font-bold">{profile.profCookingLvl} / 300</p>
                    </div>
                  )}
                  {profile?.profAidLvl && profile.profAidLvl > 0 && (
                    <div className="text-sm">
                      <p className="text-zinc-400 uppercase text-xs">First Aid</p>
                      <p className="font-bold">{profile.profAidLvl} / 300</p>
                    </div>
                  )}
                  {profile?.profFishingLvl && profile.profFishingLvl > 0 && (
                    <div className="text-sm">
                      <p className="text-zinc-400 uppercase text-xs">Fishing</p>
                      <p className="font-bold">{profile.profFishingLvl} / 300</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* 7. Achievements */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-4">Achievements</h2>
          {character.extraData?.achievements ? (
             <div className="flex items-center gap-4">
               <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full">
                 <span className="text-2xl font-black text-gold">{character.extraData.achievements.total_quantity || 0}</span>
               </div>
               <div>
                 <p className="text-sm font-bold">Achievement Points</p>
                 <p className="text-xs text-zinc-500">Total points earned on this character.</p>
               </div>
             </div>
          ) : (
            <p className="text-sm text-zinc-500">Achievements data not currently mapped.</p>
          )}
        </section>

        {/* 8. Guild Info */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-bold mb-4">Guild Info</h2>
          <p className="text-sm font-bold text-blue-600">{character.guild ? `<${character.guild}>` : 'No Guild'}</p>
        </section>

      </div>
    </div>
  );
}
