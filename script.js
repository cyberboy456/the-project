const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
body.classList.add(currentTheme + '-theme');

themeToggle.addEventListener('click', () => {
    themeToggle.classList.add('animate-spin');
    setTimeout(() => {
        themeToggle.classList.remove('animate-spin');
        body.classList.toggle('light-theme');
        body.classList.toggle('dark-theme');
        localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark' : 'light');
    }, 300);
});

const urlInput = document.getElementById('urlInput');
const checkBtn = document.getElementById('checkBtn');
const resultContainer = document.getElementById('resultContainer');
const fileCheckBtn = document.getElementById('fileCheckBtn');
const historyBtn = document.getElementById('historyBtn');

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 🔗 New API-based URL checker
async function checkUrlSafety(url) {
    const res = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('Python backend error');
    return res.json();
}

checkBtn.addEventListener('click', async () => {
    checkBtn.classList.add('pulse-animation');
    const url = urlInput.value.trim();
    if (!url) return showAlert('Please enter a URL to check', 'error');
    if (!isValidUrl(url)) return showAlert('Please enter a valid URL (include http:// or https://)', 'error');

    resultContainer.innerHTML = '';
    const loadingCard = document.createElement('div');
    loadingCard.className = 'card p-6 result-card loading';
    loadingCard.innerHTML = `<div class="animate-pulse h-20 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>`;
    resultContainer.appendChild(loadingCard);

    try {
        const result = await checkUrlSafety(url);
        resultContainer.innerHTML = '';

        const resultCard = document.createElement('div');
        resultCard.className = `card p-6 result-card ${result.safe ? 'safe-url' : 'danger-url'}`;

        const icon = result.safe
            ? `<svg class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4"/></svg>`
            : `<svg class="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01"/></svg>`;

        const title = result.safe ? 'Safe URL' : 'Warning: Unsafe URL Detected';
        const bgClass = result.safe ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900';

        resultCard.innerHTML = `
            <div class="flex items-start gap-4">
                <div>${icon}</div>
                <div>
                    <h3 class="text-xl font-bold">${title}</h3>
                    <p class="mb-4">${url}</p>
                    <div class="${bgClass} p-3 rounded">${result.reason}</div>
                    ${result.level === 'critical' ? `<div class="mt-4 bg-yellow-100 dark:bg-yellow-900 p-3 rounded"><strong>Critical:</strong> Avoid visiting this site!</div>` : ''}
                </div>
            </div>
            <div class="mt-4 flex gap-2">
                ${result.safe ? `<a href="${url}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Proceed to Site</a>` : ''}
                <button onclick="copyToClipboard('${url}')" class="bg-gray-200 dark:bg-gray-700 text-sm px-4 py-2 rounded">Copy URL</button>
                ${!result.safe ? `<button onclick="reportMaliciousUrl('${url}')" class="bg-red-600 text-white px-4 py-2 rounded">Report Abuse</button>` : ''}
            </div>
        `;

        setTimeout(() => {
            resultContainer.appendChild(resultCard);
            checkBtn.classList.remove('pulse-animation');
        }, 100);

        addToHistory(url, result.safe);

    } catch (err) {
        resultContainer.innerHTML = '';
        console.error('Check error:', err);
        showAlert('Server error while checking the URL.', 'error');
    }
});

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `fixed top-6 right-6 p-6 rounded-xl z-50 transition-all duration-300 translate-x-4 opacity-0 ${
        type === 'error' ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100' :
        type === 'success' ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100' :
        'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
    }`;
    alert.innerHTML = `<div>${message}</div>`;
    document.body.appendChild(alert);
    setTimeout(() => alert.classList.add('translate-x-0', 'opacity-100'), 10);
    setTimeout(() => alert.remove(), 5000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showAlert('URL copied to clipboard', 'success'))
        .catch(() => showAlert('Failed to copy URL', 'error'));
}

function reportMaliciousUrl(url) {
    showAlert('Thank you for reporting this malicious URL.', 'success');
}

function addToHistory(url, isSafe) {
    let history = JSON.parse(localStorage.getItem('urlCheckHistory') || '[]');
    history.unshift({ url, isSafe, timestamp: new Date().toISOString() });
    localStorage.setItem('urlCheckHistory', JSON.stringify(history.slice(0, 20)));
}

historyBtn.addEventListener('click', () => {
    const history = JSON.parse(localStorage.getItem('urlCheckHistory') || '[]');
    resultContainer.innerHTML = '';
    if (history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'card p-6 text-center py-12';
        empty.innerHTML = `<h3 class="text-xl font-medium mb-2">No History Yet</h3><p class="text-gray-500 dark:text-gray-400">Start checking URLs to build your history</p>`;
        resultContainer.appendChild(empty);
        return;
    }

    history.forEach(item => {
        const historyCard = document.createElement('div');
        historyCard.className = `card p-4 result-card ${item.isSafe ? 'safe-url' : 'danger-url'}`;
        historyCard.innerHTML = `
            <div class="flex items-center gap-3">
                <div>${item.isSafe ? '✅' : '⚠️'}</div>
                <div class="flex-grow">
                    <p class="text-sm break-all font-medium">${item.url}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <button onclick="checkHistoryUrl('${item.url}')" class="text-blue-600 hover:underline">Check Again</button>
            </div>
        `;
        resultContainer.appendChild(historyCard);
    });
});

function checkHistoryUrl(url) {
    urlInput.value = url;
    checkBtn.click();
}

fileCheckBtn.addEventListener('click', () => {
    showAlert('File URL checker coming soon!', 'info');
});