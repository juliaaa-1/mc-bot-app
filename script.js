const tg = window.Telegram.WebApp;

// Init
tg.expand();

// Установка минимальной даты (сегодня)
const dateInput = document.getElementById('event_date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

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

// Media Type Toggling
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

// Interview Toggle
interviewCheck.addEventListener('change', () => {
    if (interviewCheck.checked) {
        interviewDetails.classList.remove('hidden');
        interviewDetails.classList.add('fade-in');
    } else {
        interviewDetails.classList.add('hidden');
    }
});

// Clear Form Logic
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
            input.disabled = false;
        });

        const selects = document.querySelectorAll('select');
        selects.forEach(select => select.selectedIndex = 0);

        document.querySelectorAll('.hidden-input, [id$="_custom"]').forEach(i => i.classList.add('hidden'));
        interviewDetails.classList.add('hidden');

        toggleMediaType();
    }
});

btnPublish.addEventListener('click', validateAndSubmit);

// Hide keyboard helper
const hideKeyboard = () => {
    document.activeElement.blur();
};

// Hide on Enter key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            hideKeyboard();
        }
    }
});

// Hide on scroll/tap outside
document.addEventListener('touchstart', (e) => {
    if (!['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(e.target.tagName)) {
        hideKeyboard();
    }
}, { passive: true });

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

tg.MainButton.setText("ОПУБЛИКОВАТЬ ЗАЯВКУ");
if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
    tg.MainButton.show();
    btnPublish.classList.add('hidden');
}
tg.MainButton.onClick(validateAndSubmit);

// Validation and Submit
async function validateAndSubmit() {
    const isVideo = typeVideo.checked;
    const errors = [];

    const data = {
        media_type: isVideo ? "Видео" : "Фото",
        event_date: document.getElementById('event_date').value,
        event_time: document.getElementById('event_time').value,
        event_time_end: document.getElementById('event_time_end').value,
        location: document.getElementById('event_location').value,
        description: document.getElementById('event_desc').value,
        transfer: document.querySelector('input[name="transfer"]:checked').value,
        deadline_val: document.getElementById('deadline_select').value
    };

    if (data.deadline_val === 'other') {
        data.deadline = document.getElementById('deadline_custom').value;
    } else {
        data.deadline = data.deadline_val;
    }

    // 🚩 Validation: Required selects
    if (!data.deadline) errors.push("Укажите срок сдачи");

    // 🚩 Validation: Required
    if (!data.event_date) errors.push("Укажите дату");
    if (!data.event_time) errors.push("Укажите время начала");
    if (!data.event_time_end) errors.push("Укажите время окончания");
    if (!data.location) errors.push("Укажите место");
    if (!data.description) errors.push("Заполните описание");

    // 🚩 Validation: Date (No back-dating)
    const selectedDate = new Date(data.event_date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (selectedDate < todayDate) {
        errors.push("Нельзя выбрать прошедшую дату");
    }

    // 🚩 Validation: Time (End > Start)
    if (data.event_time && data.event_time_end) {
        if (data.event_time_end <= data.event_time) {
            errors.push("Время окончания должно быть позже времени начала");
        }
    }

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
        if (data.video_mood_val === 'other' && !data.video_mood) errors.push("Опишите настроение ролика");

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
    } else {
        const pFrom = parseInt(document.getElementById('photo_count_from').value);
        const pTo = parseInt(document.getElementById('photo_count_to').value);
        const fFromVal = document.getElementById('photo_fast_from').value;
        const fToVal = document.getElementById('photo_fast_to').value;

        if (isNaN(pFrom) || pFrom <= 0 || isNaN(pTo) || pTo <= 0) {
            errors.push("Количество фото должно быть больше 0");
        } else if (pTo < pFrom) {
            errors.push("Максимальное количество фото не может быть меньше минимального");
        }

        if (fFromVal || fToVal) {
            const fFrom = parseInt(fFromVal);
            const fTo = parseInt(fToVal);
            if (isNaN(fFrom) || fFrom <= 0 || isNaN(fTo) || fTo <= 0) {
                errors.push("Количество фото 'Сразу' должно быть больше 0");
            } else if (fTo < fFrom) {
                errors.push("Максимальное количество фото 'Сразу' не может быть меньше минимального");
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

    tg.MainButton.showProgress();
    try {
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    } catch (e) {
        alert("Заявка сформирована (но не в TG)");
        tg.MainButton.hideProgress();
    }
}
