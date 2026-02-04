const tg = window.Telegram.WebApp;

// Init
tg.expand();

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
setupCustomInput('video_logos', 'video_logos_custom');
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
            } else if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        const selects = document.querySelectorAll('select');
        selects.forEach(select => select.selectedIndex = 0);

        document.querySelectorAll('input[id$="_custom"]').forEach(i => i.classList.add('hidden'));
        interviewDetails.classList.add('hidden');
        toggleMediaType();
    }
});

btnPublish.addEventListener('click', () => {
    validateAndSubmit();
});

// Address Autocomplete Logic
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
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();

            if (data.length > 0) {
                renderSuggestions(data);
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        } catch (err) {
            console.error("Geocoding error:", err);
        }
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

document.addEventListener('click', (e) => {
    if (e.target !== locationInput) {
        suggestionsContainer.classList.add('hidden');
    }
});

// Check Availability on server
const checkDateTime = async () => {
    const date = document.getElementById('event_date').value;
    const time = document.getElementById('event_time').value;
    const dateError = document.getElementById('date_error');

    if (date && time) {
        try {
            const response = await fetch(`/check_availability?date=${date}&time=${time}`);
            const result = await response.json();

            if (result.available === false) {
                dateError.style.display = 'block';
                dateError.textContent = "Это время уже занято!";
                tg.MainButton.disable();
                tg.MainButton.setParams({ color: '#e53935' }); // Red
            } else {
                dateError.style.display = 'none';
                tg.MainButton.enable();
                tg.MainButton.setParams({ color: tg.themeParams.button_color || '#2481cc' });
            }
        } catch (e) {
            console.error("Check availability error:", e);
        }
    }
};

document.getElementById('event_date').addEventListener('change', checkDateTime);
document.getElementById('event_time').addEventListener('change', checkDateTime);

// Main Button Logic (Telegram)
tg.MainButton.setText("ОПУБЛИКОВАТЬ ЗАЯВКУ");
if (tg.initDataUnsafe && tg.initDataUnsafe.query_id) {
    tg.MainButton.show();
    btnPublish.classList.add('hidden');
}

tg.MainButton.onClick(() => {
    validateAndSubmit();
});

// Validation and Submit
async function validateAndSubmit() {
    const isVideo = typeVideo.checked;
    const errors = [];
    const data = {
        media_type: isVideo ? "Видео" : "Фото",
        event_date: document.getElementById('event_date').value,
        event_time: document.getElementById('event_time').value,
        location: document.getElementById('event_location').value,
        description: document.getElementById('event_desc').value,
        transfer: document.getElementById('transfer_needed').checked ? "Да" : "Нет",
        deadline: document.getElementById('deadline_select').value
    };

    if (data.deadline === 'other') {
        data.deadline = document.getElementById('deadline_custom').value;
    }

    if (!data.event_date) errors.push("Укажите дату");
    if (!data.event_time) errors.push("Укажите время");
    if (!data.location) errors.push("Укажите место");
    if (!data.description) errors.push("Заполните описание");

    if (isVideo) {
        data.video_duration = document.getElementById('video_duration').value;
        data.video_format = document.getElementById('video_format').value;
        data.video_mood = document.getElementById('video_mood').value === 'other' ? document.getElementById('video_mood_custom').value : document.getElementById('video_mood').value;
        data.video_pace = document.getElementById('video_pace').value;
        data.video_logos = document.getElementById('video_logos').value === 'other' ? document.getElementById('video_logos_custom').value : document.getElementById('video_logos').value;

        if (interviewCheck.checked) {
            data.interview = {
                needed: true,
                who: document.getElementById('interview_who').value,
                questions: document.getElementById('interview_questions').value
            };
        } else {
            data.interview = { needed: false };
        }
    } else {
        data.photo_count = document.getElementById('photo_count').value;
        data.photo_fast = document.getElementById('photo_fast').value;
        if (!data.photo_count) errors.push("Укажите количество фото");
    }

    if (errors.length > 0) {
        if (tg.showAlert) tg.showAlert(errors.join("\n"));
        else alert(errors.join("\n"));
        return;
    }

    if (tg.MainButton.isVisible) tg.MainButton.showProgress();

    if (!tg.initDataUnsafe || !tg.initDataUnsafe.query_id) {
        console.log("Submit data:", data);
        alert("Заявка сформирована (в консоли)! Для отправки боту используйте Telegram.");
        return;
    }

    try {
        tg.sendData(JSON.stringify(data));
    } catch (e) {
        alert("Ошибка: " + e.message);
        tg.MainButton.hideProgress();
    }
}
