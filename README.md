# SportScience Panel

PT / üye / ders yönetim paneli. Mobil öncelikli, çok şubeli, gerçek kullanımda olacak bir yönetim uygulaması (React + Vite + Supabase).

Tasarım kararları ve gerekçeleri: [`design/design-direction.md`](design/design-direction.md) (bkz. [`design-dna.json`](design/design-dna.json)).

## Geliştirme

```bash
npm install
npm run dev
```

Supabase henüz bağlı değilken (`.env` boşsa) uygulama otomatik olarak **mock mod**da çalışır: `localStorage`'da tutulan örnek verilerle (şubeler, PT'ler, üyeler, dersler) tam işlevsel şekilde kullanılabilir. Giriş ekranında demo hesaplardan biri seçilerek (PT / şube sahibi / süper admin) her rol test edilebilir.

## Supabase'e bağlama

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur.
2. Proje ayarlarından `Project URL` ve `anon public` anahtarını al.
3. `.env.example` dosyasını `.env.local` olarak kopyala, iki değeri doldur:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. `supabase/migrations/` altındaki SQL dosyalarını sırayla çalıştır (Supabase Dashboard → SQL Editor, veya Supabase CLI ile `supabase db push`):
   - `0001_init.sql` — tablolar, kapasite kısıtı (aynı saatte en fazla 3 ders), RLS politikaları.
   - `0002_realtime.sql` — `sessions` tablosunda anlık güncelleme (bir PT ders girince herkesin ekranı anında yenilenir).
   - `0003_notes_and_avatars.sql` — ders notu alanı, PT profil fotoğrafları için `avatars` storage bucket'ı ve izinleri.
5. Supabase Auth'ta **ilk** kullanıcıyı (kendini, süper admin olarak) oluştur — bundan sonrakiler uygulama içinden eklenecek:
   - Dashboard → Authentication → Users → Add user (Auto Confirm User işaretli) → oluşan UID'yi kopyala.
   - Table Editor → `profiles` → Insert row: `id` = o UID, `role` = `super_admin`, `full_name` = adın, `branch_id` boş.
6. **Edge Function'ı deploy et** — bu, uygulama içinden "PT/şube sahibi ekle" dediğinde yeni hesabı güvenle oluşturan sunucu tarafı fonksiyon (servis anahtarını tarayıcıya hiç çıkarmadan):
   - Dashboard → **Edge Functions** → **Deploy a new function**.
   - İsim: `create-person`.
   - Kod alanına `supabase/functions/create-person/index.ts` dosyasının tüm içeriğini yapıştır, Deploy'a bas.
   - Ekstra bir ayar gerekmiyor — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` her fonksiyona Supabase tarafından otomatik sağlanıyor.
7. `npm run dev`'i yeniden başlat — uygulama artık gerçek verilerle çalışır, giriş ekranı e-posta/şifre formuna döner.

Bu adımlardan sonra yeni şube, PT ve şube sahibi ekleme tamamen uygulama içinden (Ekip sekmesi) yapılır — Supabase'e bir daha girmene gerek kalmaz.

## Yapı

- `src/lib/api.ts` — tüm veri erişimi buradan geçer; Supabase bağlıysa gerçek sorgular, değilse `src/lib/mockStore.ts` üzerinden mock veri kullanır. Ekranlar hangi modda olduğunu bilmez.
- `src/components/calendar/` — uygulamanın kalbi: gün/hafta takvimi, kapasite göstergesi, ders ekleme akışı.
- `design/` — tasarım DNA'sı, tasarım yönü ve hareket spesifikasyonu.
