"""TZ (2.5-2.7, 4.8) asosidagi boshlang'ich ma'lumotlar: kategoriyalar, lavozimlar, statik matnlar."""

CATEGORIES = [
    {
        "code": "A",
        "name_uz": "Ishchi",
        "name_ru": "Рабочий",
        "question_set": "basic",
        "sort_order": 1,
    },
    {
        "code": "B",
        "name_uz": "Ishlab chiqarish",
        "name_ru": "Производство",
        "question_set": "production",
        "sort_order": 2,
    },
    {
        "code": "S",
        "name_uz": "Mutaxassis",
        "name_ru": "Специалист",
        "question_set": "specialist",
        "sort_order": 3,
    },
]

# code -> [(name_uz, name_ru), ...] tartib bo'yicha (TZ 2.5-2.7)
POSITIONS = {
    "A": [
        ("Qorovul", "Сторож"),
        ("Bog'bon", "Садовник"),
        ("Chorvachi", "Животновод"),
        ("Payvandlovchi (Svarshik)", "Сварщик"),
        ("Tozalovchi (dvornik)", "Дворник"),
        ("Farrosh", "Уборщик"),
        ("Oshpaz", "Повар"),
        ("Oshpaz yordamchisi", "Помощник повара"),
        ("Tex xodim", "Технический сотрудник"),
        ("Quruvchi yordamchisi", "Помощник строителя"),
        ("Yukchi", "Грузчик"),
        ("Yuk ortishuvchi va tushuruvchi", "Погрузчик-разгрузчик"),
        ("Haydovchi (erkak)", "Водитель"),
        ("Usta", "Мастер"),
        ("Yordamchi ishchi", "Подсобный рабочий"),
        ("Ta'mirlash bo'yicha usta", "Мастер по ремонту"),
        ("Kara haydovchi mutaxassis", "Оператор погрузчика (кара)"),
    ],
    "B": [
        ("Ishlab chiqarish rahbari", None),
        ("Muhandis-injener (texnik)", None),
        ("OTK (sifat nazoratchisi)", None),
        ("Rover stanoki operatori", None),
        ("Kromka stanoki operatori", None),
        ("SNS stanoki operatori", None),
        ("Arralash stanoki operatori", None),
        ("Frezer stanoki operatori", None),
        ("Press stanoki operatori", None),
        ("Yumshoq mebel mutaxassisi", None),
        ("Tikuvchi (mebel)", None),
        ("Silliqlovchi (shkurka)", None),
        ("Bo'yoqchi", None),
        ("Qadoqlash bo'limi xodimi", None),
        ("Yig'ish bo'limi xodimi", None),
        ("Omborxona mudiri", None),
    ],
    "S": [
        ("Direktor", None),
        ("Direktor o'rinbosari", None),
        ("Moliyachi", None),
        ("Moliyachi yordamchisi", None),
        ("Dizayn konstruktor", None),
        ("ART dizayner", None),
        ("HR (inson resurslarini boshqarish)", None),
        ("Buxgalter", None),
        ("Logist", None),
        ("Kassir", None),
        ("Servis (xizmat ko'rsatish) xodimi", None),
        ("Sotuv bo'limi agenti", None),
        ("Sotuv bo'yicha menejer", None),
        ("Marketolog", None),
        ("Sotuv operatorlari (Call center)", None),
        ("IT (Dasturchi)", None),
        ("Xarid bo'limi mutaxassisi", None),
        ("Eksport bo'yicha menejer", None),
        ("ROP (sotuv bo'limi rahbari)", None),
        ("Marketpleys bo'yicha mutaxassis", None),
    ],
}

BOT_TEXTS = {
    "welcome_message": {
        "text_uz": (
            "Assalomu alaykum! Kompaniyamizga yangi ishga kirmoqchi bo'lgan xodimlarni rezyumelarini "
            "rasmiy botimiz orqali qabul qilamiz. O'zingizga qulay bo'lgan tilni sozlab oling."
        ),
        "text_ru": (
            "Ассаламу алайкум! Мы принимаем резюме сотрудников, которые хотят начать новую работу "
            "в нашей компании через наш официальный бот. Установите подходящий язык."
        ),
    },
    "about_us": {
        "text_uz": (
            "LAZANA korxonasiga xush kelibsiz! 2007-yilda tashkil etilgan korxonamiz kichik oilaviy "
            "korxonadan mintaqadagi yetakchi mebel ishlab chiqaruvchilardan biriga aylandi. Yillar davomida "
            "biz innovatsiyalar, mahsulot sifati va mijozlarimizning ehtiyojlariga e'tibor orqali sezilarli "
            "natijalarga erishdik. Bugungi kunda mahsulotlarimiz minglab uylar va ofislarni bezatib, "
            "odamlarning kundalik hayotiga qulaylik va uslub olib kelganidan faxrlanamiz."
        ),
        "text_ru": (
            "Добро пожаловать в LAZANA! Основанная в 2007 году, наша компания превратилась из небольшого "
            "семейного предприятия в одного из ведущих производителей мебели в регионе. За эти годы мы "
            "добились значительных результатов благодаря инновациям, качеству продукции и вниманию к "
            "потребностям наших клиентов. Сегодня наша продукция украшает тысячи домов и офисов."
        ),
    },
    "thanks_message": {
        "text_uz": "Sizni ishga kirish uchun topshirgan arizangiz qabul qilindi. Kompaniyamiz HR bo'limi siz bilan bog'lanadi.",
        "text_ru": "Ваша заявка на трудоустройство принята. Отдел кадров нашей компании свяжется с вами.",
    },
}
