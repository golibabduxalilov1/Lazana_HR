import datetime as dt

import pytest

from app.bot.validators import (
    validate_address,
    validate_birth_date,
    validate_free_text,
    validate_full_name,
    validate_phone,
)


class TestValidatePhone:
    @pytest.mark.parametrize("raw", ["+998901234567", "998901234567", "+998 90 123 45 67"])
    def test_valid_formats(self, raw):
        result = validate_phone(raw)
        assert result.ok
        assert result.value == "+998901234567"

    @pytest.mark.parametrize("raw", ["+7901234567", "12345", "+998123", "abc"])
    def test_invalid_formats(self, raw):
        result = validate_phone(raw)
        assert not result.ok
        assert result.error_key == "err_phone"


class TestValidateFullName:
    def test_valid(self):
        result = validate_full_name("Aliyev Ali Aliyevich")
        assert result.ok
        assert result.value == "Aliyev Ali Aliyevich"

    def test_single_word_rejected(self):
        result = validate_full_name("Aliyev")
        assert not result.ok
        assert result.error_key == "err_full_name"

    def test_digits_rejected(self):
        result = validate_full_name("Aliyev Ali2")
        assert not result.ok


class TestValidateAddress:
    def test_valid(self):
        result = validate_address("Samarqand viloyati, Samarqand shahar")
        assert result.ok

    def test_too_short(self):
        result = validate_address("short")
        assert not result.ok
        assert result.error_key == "err_address"

    def test_link_rejected(self):
        result = validate_address("Manzil: https://example.com/some-page")
        assert not result.ok
        assert result.error_key == "err_link_not_allowed"


class TestValidateBirthDate:
    def test_valid_age(self):
        target = dt.date.today().replace(year=dt.date.today().year - 25)
        result = validate_birth_date(target.strftime("%d.%m.%Y"), min_age=16, max_age=70)
        assert result.ok
        assert result.value == target

    def test_bad_format(self):
        result = validate_birth_date("1995-05-15", min_age=16, max_age=70)
        assert not result.ok
        assert result.error_key == "err_birth_date_format"

    def test_too_young(self):
        target = dt.date.today().replace(year=dt.date.today().year - 10)
        result = validate_birth_date(target.strftime("%d.%m.%Y"), min_age=16, max_age=70)
        assert not result.ok
        assert result.error_key == "err_birth_date_age"

    def test_future_date_rejected(self):
        future = dt.date.today() + dt.timedelta(days=30)
        result = validate_birth_date(future.strftime("%d.%m.%Y"), min_age=16, max_age=70)
        assert not result.ok


class TestValidateFreeText:
    def test_valid(self):
        result = validate_free_text("Oxirgi ish joyim mebel fabrikasi edi.")
        assert result.ok

    def test_too_long(self):
        result = validate_free_text("a" * 600, max_length=500)
        assert not result.ok
        assert result.error_key == "err_text_too_long"

    def test_link_rejected(self):
        result = validate_free_text("Portfolio: t.me/example")
        assert not result.ok
        assert result.error_key == "err_link_not_allowed"
