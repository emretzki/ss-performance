import { Link } from "react-router-dom";

export function TermsScreen() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-paper)] px-6 py-12 text-[var(--color-ink)]">
      <div className="mx-auto flex max-w-[64ch] flex-col gap-6">
        <Link to="/" className="text-[13px] font-medium text-[var(--color-gold)] underline underline-offset-4">
          ← gymkoc.com'a dön
        </Link>

        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight">Kullanım Koşulları</h1>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Son güncelleme: Eylül 2026</p>
        </div>

        <section className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          <p>
            gymkoc'u ("hizmet") kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Bu koşulları kabul etmiyorsanız
            hizmeti kullanmamanızı rica ederiz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Hizmetin tanımı</h2>
          <p>
            gymkoc, spor salonlarının antrenör, ders ve şube yönetimini tek bir panelden yapabilmesini sağlayan bir bulut
            yazılım hizmetidir. Her salon (organizasyon), kendi verilerinden ve kendi hesabından sorumludur; salonlar
            arasında veri paylaşımı yapılmaz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Hesap sorumluluğu</h2>
          <p>
            Hesabınıza ait giriş bilgilerinin gizliliğinden ve hesabınız üzerinden yapılan tüm işlemlerden siz
            sorumlusunuz. Şube sahibi, kendi organizasyonuna eklediği antrenör/üye hesaplarının doğruluğundan ve bu
            kişilerin bilgilendirilmesinden sorumludur.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Kabul edilebilir kullanım</h2>
          <p>
            Hizmeti yalnızca yasalara uygun amaçlarla, başkalarının haklarını ihlal etmeyecek şekilde kullanmayı kabul
            edersiniz. Hizmeti tersine mühendislik yapmak, kötüye kullanmak veya güvenliğini aşmaya çalışmak yasaktır.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Fikri mülkiyet</h2>
          <p>
            gymkoc'un yazılımı, tasarımı ve markası bize aittir. Sizin panele girdiğiniz veriler (üye, ders, şube bilgileri)
            size aittir; hizmeti sunmak dışında bir amaçla kullanılmaz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Hizmetin değişmesi ve sona ermesi</h2>
          <p>
            Hizmeti geliştirmek amacıyla özellikler ekleyebilir, değiştirebilir veya kaldırabiliriz. Hesabınızı istediğiniz
            zaman kapatabilirsiniz; kötüye kullanım tespit edilmesi durumunda hesabı askıya alma hakkımızı saklı tutarız.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Sorumluluğun sınırlanması</h2>
          <p>
            Hizmet "olduğu gibi" sunulur. Kesintisiz veya hatasız çalışacağını garanti etmesek de sürekliliği ve veri
            güvenliğini sağlamak için makul çabayı gösteririz.
          </p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">Uygulanacak hukuk</h2>
          <p>Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir.</p>

          <h2 className="mt-2 font-display text-[18px] font-bold text-[var(--color-ink)]">İletişim</h2>
          <p>
            Sorularınız için{" "}
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
