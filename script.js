const tg = window.Telegram.WebApp;

// Получаем параметры чата
const urlParams = new URLSearchParams(window.location.search);
let chat_id = urlParams.get('chat_id');
let thread_id = urlParams.get('thread_id');

if (!chat_id && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    const startParam = tg.initDataUnsafe.start_param;
    const parts = startParam.split('_');
    chat_id = parts[0];
    thread_id = parts[1] || "";
}

tg.expand();

// 1. ЛОГИКА ТИПОВ СЪЕМКИ (Фото / Видео)
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

// 2. ЛОГИКА ИНТЕРВЬЮ
const interviewCheckbox = document.getElementById('interview_needed');
if (interviewCheckbox) {
    interviewCheckbox.addEventListener('change', (e) => {
        const whoField = document.getElementById('interview_who_field');
        if (e.target.checked) {
            whoField.classList.remove('hidden');
        } else {
            whoField.classList.add('hidden');
        }
    });
}

// 3. ЛОГИКА ДЕДЛАЙНОВ (Другой срок)
const deadlineSelect = document.getElementById('deadline');
if (deadlineSelect) {
    deadlineSelect.addEventListener('change', (e) => {
        const customField = document.getElementById('custom_deadline_field');
        if (e.target.value === 'Другое') {
            customField.classList.remove('hidden');
        } else {
            customField.classList.add('hidden');
        }
    });
}

// 4. ПОДСКАЗКИ АДРЕСОВ (DaData)
$("#location").suggestions({
    token: "66993a4087ccdc37475149495b6c8ba6f73e728e",
    type: "ADDRESS",
    onSelect: function(suggestion) {
        console.log(suggestion);
    }
});

// 5. ВАЛИДАЦИЯ И ОТПРАВКА
async function validateAndSubmit() {
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Если "Другой срок", берем значение из текстового поля
    if (data.deadline === 'Другое') {
        data.deadline = data.custom_deadline || 'Не указан';
    }

    data.chat_id = chat_id;
    data.thread_id = thread_id;

    // Ссылка на Google (уже вставлена!)
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbNE3Uo-ZL_tYTQSf-_5rvtSzovieAK0U_zXojoHS4JtMghCnUkBfTLIVKgdbDo3n9/exec";

    if (!data.event_date || !data.event_time || !data.location || !data.description) {
        alert("Пожалуйста, заполните основные поля: дата, время, место и описание.");
        return;
    }

    tg.MainButton.setText("ОТПРАВКА...");
    tg.MainButton.showProgress();

    if (chat_id && GOOGLE_SCRIPT_URL) {
        try {
            // Отправка в Google (бесшовно)
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
        // Обычная отправка (если открыто в личке)
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    }
}

// Установка мин. даты (сегодня)
const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}
