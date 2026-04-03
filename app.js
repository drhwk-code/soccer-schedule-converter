// State
const state = {
    files: [],
    events: []
};

// TeamSnap output columns (excluding the instruction column)
const TEAMSNAP_COLUMNS = [
    'Date',
    'Time',
    'Duration (HH:MM)',
    'Arrival Time (Minutes)',
    'Name',
    'Opponent Name',
    'Opponent Contact Name',
    'Opponent Contact Phone Number',
    'Opponent Contact E-mail Address',
    'Location Name',
    'Location Address',
    'Location Details',
    'Location URL',
    'Home or Away',
    'Uniform',
    'Extra Label',
    'Notes'
];

// Column mapping patterns for auto-detection
const COLUMN_MAPPINGS = {
    'Date': ['date', 'game date', 'event date', 'day', 'match date'],
    'Time': ['time', 'start time', 'game time', 'event time', 'start', 'kickoff'],
    'Duration (HH:MM)': ['duration', 'length', 'game length', 'time needed', 'session length', 'practice length'],
    'Arrival Time (Minutes)': ['arrival', 'arrival time', 'arrive', 'arrive early'],
    'Name': ['name', 'event name', 'event type', 'type', 'event', 'title'],
    'Opponent Name': ['opponent', 'opponent name', 'vs', 'against', 'opposing team', 'other team'],
    'Opponent Contact Name': ['opponent contact', 'opponent contact name', 'contact name'],
    'Opponent Contact Phone Number': ['opponent phone', 'opponent contact phone', 'contact phone'],
    'Opponent Contact E-mail Address': ['opponent email', 'opponent contact email', 'contact email'],
    'Location Name': ['location', 'location name', 'venue', 'field', 'field name', 'place'],
    'Location Address': ['address', 'location address', 'venue address', 'field address'],
    'Location Details': ['location details', 'details', 'field details', 'notes about location'],
    'Location URL': ['location url', 'map url', 'map link', 'url', 'link'],
    'Home or Away': ['home/away', 'home or away', 'home away', 'h/a', 'location type'],
    'Uniform': ['uniform', 'jersey', 'kit', 'uniform color'],
    'Extra Label': ['label', 'extra label', 'tag', 'game number', 'game #', 'game no', 'match number', 'match #'],
    'Notes': ['notes', 'comments', 'description', 'memo']
};

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesSection = document.getElementById('filesSection');
const filesList = document.getElementById('filesList');
const homeUniform = document.getElementById('homeUniform');
const awayUniform = document.getElementById('awayUniform');
const previewSection = document.getElementById('previewSection');
const previewHead = document.getElementById('previewHead');
const previewBody = document.getElementById('previewBody');
const actionsSection = document.getElementById('actionsSection');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const eventCount = document.getElementById('eventCount');
const gameCount = document.getElementById('gameCount');
const practiceCount = document.getElementById('practiceCount');

// Event Listeners
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', clearAll);
exportBtn.addEventListener('click', exportCSV);

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (files.length > 0) {
        processFiles(files);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        processFiles(files);
    }
    fileInput.value = '';
}

async function processFiles(files) {
    for (const file of files) {
        const existingIndex = state.files.findIndex(f => f.name === file.name);
        if (existingIndex >= 0) {
            state.files.splice(existingIndex, 1);
        }

        const content = await readFile(file);
        const parsed = parseCSV(content);
        const events = extractEvents(parsed);

        state.files.push({
            name: file.name,
            rowCount: events.length,
            events: events,
            options: {
                leagueName: '',
                notesUrl: '',
                arrivalTime: ''
            }
        });
    }

    combineEvents();
    updateUI();
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function parseCSV(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let headers = [];

    for (let i = 0; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length === 0 || row.every(cell => !cell.trim())) continue;

        if (headers.length === 0) {
            headers = row.map(h => h.trim());
        } else {
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header] = row[idx] || '';
            });
            result.push(obj);
        }
    }

    return { headers, rows: result };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);

    return result;
}

function extractEvents(parsed) {
    const { headers, rows } = parsed;
    const columnMap = mapColumns(headers);
    const events = [];

    for (const row of rows) {
        const event = {};

        for (const teamsnapCol of TEAMSNAP_COLUMNS) {
            const sourceCol = columnMap[teamsnapCol];
            if (sourceCol && row[sourceCol] !== undefined) {
                event[teamsnapCol] = row[sourceCol].trim();
            } else {
                event[teamsnapCol] = '';
            }
        }

        // Normalize the data
        normalizeEvent(event);

        // Skip rows that don't have essential data
        if (!event['Date'] && !event['Name'] && !event['Opponent Name']) {
            continue;
        }

        events.push(event);
    }

    return events;
}

function mapColumns(headers) {
    const map = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    for (const [teamsnapCol, patterns] of Object.entries(COLUMN_MAPPINGS)) {
        // First try exact match
        const exactIdx = lowerHeaders.findIndex(h => patterns.includes(h));
        if (exactIdx >= 0) {
            map[teamsnapCol] = headers[exactIdx];
            continue;
        }

        // Then try partial match
        for (const pattern of patterns) {
            const partialIdx = lowerHeaders.findIndex(h => h.includes(pattern) || pattern.includes(h));
            if (partialIdx >= 0) {
                map[teamsnapCol] = headers[partialIdx];
                break;
            }
        }
    }

    return map;
}

function normalizeEvent(event) {
    // Normalize date format
    if (event['Date']) {
        event['Date'] = normalizeDate(event['Date']);
    }

    // Normalize time format
    if (event['Time']) {
        event['Time'] = normalizeTime(event['Time']);
    }

    // Normalize duration
    if (event['Duration (HH:MM)']) {
        event['Duration (HH:MM)'] = normalizeDuration(event['Duration (HH:MM)']);
    }

    // Normalize arrival time to integer minutes
    if (event['Arrival Time (Minutes)']) {
        event['Arrival Time (Minutes)'] = normalizeArrivalTime(event['Arrival Time (Minutes)']);
    }

    // Normalize home/away
    if (event['Home or Away']) {
        const ha = event['Home or Away'].toLowerCase().trim();
        if (ha.startsWith('h')) {
            event['Home or Away'] = 'Home';
        } else if (ha.startsWith('a')) {
            event['Home or Away'] = 'Away';
        }
    }

    // Classify as Game or Practice based on presence of opponent
    if (event['Opponent Name']) {
        // It's a game - has opponent info
        event['Name'] = 'Game';
    } else {
        // It's a practice/event - no opponent
        event['Name'] = 'Practice';
    }
}

function normalizeDate(dateStr) {
    if (!dateStr) return '';

    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    // Try MM/DD/YYYY or similar formats
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        return dateStr; // Return as-is if already formatted
    }

    return dateStr;
}

function normalizeTime(timeStr) {
    if (!timeStr) return '';

    const time = timeStr.trim().toUpperCase();

    // Already in correct format
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time)) {
        return time;
    }

    // 24-hour format
    const match24 = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        let hours = parseInt(match24[1]);
        const minutes = match24[2];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    return timeStr;
}

function normalizeDuration(durationStr) {
    if (!durationStr) return '';

    const str = durationStr.toLowerCase().trim();

    // Already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(str)) {
        return str;
    }

    let totalMinutes = 0;

    // Match patterns like "1 hr", "1.5 hours", "1 hour 30 min", "90 min", "1 hr session", etc.
    const hourMatch = str.match(/(\d+\.?\d*)\s*(hr|hour|hrs|hours)/);
    const minMatch = str.match(/(\d+)\s*(min|mins|minute|minutes)/);

    if (hourMatch) {
        const hours = parseFloat(hourMatch[1]);
        totalMinutes += Math.round(hours * 60);
    }

    if (minMatch) {
        totalMinutes += parseInt(minMatch[1]);
    }

    // If we found hour or minute patterns, convert to HH:MM
    if (hourMatch || minMatch) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    // Try plain number (assume minutes if small, could be hours if 1-3)
    const plainNum = parseFloat(str);
    if (!isNaN(plainNum)) {
        // If it's a small number like 1, 1.5, 2, assume hours
        if (plainNum <= 4) {
            totalMinutes = Math.round(plainNum * 60);
        } else {
            // Larger numbers are probably minutes
            totalMinutes = Math.round(plainNum);
        }
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }

    return durationStr;
}

function normalizeArrivalTime(arrivalStr) {
    if (!arrivalStr) return '';

    const str = String(arrivalStr).toLowerCase().trim();

    // Already a plain integer
    if (/^\d+$/.test(str)) {
        return str;
    }

    // Extract number from strings like "30 min", "30 minutes", etc.
    const minMatch = str.match(/(\d+)\s*(min|minutes?)?/);
    if (minMatch) {
        return minMatch[1];
    }

    // Try to parse as a number
    const num = parseInt(str);
    if (!isNaN(num)) {
        return String(num);
    }

    return '';
}

function combineEvents() {
    state.events = [];
    for (const file of state.files) {
        state.events.push(...file.events);
    }

    // Sort by date and time
    state.events.sort((a, b) => {
        const dateA = new Date(a['Date'] + ' ' + a['Time']);
        const dateB = new Date(b['Date'] + ' ' + b['Time']);
        return dateA - dateB;
    });
}

function updateUI() {
    updateFilesList();
    updatePreview();
    updateCounts();

    const hasFiles = state.files.length > 0;
    filesSection.hidden = !hasFiles;
    previewSection.hidden = !hasFiles || state.events.length === 0;
    actionsSection.hidden = !hasFiles || state.events.length === 0;
}

function updateFilesList() {
    filesList.innerHTML = state.files.map((file, index) => `
        <div class="file-card">
            <div class="file-header">
                <div class="file-info">
                    <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="file-name">${escapeHtml(file.name)}</span>
                    <span class="file-count">(${file.rowCount} events)</span>
                </div>
                <button class="remove-btn" onclick="removeFile(${index})" title="Remove file">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="file-options">
                <div class="option-row">
                    <div class="option-group">
                        <label>League/Tournament Name</label>
                        <input type="text"
                            value="${escapeHtml(file.options.leagueName)}"
                            placeholder="Flight 3 Metro Blue GU12"
                            onchange="updateFileOption(${index}, 'leagueName', this.value)">
                    </div>
                    <div class="option-group">
                        <label>League/Tournament URL</label>
                        <input type="url"
                            value="${escapeHtml(file.options.notesUrl)}"
                            placeholder="https://bays.org/section/8484"
                            onchange="updateFileOption(${index}, 'notesUrl', this.value)">
                    </div>
                    <div class="option-group option-small">
                        <label>Arrival (min)</label>
                        <input type="number"
                            value="${escapeHtml(file.options.arrivalTime)}"
                            placeholder="30"
                            min="0"
                            onchange="updateFileOption(${index}, 'arrivalTime', this.value)">
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateFileOption(index, option, value) {
    if (state.files[index]) {
        state.files[index].options[option] = value;
    }
}

function updatePreview() {
    // Header
    previewHead.innerHTML = `
        <tr>
            ${TEAMSNAP_COLUMNS.slice(0, 8).map(col => `<th>${escapeHtml(col)}</th>`).join('')}
        </tr>
    `;

    // Body - show first 50 rows
    const previewRows = state.events.slice(0, 50);
    previewBody.innerHTML = previewRows.map(event => `
        <tr>
            ${TEAMSNAP_COLUMNS.slice(0, 8).map(col => `<td>${escapeHtml(event[col] || '')}</td>`).join('')}
        </tr>
    `).join('');
}

function updateCounts() {
    const total = state.events.length;
    const games = state.events.filter(e => e['Name'] === 'Game').length;
    const practices = total - games;

    eventCount.textContent = `${total} events`;
    gameCount.textContent = `${games} games`;
    practiceCount.textContent = `${practices} practices`;
}

function removeFile(index) {
    state.files.splice(index, 1);
    combineEvents();
    updateUI();
}

function clearAll() {
    state.files = [];
    state.events = [];
    homeUniform.value = '';
    awayUniform.value = '';
    updateUI();
}

function exportCSV() {
    const rows = [TEAMSNAP_COLUMNS];
    const homeUniformValue = homeUniform.value.trim();
    const awayUniformValue = awayUniform.value.trim();

    // Process each file with its own options
    for (const file of state.files) {
        const { leagueName: tournamentName, notesUrl: urlValue, arrivalTime: arrivalTimeValue } = file.options;

        for (const event of file.events) {
            const exportEvent = { ...event };

            // Build Extra Label: "Tournament Name - #GameNumber"
            const gameNumber = event['Extra Label'];
            if (tournamentName && gameNumber) {
                exportEvent['Extra Label'] = `${tournamentName} - #${gameNumber.replace(/^#/, '')}`;
            } else if (tournamentName) {
                exportEvent['Extra Label'] = tournamentName;
            } else if (gameNumber) {
                exportEvent['Extra Label'] = `#${gameNumber.replace(/^#/, '')}`;
            }

            // Add URL to Notes
            if (urlValue) {
                exportEvent['Notes'] = urlValue;
            }

            // Set Arrival Time if provided (must be integer minutes)
            if (arrivalTimeValue) {
                const minutes = parseInt(arrivalTimeValue);
                if (!isNaN(minutes)) {
                    exportEvent['Arrival Time (Minutes)'] = String(minutes);
                }
            }

            // Set Uniform based on Home/Away for games
            if (event['Name'] === 'Game') {
                const homeAway = (event['Home or Away'] || '').toLowerCase();
                if (homeAway === 'home' && homeUniformValue) {
                    exportEvent['Uniform'] = homeUniformValue;
                } else if (homeAway === 'away' && awayUniformValue) {
                    exportEvent['Uniform'] = awayUniformValue;
                }
            }

            const row = TEAMSNAP_COLUMNS.map(col => exportEvent[col] || '');
            rows.push(row);
        }
    }

    const csv = rows.map(row =>
        row.map(cell => {
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
    const filename = `${timestamp}_combined-schedule.csv`;

    link.setAttribute('href', blobUrl);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions to global scope for onclick handlers
window.removeFile = removeFile;
window.updateFileOption = updateFileOption;
