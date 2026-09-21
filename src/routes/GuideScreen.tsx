import { useAuth } from "@/contexts/AuthContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-5 first:border-0 first:pt-0">
      <h2 className="font-display text-[18px] font-bold text-[var(--color-ink)]">{title}</h2>
      <div className="flex flex-col gap-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 pl-5 list-decimal">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

export function GuideScreen() {
  const { profile } = useAuth();
  const role = profile?.role;
  const isOwner = role === "owner" || role === "super_admin";
  const isTrainer = role === "trainer";

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex max-w-[64ch] flex-col gap-6 pb-10">
        <div>
          <h1 className="font-display text-[26px] font-bold leading-none text-[var(--color-ink)]">Kullanım kılavuzu</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">
            {isOwner
              ? "Şube sahibi olarak günlük kullanımın ve ders girme adımların."
              : "PT olarak günlük kullanımın: ders girme, başlatma ve bitirme."}
          </p>
        </div>

        <Section title="Takvim nasıl okunur">
          <p>
            Takvim ekranı, o günün (ya da haftanın) tüm derslerini saat saat gösterir. Her renkli daire bir PT'yi temsil
            eder — dairenin içindeki harf, PT'nin isminin baş harfidir. Kendi derslerin her zaman altın rengiyle vurgulanır.
          </p>
          <p>
            Üstteki <strong>Gün / Hafta</strong> butonlarıyla görünümü değiştirebilir, büyüteç ikonlarıyla saatleri
            yakınlaştırıp uzaklaştırabilirsin. Sol taraftaki <strong>PT Filtrele</strong> listesinden bir PT'ye tıklayıp
            takvimde sadece onun derslerini görebilirsin.
          </p>
        </Section>

        {(isTrainer || isOwner) && (
          <Section title="Ders nasıl girilir">
            <p>
              Takvimde boş bir saate dokun. Açılan pencerede dersin süresini, varsa idman türünü ve üyeyi seç, istersen bir
              not ekle, sonra <strong>Dersi Ekle</strong>'ye bas. Ders o saatte, senin adına anında görünür.
            </p>
            {isOwner && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-gold-tint)] px-3 py-2 text-[var(--color-ink)]">
                Şube sahibi olarak sen de PT gibi kendi adına ders girebilirsin — aynı zamanda kendi salonunda ders veren
                bir şube sahibiysen bu tam sana göre. İlk dersini girdiğinde otomatik olarak PT listesine de eklenirsin.
              </p>
            )}
            <p>
              Bir saat doluysa (kapasiteye ulaşmışsa) sistem sana en yakın müsait saati önerir. Şubenin bir saatte kaç ders
              kaldırabileceğini şube sahibi <strong>Ayarlar</strong>'dan değiştirebilir.
            </p>
          </Section>
        )}

        {(isTrainer || isOwner) && (
          <Section title="Dersi başlatma, bitirme, iptal">
            <Steps
              items={[
                "Takvimde kendi dersine dokun, yönetim penceresi açılır.",
                "Ders saati geldiğinde \"Dersi Başlat\" butonuna bas — ders \"Devam ediyor\" olarak işaretlenir.",
                "Ders bitince \"Dersi Bitir\"e bas. Unutursan sistem 1 saat sonra dersi otomatik tamamlanmış sayar.",
                "Ders gerçekleşmeyecekse aynı pencereden iptal edebilirsin.",
              ]}
            />
          </Section>
        )}

        {isTrainer && (
          <Section title="Raporların">
            <p>
              Sol menüden <strong>Raporlarım</strong>'a girerek bu hafta/bu ay kaç ders verdiğini, geçen döneme göre
              artış/azalışını ve idman türüne göre dağılımını görebilirsin.
            </p>
          </Section>
        )}

        {isOwner && (
          <>
            <Section title="Ekip: PT ve üye ekleme">
              <p>
                Sol menüden <strong>Ekip</strong>'e gir. <strong>PT'ler</strong> sekmesinden "Hesap ekle" ile yeni bir PT
                için giriş bilgileri oluşturabilirsin — oluşan geçici şifreyi PT'ye ilet, ilk girişte kullanır.
                <strong> Üyeler</strong> sekmesinden salonunuza kayıtlı üyeleri ekleyip not düşebilirsin (üyeler ayrı bir
                giriş yapmaz, sadece ders kaydında görünür). <strong>Şubeler</strong> sekmesinden yeni bir şube açabilirsin.
              </p>
            </Section>

            <Section title="Genel Bakış ve Raporlar">
              <p>
                <strong>Genel Bakış</strong>, bugün kaç ders girildiğini, en yoğun saati ve PT bazlı günlük dağılımı tek
                ekranda gösterir. <strong>Raporlar</strong>'da şube genelini ya da tek bir PT'yi seçip haftalık/aylık ders
                sayılarını ve idman türü dağılımını inceleyebilirsin.
              </p>
            </Section>

            <Section title="Ayarlar">
              <p>
                Salonunun adı, logosu ve marka rengi; şubenin adresi ve bir saatteki maksimum ders sayısı (kapasite); ve
                idman türleri (Boks, Kickbox gibi) hepsi <strong>Ayarlar</strong>'dan yönetilir. Marka rengini değiştirmen,
                panelin tamamına anında yansır.
              </p>
            </Section>
          </>
        )}

        <Section title="Profil">
          <p>
            Sağ üstten (ya da alt menüden) <strong>Profil</strong>'e girip fotoğrafını değiştirebilir, hangi şubede
            olduğunu görebilir ve çıkış yapabilirsin.
          </p>
        </Section>

        <Section title="Sorun mu var?">
          <p>
            Bir şey beklendiği gibi çalışmıyorsa{" "}
            <a href="mailto:emre.korkmaz2407@gmail.com" className="font-medium text-[var(--color-gold)] underline underline-offset-4">
              emre.korkmaz2407@gmail.com
            </a>{" "}
            adresine yaz.
          </p>
        </Section>
      </div>
    </div>
  );
}
