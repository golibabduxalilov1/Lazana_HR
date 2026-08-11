"""Foydalanuvchiga ko'rinadigan barcha statik (kodda saqlanadigan) matnlar, uz/ru.

Admin panel orqali tahrirlanadigan matnlar (`welcome_message`, `about_us`, `thanks_message`)
bu yerda emas — `bot_texts` jadvalida saqlanadi (app/db/seed_data.py da boshlang'ich qiymatlar bor).
"""

T: dict[str, dict[str, str]] = {
    "menu_about": {"uz": "ℹ️ Biz haqimizda ma'lumot", "ru": "ℹ️ О нас"},
    "menu_apply": {"uz": "📄 Hujjat topshirish", "ru": "📄 Подать документы"},
    "menu_change_lang": {"uz": "🌐 Tilni o'zgartirish", "ru": "🌐 Изменить язык"},
    "btn_lang_uz": {"uz": "🇺🇿 O'zbek tili", "ru": "🇺🇿 O'zbek tili"},
    "btn_lang_ru": {"uz": "🇷🇺 Русский язык", "ru": "🇷🇺 Русский язык"},
    "btn_back": {"uz": "⬅️ Orqaga", "ru": "⬅️ Назад"},
    "btn_cancel": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена"},
    "btn_confirm": {"uz": "✅ Tasdiqlash", "ru": "✅ Подтвердить"},
    "btn_edit": {"uz": "✏️ Tahrirlash", "ru": "✏️ Редактировать"},
    "btn_done": {"uz": "✅ Tayyor", "ru": "✅ Готово"},
    "btn_share_contact": {"uz": "📱 Raqamni ulashish", "ru": "📱 Поделиться номером"},
    "btn_to_menu": {"uz": "🏠 Asosiy menyu", "ru": "🏠 Главное меню"},
    "main_menu_title": {"uz": "Quyidagi bo'limlardan birini tanlang:", "ru": "Выберите один из разделов:"},
    "language_changed": {"uz": "Til o'zbek tiliga o'zgartirildi.", "ru": "Язык изменён на русский."},
    "choose_language": {"uz": "Tilni tanlang:", "ru": "Выберите язык:"},
    "category_prompt": {
        "uz": "Qaysi yo'nalish bo'yicha hujjat topshirmoqchisiz?",
        "ru": "По какому направлению вы хотите подать документы?",
    },
    "category_a": {"uz": "🔧 A) Ishchi", "ru": "🔧 A) Рабочий"},
    "category_b": {"uz": "🏭 B) Ishlab chiqarish", "ru": "🏭 B) Производство"},
    "category_s": {"uz": "🎓 S) Mutaxassis", "ru": "🎓 S) Специалист"},
    "position_prompt": {"uz": "Lavozimni tanlang:", "ru": "Выберите должность:"},
    "no_positions": {
        "uz": "Afsuski, hozircha bu yo'nalishda faol lavozimlar yo'q.",
        "ru": "К сожалению, сейчас в этом направлении нет активных вакансий.",
    },
    # --- Savollar ---
    "step_full_name": {
        "uz": "Familiya Ism Sharifingizni to'liq kiriting (masalan: Aliyev Ali Aliyevich):",
        "ru": "Введите ваше полное ФИО (например: Aliyev Ali Aliyevich):",
    },
    "step_phone": {
        "uz": "Telefon raqamingizni kiriting (masalan: +998901234567) yoki tugma orqali ulashing:",
        "ru": "Введите номер телефона (например: +998901234567) или поделитесь через кнопку:",
    },
    "step_address": {
        "uz": "Manzilingizni kiriting (masalan: Samarqand viloyati, Samarqand shahar, Bog'ishamol MFY, 14-uy):",
        "ru": "Введите ваш адрес (например: Самаркандская область, г. Самарканд, ул. Богишамол, дом 14):",
    },
    "step_birth_date": {
        "uz": "Tug'ilgan sanangizni kun.oy.yil formatida kiriting (masalan: 15.05.1995):",
        "ru": "Введите дату рождения в формате день.месяц.год (например: 15.05.1995):",
    },
    "step_work_experience": {
        "uz": "Mehnat faoliyatingiz haqida qisqacha yozing (oxirgi 1 yildagi ish joyi va lavozimi):",
        "ru": "Кратко напишите о трудовой деятельности (последнее место работы и должность за 1 год):",
    },
    "step_experience_years": {
        "uz": "Ushbu lavozim bo'yicha ish stajingiz qancha?",
        "ru": "Какой у вас стаж работы по данной должности?",
    },
    "exp_lt1": {"uz": "1 yilgacha", "ru": "До 1 года"},
    "exp_1_3": {"uz": "1–3 yil", "ru": "1–3 года"},
    "exp_3_5": {"uz": "3–5 yil", "ru": "3–5 лет"},
    "exp_5plus": {"uz": "5 yildan ortiq", "ru": "Более 5 лет"},
    "step_education_level": {"uz": "Ma'lumotingiz:", "ru": "Ваше образование:"},
    "edu_oliy": {"uz": "Oliy", "ru": "Высшее"},
    "edu_orta": {"uz": "O'rta", "ru": "Среднее"},
    "edu_orta_maxsus": {"uz": "O'rta-maxsus", "ru": "Среднее специальное"},
    "edu_tugallanmagan_oliy": {"uz": "Tugallanmagan oliy", "ru": "Неоконченное высшее"},
    "step_education_institution": {
        "uz": "Qaysi ta'lim muassasasini tugatgansiz (universitet, kollej, litsey va h.k.)?",
        "ru": "Какое учебное заведение вы окончили (университет, колледж, лицей и т.д.)?",
    },
    "step_languages": {
        "uz": "Qaysi tillarni bilasiz? (Bir nechtasini tanlashingiz mumkin, so'ng \"Tayyor\" tugmasini bosing)",
        "ru": "Какими языками вы владеете? (Можно выбрать несколько, затем нажмите «Готово»)",
    },
    "lang_uz": {"uz": "O'zbek tili", "ru": "Узбекский язык"},
    "lang_ru": {"uz": "Rus tili", "ru": "Русский язык"},
    "lang_tj": {"uz": "Tojik tili", "ru": "Таджикский язык"},
    "lang_kz": {"uz": "Qozoq tili", "ru": "Казахский язык"},
    "lang_tr": {"uz": "Turk tili", "ru": "Турецкий язык"},
    "lang_other": {"uz": "Boshqa", "ru": "Другой"},
    "step_languages_other": {
        "uz": "Qaysi boshqa til(lar)ni bilasiz? Yozing:",
        "ru": "Какими ещё языками вы владеете? Напишите:",
    },
    "err_languages_empty": {
        "uz": "Kamida bitta tilni tanlang.",
        "ru": "Выберите хотя бы один язык.",
    },
    "step_expected_salary": {"uz": "Kutilayotgan maoshingiz:", "ru": "Ожидаемая зарплата:"},
    "salary_4m": {"uz": "4 000 000 so'm", "ru": "4 000 000 сум"},
    "salary_5_7m": {"uz": "5 000 000 – 7 000 000 so'm", "ru": "5 000 000 – 7 000 000 сум"},
    "salary_7_10m": {"uz": "7 000 000 – 10 000 000 so'm", "ru": "7 000 000 – 10 000 000 сум"},
    "salary_10plus": {"uz": "10 000 000 dan yuqori", "ru": "Более 10 000 000"},
    "step_computer_skills": {
        "uz": "Kompyuter dasturlaridan foydalanish ko'nikmangiz (masalan: Office, Photoshop, 1C va h.k.):",
        "ru": "Навыки владения компьютерными программами (например: Office, Photoshop, 1C и т.д.):",
    },
    "step_key_skills": {"uz": "Asosiy ko'nikmalaringizni yozing:", "ru": "Напишите ваши ключевые навыки:"},
    # --- Tasdiqlash ---
    "confirm_title": {
        "uz": "Quyidagi ma'lumotlarni tekshirib chiqing:",
        "ru": "Проверьте введённые данные:",
    },
    "confirm_category": {"uz": "Yo'nalish", "ru": "Направление"},
    "confirm_position": {"uz": "Lavozim", "ru": "Должность"},
    "confirm_full_name": {"uz": "F.I.Sh.", "ru": "ФИО"},
    "confirm_phone": {"uz": "Telefon", "ru": "Телефон"},
    "confirm_address": {"uz": "Manzil", "ru": "Адрес"},
    "confirm_birth_date": {"uz": "Tug'ilgan sana", "ru": "Дата рождения"},
    "confirm_work_experience": {"uz": "Mehnat faoliyati", "ru": "Опыт работы"},
    "confirm_experience_years": {"uz": "Ish staji", "ru": "Стаж работы"},
    "confirm_education_level": {"uz": "Ma'lumoti", "ru": "Образование"},
    "confirm_education_institution": {"uz": "Ta'lim muassasasi", "ru": "Учебное заведение"},
    "confirm_languages": {"uz": "Tillar", "ru": "Языки"},
    "confirm_expected_salary": {"uz": "Kutilayotgan maosh", "ru": "Ожидаемая зарплата"},
    "confirm_computer_skills": {"uz": "Kompyuter ko'nikmalari", "ru": "Компьютерные навыки"},
    "confirm_key_skills": {"uz": "Asosiy ko'nikmalar", "ru": "Ключевые навыки"},
    "application_cancelled": {
        "uz": "Anketa bekor qilindi. Asosiy menyuga qaytdingiz.",
        "ru": "Анкета отменена. Вы вернулись в главное меню.",
    },
    "application_saved_thanks_fallback": {
        "uz": "Arizangiz qabul qilindi. Rahmat!",
        "ru": "Ваша заявка принята. Спасибо!",
    },
    "nothing_to_go_back": {
        "uz": "Bu birinchi qadam, orqaga qaytish imkoni yo'q.",
        "ru": "Это первый шаг, вернуться назад невозможно.",
    },
    # --- Validatsiya xatolari ---
    "err_full_name": {
        "uz": "❗ F.I.Sh. kamida 2 so'zdan iborat bo'lishi va faqat harflardan tashkil topishi kerak. Qayta kiriting:",
        "ru": "❗ ФИО должно состоять минимум из 2 слов и содержать только буквы. Введите заново:",
    },
    "err_phone": {
        "uz": "❗ Telefon raqami noto'g'ri formatda. Format: +998901234567. Qayta kiriting yoki tugma orqali ulashing:",
        "ru": "❗ Неверный формат номера. Формат: +998901234567. Введите заново или поделитесь через кнопку:",
    },
    "err_address": {
        "uz": "❗ Manzil kamida 10 belgidan iborat bo'lishi kerak. Qayta kiriting:",
        "ru": "❗ Адрес должен содержать минимум 10 символов. Введите заново:",
    },
    "err_birth_date_format": {
        "uz": "❗ Sana formati noto'g'ri. Kun.oy.yil formatida kiriting (masalan: 15.05.1995):",
        "ru": "❗ Неверный формат даты. Введите в формате день.месяц.год (например: 15.05.1995):",
    },
    "err_birth_date_age": {
        "uz": "❗ Yoshingiz {min}–{max} oralig'ida bo'lishi kerak. Sanani qayta kiriting:",
        "ru": "❗ Возраст должен быть в пределах {min}–{max} лет. Введите дату заново:",
    },
    "err_text_too_long": {
        "uz": "❗ Matn juda uzun (maksimal {max} belgi). Qisqartirib qayta yuboring:",
        "ru": "❗ Текст слишком длинный (максимум {max} символов). Сократите и отправьте заново:",
    },
    "err_text_too_short": {
        "uz": "❗ Matn juda qisqa. Qayta kiriting:",
        "ru": "❗ Текст слишком короткий. Введите заново:",
    },
    "err_link_not_allowed": {
        "uz": "❗ Bu maydonga havola (link) kiritish mumkin emas. Qayta kiriting:",
        "ru": "❗ В это поле нельзя вставлять ссылки. Введите заново:",
    },
    "err_generic_choice": {
        "uz": "❗ Iltimos, quyidagi tugmalardan birini tanlang.",
        "ru": "❗ Пожалуйста, выберите один из предложенных вариантов.",
    },
    # --- Cheklovlar ---
    "rate_limited": {
        "uz": "⏳ Juda tez-tez so'rov yubordingiz. Iltimos, bir oz kutib turing.",
        "ru": "⏳ Вы отправляете запросы слишком часто. Пожалуйста, подождите немного.",
    },
    "cooldown_active": {
        "uz": "Siz yaqinda ariza topshirgansiz. Iltimos, {hours} soatdan so'ng qayta urinib ko'ring.",
        "ru": "Вы недавно подавали заявку. Пожалуйста, попробуйте снова через {hours} часов.",
    },
    "blocked_user": {
        "uz": "Kechirasiz, sizga botdan foydalanish cheklangan.",
        "ru": "Извините, ваш доступ к боту ограничен.",
    },
    "unexpected_input": {
        "uz": "Iltimos, menyudan foydalaning yoki /start buyrug'ini bosing.",
        "ru": "Пожалуйста, используйте меню или отправьте команду /start.",
    },
}


def t(lang: str, key: str, **kwargs) -> str:
    lang = lang if lang in ("uz", "ru") else "uz"
    entry = T.get(key)
    if not entry:
        return key
    value = entry.get(lang, entry.get("uz", key))
    return value.format(**kwargs) if kwargs else value
