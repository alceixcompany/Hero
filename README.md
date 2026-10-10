# NEXUS — Kahramanlar Arenası

Hero / NEXUS: Türkçe açık artırma ve 3B arena oyunu. Aynı cihaz, bot ve iki ayrı cihazdan çevrimiçi oda modları vardır. Yayın için Node.js 22.x kullanılır.

```sh
npm ci
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
- New York, Asgard, Wakanda; ilgili özelliklere %10 arena bonusu. 10 kahramana alan açmak için en ve derinlik %25 büyütülmüştür; platformlar, siperler, başlangıç dizilişleri ve kamera kadrajları birlikte genişler.
- Ayarlanabilir %0–25 kritik şansı ve aynı oranda hasar sapması. %0'da kaçış devam eder.
- Can, kalkan, kritik, kaçış, alan hasarı, iyileştirme; her 3. saldırıda özel yetenek.
- Savaş oynatımı: duraklat, tek hamle, 1× / 2× / 4× hız, günlük ve rövanş.
- Yakın dövüşçüler hedef çevresinde boş yaklaşma noktaları seçer; kavisli yollar ve gövde boyutuna göre aralıklar kalabalığı azaltır. İkili saldırı ve koruyucu da ayrı konum kullanır. Bu görsel hareketler hasar hesabını veya taktik dizilişi değiştirmez.
- Sinema kamerası kahramanların birbirini kapatmasını değerlendirir; belirgin iyileşme varsa en az 8 saniye arayla yumuşak açı değiştirir. Çapraz ve üstten kamera elle seçilebilir; final düellosu bu iki seçimi korur.
- Açık artırma ilerlemesi bu tarayıcıda localStorage ile korunur. Savaşlar bellekte çalışır; sayfa yenilemek takımları korur ve savaşı yeniden başlatmaya izin verir.

## Motor

`dist/engine.mjs` DOM'dan bağımsız kuralları içerir. `dist/auction-ui.mjs` gelecek lotların kimliğini arayüze aktarmadan gizler. `dist/arena-3d.mjs`, Three.js ile hazır iskeletli karakter modelleri, üç arena, ışık, gölge, enerji mermileri, ışın/yıldırım, kalkan ve darbe efektleri çizer. `dist/arena-ui.mjs` savaş panellerini, `dist/app.mjs` oynatımı yönetir. Three.js 0.180.0 çalışma dosyaları `dist/vendor/` içinde yereldir; lisansı yanında bulunur. Yerel/bot modları statik çalışabilir. İki cihaz modu yerelde Node/WebSocket, Vercel’de Function + ortak Redis kaydı kullanır; GitHub Pages tek başına yeterli değildir.

Can: 65 + dayanıklılık × 12. Temel saldırı: güç × 1.5 + enerji × 1.15 + teknoloji × 0.65 + zekâ × 0.4 + 7. Uyum saldırıya eklenir; dayanıklılık normalde ×0.9, delici saldırıda ×0.3 hasar azaltır. Kritik ×1.5; özel hamle ×1.25. Hız ve zekâ hamle sırasına, hız farkı %2–16 kaçışa etki eder. Şans her vuruşta kritik ve hasar sapması yaratır. Hedefler yaşayan rakiplerden rastgele seçilir. 40 tur sınırında kalan can / başlangıç can oranı sonucu belirler.

Puanlar oyuna özel dengeleme değerleridir; resmî Marvel sıralaması değildir. Çevrimiçi modda Node/WebSocket sunucusu oyun durumunu yönetir. Arena artık stilize 3B figürlerle mücadeleyi gösterir; fotoğraf gerçekçiliğinde film modelleri kullanmaz. Geniş/yakın kamera ve tam ekran mevcuttur. WebGL açılamayan cihazlarda takım panelleri ve günlük oynanabilir kalır.

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


## v9 — Canlı müzayede ve iki cihazdan oyun

Her kahramanın açılış teklifi 1 coin'dir. Yeni karakter açıldığında veya teklif sırası değiştiğinde seçici geçerli en düşük teklife döner; aynı sıradaki çevrimiçi güncellemeler seçtiğin tutarı korur. Üstteki sıra bildirimi ve oyuncu kartı, ilk teklif sahibini ve aktif oyuncuyu gösterir. Açılış sırası her karakterde değişir.

**Çevrimiçi → Oda oluştur** ile adını gir. Arkadaşın **Kodla katıl** seçer veya davet bağlantısını açar. Altı karakterli kod yalnızca odayı bulur; oyuncu oturum anahtarı davet URL’sine konmaz. İkiniz **Hazırım** dedikten sonra oda sahibi müzayedeyi başlatır. Arena ve şans ayarlarını oda sahibi seçer; mücadele ve rövanş iki oyuncunun onayıyla başlar. Aynı cihaz ve bot modu korunur.

- Canlı teklif akışı, +1/+3/+5 hızlı teklifler, açılış parlaması, satış bildirimi ve aktif oyuncunun takım uyumu / ikili yetenek ipucu.
- Her teklif sırası 20 saniye; yeni kartta açılış animasyonu için ek 1,5 saniye. Süre dolması otomatik pas. Yerel/bot modunda süre sınırı yok.
- Sunucu teklif sırasını, tamsayı/bütçe/takım sınırını, komut maliyetini, bekleme süresini ve yalnızca oturum sahibinin takımını doğrular. Coin, savaş şansı ve sonuç istemciden kabul edilmez.
- Gelecek lotlar DOM’a veya ağdaki oda durumuna gönderilmez. Sadece aktif/geçmiş kahramanlar açılır; arşiv tüm 30 karakterin genel bilgilerini gösterir.
- Durum sürümü eski istekleri reddeder; istek kimliği tekrarının sonucunu yeniden satın alma yapmadan döndürür. Bağlantıda kalmış teklifler otomatik tekrar gönderilmez.
- Yenileme aynı sekmedeki `sessionStorage` oturumuyla geri katılır. Kopan bağlantı otomatik yeniden denenir. Başka sekmeden aynı oyuncu açılırsa eski sekme devreden çıkar; iki sekme bir takımı aynı anda yönetmez.
- Bir oyuncu kopunca saat ve savaş durur. 2 dakika içinde dönmezse oda kapanır ve bağlı rakip kazanır; iki taraf da çevrimdışıysa kazanan atanmaz. Lobide misafir ayrılırsa koltuğu yeniden kullanılabilir; oda sahibi ayrılırsa oda kapanır.
- Savaşın hamleleri sunucuda aynı sırayla hesaplanır. Kameralar her cihazda ayrı seçilebilir. Oynatma hızını oda sahibi yönetir. Her oyuncu mücadele başına üç kez 30 saniyelik taktik molası kullanabilir; molalar otomatik biter.
- Oda durumları `.data/rooms.json` içinde atomik olarak, `0600` izinle saklanır. Oturum anahtarları diskte SHA-256 özeti olarak tutulur. Sunucu yeniden başlatılırsa oda, bütçe, takım, rastgele sayı durumu ve savaş kuyruğu korunur. Sunucu diske kaydedemezse yeni işlemleri durdurur.
- Origin kontrolü, 4 KB WebSocket paket sınırı, hız sınırı, bağlantı kalp atışı ve yavaş bağlantı koruması bulunur. Bir sunucuda en fazla 300 oda / 600 bağlantı. Bir saat kullanılmayan ve tüm oyuncuları çevrimdışı olan odalar temizlenir.

### İki telefon/bilgisayar, aynı Wi-Fi

`npm run dev` hem `http://127.0.0.1:5173` hem bilgisayarın LAN adresini yazdırır. İkinci cihaz **127.0.0.1 kullanmaz**; terminaldeki `http://192.168.x.x:5173` adresini açar. Yerel cihazdan oluşturulan davet bağlantısı otomatik LAN adresini kullanır. Bilgisayar açık kalmalı; aynı Wi-Fi, TCP 5173 erişimi ve cihazlar arası iletişim gerekir. Konuk Wi-Fi izolasyonu veya işletim sistemi güvenlik duvarı erişimi engelleyebilir. VPN varsa doğru LAN adresini kullanın.

### İnternet üzerinden yayınlama

#### Vercel — oyun ve odalar aynı deploy'da

Proje artık **Vercel üzerinde hem oyunu hem çevrimiçi odaları çalıştırır**. Ayrı Node sunucusu, Render, Docker veya sunucu adresi gerekmez. Root Directory depo kökü olmalı (boş veya `.`); Node 22.x, build komutu, çıktı klasörü ve API ayarları `vercel.json` içindedir.

İlk kurulum:

1. Vercel projesinde **Storage → Create Database → Upstash Redis** seçin (mevcut veritabanı varsa **Connect**). Bu projeye Production ortamında bağlayın. Varsayılan değişken adlarını kullanın; URL veya token'ı elle kopyalamanız gerekmez.
2. Son `main` commit'ini **Deploy / Redeploy** edin.
3. Oyunda **Çevrimiçi → Oda oluştur** seçin; davet linkini arkadaşınıza gönderin. İkiniz de Hazırım dediğinizde müzayedeyi başlatın.

Veritabanının Vercel hesabınıza bağlanması kullanıcı tarafından bir kez tamamlanmalıdır; build script'i hesabınız adına bir servis satın almaz veya bağlantı yetkisi vermez. Entegrasyon `KV_REST_API_URL` / `KV_REST_API_TOKEN` veya `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` değişkenlerini sunucuya verir. Kod ikisini de otomatik tanır. Kayıtlar ilk oda oluşturulduğunda hazırlanır; SQL, migration veya manuel tablo oluşturma yoktur. Yeniden deploy'da aynı veritabanını bağlı tutun.

`npm run build` tüm oyun dosyalarını `build/` içine hazırlar. `api/room.mjs` bir Vercel Function'dır; istemci aynı alan adındaki `/api/room` üzerinden senkronize olur. Davet linki otomatik mevcut oyun adresini kullanır; `PUBLIC_URL`, `ALLOWED_ORIGINS` veya `NEXUS_ROOM_SERVER_URL` girmeniz gerekmez. Son değişken yalnızca eski ayrı WebSocket sunucusu yöntemini bilerek kullanmak isteyenler için korunur; normal Vercel kurulumunda **boş bırakın**.

API, oda durumunu Upstash Redis'te atomik karşılaştır-yaz işlemiyle saklar. Farklı Function instance'ları aynı oda kaydını okur; bir instance eski kaydı yeni bir teklifin üzerine yazamaz. Tekrar edilen istek kimlikleri ikinci kez coin harcamaz; istemci yanıtı kaybolmuş teklifleri otomatik yeniden göndermez. Oyuncu token'ları yalnızca JSON istek gövdesindedir, davet linkinde veya paylaşılan oda durumunda değildir; Redis kaydında SHA-256 özeti bulunur. Redis erişim anahtarları tarayıcıya gönderilmez.

Mücadele ve teklif saatini yetkili sunucu istekleri ilerletir; sürekli çalışan süreç veya cron gerekmez. Bekleme odası yaklaşık 1,5 saniye, mücadele yaklaşık 650 ms aralıklarla kontrol edilir; güncellenmemiş durum yeniden çizilmez. 15 saniye kalp atışı alınamayan oyuncu çevrimdışı sayılır, saat/mücadele durur ve mevcut 2 dakikalık geri dönüş hakkı uygulanır. Tarayıcıyı uzun süre arka plana almak bağlantıyı beklemeye geçirebilir. Aynı oyuncu başka sekmede açılırsa önceki sekme devreden çıkar.

Oda kayıtları yeniden deploy'dan bağımsızdır. Production ve Preview kayıtları ayrılır; Preview ortamını denemek için entegrasyonu o ortama da bağlayın. Gerekirse aynı veritabanını paylaşan farklı projeler için `NEXUS_ROOM_NAMESPACE` belirlenebilir. Kullanılmayan/çevrimdışı odalar temizlenir; tüm ortak kayıt 24 saat hareketsizlikten sonra sona erer. Bu kişisel oyun sürümünde Vercel ortak kaydı en fazla 20 oda / 3 MB ile sınırlandırılmıştır. İstek başına 4 KB, IP başına dakikada 300 istek ve 30 giriş/oda açma sınırı vardır.

Entegrasyon yoksa bot ve aynı cihaz modu çalışır; oda paneli eksik bağlantıyı açıkça gösterir. Kurulum durumu `GET /api/room` ile kontrol edilir; bu yanıt hiçbir erişim anahtarını açıklamaz. Veritabanı erişilemezse yeni teklif onaylanmaz. Vercel ve Upstash kullanım ücretleri seçilen plana ve istek miktarına bağlıdır; planınızı kurulum ekranında inceleyin.

Testler: `npm test`. Ek olarak geçici Redis ortamında `NEXUS_TEST_REDIS_URL` / `NEXUS_TEST_REDIS_TOKEN` ile `node tools/verify-redis-rooms.mjs` gerçek atomik yazma, çakışan teklifler, geri dönüş ve tam savaş akışını doğrular; test anahtarlarını sonunda temizler. Bu değişkenler yalnızca doğrulama içindir, normal deploy için gerekmez.

Kaynaklar: [Vercel–Upstash entegrasyonu](https://upstash.com/docs/redis/howto/vercelintegration), [Redis REST API](https://upstash.com/docs/redis/features/restapi).

#### Node / Docker (oyun ve oda sunucusu birlikte)

GitHub’a kod göndermek çalışan oyun sunucusu oluşturmaz. Node.js/WebSocket destekleyen tek bir sunucu, HTTPS/WSS ve kalıcı disk gerekir. `npm ci && npm start` ile çalıştırın; `PORT` barındırma ortamından alınır. Reverse proxy `/ws` için WebSocket upgrade ve Host başlığını korumalıdır. Sağlık kontrolü: `GET /api/health`. `PUBLIC_URL` gerçek HTTPS adresiyse davet bağlantıları bunu kullanır. `ALLOWED_ORIGINS` gerekirse virgülle ayrılan tam origin adresleriyle ayarlanır. `.env.example` örnektir; Node ortam değişkenlerini hizmet yapılandırmasından veya `node --env-file=.env server.mjs` ile yükleyin.

Docker kullanımı:

```sh
docker compose up --build -d
```

`rooms` volume oda durumlarını yeniden başlatmalar arasında tutar. HTTPS’i reverse proxy üzerinden sağlayın. **Tek uygulama instance/replica çalıştırın.** Oda durumu tek süreçte ve tek diskte tutulur; çoklu sunucu için ortak veri deposu ve dağıtık oda yönlendirmesi eklenmelidir. Kalıcı disksiz bir yayında sunucu yeniden oluşturulursa odalar kaybolur. Oda kodu hesabın yerini tutmaz: bağlantıyı yalnızca oynamasını istediğiniz kişiyle paylaşın; odaya üçüncü oyuncu alınmaz. Sekmenin oturum verisini temizlerseniz sunucu oyuncu anahtarınızı yeniden vermez.

Testler: `npm test`. Oda testleri eşzamanlı/eski/tekrarlanan istekleri, gizli lotları, yetkileri, süre/kopma/geri dönüşü, sunucu yeniden başlatmasını, dosya izinlerini, gerçek WebSocket bağlantılarını, Origin/paket sınırlarını, ortak sonucu ve rövanşı doğrular. GitHub Actions Node 22/24 üzerinde bunları çalıştırır.

### Gizli savaş planı ve arena bölgeleri

Açık artırma tamamlanınca savaş planı modalı açılır. Bir kahraman seçip altı konumdan birine dokunarak yerleştirin; dolu konuma yerleştirmek iki kahramanın konumunu değiştirir. Her kahramana hücum, avcı veya koruma görevi verilebilir. Diziliş savaşta değiştirilemez. Aynı cihazda ilk plan kilitlenince cihaz devir ekranı çıkar; bot kendi planını hazırlar. Çevrimiçi oyunda sunucu, iki oyuncu da kilitleyene kadar rakibin planını snapshot'a eklemez; iki onay aynı savaş durumunu başlatır. Henüz rakip onaylamadıysa kendi planınızın kilidini açabilirsiniz. Yenileme sonrası kilitli çevrimiçi plan geri gelir. Rövanşta iki oyuncu da tekrar planlayabilir.

- Ön saf, normal yakın dövüşçülerin arka sıraya saldırmasını engeller; ön saf düşünce arka sıra açılır. Menzilli saldırılarda yaşayan ön saf, arka sıraya %20 koruma sağlar. Hız 8+ veya uçuşa sahip avcılar bu korumayı aşabilir. Hedef seçimi ön saf kuralını kaldırmaz.
- Avcı, erişebildiği en düşük can oranındaki hedefe yönelir; saldırısı %8 azalır. Koruma görevi saldırıyı %15 azaltır; kahraman tur başına bir defa komşusunun doğrudan hasarının %30'unu üstlenir. Kalkanı bu payı emebilir; elenen koruyucu tekrar kalkmaz.
- Siper, menzilli doğrudan hasarı %20 azaltırken saldırıyı %8 azaltır. Açık alan hem saldırıyı hem doğrudan alınan hasarı %8 artırır. Yüksek platform menzilli saldırıyı %8, uçabilen menzilli kahramanda %12 artırır; yerdeki kahramanların girişimini 1 azaltır.
- Yatay/dikey komşu ikililer her ikinci ortak saldırıda +1 ek yük kazanır. Kişisel alan yetenekleri hedefin komşularına yayılır ve siperi aşar; mevcut ikili alan etkileri tüm diğer yaşayan rakiplere yayılmaya devam eder.

Arena modelleri bu konumlara yerleşir: siperler, basamaklı platformlar, koruma bağlantısı ve avcıların kavisli yaklaşması seçimleri görünür kılar. Ekran etiketleri birbirini kapatmamak için yerleştirilir; görsel hareket savaş hesabından bağımsızdır. Yerel WebSocket odaları ve Vercel Redis odaları aynı kuralları kullanır.

### Karşılaşmalar ve maç özeti

Yakın dövüşte hazırlık, kısa yumruk/kılıç alışverişi ve asıl darbe; uçabilen kahramanlarda yükselme, dalış ve geri dönüş; mistik kahramanlarda hedefi çevreleyen büyü alanı gösterilir. Kaçış, kalkan, alan hasarı ve elenme yetkili savaş hesabına bağlıdır. Animasyondaki hazırlık hamleleri ek hasar vermez; arenadaki can çubukları asıl temas anında değişir.

Maçı bitiren isabetli darbe kısa ve yumuşak ağır çekim kullanır. Normal elemeler ve 40 tur sonunda verilen karar bu efekti başlatmaz. Hız değişimi animasyonun bulunduğu anı korur; azaltılmış hareket tercihi ağır çekimi ve yoğun efektleri kapatır. Yerel ve çevrimiçi sonuç ekranı animasyon tamamlanınca açılır. Kazananlar ekipmanlarına göre zafer pozu alır; elenen karakterler kalkmaz. Yeniden bağlanan cihaz, geçmiş son darbeyi tekrar oynatmaz.

Maç özetinde en çok gerçek can hasarı veren ve en çok koruma katkısı yapan kahraman yer alır. Alan hasarı ve koruyucuya aktarılan hasar hesaba katılır; kalan canın üstündeki hasar sayılmaz. Koruma, üstlenilen doğrudan hasar ve kahramanın verdiği kalkanın gerçekten emdiği hasardır. Oyuncunun takım kalkanı komutu bir kahramana yazılmaz. Kırılma anı, kazananın en çok eleme yapan hamlesi; eşitlikte en çok gerçek hasar veren hamlesidir (beraberlikte iki taraf değerlendirilir). “Arenayı incele” zafer pozlarını açar; “Maç özeti” sonuç kartlarını tekrar gösterir. Çevrimiçi inceleme seçimi yeni snapshot geldiğinde kapanmaz.

Arena, yerel olarak üretilen yansıma ortamı, temas gölgeleri, ekran boyutuna göre gölge çözünürlüğü ve karaktere özgü darbe efektleri kullanır; ek model servisi veya deploy ayarı gerekmez.

## Tepki veren arena ve final düellosu

Her takımın ön ve arka siperinin 72 dayanıklılığı vardır. Gerçek can/kalkan hasarı siperi aşındırır; ağır kahramanlar daha hızlı parçalar. Kıran darbe mevcut korumayı kullanır, sonraki saldırılar siperin %20 menzilli savunmasını ve %8 saldırı kısıtlamasını kaybeder. Kaçırılan darbeler sipere zarar vermez. Dayanıklılık, savaş olayları ve kalıcı yıkım durumu iki çevrimiçi oyuncuya da sunucudan gelir; yeniden bağlanma aynı enkazı gösterir. Rövanş siperleri yeniler.

Hulk’un ağır hazırlanışı ve yer darbesi, Spider-Man’in kavisli sıçrayışı, Wanda’nın iki elle büyü hazırlığı ve Thor’un çakan ışığı farklı hareket/efekt imzaları kullanır. Çatlaklar ve enkaz kalır; geçici toz/parça sayısı sınırlıdır. İskelet hareketleri her karede geri alınarak yeni animasyonla karışır, ölüler bu pozlara girmez.

Her tarafta bir kahraman kaldığı görsel darbe anında final başlar. İki kahramanı kapsayan sabit kadraja yumuşak geçiş yapılır; vuruşlar zoomu değiştirmez. Gereksiz konum yazıları sadeleşir, hedef seçimi, komutlar ve duraklatma erişilebilir kalır. Müzik açıkken daha hızlı, düşük sesli gerilim ritmi eklenir; haricî parça seçiliyse yalnızca alt ritim çalar. Sessiz/duraklatılmış oyun bu ritmi kapatır. Hareket azaltma tercihi otomatik yakınlaşma, parlama ve parçacıkları kapatır.


### Arena v14 — yaralar, zirve yetenekleri ve kesintisiz yakın dövüş

Görünen can oranı iskelet duruşunu ve hareket temposunu etkiler. Hulk düşük canda öne eğilir ve daha saldırgan hareket eder; zırhlı kahramanlarda gövde hasarı ve kısa kıvılcımlar görünür. Uçan yaralı kahramanların inişleri hafif sendeleyebilir. İyileşme yorgunluğu azaltır; zırhın savaş izleri aynı maçta kalır. Efektler asıl temasla güncellenen cana bağlıdır; ölü kahramanlarda aktif davranışlar durur. Rövanş izleri sıfırlar.

Thor, Iron Man ve Wanda **kahraman başına maçta bir kez** zirve yeteneği hazırlar. En az iki kişisel saldırıdan sonra Thor %70, Iron Man/Wanda %65 veya daha düşük canda tetiklenir; tam canda beş kişisel saldırıdan sonra da açılır. Dört saniyelik hazırlık hasar veya enerji üretmez. Oynatma hızı cevap penceresini kısaltmaz; mola ve kopma süreyi dondurur. Thor kararan ışık ve yıldırım, Iron Man altı silah/mühimmat ve ışınlar, Wanda havaya kaldırılan parçalarla hazırlanır. Normal özel saldırı çarpanına ek olarak Thor/Wanda ×1.45, Iron Man ×1.5 ham güç kazanır; Thor/Wanda'nın alan etkisi tüm diğer yaşayan rakiplere yayılır. Kaçış ihtimali devam eder.

Rakip 35 enerjiyle **Karşı hamle** verip zirveyi normal saldırıya indirir. Kesilen yetenek yeniden dolmaz; enerji yalnızca bir kez harcanır. Karşı hamle diğer komutların bekleme süresini atlar, yalnızca rakip hazırlanırken kullanılabilir. Takım kalkanı mevcut enerji/bekleme kurallarıyla kullanılabilir; savunma duruşuna geçiş hazırlık sırasında duruş beklemesini atlar. Klavye: oyuncu 1 için 4, oyuncu 2 için 0; çevrimiçi tuşlar kendi takımını kontrol eder. Bot hazırlığın yaklaşık 1.4. saniyesinde aynı maliyetlerle cevap verir.

Yerde yakın dövüş 1× hızda yaklaşık 3.45 saniyelik yaklaşma, blok, karşılık ve son vuruş sekansına dönüşür. Ara yumruklar/bloklar ek hasar yazmaz; gerçek hasar ve elenme sekansın son temasında gerçekleşir. Kahramanlar başlangıç konumuna dönmek yerine ulaştıkları dövüş noktasında kalır; son vuruş biraz mesafe açar. Dizilişin roller ve bölge bonusları sabit kalır, hareketler fizik tabanlı yeni hasar hesabı oluşturmaz. Hareket azaltma tercihi kısa ve sade saldırılar, kıvılcımsız hasar izleri ve düşük yoğunluklu zirve efektleri kullanır; dört saniyelik cevap süresi korunur.

`battle-climax.mjs` ve `engine.mjs` hem yerel hem iki oda altyapısında aynı yetki kurallarını uygular. `battle-presentation.mjs` temas zamanını iskelet, can çubuğu ve ölüm kilidi arasında paylaşır. Testler hazırlıkta hasarsızlık, tek kullanım, kesme/kalkan/savunma, kaydedilen rastgele durumdan devam, hız/mola/kopma ve süre dolduktan sonra gelen karşı hamleyi kapsar. Görsel kaynakların sınırları, duraklatma, iyileşme, iskelet geçişleri ve cesetlerin yerde kalması da doğrulanır.
