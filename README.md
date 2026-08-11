# LAZANA HR Bot

"LAZANA" ishlab chiqarish korxonasi uchun ish qidiruvchi nomzodlardan anketa qabul qiluvchi Telegram bot,
PostgreSQL ma'lumotlar bazasi, bot-ichi admin rejimi (`/admin`) va alohida FastAPI web-admin panel.

Texnik topshiriq: `LAZANA_HR_Bot_TZ.md` (loyihaning boshlang'ich talablari hujjati).

## 1. Tarkib

```
app/
  config.py            — .env dan sozlamalarni o'qiydi (pydantic-settings)
  db/
    models.py           — SQLAlchemy 2.0 (async) modellari — TZ bo'lim 4
    seed_data.py         — 3 kategoriya + 53 lavozim + statik matnlar (TZ 2.5-2.7, 4.8)
    seed.py               — seed_data.py ni bazaga yozadi (idempotent)
    create_web_admin.py    — web-admin panel uchun login/parol o'rnatadi
  bot/
    main.py              — botni ishga tushiruvchi kirish nuqtasi
    texts.py              — barcha bilingual (uz/ru) UI matnlari
    steps.py               — A/B/S kategoriyalari uchun savollar ketma-ketligi
    validators.py            — F.I.Sh., telefon, manzil, sana, erkin matn validatsiyasi
    keyboards.py              — inline/reply klaviaturalar
    handlers/                  — start, menu, til, anketa FSM, /admin
    middlewares/                 — DB sessiya + rate limiting
  services/
    notifications.py              — HR guruhiga bildirishnoma
    export.py                       — CSV eksport generatori
admin_panel/               — FastAPI web-admin (JWT autentifikatsiya + statik SPA)
alembic/                    — DB migratsiyalari
tests/                        — unit testlar (validatorlar)
```

## 2. Loyihaviy qarorlar (TZ dagi ochiq savollarga javoblar)

TZ bo'lim 11 dagi ochiq savollar bo'yicha quyidagi qarorlar qabul qilindi — kerak bo'lsa keyinchalik o'zgartirilishi mumkin:

1. **Admin panel** — ikkalasi ham qurildi: tezkor bot-ichi `/admin` rejimi **va** to'liq FastAPI web-panel (`admin_panel/`).
2. **HR bildirishnomasi** — `HR_NOTIFY_CHAT_ID` da ko'rsatilgan Telegram guruh/kanalga yuboriladi (TZ 5.2 formatida).
3. **Rad etilganlarga avtomatik javob** — MVPda yo'q (F13 dan tashqarida). Kerak bo'lsa `app/bot/handlers/admin.py` dagi status o'zgarish joyiga qo'shish oson.
4. **Parallel arizalar** — bitta foydalanuvchi bir vaqtning o'zida bir nechta yo'nalishga ariza topshira olmaydi; oxirgi arizadan keyin `REAPPLY_COOLDOWN_HOURS` (standart 24 soat) ichida yangi ariza boshlay olmaydi (F19).
5. **Hosting** — hujjatlashtirilmagan, istalgan Ubuntu 22.04+ VPS da Python + PostgreSQL + Redis o'rnatib ishga tushiriladi.
6. **Ma'lumotlarni saqlash muddati** — MVPda avtomatik arxivlash/o'chirish yo'q; `application_status_history` orqali to'liq tarix saqlanadi, keyinchalik retensiya siyosati alohida qo'shilishi mumkin.

Qo'shimcha qaror: **web-admin login** uchun `admins` jadvaliga ixtiyoriy `username`/`password_hash` ustunlari qo'shildi (faqat web-panelga kiradigan adminlar uchun to'ldiriladi; bot-ichi admin faqat Telegram ID whitelisting orqali ishlaydi, TZ 7.5 ga mos).

Rollar (TZ 6.3): `viewer` — faqat ko'rish; `hr` — ko'rish + status o'zgartirish + eksport; `super_admin` — bulardan tashqari lavozimlar/matnlar/adminlarni boshqarish.

## 3. Talablar

- Python 3.12+, PostgreSQL 15+, Redis 7+ (barchasi lokal/serverda o'rnatilgan bo'lishi kerak)
- Telegram bot tokeni ([@BotFather](https://t.me/BotFather) orqali)

## 4. Ishga tushirish

1. Muhitni tayyorlang:

```bash
python -m venv .venv && source .venv/bin/activate  # yoki .venv\Scripts\activate (Windows)
pip install -r requirements-dev.txt
cp .env.example .env
```

`.env` faylida quyidagilarni to'ldiring: `BOT_TOKEN`, `HR_NOTIFY_CHAT_ID`, `POSTGRES_PASSWORD`,
`DATABASE_URL`, `REDIS_URL` (lokal PostgreSQL/Redis manzillariga moslang), `ADMIN_JWT_SECRET`
(tasodifiy uzun satr), `BOOTSTRAP_SUPER_ADMIN_ID` (o'zingizning Telegram ID raqamingiz —
[@userinfobot](https://t.me/userinfobot) orqali bilib olishingiz mumkin).

2. Migratsiyalarni bajaring va boshlang'ich ma'lumotlarni yuklang:

```bash
alembic upgrade head
python -m app.db.seed
```

3. Botni va web-admin panelni ishga tushiring (alohida terminallarda):

```bash
python -m app.bot.main
uvicorn admin_panel.main:app --reload --port 8000
```

4. Botga Telegramda `/start` yuboring — ishlashi kerak. `/admin` buyrug'i faqat
   `BOOTSTRAP_SUPER_ADMIN_ID` sifatida ko'rsatilgan Telegram ID uchun ishlaydi.

5. Web-admin panelga kirish uchun login/parol o'rnating:

```bash
python -m app.db.create_web_admin \
  --telegram-id 123456789 --username hr_admin --password "KuchliParol123" --role super_admin --full-name "Ism Familiya"
```

So'ng `http://localhost:8000` ga kirib, shu login/parol bilan tizimga kiring.

## 5. Testlar

```bash
pytest tests/ -v
```

> **Muhim izoh:** ushbu kod ushbu muhitda (Windows, Python 3.14, tarmoq cheklovi bilan) to'liq
> ishga tushirilmadi — `aiogram`/`asyncpg` kabi kutubxonalar Windows + Python 3.14 uchun tayyor
> paket (wheel) topa olmadi va kompilyatsiya vositalari (MSVC) ushbu muhitda mavjud emas edi.
> Validatorlar (`app/bot/validators.py`) uchun yozilgan unit-testlar
> (`tests/test_validators.py`, 20 ta test) muvaffaqiyatli o'tdi va barcha `.py` fayllar sintaksis
> bo'yicha tekshirildi (`py_compile`) — xatolik topilmadi. Lekin botni birinchi marta ishga
> tushirganingizda puxta qo'lda sinovdan o'tkazishingizni tavsiya qilamiz — jumladan:
> `/start` → til tanlash → "Hujjat topshirish" → har uchala toifa (A/B/S) bo'yicha to'liq anketa →
> tasdiqlash → HR guruhiga xabar kelishi, hamda `/admin` va web-panel funksiyalari.

## 6. Ma'lumotlar bazasi migratsiyalari

Yangi migratsiya yaratish (modelga o'zgartirish kiritgandan so'ng):

```bash
alembic revision --autogenerate -m "o'zgartirish tavsifi"
alembic upgrade head
```

Productionga to'g'ridan-to'g'ri `ALTER TABLE` bilan kirish taqiqlangan (TZ 4.12) — faqat Alembic orqali.

## 7. HR xodimi uchun qisqa qo'llanma

### Bot ichida (`/admin`)

- `/admin` — admin menyusini ochadi (faqat ro'yxatga olingan Telegram ID lar uchun).
- **📋 Arizalar** — holat bo'yicha filtrlab ko'rish, arizani ochib statusini o'zgartirish
  (`Yuborilgan → Ko'rib chiqilgan → Taklif qilingan / Rad etilgan`), izoh qoldirish.
- **📊 Statistika** — jami/haftalik/oylik son, holat va yo'nalish bo'yicha taqsimot.
- **📤 Eksport** — tanlangan davr uchun CSV fayl (Excel da ochiladi).
- **🏷 Lavozimlar**, **📝 Matnlar**, **👤 Adminlar** — faqat `super_admin` roli uchun.

### Web-admin panel (`http://<server>:8000`)

Bot-ichi rejimning barcha imkoniyatlari + qulayroq jadval ko'rinishi, qidiruv va filtrlash.
Login/parol `create_web_admin.py` skripti orqali beriladi (yuqoriga qarang).

## 8. Xavfsizlik eslatmalari (production uchun)

- `.env` faylini hech qachon versiya nazoratiga qo'shmang (`.gitignore` da allaqachon istisno qilingan).
- `ADMIN_JWT_SECRET` va `POSTGRES_PASSWORD` — kuchli, tasodifiy qiymatlar bo'lishi shart.
- PostgreSQL portini (`5432`) tashqi tarmoqqa ochmang — faqat `127.0.0.1` ga bog'lab qo'ying (`postgresql.conf` / `pg_hba.conf`).
- Web-admin panelni production da HTTPS ortida (masalan Nginx + Let's Encrypt) joylashtiring.
- Zaxira nusxalash (TZ 7.8): `pg_dump` asosida kunlik avtomatik backup skriptini alohida sozlash tavsiya etiladi
  (masalan cron + `pg_dump | gzip > backup_$(date +%F).sql.gz`, kamida 30 kun saqlash, offsite nusxa bilan).
