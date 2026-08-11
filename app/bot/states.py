from aiogram.fsm.state import State, StatesGroup


class LanguageStates(StatesGroup):
    choosing = State()


class ApplicationStates(StatesGroup):
    choosing_category = State()
    choosing_position = State()
    filling_step = State()  # generic — qaysi savol ekanligi FSMContext.data["step_key"] da saqlanadi
    confirming = State()


class AdminStates(StatesGroup):
    browsing_applications = State()
    entering_status_comment = State()
    managing_positions = State()
    choosing_position_category = State()
    choosing_text_key = State()
    adding_position_name_uz = State()
    adding_position_name_ru = State()
    editing_text_uz = State()
    editing_text_ru = State()
    adding_admin_id = State()
    adding_admin_full_name = State()
    adding_admin_phone = State()
    adding_admin_role = State()
