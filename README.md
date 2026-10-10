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
- New York, Asgard, Wakanda; ilgili özelliklere %10 arena bonusu.
- Ayarlanabilir %0–25 kritik şansı ve aynı oranda hasar sapması. %0'da kaçış devam eder.
- Can, kalkan, kritik, kaçış, alan hasarı, iyileştirme; her 3. saldırıda özel yetenek.
- Savaş oynatımı: duraklat, tek hamle, 1× / 2× / 4× hız, günlük ve rövanş.
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
