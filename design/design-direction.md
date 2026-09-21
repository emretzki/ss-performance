# Gymkoç Panel — Tasarım Yönü

## Konu ve iş

Sahada telefonla ders giren PT'ler, masaüstünden takip eden salon sahibi. Takvimin tek işi: PT bir dersi 10 saniyede girebilsin, herkes doluluğu bir bakışta görsün. Bu bir vitrin değil, günde onlarca kez açılacak bir araç — her karar okunabilirlik ve hız lehine.

## Token sistemi

**Renk** (adlandırılmış, logo'dan örneklenmiş):
- `ink` `#17140F` — birincil metin, near-black (logo siyahı)
- `gold` `#96792C` — TEK vurgu: aksiyonlar, seçili durum, **ve giriş yapan PT'nin kendi dersleri**
- `gold-deep` `#6E5A20` — hover/basılı
- `gold-soft` `#C9AF6E` — zayıf tonlar (seçili chip metni, ince vurgular)
- `paper` `#FAF8F4` — uygulama zemini
- `surface` `#FFFFFF` — kart/hücre yüzeyi
- `line` `#E4E0D6` — ince ayraç çizgileri (gölge yerine yapı)
- `ash` `#8A8478` — ikincil/meta metin
- `danger` `#B23B3B` — SADECE gerçek hata (kayıt başarısız, çakışma) — "dolu" bir hata değildir, bu yüzden kırmızı kullanılmaz

**PT rozet renkleri** (marka altın rengiyle karışmasın diye ayrı, mat/toprak tonlu 5'li set): `clay #B0704A`, `moss #6F7D4F`, `slate #556478`, `plum #7A5C74`, `stone #6B6458`. Yeni PT eklendikçe sırayla atanır. **Gold rengi hiçbir PT rozetinde kullanılmaz** — gold sadece "bu ben" anlamına gelir, bu tek başına bir tanıma sistemi kurar (PT kendi dersini renkten anında ayırt eder, isim okumaya gerek kalmaz).

**Tipografi**:
- Başlık/rakam: **Barlow Condensed** (700/800) — logonun bloklu, dar karakterli wordmark'ıyla aynı aile ruhu; saat etiketleri, gün başlıkları, büyük sayılar (raporlardaki "24 ders") bu ailede.
- Gövde/UI: **Inter** (400/500) — küçük boyutta yüksek okunabilirlik, Türkçe karakter desteği tam, tabular-nums saat/sayı hizalaması için.
- Ayrı mono yok — Inter'ın tabular figures'ı saat etiketleri için yeterli, ekstra font yükü almaya değmez.

**Spacing**: 4px birim, hücre içi 8-12px, gruplar arası 24px katları. Yoğun görünümlerde (takvim satırları) 8px ritim korunur, bölümler arası nefes alanı geniş tutulur.

**Şekil/yapı**: 6-10px radius, hairline (`line`) ile ayrım — gölge sadece gerçekten yüzen katmanlarda (bottom sheet, dropdown), statik kart/hücrede gölge YOK.

## İmza öge: 3'lü kapasite çubuğu

Bu ürünün gerçek, kendine özgü kuralı "aynı saatte en fazla 3 ders" — bu kuralı jenerik bir progress bar/donut chart yerine somut bir gösterge haline getiriyoruz: her saat hücresinde **3 kısa dikey çentik** (tally mark gibi). Boş çentik = ince `line` konturlu, boş. Dolu çentik = o dersi veren PT'nin rozet rengiyle (kendi dersiyse gold) dolu. 3/3 dolunca hücre zeminine %4 opaklıkta çapraz hairline doku + "Dolu" etiketi eklenir (renk + doku + metin — tek başına renge güvenilmiyor). Bu çentik motifi takvimde, genel bakış kartlarında (mini legend) ve raporlarda (doluluk oranı görselleştirmesi) tutarlı şekilde tekrar eder — uygulamanın tek "imza" görsel dili budur, başka yerde dekoratif motif yok.

## Takvim: grid ve etkileşim

- Sol sütun saat ekseni, sabit (mobil 56px / masaüstü 72px), tabular saat etiketleri.
- Zoom: pinch DEĞİL — mobil web'de tarayıcı sayfa zoom'uyla çakışır, güvenilmez. Bunun yerine takvim araç çubuğunda kompakt bir +/- stepper, 3 seviye: **Sıkışık / Normal / Detaylı** (30 dk satır yüksekliği 40/64/96px). Tercih `localStorage`'da kalıcı.
- Hücreye dokunma (mobilde tüm hücre dokunma alanı, tek elle kolay) → bottom sheet: saat ön dolu (büyük, sabit), süre chip'leri (30/45/60/90 dk), opsiyonel üye arama (atlanabilir), tek büyük CTA "Dersi Ekle" alt thumb-zone'da. Tek ekran, sihirbaz yok.
- Hücre zaten 3/3 doluysa sheet açılmaz; hücrenin üstünde bağlamsal bir not belirir: *"Bu saat dolu (3/3). En yakın müsait saat: 10:30"* — dokunulabilir chip ile o saate atlanır. Ölü uç yerine bir sonraki adım sunulur.
- Bugünün sütununda anlık saat çizgisi (ince gold çizgi) — işlevsel gerçekçilik detayı.

## Masaüstü ≠ büyütülmüş mobil

Masaüstünde sol sabit panel: şube seçici (admin/süper admin), PT filtre listesi (checkbox + rozet rengi), Gün/Hafta toggle, zoom stepper. Sağda geniş hafta grid'i — sessions küçük dolu bloklar olarak PT baş harfleriyle gösterilir (mobildeki sade çentikten daha bilgi yoğun, çünkü yer var). Hücreye tıklayınca bottom sheet DEĞİL, hücreye ankorlu küçük bir popover açılır (masaüstünde modal-sheet mobil hissi verir, yersiz).

## Metin tonu (arayüzün kendi sesi, özür dilemez, net)

- Boş gün: "Bugün için henüz ders girilmedi. Bir saate dokunup ilk dersi ekle."
- Dolu saat: "Bu saat dolu (3/3). En yakın müsait saat: 10:30"
- Kayıt hatası: "Ders kaydedilemedi. Bu saat az önce doldu, farklı bir saat seçin."
- Filtre sonucu boş: "Bu filtrelerde ders yok."

## Anti-slop denetimi (design-taste-frontend)

Bu skill kendi kapsamını "landing/marketing sayfaları" ile sınırlıyor ve dashboard/admin panellerini açıkça dışarıda bırakıyor (Section 13) — bu yüzden hero/eyebrow/marquee gibi landing'e özgü kuralları bu panele uygulamadım. Sayfa türünden bağımsız evrensel hijyen kısmını uyguladım:
- Em-dash (—) kullanılmayacak, tüm metinlerde düz tire (-) veya nokta/virgül.
- Sahte "kesin" istatistik yok (örn. uydurma %99.9 gibi rakamlar) — raporlardaki sayılar gerçek `sessions` verisinden gelecek.
- Placeholder isim gerekiyorsa (demo/seed data) gerçekçi Türkçe isimler kullanılacak, "Ahmet Yılmaz" tarzı generic değil.
- Tek vurgu rengi (gold) ve tek radius sistemi (6/10/14px) tüm ekranlarda kilitli, sayfa ortasında değişmeyecek.
- Buton/form kontrastı WCAG AA: gold zemin üzerine her zaman `ink` (siyah) metin, asla beyaz-üzerine-beyaz gibi düşük kontrast kombinasyon yok.
- Kart-gölge yerine hairline zaten DNA aşamasında elenmişti, bu denetim bunu doğruladı.

## Hareket spesifikasyonu (işlevsel, tepkisel — scroll-craft kapsam dışı)

`scroll-craft` sinematik scroll-hikaye sayfaları içindir (film grameri, sahne planlama, varlık üretimi) — bu panelde uygulanabilir bir mekanizma değil, bu yüzden kullanılmadı. Yerine DNA motion token'larına (micro 120ms, transition 200ms) dayanan somut kurallar:

| Etkileşim | Süre | Easing | Teknik | Reduced motion |
|---|---|---|---|---|
| Gün ↔ Hafta görünüm geçişi | 200ms | ease-in-out | `transform`+`opacity` cross-fade, içerik yeniden mount değil re-layout | Geçiş süresi 0, anında değişir |
| Saat aralığı zoom (Sıkışık/Normal/Detaylı) | 200ms | ease-in-out | satır yüksekliği CSS custom property (`--row-h`) ile `transition: height`, transform-based değil çünkü grid satır boyu değişiyor | Anında değişir, `transition: none` |
| Ders ekleme bottom sheet aç/kapa | aç 220ms / kapa 160ms (kapanış her zaman girişten hızlı) | aç: ease-out, kapa: ease-in | `transform: translateY()` + backdrop `opacity`, `will-change: transform` sadece açık olduğu sürece | Sheet konum değiştirmeden fade (`opacity` 120ms) |
| Hücre dokunma geri bildirimi (tap) | 100ms | ease-out | `scale(0.97)` `:active`, native touch feedback'e yakın | Değişmez, dokunma her zaman anlık geri bildirim verir (a11y için bu kapatılmaz) |
| Kapasite çentiği dolma anı (yeni ders eklendiğinde) | 150ms | ease-out | çentik `background-color` + `scale(1→1.05→1)` tek seferlik | Renk değişimi anında, scale yok |
| Liste kaydırma (PT/üye listeleri) | native | native momentum scroll | `overflow-y: auto` + `overscroll-behavior: contain`, custom scroll JS YOK | değişmez |
| Toast/inline uyarı ("bu saat dolu") | 150ms giriş | ease-out | `opacity`+`translateY(4px→0)`, otomatik kapanmaz (kullanıcı eylemiyle kapanır) | Sadece `opacity` |
| Realtime güncelleme (başka PT ders girince) | 200ms | ease-out | yeni hücre içeriği `opacity` 0→1 ile beliriyor, sayfa kaymıyor (layout shift yok) | Anında görünür |

Kurallar: yalnızca `transform` ve `opacity` animasyonlanır (satır yüksekliği zoom'u istisna, çünkü grid boyutu gerçekten değişiyor ve bu düşük frekanslı bir etkileşim). Idle/ambient animasyon yok — her hareket bir dokunma/tıklama/realtime veri olayına bağlı. Tüm süreler `prefers-reduced-motion: reduce` altında ya sıfırlanır ya da sadece opacity'e indirgenir.

## Öz-eleştiri (jenerik olan neyi eledi)

- İlk dürtü "her PT'ye rastgele parlak renk + progress bar doluluk" idi — bu jenerik SaaS kalıbı. Yerine: gold'u sadece "ben"e ayırma + 3 çentik motifi konuldu, markaya ve gerçek kurala özgü hale geldi.
- Gölge-kart kalıbı tamamen çıkarıldı, hairline sınırlarla değiştirildi (DNA'daki Linear/Cal.com prensibiyle uyumlu).
- "Dolu" durumu kırmızı yapmadık — kırmızı gerçek hatalara ayrıldı, kapasite dolması bir hata değil normal bir durum.
