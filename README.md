# Salon Yönetim Paneli

Çok kiracılı (multi-tenant) spor salonu yönetim paneli — her salon kendi markası, ekibi ve verisiyle tamamen izole çalışır. Mobil öncelikli, gerçek kullanımda olacak bir yönetim uygulaması (React + Vite + Supabase).

Tasarım kararları ve gerekçeleri: [`design/design-direction.md`](design/design-direction.md) (bkz. [`design-dna.json`](design/design-dna.json)).

## Geliştirme

```bash
npm install
npm run dev
```

Supabase henüz bağlı değilken (`.env` boşsa) uygulama otomatik olarak **mock mod**da çalışır: `localStorage`'da tutulan örnek verilerle (iki ayrı örnek salon — Gymkoç Demo ve Fitness Farm — kendi şube/PT/üye/ders verileriyle) tam işlevsel şekilde kullanılabilir. Giriş ekranında demo hesaplardan biri seçilerek her rol ve her salon test edilebilir; "Yeni salon oluştur" ile yeni bir organizasyon da (mock modda) yaratılabilir.

## Supabase'e bağlama (sıfırdan kurulum)

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur.
2. Proje ayarlarından `Project URL` ve `anon public` (publishable) anahtarını al.
3. `.env.example` dosyasını `.env.local` olarak kopyala, iki değeri doldur:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. `supabase/migrations/` altındaki SQL dosyalarını **sırayla** SQL Editor'da çalıştır:
   - `0001_init.sql` — temel tablolar, kapasite kısıtı, RLS.
   - `0002_realtime.sql` — `sessions` tablosunda anlık güncelleme.
   - `0003_notes_and_avatars.sql` — ders notu, PT profil fotoğrafı (`avatars` bucket).
   - `0004_multi_tenant.sql` — **çok kiracılı dönüşüm**: `organizations` tablosu, her şubeye özel ders kapasitesi, idman türleri, canlı ders (başlat/bitir) alanları, organizasyon bazlı RLS.
   - `0005_cron.sql` — devam eden bir ders 1 saati geçerse otomatik "tamamlandı" işaretlenmesi (5 dakikada bir çalışan zamanlanmış görev). Hata verirse önce Dashboard → **Database** → **Extensions**'tan `pg_cron`'u etkinleştirip tekrar dene.
   - `0006_subdomains.sql` — her organizasyona bir `slug` (alt alan adı) atar, giriş ekranının marka gösterebilmesi için herkese açık bir "sadece marka bilgisi" okuma izni ekler.
5. Supabase Auth'ta **ilk** kullanıcıyı (kendini, ilk salonun sahibi olarak) oluştur — bundan sonrakiler uygulama içinden eklenecek:
   - Dashboard → Authentication → Users → Add user (Auto Confirm User işaretli) → oluşan UID'yi kopyala.
   - Table Editor → `organizations` → Insert row: `name`, `accent_color` (örn. `#96792C`), `owner_auth_id` = o UID.
   - Table Editor → `profiles` → Insert row: `id` = aynı UID, `organization_id` = az önce oluşturduğun organizasyonun id'si, `role` = `owner`, `full_name`.
   - Table Editor → `branches` → Insert row: `organization_id`, `name`, `max_concurrent_sessions` (örn. `3`).
6. **Edge Function'ları deploy et** (Dashboard → **Edge Functions** → **Deploy a new function**, her biri için kodun tamamını yapıştır):
   - `create-person` — mevcut PT/şube sahibi ekleme fonksiyonu, organizasyon bazlı yetki kontrolüyle güncellendi. **Zaten deploy ettiysen bu güncellenmiş haliyle yeniden deploy et.**
   - `create-organization` — **yeni**: "Yeni salon oluştur" ekranının kullandığı, sıfırdan bağımsız bir salon (organizasyon + ilk şube + varsayılan idman türü) kuran fonksiyon.
   - İkisi için de ekstra ayar gerekmiyor — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` otomatik sağlanıyor.
7. `npm run dev`'i yeniden başlat.

Bundan sonra: yeni bir salon **/signup** ekranından kendi kendine (self-servis) oluşturulabilir; mevcut bir salonun sahibi kendi ekibini, şubelerini, marka logosunu/rengini ve idman türlerini tamamen uygulama içinden (Ekip + Ayarlar) yönetir — Supabase'e bir daha girmeye gerek kalmaz.

## gymkoc.com domain'ini bağlama (alt alan adları: salonadi.gymkoc.com)

Uygulama artık hostname'e göre davranıyor: `gymkoc.com` (kök) herkese açık, markasız bir karşılama sayfası gösterir; `salonadi.gymkoc.com` doğrudan o salonun (kendi logosu/rengiyle) giriş ekranına gider. Bunun için:

1. Vercel projesinde **Settings → Domains** → `gymkoc.com` ekle, ardından ayrıca `*.gymkoc.com` (wildcard) ekle.
2. Wildcard domain için Vercel, domain'in **tüm nameserver'larının** Vercel'e devredilmesini ister (tek bir CNAME kaydı yeterli olmuyor). Domain kayıt firmanın panelinde domain'in Nameservers ayarını "Özel/Custom" yapıp `ns1.vercel-dns.com` ve `ns2.vercel-dns.com` olarak değiştir. Bu, domain'in tüm DNS yönetimini Vercel'e taşır — domain üzerinde başka bir servis (ör. e-posta/MX kaydı) varsa nameserver değişikliğinden sonra o kayıtları Vercel'in kendi DNS panelinden yeniden eklemen gerekir.
3. SSL sertifikaları (kök + wildcard) nameserver değişikliği yayıldıktan sonra Vercel tarafından otomatik sağlanır; birkaç dakikadan birkaç saate sürebilir. Vercel → Domains sayfasında `*.gymkoc.com` yanında yeşil "Valid Configuration" yazana kadar bekle.
4. `0006_subdomains.sql` migration'ını çalıştırdıktan sonra her organizasyonun bir `slug`'ı olur (isimden otomatik türetilir, örn. "Gymkoç Demo" → `gymkocdemo`). Mevcut organizasyonların slug'ını Table Editor → `organizations`'tan görüp istersen değiştirebilirsin.
5. Yeni bir salon `/signup`'tan oluşturulduğunda otomatik olarak kendi `slug.gymkoc.com` adresine yönlendirilir.

Not: Vercel'in varsayılan `*.vercel.app` adresi de çalışmaya devam eder (o zaman uygulama "kiracı yok" moduna düşer ve markasız giriş ekranını gösterir) — asıl kullanım artık her zaman kendi alt alan adı üzerinden olacak.

## Yapı

- `src/lib/api.ts` — tüm veri erişimi buradan geçer; Supabase bağlıysa gerçek sorgular, değilse `src/lib/mockStore.ts` üzerinden mock veri kullanır. Ekranlar hangi modda olduğunu bilmez.
- `src/contexts/OrganizationContext.tsx` — aktif organizasyonun logo/renk bilgisini okuyup CSS değişkenlerini (`--color-gold` vb.) çalışma anında günceller; bu sayede her salon kendi markasını görür, kod değişmez.
- `src/components/calendar/` — uygulamanın kalbi: gün/hafta takvimi, PT avatarlı doluluk göstergesi, ders ekleme/başlatma/bitirme/iptal akışı.
- `design/` — tasarım DNA'sı, tasarım yönü ve hareket spesifikasyonu.
