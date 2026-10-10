// Distinct proportions and signature equipment for every playable hero.
// The imported body/hairstyle topology and animations are Quaternius CC0 assets.
const p=(base,height,width,suit,trim,skin,hair,gear,attack='Punch_Cross')=>({base,height,width,suit,trim,skin,hair,gear,attack});
const skin='#cda184';
export const CHARACTER_PROFILES={
 ironman:p('male',2.52,1.06,'#b32d31','#d8b35a','#d8b35a',null,'armor','Pistol_Shoot'),
 spiderman:p('male',2.24,.82,'#d53246','#204eaa','#d53246',null,'spider','Punch_Jab'),
 thor:p('male',2.65,1.13,'#263e54','#c5d5db',skin,'long-blond','hammer','Sword_Attack'),
 hulk:p('male',3.25,1.5,'#518e42','#58438c','#518e42','buzz-dark','hulk'),
 strange:p('male',2.48,.91,'#214e73','#ae302f',skin,'parted-dark','sorcerer','Spell_Simple_Shoot'),
 panther:p('male',2.4,.99,'#151c2e','#c0c6d1','#151c2e',null,'panther'),
 wanda:p('female',2.36,.92,'#7e203c','#bc455f',skin,'long-auburn','witch','Spell_Simple_Shoot'),
 captain:p('male',2.58,1.1,'#235185','#c53342',skin,null,'shield','Punch_Jab'),
 widow:p('female',2.29,.89,'#1d2837','#687585',skin,'long-auburn','agent','Pistol_Shoot'),
 loki:p('male',2.56,.93,'#1d5545','#d4ac46',skin,'long-dark','horns','Spell_Simple_Shoot'),
 marvel:p('female',2.51,1.02,'#23477a','#d4ac48',skin,'parted-blond','star','Punch_Cross'),
 hawkeye:p('male',2.4,.92,'#382950','#8a66b2',skin,'buzz-dark','bow','Pistol_Shoot'),
 wolverine:p('male',2.18,1.23,'#e1b338','#264d88',skin,null,'claws','Punch_Jab'),
 deadpool:p('male',2.45,.96,'#b42d43','#171f2a','#b42d43',null,'katanas','Sword_Attack'),
 storm:p('female',2.52,.96,'#263447','#dce4f3','#855c43','long-white','storm','Spell_Simple_Shoot'),
 cyclops:p('male',2.48,1.04,'#21529a','#e1b74a',skin,'buzz-dark','visor','Pistol_Shoot'),
 jean:p('female',2.42,.96,'#28704d','#e2bc55',skin,'long-auburn','phoenix','Spell_Simple_Shoot'),
 magneto:p('male',2.57,1.05,'#ac2a4d','#704b92',skin,null,'magnet','Spell_Simple_Shoot'),
 professor:p('male',2.34,.94,'#35463f','#c0a776',skin,null,'chair','Spell_Simple_Shoot'),
 daredevil:p('male',2.43,.95,'#97263a','#591a28',skin,null,'devil','Punch_Jab'),
 punisher:p('male',2.56,1.11,'#202833','#eef0e4',skin,'buzz-dark','skull','Pistol_Shoot'),
 antman:p('male',2.32,.89,'#a42b39','#b9c8d2','#a42b39',null,'ant','Punch_Jab'),
 wasp:p('female',2.2,.84,'#263444','#d8af47',skin,null,'wasp','Pistol_Shoot'),
 vision:p('male',2.53,.98,'#3c886d','#e0ba55','#aa354e',null,'vision','Spell_Simple_Shoot'),
 falcon:p('male',2.46,1.06,'#8d333a','#b6c6ce','#895b42','buzz-dark','falcon','Pistol_Shoot'),
 winter:p('male',2.5,1.08,'#252e3b','#b8cbd2',skin,'long-dark','bionic','Punch_Cross'),
 warmachine:p('male',2.68,1.18,'#465264','#b6c1c9','#465264',null,'wararmor','Pistol_Shoot'),
 rocket:p('male',1.52,1.1,'#b67937','#594537','#8c6d50',null,'raccoon','Pistol_Shoot'),
 groot:p('male',3.12,.88,'#796044','#6f9457','#796044',null,'tree'),
 gamora:p('female',2.43,.96,'#2d3341','#b29a67','#65a359','long-purple','sword','Sword_Attack')
};
export const profileFor=id=>CHARACTER_PROFILES[id];
