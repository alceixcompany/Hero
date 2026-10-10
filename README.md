# NEXUS — Kahramanlar Arenası

Türkçe, tarayıcıda çalışan açık artırma ve arena oyunu. Kurulum bağımlılığı yok.

```sh
npm run dev
```

Tarayıcı: http://127.0.0.1:5173. Motor testleri: `npm test`.

## Oyun

- Aynı cihazda iki oyuncu veya bot rakip, kişi başı 20 coin.
- 30 Marvel karakterinden rastgele 10 karakter; takım başına en fazla 5 üye.
- Gelecek karakterler kapalı kart olarak görünür; isim, portre ve detay bağlantısı yalnızca lot başladığında açılır.
- Sırayla artan teklifler, pas ile satış, sadece kazanan teklifin tahsil edilmesi.
- İki ilk pas satış olmadan lotu geçer. Hiç üyesi olmayan takıma açık artırma sonunda satılmamış bir karakter ücretsiz verilir.
- Karakter arşivi, iki karakter karşılaştırması, 6 özellik ve karaktere özel yetenekler.
- New York, Asgard, Wakanda; ilgili özelliklere %10 arena bonusu.
- Ayarlanabilir %0–25 kritik şansı ve aynı oranda hasar sapması. %0'da kaçış devam eder.
- Can, kalkan, kritik, kaçış, alan hasarı, iyileştirme; her 3. saldırıda özel yetenek.
- Savaş oynatımı: duraklat, tek hamle, 1× / 2× / 4× hız, günlük ve rövanş.
- Açık artırma ilerlemesi bu tarayıcıda localStorage ile korunur. Savaşlar bellekte çalışır; sayfa yenilemek takımları korur ve savaşı yeniden başlatmaya izin verir.

## Motor

`dist/engine.mjs` DOM'dan bağımsız kuralları içerir. `dist/auction-ui.mjs` gelecek lotların kimliğini arayüze aktarmadan gizler. `dist/arena-3d.mjs`, Three.js ile hazır iskeletli karakter modelleri, üç arena, ışık, gölge, enerji mermileri, ışın/yıldırım, kalkan ve darbe efektleri çizer. `dist/arena-ui.mjs` savaş panellerini, `dist/app.mjs` oynatımı yönetir. Three.js 0.180.0 çalışma dosyaları `dist/vendor/` içinde yereldir; lisansı yanında bulunur. Doğrudan statik barındırılabilir.

Can: 65 + dayanıklılık × 12. Temel saldırı: güç × 1.5 + enerji × 1.15 + teknoloji × 0.65 + zekâ × 0.4 + 7. Uyum saldırıya eklenir; dayanıklılık normalde ×0.9, delici saldırıda ×0.3 hasar azaltır. Kritik ×1.5; özel hamle ×1.25. Hız ve zekâ hamle sırasına, hız farkı %2–16 kaçışa etki eder. Şans her vuruşta kritik ve hasar sapması yaratır. Hedefler yaşayan rakiplerden rastgele seçilir. 40 tur sınırında kalan can / başlangıç can oranı sonucu belirler.

Puanlar oyuna özel dengeleme değerleridir; resmî Marvel sıralaması değildir. İlk oynanabilir sürüm aynı cihazda çalışır; çevrimiçi oda sunucusu yoktur. Arena artık stilize 3B figürlerle mücadeleyi gösterir; fotoğraf gerçekçiliğinde film modelleri kullanmaz. Geniş/yakın kamera ve tam ekran mevcuttur. WebGL açılamayan cihazlarda takım panelleri ve günlük oynanabilir kalır.

## Görseller

Karakter portreleri [akabab/superhero-api](https://github.com/akabab/superhero-api) kaynağından alınmıştır; dosya bazlı bağlantılar `dist/assets/sources.json` içinde kayıtlıdır. Marvel karakterleri ilgili hak sahiplerine aittir. Fontlar Google Fonts üzerinden Barlow Condensed ve DM Sans; sistem fontları yedek olarak mevcuttur.

ImageGen ile 4×3 çizgi roman karakter atlası üretimi denendi; aracın otomatik kontrolü çıktıyı reddetti ve üretilmiş bir dosya teslim edilmedi. Kullanılan portreler yerel `dist/assets/` dosyalarıdır.

## Arena v3

- Kahramanların yakın dövüş / menzilli saldırı ve uçuş profilleri var. 12 uçabilen karakter havada süzülür; zırhlılarda itici, Falcon/Wasp'ta kanat hareketi görünür. Karakterler savaş boyunca konum değiştirir, rakiplerine döner; yakın dövüşçüler yaklaşır, kaçar ve geri çekilir.
- Three.js GLTFLoader ile Kenney City Kit (Commercial) 2.1 ve Nature Kit'ten 8 hazır GLB çevre modeli yüklenir. Modeller ve şehir paleti yereldir; kaynak ve CC0 lisansları `dist/assets/models/` içindedir. Model yüklenemediğinde mevcut temel çevre çalışmaya devam eder. Kahramanlar bu sürümde kendimiz oluşturduğumuz stilize, eklemli 3B figürlerdir; hazır Marvel film karakteri modelleri kullanılmaz.
- Enerji 35 ile başlar; takım saldırısında +8, rakip saldırısında +4 kazanır (en fazla 100). Güç patlaması 35 enerjiyle sonraki 3 takım saldırısını %25 artırır. Takım kalkanı 35 enerjiyle yaşayan karakterlere 22 kalkan verir (sınır 60). İkinci nefes 50 enerjiyle yaşayan karakterlere en fazla 20 can verir; elenmiş karakterleri diriltmez. Komutlar arasında 3 takım saldırısı gerekir.
- Dengeli / Hücum / Savunma duruşları gerçek savaş formülünü etkiler; değişiklikler arasında 2 takım saldırısı gerekir. Hücum: +%18 saldırı, −%30 dayanıklılıktan gelen hasar azaltma. Savunma: −%10 saldırı, +%25 dayanıklılıktan gelen hasar azaltma, +4 yüzde puan kaçış (üst sınır %20). Duruşlar can miktarını değiştirmez.
- Hedef seçimi yaşayan belirli bir rakibe odaklanır; hedef elenince otomatik seçime döner. Bot, enerji ve takımın kalan canına göre aynı maliyetlerle komut kullanır.
- Sinematik, geniş ve yakın kameralar; tam ekranda da çalışan hızlı komutlar; mobil komut panelleri; hareket azaltma tercihi desteği. Konum animasyonları görseldir; hasar, karakter puanları ve taktikler üzerinden hesaplanır. Serbest joystick kontrolü veya fizik tabanlı aksiyon oyunu değildir.

## Arena v4 — kesintisiz kamera ve takip

Sinema modu artık sabit bir tarafta kalır. Her saldırıda odak değişimi yumuşatılır; saldırı sonlarında merkeze ani dönüş, özel saldırılarda otomatik zoom ve kamera sarsıntısı yoktur. Kamera konumu ve bakış noktası kare süresine bağlı olarak ayrı ayrı sönümlenir. Kamera modu ve ekran boyutu değişimleri de geçiş yapar. `camera-rig.mjs` için farklı FPS, hızlı hedef değişimi ve geçiş sınırı regresyon testleri vardır.

Arayüz güncellenirken `arena-dom.mjs` 3B tuvali, etiketleri ve efekt katmanlarını yerinde tutar. Aynı boyutta `renderer.setSize` tekrar çağrılmaz; rAF döngüsü her hamlede yeniden başlatılmaz. Animasyon ilerlemesi aktif kare süresiyle hesaplanır. Duraklatma saldırıyı dondurur; tek hamle animasyonu tamamlar; hız değiştirmek saldırı evresini korur. Otomatik oynatma, düşük FPS'de de mevcut animasyon bitmeden sonraki saldırıyı başlatmaz. Hamle ortasında duraklatılırsa sağ ok / «Hamleyi tamamla» önce bu saldırıyı tamamlar, sonraki basış yeni hamleyi başlatır. Açık kalması istenen yerel geliştirme sunucusu kullanıcı durdurana kadar çalışmaya devam eder.

Sıradaki hamle şeridi yalnızca gerçek savaş kuyruğunu gösterir; gelecek turun rastgele sırasını önceden hesaplamaz. Üçüncü kişisel saldırıya hazırlanan kahramanlar `ÖZEL HAZIR` etiketi alır. Arena etiketine tıklamak karşı takımın o kahramana odaklanmasını sağlar. Darbe kartı saldıran/hedef portrelerini, hasarı, kalkanın emdiği miktarı ve saldırı ilerlemesini gösterir. Ses açıksa darbe anında yakın / menzilli vuruşa uygun kısa sentez ses çalınır.

Kısayollar: Boşluk duraklat / devam et; sağ ok duraklatılmışken tek hamle; 1/2/3 oyuncu 1 güç/kalkan/can komutları; 7/8/9 oyuncu 2 komutları. Form, hedef seçimi ve modal açıkken kısayollar devre dışıdır. Bot tarafına oyuncu komutu verilemez. Hız kontrolleri arena içinde de bulunduğundan tam ekran görünümünde kullanılabilir.

## Arena v5 — iskeletli kahramanlar

[Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) Standard paketinin erkek/kadın gövdeleri, saç ve sakal modelleri ile [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) animasyonları kullanılır. Bunlar CC0 varlıklardır; resmî Marvel veya film modelleri değildir. 30 karakterin kostümü, boyu, eni, saç rengi ve ekipmanı `character-profiles.mjs` / `character-models.mjs` içinde uyarlanır. Thor'un çekici, Captain America'nın kalkanı, Wolverine'in pençeleri, Falcon/Wasp kanatları, Rocket kuyruğu, Groot dalları ve Professor X sandalyesi kemikleri takip eder.

65 kemikli gövdeler GLB olarak yüklenir. 14 hazır klip; bekleme, yürüme, yumruk, kılıç, ateş, büyü, darbe, kaçış ve elenme hareketlerini sağlar. Her savaşçı ve önizleme bağımsız iskelet/mixer kullanır; önizlemeyi kapatmak arenayı etkilemez. Professor X saldırırken oturma pozu korunur. Model yüklenemezse arenada mevcut figür yedek olarak kalır.

Karakter detaylarındaki **3B modeli incele** düğmesi büyük bir vitrin açar: sürükleyerek döndür, Hazır / Yürü / Saldır animasyonlarını seç, Portre'ye dön. Vitrin kapatıldığında renderer ve model kaynakları bırakılır. Dosyalar yereldir; yaklaşık 3 MB ortak model/animasyon indirmesi önbellekte paylaşılır. Kaynaklar, lisanslar ve SHA-256 kayıtları `dist/assets/characters/` içindedir. Paketleme adımı `python3 tools/prepare-characters.py BASE_PACK.zip ANIMATION_LIBRARY.glb` ile tekrarlanabilir. `npm test` bütün 30 modeli, bağımsız iskeletleri ve elenme pozunun sonraki saldırılarda korunmasını da doğrular.

## Arena v6 — kalıcı elenme, ses ve Marvel bağları

`fighter-life.mjs` elenmeyi savaş boyunca kilitler. Sonraki arayüz güncellemesi, geciken model yüklemesi, alan hasarı veya başka bir saldırı elenmiş kahramanı canlı duruma döndüremez. Modelin kendi ölüm pozu da kilitlidir; yalnızca yeni savaş/rövanşın açık `reset()` çağrısı bekleme pozunu geri getirir. Eski figür yedeğinde de yere düşme açısı korunur. Regresyon testleri pelvis açısına ek olarak başın zemine yakın kalmasını ve geç gelen hareket/olayların karakteri kaldırmamasını kontrol eder.

`game-audio.mjs` indirme gerektirmeyen özgün Web Audio efektleri ve hafif müzik üretir. Sekiz karakter ses ailesi (enerji, yıldırım, büyü, atış, kılıç, ağ, kalkan, yumruk), kaçış/kalkan/elenme, ikili hamle, komut, açık artırma ve sonuç sesleri vardır. Sesi ilk kullanıcı hareketi açar. Efekt/müzik düzeyi ve sessiz tercih `nexus-audio-v1` ile saklanır. Başlıktaki **SES** ve tam ekran arenadaki **♪** ayarları açar. Duraklatma veya sekmenin gizlenmesi müziği susturur; zamanlayıcı durur. Master gain ve kompresör ses tepe seviyelerini sınırlar.

`team-links.mjs` yedi ilişkiyi tanımlar: Captain America–Winter Soldier, Wanda–Vision, Iron Man–Spider-Man, Rocket–Groot, Iron Man–War Machine, Hank Pym–Janet van Dyne ve Black Widow–Hawkeye. İlişki kaynakları her kaydın `source` alanında Marvel'ın resmî sayfalarına bağlanır. İkili yeteneklerin adları ve denge etkileri bu oyun için tasarlanmıştır; çizgi roman veya filmdeki resmî yetenek adları olarak sunulmaz.

İki üye aynı takımda ve hayattayken üyelerden gelen her saldırı ortak sayaca 1 yük ekler. 4 yükte isabetli saldırı otomatik ikili hamleye dönüşür; kaçış olursa yük korunur. Bir saldırıda en fazla bir ikili hamle çalışır; bir üye elenince bağ kapanır. Ek hasar kalkan tarafından emilir; alan hasarı, hedef zayıflatma ve ikili kalkanları gerçek motor sonuçlarıdır, kalkan 60 sınırını aşmaz. Yük veya yetenekler yeni savaşa taşınmaz. Grup uyumu ve kişisel her-3-saldırı yetenekleri ayrıca çalışır.

Arşivde **Marvel bağları** rehberi, kahraman detaylarında eşleşmeler, açık artırma takımında tamamlanmış ikililer ve arena altında yük göstergeleri bulunur. İkili hamlede yardımcı karakterin iskeleti de saldırır, ikinci ışın ve ortak darbe halkası görünür; savaş günlüğü ikiliyi kaydeder. Gelecek lot kimlikleri gizli kalır. `npm test` yedi yeteneğin etkilerini, çapraz takımın bağ kuramamasını, kaçışta yükün korunmasını, elenmenin kalıcılığını ve ses çizgesinin/mute davranışının geçerliliğini doğrular.
