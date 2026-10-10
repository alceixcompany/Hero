// Relationships are Marvel-inspired; skill names and balance values belong to this game.
export const LINK_CHARGE=4;
export const TEAM_LINKS=[
 {id:'old-friends',members:['captain','winter'],name:'Sonuna kadar',relation:'Steve ve Bucky · Eski dostlar',color:'#9bc6eb',desc:'Kalkan ve biyonik kol birleşir: +16 hasar, ikiliye +12 kalkan.',effect:{damage:16,shield:12},source:'https://www.marvel.com/comics/discover/998/captain-america-winter-soldier'},
 {id:'chaos-resonance',members:['wanda','vision'],name:'Kaos rezonansı',relation:'Wanda ve Vision · Kalpten bağ',color:'#f385ba',desc:'Kaos ve yoğunluk: +12 hasar, diğer rakiplere 8 alan hasarı, ikiliye +10 kalkan.',effect:{damage:12,splash:8,shield:10},source:'https://www.marvel.com/comics/guides/2030/love-story-of-scarlet-witch-and-vision'},
 {id:'iron-web',members:['ironman','spiderman'],name:'Demir ağ',relation:'Tony ve Peter · Mentor ve öğrenci',color:'#f0bf77',desc:'Ağla tut, reaktörle vur: +14 hasar; hedefin sonraki saldırısı −%35.',effect:{damage:14,weaken:true},source:'https://www.marvel.com/articles/comics/iron-spider-suit-history-explained'},
 {id:'root-rocket',members:['rocket','groot'],name:'Kök ve roket',relation:'Rocket ve Groot · Guardians ortaklığı',color:'#b9d589',desc:'Köklerin arasından salvo: +18 hasar, ikiliye +12 kalkan.',effect:{damage:18,shield:12},source:'https://www.marvel.com/comics/issue/54929'},
 {id:'double-reactor',members:['ironman','warmachine'],name:'Çifte reaktör',relation:'Tony ve Rhodey · Zırhlı dostlar',color:'#9de6ff',desc:'İki zırh, eş zamanlı ateş: +20 hasar, diğer rakiplere 6 alan hasarı.',effect:{damage:20,splash:6},source:'https://www.marvel.com/characters/war-machine-james-rhodes/on-screen/'},
 {id:'pym-crossfire',members:['antman','wasp'],name:'Pym çaprazı',relation:'Hank ve Janet · Kurucu Avengers',color:'#f3d57a',desc:'Küçül, kuşat, vur: +14 hasar; hedefin sonraki saldırısı −%35, ikiliye +8 kalkan.',effect:{damage:14,weaken:true,shield:8},source:'https://www.marvel.com/comics/guides/995/marvels_antman_and_the_wasp'},
 {id:'budapest',members:['widow','hawkeye'],name:'Budapeşte protokolü',relation:'Natasha ve Clint · Güvenilir ortaklar',color:'#cea3ef',desc:'Elektroşok ve hassas ok: +16 hasar; hedefin sonraki saldırısı −%35.',effect:{damage:16,weaken:true},source:'https://www.marvel.com/comics/issue/115190/black_widow_hawkeye_2024_1_variant/'}
];
export const teamLinks=ids=>TEAM_LINKS.filter(link=>link.members.every(id=>ids.includes(id)));
export const heroLinks=id=>TEAM_LINKS.filter(link=>link.members.includes(id));
