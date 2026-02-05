const tg = window.Telegram.WebApp;

// Init
tg.expand();

// Установка минимальной даты (сегодня)
const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// DOM Elements
const typePhoto = document.getElementById('type_photo');
const typeVideo = document.getElementById('type_video');
const photoFields = document.getElementById('photo_fields');
const videoFields = document.getElementById('video_fields');
const btnPublish = document.getElementById('btn_publish');
const btnClear = document.getElementById('btn_clear');
const locationInput = document.getElementById('event_location');
const suggestionsContainer = document.getElementById('address_suggestions');
const interviewCheck = document.getElementById('video_interview_check');
const interviewDetails = document.getElementById('interview_details');

// Helper to hide keyboard
const hideKeyboard = () => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
    }
};

// Custom inputs toggling helper
const setupCustomInput = (selectId, inputId) => {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;

    select.addEventListener('change', () => {
        if (select.value === 'other') {
            input.classList.remove('hidden');
            input.focus();
        } else {
            input.classList.add('hidden');
        }
    });
};

setupCustomInput('video_mood', 'video_mood_custom');
setupCustomInput('deadline_select', 'deadline_custom');

const toggleMediaType = () => {
    if (typeVideo.checked) {
        photoFields.classList.add('hidden');
        videoFields.classList.remove('hidden');
        videoFields.classList.add('fade-in');
    } else {
        videoFields.classList.add('hidden');
        photoFields.classList.remove('hidden');
        photoFields.classList.add('fade-in');
    }
};

typePhoto.addEventListener('change', toggleMediaType);
typeVideo.addEventListener('change', toggleMediaType);

interviewCheck.addEventListener('change', () => {
    if (interviewCheck.checked) {
        interviewDetails.classList.remove('hidden');
        interviewDetails.classList.add('fade-in');
    } else {
        interviewDetails.classList.add('hidden');
    }
});

// Hide keyboard on Enter or Tap
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') hideKeyboard();
});
document.addEventListener('touchstart', (e) => {
    if (!['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) hideKeyboard();
}, { passive: true });

// Clear Form
btnClear.addEventListener('click', () => {
    if (confirm("Очистить все поля?")) {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.type === 'radio') {
                if (input.id === 'type_photo') input.checked = true;
                if (input.id === 'transfer_no') input.checked = true;
            } else if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
        document.querySelectorAll('.hidden-input, [id$="_custom"]').forEach(i => i.classList.add('hidden'));
        interviewDetails.classList.add('hidden');
        toggleMediaType();
    }
});

// Address Autocomplete
let debounceTimeout;
locationInput.addEventListener('input', (e) => {
    const query = e.target.value;
    clearTimeout(debounceTimeout);
    if (query.length < 3) {
        suggestionsContainer.classList.add('hidden');
        return;
    }
    debounceTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ru`);
            const data = await response.json();
            if (data.length > 0) renderSuggestions(data);
            else suggestionsContainer.classList.add('hidden');
        } catch (err) { console.error(err); }
    }, 500);
});

function renderSuggestions(data) {
    suggestionsContainer.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = item.display_name;
        div.addEventListener('click', () => {
            locationInput.value = item.display_name;
            suggestionsContainer.classList.add('hidden');
        });
        suggestionsContainer.appendChild(div);
    });
    suggestionsContainer.classList.remove('hidden');
}

// Telegram Buttons
tg.MainButton.setText("ОПУБЛИКОВАТЬ ЗАЯВКУ");
if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
    tg.MainButton.show();
    btnPublish.classList.add('hidden');
}
tg.MainButton.onClick(validateAndSubmit);
btnPublish.addEventListener('click', validateAndSubmit);

// MAIN VALIDATION AND SUBMIT
async function validateAndSubmit() {
    try {
        const isVideo = typeVideo.checked;
        const errors = [];

        // Собираем базовые данные
        const data = {
            media_type: isVideo ? "Видео" : "Фото",
            event_date: document.getElementById('event_date').value,
            event_time: document.getElementById('event_time').value,
            event_time_end: document.getElementById('event_time_end').value,
            location: document.getElementById('event_location').value,
            description: document.getElementById('event_desc').value,
            transfer: (document.querySelector('input[name="transfer"]:checked') || { value: "Нет" }).value,
            deadline_val: document.getElementById('deadline_select').value
        };

        // Срок сдачи (deadline)
        if (data.deadline_val === 'other') {
            data.deadline = document.getElementById('deadline_custom').value;
        } else {
            data.deadline = data.deadline_val;
        }

        // Проверка обязательных полей
        if (!data.event_date) errors.push("Укажите дату");
        if (!data.event_time) errors.push("Укажите время начала");
        if (!data.event_time_end) errors.push("Укажите время окончания");
        if (!data.location) errors.push("Укажите место");
        if (!data.description) errors.push("Заполните описание");
        if (!data.deadline) errors.push("Укажите срок сдачи");

        // Проверка даты
        if (data.event_date) {
            const selectedDate = new Date(data.event_date);
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            if (selectedDate < todayDate) errors.push("Нельзя выбрать прошедшую дату");
        }

        // Проверка времени
        if (data.event_time && data.event_time_end) {
            if (data.event_time_end <= data.event_time) errors.push("Окончание должно быть позже начала");
        }

        // ТЗ Видео
        if (isVideo) {
            data.video_duration = document.getElementById('video_duration').value;
            data.video_format = document.getElementById('video_format').value;
            data.video_mood_val = document.getElementById('video_mood').value;
            data.video_pace = document.getElementById('video_pace').value;
            data.video_logos = document.getElementById('video_logos').value;

            if (!data.video_format) errors.push("Выберите формат видео");
            if (!data.video_mood_val) errors.push("Выберите настроение ролика");
            if (!data.video_pace) errors.push("Выберите темп монтажа");

            data.video_mood = data.video_mood_val === 'other' ? document.getElementById('video_mood_custom').value : data.video_mood_val;
            if (data.video_mood_val === 'other' && !data.video_mood) errors.push("Опишите настроение");

            if (interviewCheck.checked) {
                data.interview = {
                    needed: true,
                    who: document.getElementById('interview_who').value,
                    questions: document.getElementById('interview_questions').value
                };
                if (!data.interview.who) errors.push("Укажите, кто в кадре для интервью");
            } else {
                data.interview = { needed: false };
            }
        }
        // ТЗ Фото
        else {
            const pFrom = parseInt(document.getElementById('photo_count_from').value);
            const pTo = parseInt(document.getElementById('photo_count_to').value);
            const fFromVal = document.getElementById('photo_fast_from').value;
            const fToVal = document.getElementById('photo_fast_to').value;

            if (isNaN(pFrom) || isNaN(pTo)) {
                errors.push("Укажите количество фото");
            } else if (pFrom <= 0 || pTo <= 0) {
                errors.push("Количество фото должно быть больше 0");
            } else if (pTo < pFrom) {
                errors.push("Максимум фото не может быть меньше минимума");
            }

            if (fFromVal || fToVal) {
                const fFrom = parseInt(fFromVal);
                const fTo = parseInt(fToVal);
                if (isNaN(fFrom) || isNaN(fTo) || fFrom <= 0 || fTo <= 0) {
                    errors.push("Количество фото 'Сразу' должно быть больше 0");
                } else if (fTo < fFrom) {
                    errors.push("Максимум 'Фото сразу' не может быть меньше минимума");
                }
                data.photo_fast = `от ${fFrom} до ${fTo}`;
            } else {
                data.photo_fast = "не требуется";
            }
            data.photo_count = `от ${pFrom} до ${pTo}`;
        }

        if (errors.length > 0) {
            const msg = errors.join("\n");
            if (tg.showAlert) tg.showAlert(msg); else alert(msg);
            return;
        }

        // ОТПРАВКА
        if (tg.MainButton.isVisible) tg.MainButton.showProgress();

        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 150);

    } catch (err) {
        alert("Произошла ошибка: " + err.message);
        if (tg.MainButton.isVisible) tg.MainButton.hideProgress();
    }
}
