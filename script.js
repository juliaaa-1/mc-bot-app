const tg = window.Telegram.WebApp;

const urlParams = new URLSearchParams(window.location.search);
let chat_id = urlParams.get('chat_id');
let thread_id = urlParams.get('thread_id');
let message_id = "";
let form_type = "default"; // 'default' or 'client'

if (!chat_id && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    const startParam = tg.initDataUnsafe.start_param;
    const parts = startParam.split('_');
    chat_id = parts[0];
    thread_id = parts[1] || "";
    message_id = parts[2] || "";
    form_type = parts[3] === 'client' ? 'client' : 'default';
}

// Переключение интерфейса в зависимости от типа формы
if (form_type === 'client') {
    document.getElementById('block_sender').classList.add('hidden');
    document.getElementById('block_client').classList.remove('hidden');
} else {
    document.getElementById('block_sender').classList.remove('hidden');
    document.getElementById('block_client').classList.add('hidden');
}

tg.expand();

const dateInput = document.getElementById('event_date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

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

const interviewCheck = document.getElementById('video_interview_check');
if (interviewCheck) {
    interviewCheck.addEventListener('change', (e) => {
        const details = document.getElementById('interview_details');
        if (e.target.checked) details.classList.remove('hidden');
        else details.classList.add('hidden');
    });
}

const deadlineSelect = document.getElementById('deadline_select');
if (deadlineSelect) {
    deadlineSelect.addEventListener('change', (e) => {
        const customInput = document.getElementById('deadline_custom');
        if (e.target.value === 'other') customInput.classList.remove('hidden');
        else customInput.classList.add('hidden');
    });
}

const moodSelect = document.getElementById('video_mood');
if (moodSelect) {
    moodSelect.addEventListener('change', (e) => {
        const customMood = document.getElementById('video_mood_custom');
        if (e.target.value === 'other') customMood.classList.remove('hidden');
        else customMood.classList.add('hidden');
    });
}

const senderSelect = document.getElementById('sender_select');
if (senderSelect) {
    senderSelect.addEventListener('change', (e) => {
        const customInput = document.getElementById('sender_custom');
        if (e.target.value === 'other') customInput.classList.remove('hidden');
        else customInput.classList.add('hidden');
    });
}

$(document).ready(function () {
    $("#event_location").suggestions({
        token: "1379cd2ac4b0d2070616f1c9861afefea8909fd0",
        type: "ADDRESS",
        count: 5,
        mobileWidth: true,
        restrict_value: true,
        constraints: {
            locations: { country: "Россия" }
        },
        onSelect: function (suggestion) {
            console.log(suggestion);
        }
    });

    // Инициализация маски ввода телефона
    initPhoneMask();
});

document.getElementById('btn_clear').addEventListener('click', () => {
    tg.showPopup({
        title: 'Очистка',
        message: 'Вы уверены, что хотите очистить все поля?',
        buttons: [
            { id: 'yes', type: 'destructive', text: 'Да, очистить' },
            { id: 'no', type: 'cancel' }
        ]
    }, function (btnId) {
        if (btnId === 'yes') {
            document.getElementById('requestForm').reset();
            document.getElementById('interview_details').classList.add('hidden');
            document.getElementById('deadline_custom').classList.add('hidden');
            document.getElementById('video_mood_custom').classList.add('hidden');
        }
    });
});

document.getElementById('btn_publish').addEventListener('click', validateAndSubmit);

function showError(msg) {
    tg.showPopup({
        title: 'Ошибка',
        message: msg,
        buttons: [{ type: 'ok' }]
    });
}

async function validateAndSubmit() {
    const form = document.getElementById('requestForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (data.event_date) {
        const selectedDate = new Date(data.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showError("Дата мероприятия не может быть в прошлом!");
            return;
        }
    } else {
        showError("Пожалуйста, выберите дату мероприятия.");
        return;
    }

    // 1.5 Проверка отправителя или заказчика
    if (form_type === 'client') {
        if (!data.client_name || data.client_name.trim() === '') {
            showError("Пожалуйста, введите Заказчика (ФИО или организацию).");
            return;
        }
        if (!data.client_phone || data.client_phone.trim().length < 10) {
            showError("Пожалуйста, введите корректный номер телефона.");
            return;
        }
    } else {
        if (!data.sender) {
            showError("Пожалуйста, выберите отправителя заявки.");
            return;
        }
        if (data.sender === 'other' && (!data.custom_sender || data.custom_sender.trim() === '')) {
            showError("Пожалуйста, введите название организации.");
            return;
        }
    }

    if (!data.event_time || !data.event_time_end) {
        showError("Пожалуйста, укажите время начала и окончания.");
        return;
    }
    const locationVal = document.getElementById('event_location').value;
    if (!locationVal || locationVal.trim().length === 0) {
        showError("Пожалуйста, укажите место проведения.");
        return;
    }
    if (!data.description || data.description.trim().length === 0) {
        showError("Пожалуйста, добавьте описание мероприятия.");
        return;
    }

    if (data.media_type === 'Фото') {
        const countFrom = parseFloat(data.photo_count_from);
        const countTo = parseFloat(data.photo_count_to);
        const fastFrom = data.photo_fast_from ? parseFloat(data.photo_fast_from) : null;
        const fastTo = data.photo_fast_to ? parseFloat(data.photo_fast_to) : null;

        function isValidInt(num) { return Number.isInteger(num) && num > 0; }

        if (!data.photo_count_from || !data.photo_count_to) {
            showError("Укажите количество фото (От и До).");
            return;
        }
        if (!isValidInt(countFrom) || !isValidInt(countTo)) {
            showError("Количество фото должно быть целым числом больше 0.");
            return;
        }
        if (countFrom > countTo) {
            showError("'От' не может быть больше 'До'.");
            return;
        }

        if (data.photo_fast_from || data.photo_fast_to) {
            if (!isValidInt(fastFrom) || !isValidInt(fastTo)) {
                showError("Количество фото 'Сразу' должно быть целым числом.");
                return;
            }
            if (fastFrom > fastTo) {
                showError("Ошибка 'Сразу': 'От' не может быть больше 'До'.");
                return;
            }
        }
    }

    if (data.deadline === 'other') {
        data.deadline = data.custom_deadline || document.getElementById('deadline_custom').value;
    }
    if (data.video_mood === 'other') {
        data.video_mood = data.video_mood_custom || document.getElementById('video_mood_custom').value;
    }

    // Обработка данных отправителя для обычного режима
    if (form_type !== 'client' && data.sender === 'other') {
        data.sender = data.custom_sender || document.getElementById('sender_custom').value;
    }

    data.location = locationVal;
    data.chat_id = chat_id;
    data.thread_id = thread_id;
    data.message_id = message_id;
    data.form_type = form_type; // Передаем тип формы скрипту

    // Публичная ссылка на Google Script (Deployment ID)
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyERT0eR7DOI-A3uXxEs2YKMhmWbJDAEjnIeKKD5AoNnzAxeyDiVjg5L4CE0hfvtdqQ/exec";

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
            showError("Ошибка отправки: " + e.message);
            tg.MainButton.hideProgress();
        }
    } else {
        tg.sendData(JSON.stringify(data));
        setTimeout(() => tg.close(), 100);
    }
}

// === ЛОГИКА МАСКИ ТЕЛЕФОНА ===
function initPhoneMask() {
    let phoneInputs = document.querySelectorAll('input[data-tel-input]');

    let getInputNumbersValue = function (input) {
        return input.value.replace(/\D/g, "");
    }

    let onPhoneInput = function (e) {
        let input = e.target,
            inputNumbersValue = getInputNumbersValue(input);
        formattedInputValue = "";
        selectionStart = input.selectionStart;

        if (!inputNumbersValue) {
            return input.value = "";
        }

        if (input.value.length != selectionStart) {
            if (e.data && /\D/g.test(e.data)) {
                input.value = inputNumbersValue;
            }
            return;
        }

        if (["7", "8", "9"].indexOf(inputNumbersValue[0]) > -1) {
            //russian number
            if (inputNumbersValue[0] == "9") inputNumbersValue = "7" + inputNumbersValue;
            let firstSymbols = (inputNumbersValue[0] == "8") ? "8" : "+7";
            formattedInputValue = firstSymbols + " ";
            if (inputNumbersValue.length > 1) {
                formattedInputValue += "(" + inputNumbersValue.substring(1, 4);
            }
            if (inputNumbersValue.length >= 5) {
                formattedInputValue += ") " + inputNumbersValue.substring(4, 7);
            }
            if (inputNumbersValue.length >= 8) {
                formattedInputValue += "-" + inputNumbersValue.substring(7, 9);
            }
            if (inputNumbersValue.length >= 10) {
                formattedInputValue += "-" + inputNumbersValue.substring(9, 11);
            }
        } else {
            // Not russian number
            formattedInputValue = "+" + inputNumbersValue.substring(0, 16);
        }
        input.value = formattedInputValue;
    }

    let onPhoneKeyDown = function (e) {
        let input = e.target;
        if (e.keyCode == 8 && getInputNumbersValue(input).length == 1) {
            input.value = "";
        }
    }

    let onPhonePaste = function (e) {
        let pastedText = e.clipboardData || window.clipboardData;
        input = e.target;
        inputNumbersValue = getInputNumbersValue(input);

        if (pastedText) {
            let text = pastedText.getData("Text");
            if (/\D/g.test(text)) {
                input.value = inputNumbersValue;
            }
        }
    }

    for (let i = 0; i < phoneInputs.length; i++) {
        let input = phoneInputs[i];
        input.addEventListener("input", onPhoneInput);
        input.addEventListener("keydown", onPhoneKeyDown);
        input.addEventListener("paste", onPhonePaste);
    }
}


