const tg = window.Telegram.WebApp;

// Получаем параметры чата
const urlParams = new URLSearchParams(window.location.search);
let chat_id = urlParams.get('chat_id');
let thread_id = urlParams.get('thread_id');

// Если зашли через t.me/bot/app?startapp=...
if (!chat_id && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    const startParam = tg.initDataUnsafe.start_param;
    const parts = startParam.split('_');
    chat_id = parts[0];
    thread_id = parts[1] || "";
}

tg.expand();

// -------------------------------------------------------------
// 1. ИНИЦИАЛИЗАЦИЯ ПОЛЕЙ И ЛОГИКИ
// -------------------------------------------------------------

// Установка минимальной даты (сегодня)
const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Переключение Фото/Видео
document.querySelectorAll('input[name="media_type"]').forEach(input => {
    input.addEventListener('change', (e) => {
        const photoFields = document.getElementById('photo_fields');
        const videoFields = document.getElementById('video_fields');
        if (e.target.value === 'Фото') {
            photoFields.classList.remove('hidden');
            videoFields.classList.add('hidden');
        } else {
            photoFields.classList.add('hidden');
            videoFields.classList.remove('hidden');
        }
    });
});

// Чекбокс Интервью
const interviewCheck = document.getElementById('video_interview_check');
if (interviewCheck) {
    interviewCheck.addEventListener('change', (e) => {
        const details = document.getElementById('interview_details');
        if (e.target.checked) details.classList.remove('hidden');
        else details.classList.add('hidden');
    });
}

// Дедлайн Select
const deadlineSelect = document.getElementById('deadline_select');
if (deadlineSelect) {
    deadlineSelect.addEventListener('change', (e) => {
        const customInput = document.getElementById('deadline_custom');
        if (e.target.value === 'other') customInput.classList.remove('hidden');
        else customInput.classList.add('hidden');
    });
}

// Настроение Select
const moodSelect = document.getElementById('video_mood');
if (moodSelect) {
    moodSelect.addEventListener('change', (e) => {
        const customMood = document.getElementById('video_mood_custom');
        if (e.target.value === 'other') customMood.classList.remove('hidden');
        else customMood.classList.add('hidden');
    });
}

// DADATA (Адреса)
$(document).ready(function () {
    $("#event_location").suggestions({
        token: "66993a4087ccdc37475149495b6c8ba6f73e728e",
        type: "ADDRESS",
        count: 5,
        onSelect: function (suggestion) {
            console.log(suggestion);
        }
    });
});

// Кнопка Очистить
document.getElementById('btn_clear').addEventListener('click', () => {
    if (confirm("Очистить всю форму?")) {
        document.getElementById('requestForm').reset();
        document.getElementById('interview_details').classList.add('hidden');
        document.getElementById('deadline_custom').classList.add('hidden');
        document.getElementById('video_mood_custom').classList.add('hidden');
    }
});

// -------------------------------------------------------------
// 2. ВАЛИДАЦИЯ И ОТПРАВКА
// -------------------------------------------------------------
document.getElementById('btn_publish').addEventListener('click', validateAndSubmit);

async function validateAndSubmit() {
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // --- ПРОВЕРКИ ---

    // 1. Проверка даты (нельзя в прошлом)
    if (data.event_date) {
        const selectedDate = new Date(data.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            alert("❌ Ошибка: Дата мероприятия не может быть в прошлом!");
            return;
        }
    } else {
        alert("❌ Пожалуйста, выберите дату мероприятия.");
        return;
    }

    // 2. Проверка Обязательных полей
    if (!data.event_time || !data.event_time_end) {
        alert("❌ Пожалуйста, укажите время начала и окончания.");
        return;
    }
    const locationVal = document.getElementById('event_location').value;
    if (!locationVal || locationVal.trim().length === 0) {
        alert("❌ Пожалуйста, укажите место проведения.");
        return;
    }
    if (!data.description || data.description.trim().length === 0) {
        alert("❌ Пожалуйста, добавьте описание мероприятия.");
        return;
    }

    // 3. Проверка ФОТО
    if (data.media_type === 'Фото') {
        const countFrom = parseFloat(data.photo_count_from);
        const countTo = parseFloat(data.photo_count_to);
        const fastFrom = data.photo_fast_from ? parseFloat(data.photo_fast_from) : null;
        const fastTo = data.photo_fast_to ? parseFloat(data.photo_fast_to) : null;

        function isValidInt(num) {
            return Number.isInteger(num) && num > 0;
        }

        if (!data.photo_count_from || !data.photo_count_to) {
            alert("❌ Укажите количество фото (От и До).");
            return;
        }
        if (!isValidInt(countFrom) || !isValidInt(countTo)) {
            alert("❌ Количество фото должно быть целым числом больше 0.");
            return;
        }
        if (countFrom > countTo) {
            alert("❌ Ошибка: 'От' не может быть больше 'До'.");
            return;
        }

        if (data.photo_fast_from || data.photo_fast_to) {
            if (!isValidInt(fastFrom) || !isValidInt(fastTo)) {
                alert("❌ Количество фото 'Сразу' должно быть целым числом.");
                return;
            }
            if (fastFrom > fastTo) {
                alert("❌ Ошибка 'Сразу': 'От' не может быть больше 'До'.");
                return;
            }
        }
    }

    // 4. Другое
    if (data.deadline === 'other') {
        data.deadline = data.custom_deadline || document.getElementById('deadline_custom').value;
    }
    if (data.video_mood === 'other') {
        data.video_mood = data.video_mood_custom || document.getElementById('video_mood_custom').value;
    }

    data.location = locationVal; // Берем адрес из input

    // --- ОТПРАВКА ---
    data.chat_id = chat_id;
    data.thread_id = thread_id;

    // ССЫЛКА НА GOOGLE (Та самая, что ты уже вставила, я вставлю её снова)
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbERT0eR7DOI-A3uXxEszYKMehEaG-tD9eO_r2a-VqGv_0wW5q6k4rMhyZfC5E_h5iA/exec";

    tg.MainButton.setText("ОТПРАВЛЯЮ...");
    tg.MainButton.showProgress();
    tg.MainButton.show();

    if (chat_id) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(data)
            });
            tg.close();
        } catch (e) {
            alert("Ошибка отправки: " + e.message);
            tg.MainButton.hideProgress();
        }
    } else {
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    }
}
