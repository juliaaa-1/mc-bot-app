const tg = window.Telegram.WebApp;

// Получаем параметры из URL (chat_id и thread_id)
const urlParams = new URLSearchParams(window.location.search);
const chat_id = urlParams.get('chat_id');
const thread_id = urlParams.get('thread_id');

// Init
tg.expand();

// Установка минимальной даты (сегодня)
const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Показ/скрытие полей в зависимости от типа
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

// Логика интервью
const interviewNeeded = document.getElementById('interview_needed');
if (interviewNeeded) {
    interviewNeeded.addEventListener('change', (e) => {
        const whoField = document.getElementById('interview_who_field');
        if (e.target.checked) whoField.classList.remove('hidden');
        else whoField.classList.add('hidden');
    });
}

// Функция сборки данных и отправки
async function validateAndSubmit() {
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Добавляем ID чата для Google
    data.chat_id = chat_id;
    data.thread_id = thread_id;

    // Ссылка на ваш Google Apps Script (ВСТАВЬТЕ ЕЁ НИЖЕ)
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbNE3Uo-ZL_tYTQSf-_5rvtSzovieAK0U_zXojoHS4JtMghCnUkBfTLIVKgdbDo3n9/exec";

    // Простая валидация
    if (!data.event_date || !data.event_time || !data.location || !data.description) {
        alert("Пожалуйста, заполните основные поля: дата, время, место и описание.");
        return;
    }

    tg.MainButton.showProgress();

    if (chat_id && GOOGLE_SCRIPT_URL !== "ВАША_ССЫЛКА_ИЗ_GOOGLE") {
        // ЕСЛИ ОТКРЫТО В ГРУППЕ: Шлем в Google
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                body: JSON.stringify(data)
            });
            tg.close();
        } catch (e) {
            alert("Ошибка отправки в Google: " + e.message);
            tg.MainButton.hideProgress();
        }
    } else {
        // ЕСЛИ В ЛИЧКЕ: Шлем боту напрямую (старый способ)
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    }
}

// Кнопка закрытия клавиатуры при Enter
document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            el.blur();
        }
    });
});
