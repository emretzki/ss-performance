import { Link } from "react-router-dom";

export function PrivacyScreen() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] px-6 py-12 text-[var(--color-ink)]">
      <div className="mx-auto flex max-w-[64ch] flex-col gap-6">
        <Link to="/" className="text-[13px] font-medium text-[var(--color-gold)] underline underline-offset-4">
          ← gymkoc.com'a dön
        </Link>

        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight">Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Son güncelleme: Eylül 2026</p>
        </div>

        <section className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          <p>
            gymkoc ("biz", "platform"), spor salonlarının antrenör, üye ve ders yönetimini tek bir panelden yapabilmesini
            sağlayan bir yazılım hizmetidir. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri
            sorumlusu sıfatıyla hangi kişisel verileri, hangi amaçla işlediğimizi açıklar.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Hangi verileri işliyoruz</h2>
          <ul className="list-disc pl-5">
            <li>Hesap sahibi ve antrenörlerin ad soyad, e-posta ve telefon bilgileri</li>
            <li>Salon/şube bilgileri (isim, adres, kapasite ayarları)</li>
            <li>Ders/seans kayıtları (tarih, saat, antrenör, süre)</li>
            <li>Üye kayıtları, salon yöneticisinin panele kendi ekleyeceği ölçüde</li>
            <li>Oturum açma ve kullanım logları (güvenlik ve hata teşhisi amacıyla)</li>
          </ul>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Verileri neden işliyoruz</h2>
          <p>
            Bu veriler yalnızca hizmetin çalışması için gereklidir: hesabınızın oluşturulması ve yönetilmesi, takvim/ders
            planlamasının yapılabilmesi, raporların üretilmesi ve destek taleplerinizin yanıtlanması. Pazarlama amaçlı
            profilleme veya reklam amacıyla kullanılmaz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Nerede saklanıyor</h2>
          <p>
            Veriler, bulut altyapı sağlayıcımız (Supabase/AWS) üzerinde şifreli olarak barındırılır. Verileriniz, hesabınız
            aktif olduğu sürece ve yasal saklama yükümlülüklerimiz gereği tutulur; hesap kapatma talebinde makul bir süre
            içinde silinir veya anonimleştirilir.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Üçüncü taraflarla paylaşım</h2>
          <p>
            Verileriniz, hizmeti sunabilmemiz için kullandığımız altyapı sağlayıcıları (barındırma, e-posta gönderimi) dışında
            hiçbir üçüncü tarafla satılmaz, kiralanmaz veya pazarlama amacıyla paylaşılmaz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">KVKK kapsamındaki haklarınız</h2>
          <p>
            KVKK madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,
            işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içi/yurt dışı aktarıldığı üçüncü
            kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini/yok edilmesini isteme ve bu işlemlerin
            aktarıldığı üçüncü kişilere bildirilmesini isteme haklarına sahipsiniz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">İletişim</h2>
          <p>
            Gizlilikle ilgili her türlü soru, talep veya KVKK başvurunuz için{" "}
            <a href="mailto:emre.korkmaz2407@gmail.com" className="font-medium text-[var(--color-gold)] underline underline-offset-4">
              emre.korkmaz2407@gmail.com
            </a>{" "}
            adresinden bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
