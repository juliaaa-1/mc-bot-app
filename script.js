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

let selectedFiles = [];

const multiDayCheck = document.getElementById('multi_day_check');
if (multiDayCheck) {
    multiDayCheck.addEventListener('change', (e) => {
        const endBlock = document.getElementById('end_date_block');
        if (e.target.checked) endBlock.classList.remove('hidden');
        else {
            endBlock.classList.add('hidden');
            document.getElementById('event_date_end').value = "";
        }
    });
}

// ЛОГИКА ФАЙЛОВ
const fileInput = document.getElementById('event_files');
const fakeBtn = document.getElementById('fake_file_btn');
const fileListContainer = document.getElementById('file_list_container');
const statusText = document.getElementById('file_status_text');

fakeBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);

    for (let file of newFiles) {
        if (selectedFiles.length < 5) {
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        }
    }

    updateFileUI();
    fileInput.value = "";
});

function updateFileUI() {
    fileListContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="file-item-name">${file.name}</span>
            <span class="file-item-delete" onclick="removeFile(${index})">×</span>
        `;
        fileListContainer.appendChild(item);
    });

    const count = selectedFiles.length;
    if (count === 0) {
        statusText.innerText = "Файлы не выбраны";
    } else {
        const ending = getFileEnding(count);
        statusText.innerText = `Выбран${count === 1 ? '' : 'о'} ${count} файл${ending}`;
    }

    fakeBtn.disabled = count >= 5;
}

function getFileEnding(count) {
    if (count === 1) return "";
    if (count >= 2 && count <= 4) return "а";
    return "ов";
}

window.removeFile = function (index) {
    selectedFiles.splice(index, 1);
    updateFileUI();
};

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
            selectedFiles = [];
            updateFileUI();
        }
    });
});

document.getElementById('btn_publish').addEventListener('click', validateAndSubmit);

function showError(msg) {
    tg.showPopup({
        title: 'Результат',
        message: msg,
        buttons: [{ type: 'ok' }]
    });
}

function validateAndSubmit() {
    // ВАЖНО: Проверка наличия ID чата
    if (!chat_id || chat_id === "null" || chat_id === "undefined") {
        showError('ОШИБКА: Нет ID чата. Закройте форму и снова нажмите на кнопку в боте.');
        return;
    }

    const form = document.getElementById('requestForm');
    const formData = new FormData(form);

    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    const data = Object.fromEntries(formData.entries());

    if (data.event_date) {
        const selectedDate = new Date(data.event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showError("Дата начала не может быть в прошлом!");
            return;
        }

        if (data.is_multi_day === 'on') {
            if (!data.event_date_end) {
                showError("Пожалуйста, выберите дату окончания.");
                return;
            }
            const endDate = new Date(data.event_date_end);
            if (endDate < selectedDate) {
                showError("Дата окончания не может быть раньше даты начала!");
                return;
            }
        }
    } else {
        showError("Пожалуйста, выберите дату начала.");
        return;
    }

    const locationVal = document.getElementById('event_location').value;
    if (!locationVal || locationVal.trim().length === 0) {
        showError("Пожалуйста, укажите место проведения."); return;
    }
    if (!data.description || data.description.trim().length === 0) {
        showError("Пожалуйста, добавьте описание мероприятия."); return;
    }

    if (data.media_type === 'Фото') {
        const countFrom = parseInt(data.photo_count_from);
        const countTo = parseInt(data.photo_count_to);
        if (!countFrom || !countTo || countFrom > countTo) {
            showError("Проверьте количество фото (От и До)."); return;
        }
    }

    if (data.deadline === 'other') {
        data.deadline = data.custom_deadline || document.getElementById('deadline_custom').value;
    }

    formData.append('location', locationVal);
    formData.append('chat_id', chat_id);
    formData.append('thread_id', thread_id);
    formData.append('message_id', message_id);
    formData.append('form_type', form_type);

    const PYTHON_BACKEND_URL = "https://yuliyaanisimova06.pythonanywhere.com/submit/";

    tg.MainButton.setText("ОТПРАВЛЯЮ...");
    tg.MainButton.showProgress();
    tg.MainButton.show();

    console.log("Отправка на:", PYTHON_BACKEND_URL);

    fetch(PYTHON_BACKEND_URL, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(d => { throw new Error(d.message || 'Ошибка сервера: ' + response.status) });
            }
            return response.json();
        })
        .then(res => {
            console.log("Ответ сервера:", res);
            if (res.status === 'success') {
                tg.MainButton.hideProgress();
                tg.MainButton.setText("ГОТОВО!");
                setTimeout(() => tg.close(), 800);
            } else {
                tg.MainButton.hideProgress();
                tg.MainButton.setText("ОШИБКА!");
                showError("СЕРВЕР ВЕРНУЛ ОШИБКУ:\n" + (res.message || "Неизвестная ошибка"));
            }
        })
        .catch(error => {
            console.error("Ошибка отправки:", error);
            tg.MainButton.hideProgress();
            tg.MainButton.setText("ОШИБКА СЕТИ");
            showError("СЕТЕВАЯ ОШИБКА (Failed to fetch).\n\n" +
                "Такое бывает из-за VPN. Пожалуйста, проверьте чат в Telegram:\n\n" +
                "1. Если заявка УЖЕ ПРИШЛА — всё хорошо, можете закрыть форму.\n" +
                "2. Если заявки нет — попробуйте выключить/включить VPN и отправить снова.");
        });
}

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
