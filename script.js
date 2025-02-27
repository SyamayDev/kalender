document.addEventListener('DOMContentLoaded', () => {
    let currentDate = new Date();
    let markedEvents = JSON.parse(localStorage.getItem('markedEvents')) || {};
    const hijriMonths = [
        "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
        "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
        "Ramadan", "Syawal", "Dzulqa'dah", "Dzuhijjah"
    ];
    let isFirstLoad = true;

    function gregorianToHijri(date) {
        const referenceDate = new Date(2025, 1, 26); // 26 Feb 2025
        const referenceHijri = { day: 27, month: "Sya'ban", year: 1446 };
        const daysSinceReference = Math.floor((date - referenceDate) / (1000 * 60 * 60 * 24));
        let hijriDay = referenceHijri.day + daysSinceReference;
        let hijriMonth = hijriMonths.indexOf(referenceHijri.month);
        let hijriYear = referenceHijri.year;

        const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
        monthLengths[8] = 30; // Ramadan selalu 30 hari

        while (hijriDay > monthLengths[hijriMonth]) {
            hijriDay -= monthLengths[hijriMonth];
            hijriMonth++;
            if (hijriMonth >= 12) {
                hijriMonth = 0;
                hijriYear++;
            }
        }
        while (hijriDay <= 0) {
            hijriMonth--;
            if (hijriMonth < 0) {
                hijriMonth = 11;
                hijriYear--;
            }
            hijriDay += monthLengths[hijriMonth];
        }

        return {
            day: hijriDay,
            month: hijriMonths[hijriMonth],
            year: hijriYear
        };
    }

    function formatHijriDate(hijri) {
        return `${hijri.day} ${hijri.month} ${hijri.year} H`;
    }

    function populateSelects() {
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('id-ID', { month: 'long' }));

        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 50; year <= currentYear + 50; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }

        monthSelect.value = currentDate.getMonth();
        yearSelect.value = currentDate.getFullYear();

        monthSelect.addEventListener('change', () => {
            currentDate.setMonth(parseInt(monthSelect.value));
            renderCalendar(currentDate);
        });
        yearSelect.addEventListener('change', () => {
            currentDate.setFullYear(parseInt(yearSelect.value));
            renderCalendar(currentDate);
        });
    }

    function renderCalendar(date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        document.getElementById('monthYear').textContent = `${date.toLocaleString('id-ID', { month: 'long' })} ${year}`;
        const todayHijri = gregorianToHijri(new Date());
        document.getElementById('hijriDate').textContent = `Tanggal Hijriyah Hari Ini: ${formatHijriDate(todayHijri)}`;

        let calendarBody = document.getElementById('calendarBody');
        calendarBody.innerHTML = '';
        let row = document.createElement('tr');
        let dayCount = 1;

        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('td');
            emptyCell.style.padding = '6px';
            row.appendChild(emptyCell);
        }

        while (dayCount <= daysInMonth) {
            if (row.children.length === 7) {
                calendarBody.appendChild(row);
                row = document.createElement('tr');
            }
            let cell = document.createElement('td');
            const currentDay = new Date(year, month, dayCount);
            const dateKey = currentDay.toISOString().split('T')[0];
            const hijri = gregorianToHijri(currentDay);
            const hijriText = `${hijri.day} ${hijri.month}`;

            cell.innerHTML = `${dayCount}<span class="hijri-date">${hijriText}</span>`;
            cell.style.padding = '6px';

            if (markedEvents[dateKey]) {
                cell.classList.add('marked-date');
                cell.title = `${markedEvents[dateKey].name} (${markedEvents[dateKey].time || 'Tanpa waktu'})`;
            }
            if (currentDay.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            cell.addEventListener('click', () => openMarkDateModal(currentDay));
            row.appendChild(cell);
            dayCount++;
        }

        while (row.children.length < 7) {
            const emptyCell = document.createElement('td');
            emptyCell.style.padding = '6px';
            row.appendChild(emptyCell);
        }
        calendarBody.appendChild(row);

        if (isFirstLoad) {
            updateCountdown();
            isFirstLoad = false;
        }
    }

    function openMarkDateModal(date) {
        const dateKey = date.toISOString().split('T')[0];
        const hijri = gregorianToHijri(date);
        document.getElementById('selectedDate').textContent = `${date.toLocaleDateString('id-ID')} (${formatHijriDate(hijri)})`;
        document.getElementById('eventName').value = markedEvents[dateKey]?.name || '';
        document.getElementById('eventTime').value = markedEvents[dateKey]?.time || '';
        
        const deleteButton = document.getElementById('deleteEvent');
        const shareButton = document.createElement('button');
        shareButton.className = 'btn btn-success';
        shareButton.style.fontSize = '0.9rem';
        shareButton.textContent = 'Bagikan';
        shareButton.onclick = () => shareEvent(dateKey);

        const modalFooter = document.querySelector('#markDateModal .modal-footer');
        modalFooter.appendChild(shareButton);

        if (markedEvents[dateKey]) {
            deleteButton.style.display = 'inline-block';
            shareButton.style.display = 'inline-block';
        } else {
            deleteButton.style.display = 'none';
            shareButton.style.display = 'none';
        }

        $('#markDateModal').modal('show');

        document.getElementById('saveEvent').onclick = () => {
            const eventName = document.getElementById('eventName').value;
            const eventTime = document.getElementById('eventTime').value;
            if (eventName) {
                markedEvents[dateKey] = { name: eventName, time: eventTime || null };
                localStorage.setItem('markedEvents', JSON.stringify(markedEvents));
                renderCalendar(currentDate);
                updateCountdown();
                $('#markDateModal').modal('hide');
                checkNotification(dateKey);
            }
        };

        document.getElementById('deleteEvent').onclick = () => {
            delete markedEvents[dateKey];
            localStorage.setItem('markedEvents', JSON.stringify(markedEvents));
            renderCalendar(currentDate);
            updateCountdown();
            $('#markDateModal').modal('hide');
        };

        // Cleanup share button when modal closes
        $('#markDateModal').on('hidden.bs.modal', function () {
            shareButton.remove();
        });
    }

    function shareEvent(dateKey) {
        const event = markedEvents[dateKey];
        if (!event) return;

        const eventDate = new Date(dateKey);
        const hijri = gregorianToHijri(eventDate);
        const timeText = event.time ? ` pada pukul ${event.time}` : '';
        const shareText = `Acara: ${event.name}\nTanggal: ${eventDate.toLocaleDateString('id-ID')} (${formatHijriDate(hijri)})${timeText}`;

        // Try native share API first
        if (navigator.share) {
            navigator.share({
                title: 'Bagikan Acara',
                text: shareText
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback to custom share options
            const shareWindow = window.open('', '_blank', 'width=600,height=400');
            shareWindow.document.write(`
                <html>
                <head>
                    <title>Bagikan Acara</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        a { display: block; margin: 10px 0; color: #28a745; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <h3>Bagikan melalui:</h3>
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}" target="_blank">WhatsApp</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}" target="_blank">Facebook</a>
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}" target="_blank">Twitter</a>
                    <a href="#" onclick="navigator.clipboard.writeText('${shareText}'); alert('Teks disalin ke clipboard!'); return false;">Salin Teks</a>
                </body>
                </html>
            `);
        }
    }

    function updateCountdown() {
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        let nearestEvent = null;
        let minDiff = Infinity;

        for (const [dateKey, event] of Object.entries(markedEvents)) {
            const eventDate = new Date(dateKey);
            if (event.time) {
                const [hours, minutes] = event.time.split(':');
                eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
            const diff = eventDate - today;
            if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                nearestEvent = { date: dateKey, name: event.name, time: event.time };
            }
        }

        if (nearestEvent) {
            const daysLeft = Math.ceil(minDiff / (1000 * 60 * 60 * 24));
            const timeText = nearestEvent.time ? ` pada ${nearestEvent.time}` : '';
            document.getElementById('countdown').textContent = `${daysLeft} hari lagi menuju ${nearestEvent.name}${timeText}`;
            document.getElementById('countdownMessage').textContent = `${daysLeft} hari lagi menuju ${nearestEvent.name}${timeText}`;
            $('#countdownModal').modal('show');
        } else {
            document.getElementById('countdown').textContent = 'Tidak ada acara yang ditandai.';
            $('#countdownModal').modal('hide');
        }
    }

    function checkNotification(dateKey) {
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        if (dateKey === todayKey && markedEvents[dateKey] && Notification.permission === 'granted') {
            const event = markedEvents[dateKey];
            const timeText = event.time ? ` pada ${event.time}` : '';
            new Notification(`Pengingat: ${event.name}`, {
                body: `Hari ini${timeText} adalah hari yang Anda tandai!`,
                icon: 'https://via.placeholder.com/150'
            });
        }
    }

    function checkTodayEvents() {
        const todayKey = new Date().toISOString().split('T')[0];
        if (markedEvents[todayKey] && Notification.permission === 'granted') {
            const event = markedEvents[todayKey];
            const timeText = event.time ? ` pada ${event.time}` : '';
            new Notification(`Pengingat: ${event.name}`, {
                body: `Hari ini${timeText} adalah hari yang Anda tandai!`,
                icon: 'https://via.placeholder.com/150'
            });
        }
    }

    function showEventList() {
        const eventListBody = document.getElementById('eventListBody');
        eventListBody.innerHTML = '';

        for (const [dateKey, event] of Object.entries(markedEvents)) {
            const eventDate = new Date(dateKey);
            const hijri = gregorianToHijri(eventDate);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${eventDate.toLocaleDateString('id-ID')} (${formatHijriDate(hijri)})</td>
                <td>${event.name}</td>
                <td>${event.time || 'Tanpa waktu'}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-event" data-key="${dateKey}" style="font-size: 0.8rem;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-event" data-key="${dateKey}" style="font-size: 0.8rem;"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm btn-success share-event" data-key="${dateKey}" style="font-size: 0.8rem;"><i class="fas fa-share"></i></button>
                </td>
            `;
            eventListBody.appendChild(row);
        }

        $('#eventListModal').modal('show');

        document.querySelectorAll('.edit-event').forEach(button => {
            button.addEventListener('click', (e) => {
                const dateKey = e.target.closest('button').dataset.key;
                const eventDate = new Date(dateKey);
                $('#eventListModal').modal('hide');
                openMarkDateModal(eventDate);
            });
        });

        document.querySelectorAll('.delete-event').forEach(button => {
            button.addEventListener('click', (e) => {
                const dateKey = e.target.closest('button').dataset.key;
                delete markedEvents[dateKey];
                localStorage.setItem('markedEvents', JSON.stringify(markedEvents));
                renderCalendar(currentDate);
                updateCountdown();
                showEventList();
            });
        });

        document.querySelectorAll('.share-event').forEach(button => {
            button.addEventListener('click', (e) => {
                const dateKey = e.target.closest('button').dataset.key;
                shareEvent(dateKey);
            });
        });
    }

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        document.getElementById('monthSelect').value = currentDate.getMonth();
        document.getElementById('yearSelect').value = currentDate.getFullYear();
        renderCalendar(currentDate);
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        document.getElementById('monthSelect').value = currentDate.getMonth();
        document.getElementById('yearSelect').value = currentDate.getFullYear();
        renderCalendar(currentDate);
    });

    document.getElementById('eventListBtn').addEventListener('click', () => {
        showEventList();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        currentDate = new Date();
        document.getElementById('monthSelect').value = currentDate.getMonth();
        document.getElementById('yearSelect').value = currentDate.getFullYear();
        renderCalendar(currentDate);
        updateCountdown();
    });

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    populateSelects();
    renderCalendar(currentDate);
    checkTodayEvents();
});
