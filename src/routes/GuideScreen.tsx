import { Link } from "react-router-dom";
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
  // Reachable both signed in (per-role view) and from the public landing
  // domain, before signup, as a selling point in outreach material — with
  // no profile there's no role to branch on, so show the combined picture
  // (both the owner's and the PT's day-to-day) rather than nothing.
  const isOwner = !profile || role === "owner" || role === "super_admin";
  const isTrainer = !profile || role === "trainer";

  return (
    <div className={profile ? "flex-1 overflow-y-auto p-4 lg:p-6" : "min-h-[100dvh] bg-[var(--color-paper)] p-4 lg:p-6"}>
      <div className="mx-auto flex max-w-[64ch] flex-col gap-6 pb-10">
        {!profile && (
          <Link to="/" className="text-[13px] font-medium text-[var(--color-gold)] underline underline-offset-4">
            ← gymkoc.com'a dön
          </Link>
        )}
        <div>
          <h1 className="font-display text-[26px] font-bold leading-none text-[var(--color-ink)]">Kullanım kılavuzu</h1>
          <p className="mt-1.5 text-[13px] text-[var(--color-ash)]">
            {!profile
              ? "gymkoc'ta bir gününüz nasıl geçer — şube sahibi ve PT gözünden."
              : isOwner
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
              artış/azalışını ve idman türüne göre dağılımını görebilirsin. Ayrıca bu ay <strong>verdiğin derslerin
              değerini</strong> (üyelerin paket birim fiyatına göre) ve buna karşılık <strong>kazandığın primi</strong> de
              burada görürsün — sadece kendi rakamların, salonun ya da diğer PT'lerin kazancı gösterilmez. Bu, salonun
              gerçek cirosundan farklıdır: ciro paketin ödendiği aya yazılır, buradaki rakam ise o ay fiilen verdiğin
              derslerin değeridir.
            </p>
          </Section>
        )}

        {isOwner && (
          <>
            <Section title="Ekip: PT ekleme">
              <p>
                Sol menüden <strong>Ekip → PT'ler</strong>'e gir, "PT ekle"ye bas. Ad soyad, e-posta ve bir geçici şifre
                gir (otomatik önerilen şifreyi kullanabilir ya da kendin yazabilirsin), hangi şubeye ait olduğunu seç.
              </p>
              <p className="rounded-[var(--radius-md)] bg-[var(--color-danger-tint)] px-3 py-2 text-[var(--color-danger)]">
                Hesap oluşunca şifre <strong>bir kez</strong> gösterilir. Kapatmadan önce mutlaka kopyala ve PT'ye ilet —
                "Tamam" butonu sen kopyalamadan aktif olmaz. Kopyalamayı unutsan bile sorun değil: PT kendi giriş
                ekranındaki <strong>"Şifremi unuttum"</strong> bağlantısıyla e-postasına gelen linkle yeni bir şifre
                belirleyebilir.
              </p>
              <p>
                <strong>Şubeler</strong> sekmesinden yeni bir şube açabilirsin.
              </p>
              <p>
                Bir PT'ye tıklayınca <strong>prim oranını</strong> ayarlayabilirsin — bu PT'nin verdiği bir dersten alacağı
                yüzde. Örn. ders birim fiyatı 1.300 TL, oran %40 ise PT 520 TL, salon 780 TL kazanır. Kendi verdiğin
                dersler bu hesaba dahil değildir — hepsi doğrudan salon karına yazılır.
              </p>
            </Section>

            <Section title="Üyeler ve paketleri">
              <p>
                Sol menüden <strong>Üyeler</strong>'e gir, "Üye ekle"ye bas. Üyeler ayrı bir giriş yapmaz, sadece ders
                kaydında isim olarak görünür. Birden fazla şuben varsa üye formunda bir <strong>Şube</strong> seçici
                çıkar — bir üyeyi başka bir şubeye taşımak istersen aynı yerden değiştirebilirsin.
              </p>
              <p>
                Bir üyeye tıklayınca <strong>paket adı, toplam ücret ve toplam ders sayısı</strong> girebilirsin — birim
                fiyat (ücret ÷ ders sayısı) otomatik hesaplanır. Üye listesinde her satırda kaç ders kaldığını gösteren
                animasyonlu bir çubuk görürsün; bu üyeye her ders girdiğinde çubuk otomatik azalır.
              </p>
              <p>
                Paket kutusundaki adı, ücreti ya da ders sayısını düzeltmek artık sadece bir düzeltmedir — bir yazım
                hatasını düzeltmek geçmişi ya da ciroyu etkilemez. Üyeye gerçekten <strong>yeni bir paket</strong>
                (yenileme ya da ilk paket) vermek için <strong>"+ Yeni paket ekle"</strong>'ye bas: adı, ücreti, ders
                sayısı ve <strong>ödeme tarihini</strong> gir.
              </p>
              <p>
                İki seçeneğin var: <strong>"Hemen başlat"</strong> — mevcut paket dersleri bitmemiş olsa bile şimdi
                değiştirilsin istiyorsan; eski paket anında geçmişe (Geçmiş paketler) kaydedilir, yeni paket sayaç
                sıfırlanarak hemen başlar. <strong>"Gelecek paket olarak ekle"</strong> — üye mevcut paketi bitmeden
                önceden ödeme yaptıysa: ciroya hemen (ödeme tarihine göre) yazılır, ama üyenin ders sayacı mevcut paket
                gerçekten bitene kadar değişmez; paket bitince sıradaki otomatik devreye girer, ekstra bir işlem
                yapmana gerek kalmaz.
              </p>
              <p>
                Ders ücreti toplu alındığı için ciro, ödeme tarihinin ait olduğu aya yazılır — dersler sonraki aya sarksa
                bile sonraki ayın cirosuna eklenmez. PT primi buna bağlı değildir: her PT'ye, o ay <strong>fiilen
                verdiği</strong> dersler üzerinden ödenir.
              </p>
            </Section>

            <Section title="Genel Bakış ve Raporlar">
              <p>
                <strong>Genel Bakış</strong>, bugün kaç ders girildiğini, en yoğun saati ve PT bazlı günlük dağılımı tek
                ekranda gösterir. <strong>Raporlar</strong>'da şube genelini ya da tek bir PT'yi seçip haftalık/aylık ders
                sayılarını ve idman türü dağılımını inceleyebilirsin.
              </p>
              <p>
                Birden fazla şuben varsa Raporlar'ın üstünde ayrı bir <strong>Şube</strong> filtresi çıkar: tek bir
                şubeyi seçebilir, ya da <strong>"Tüm şubeler"</strong>e basıp bütün şirketin toplamını (ciro, gider, prim,
                kâr — hepsi birleşik) görebilirsin. Bu filtre, sol üstteki şube seçiciden bağımsız çalışır. PT'ler
                sadece kendi şubelerinin raporunu görür, bu filtreyi göremez.
              </p>
              <p>
                "Tüm şube" seçiliyken <strong>bu ayın cirosunu</strong> (o ay ödenen paketlerin toplamı), <strong>giderleri</strong>
                (Ayarlar'da girdiğin sabit aylık giderler), PT'lere ödenecek toplam primi ve bunların sonucunda kalan
                <strong> salon karını</strong> görürsün. Tek bir PT seçersen, o PT'nin o ay verdiği derslerin değeri ve ona
                ödenecek prim gösterilir — bu, o PT'nin verdiği derslerin değeridir, ciro değildir; ciro paketin ödendiği
                aya, prim ise dersin fiilen verildiği aya göre hesaplanır.
              </p>
            </Section>

            <Section title="Ayarlar">
              <p>
                Sol menüden <strong>Ayarlar</strong>'a gir. Dört bölüm var:
              </p>
              <p>
                <strong>Marka</strong> — salonun logosunu yükle, salon adını ve marka rengini belirle.
                Seçtiğin renk, panelin tamamında (butonlar, vurgular, senin ve PT'lerinin gördüğü her yerde) anında
                kullanılır.
              </p>
              <p>
                <strong>Şube</strong> — şube adı, adres ve <strong>bir saatte kaç ders girilebileceği</strong> (kapasite)
                buradan ayarlanır. Kapasiteyi salonun büyüklüğüne göre belirle: küçük bir stüdyoysan 1-2, geniş bir
                salonsan daha fazla olabilir. Birden fazla şuben varsa, önce sol menünün üstündeki <strong>Şube</strong>
                seçiciden düzenlemek istediğin şubeyi seç — Ayarlar sayfası her zaman o an seçili olan şubeyi gösterir.
              </p>
              <p>
                <strong>İdman türleri</strong> — Boks, Kickbox, Fitness gibi kategoriler ekleyip her birine bir renk
                verebilirsin. Bu renkler takvimde ders çemberinin etrafında halka olarak görünür ve Raporlar'da hangi türe
                ne kadar ders girildiğini karşılaştırmanı sağlar. Artık kullanmadığın bir türü çöp kutusu ikonuyla
                silebilirsin.
              </p>
              <p>
                <strong>Giderler</strong> — kira, elektrik gibi düzenli aylık giderlerini gir (örn. Kira - 30.000 TL). Her
                biri her ay otomatik olarak Raporlar'daki salon karından düşülür, ayrıca bir işlem yapmana gerek kalmaz.
              </p>
            </Section>
          </>
        )}

        <Section title="Profil">
          <p>
            Sol menüden (mobilde alt menüden) <strong>Profil</strong>'e gir. Buradan fotoğrafını değiştirebilir, hangi
            şubede olduğunu görebilir ve çıkış yapabilirsin. İlk girişten sonra kendi bilgilerini de kendin
            güncelleyebilirsin — kimseye ihtiyacın yok:
          </p>
          <Steps
            items={[
              "Ad soyad ve telefon numaranı Bilgilerin kartından değiştirip kaydedebilirsin.",
              "Şifre değiştir kartından, ilk giriş için kullandığın geçici şifreyi kendi seçtiğin bir şifreyle değiştirebilirsin.",
              "E-posta kartından e-posta adresini güncelleyebilirsin — yeni adresine bir onay bağlantısı gider, ona tıklayana kadar eski adresin geçerli kalır.",
            ]}
          />
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
