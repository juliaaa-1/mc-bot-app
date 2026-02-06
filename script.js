const tg = window.Telegram.WebApp;

// Получаем параметры чата из URL (chat_id и thread_id для Google)
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

// 1. ПЕРЕКЛЮЧЕНИЕ ФОТО / ВИДЕО
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

// 2. ЛОГИКА ИНТЕРВЬЮ (ЧЕКБОКС)
const interviewCheck = document.getElementById('video_interview_check');
if (interviewCheck) {
    interviewCheck.addEventListener('change', (e) => {
        const details = document.getElementById('interview_details');
        if (e.target.checked) {
            details.classList.remove('hidden');
        } else {
            details.classList.add('hidden');
        }
    });
}

// 3. ЛОГИКА ДЕДЛАЙНОВ (ВЫБОР ИЗ СПИСКА)
const deadlineSelect = document.getElementById('deadline_select');
if (deadlineSelect) {
    deadlineSelect.addEventListener('change', (e) => {
        const customInput = document.getElementById('deadline_custom');
        if (e.target.value === 'other') {
            customInput.classList.remove('hidden');
        } else {
            customInput.classList.add('hidden');
        }
    });
}

// 4. ЛОГИКА НАСТРОЕНИЯ ВИДЕО
const moodSelect = document.getElementById('video_mood');
if (moodSelect) {
    moodSelect.addEventListener('change', (e) => {
        const customMood = document.getElementById('video_mood_custom');
        if (e.target.value === 'other') {
            customMood.classList.remove('hidden');
        } else {
            customMood.classList.add('hidden');
        }
    });
}

// 5. ПОДСКАЗКИ АДРЕСОВ (DaData через JQuery)
$(document).ready(function () {
    $("#event_location").suggestions({
        token: "66993a4087ccdc37475149495b6c8ba6f73e728e",
        type: "ADDRESS",
        onSelect: function (suggestion) {
            console.log(suggestion);
        }
    });
});

// 6. ОЧИСТКА ПОЛЕЙ
document.getElementById('btn_clear').addEventListener('click', () => {
    if (confirm("Очистить всю форму?")) {
        document.getElementById('requestForm').reset();
        // Скрываем доп. поля вручную, так как reset не убирает классы hidden
        document.getElementById('interview_details').classList.add('hidden');
        document.getElementById('deadline_custom').classList.add('hidden');
        document.getElementById('video_mood_custom').classList.add('hidden');
    }
});

// 7. СБОР ДАННЫХ И ОТПРАВКА
document.getElementById('btn_publish').addEventListener('click', validateAndSubmit);

async function validateAndSubmit() {
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Доп. обработка кастомных полей
    if (data.deadline === 'other') {
        data.deadline = data.custom_deadline || document.getElementById('deadline_custom').value;
    }
    if (data.video_mood === 'other') {
        data.video_mood = data.video_mood_custom || document.getElementById('video_mood_custom').value;
    }

    // Собираем данные из полей Фото (т.к. они могут быть не в FormData если нет name)
    // Но мы добавили name в index.html выше.

    // Добавляем ID чата
    data.chat_id = chat_id;
    data.thread_id = thread_id;

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbNE3Uo-ZL_tYTQSf-_5rvtSzovieAK0U_zXojoHS4JtMghCnUkBfTLIVKgdbDo3n9/exec";

    // Валидация основных полей
    if (!data.event_date || !data.event_time || !data.location || !data.description) {
        alert("Пожалуйста, заполните основные поля: дата, время, место и описание.");
        return;
    }

    tg.MainButton.setText("ОТПРАВКА...");
    tg.MainButton.showProgress();
    tg.MainButton.show();

    if (chat_id && GOOGLE_SCRIPT_URL) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(data)
            });
            tg.close();
        } catch (e) {
            alert("Ошибка сети: " + e.message);
            tg.MainButton.hideProgress();
        }
    } else {
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    }
}

// Мин. дата
const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}
