const channels = [
    { id: 's0LLVQeMmtU', label: 'Asianet News', color: '#ff3333', startViewers: 0 },
    { id: '1wECsnGZcfc', label: '24 News', color: '#33cc33', startViewers: 0 },
    { id: 'nObUcHKZEGY', label: 'REPORTER LIVE', color: '#3333ff', startViewers: 0 },
    { id: '3miKzKlmA-4', label: 'Manorama News', color: '#ff9900', startViewers: 0 },
    { id: '281kTVNp8Wc', label: 'Mathrubhumi News', color: '#cc33cc', startViewers: 0 },
    { id: 'AT0fo8Ty4jo', label: 'BIGTV24X7', color: '#00cccc', startViewers: 0 }
];

let lastDbTimestamp = null;
let liveInterval;
let maxDataPoints = 15;

// Build the Scoreboard UI
const scoreboard = document.getElementById('live-scoreboard');
channels.forEach((channel, index) => {
    scoreboard.innerHTML += `
        <div class="stat-card" style="border-color: ${channel.color}">
            <h3>${channel.label}</h3>
            <div class="number" id="count-${index}">Waiting...</div>
        </div>
    `;
});

// Initialize Chart
let liveLabels = Array.from({ length: maxDataPoints }, () => new Date().toLocaleTimeString());
let liveDatasets = channels.map(c => ({
    label: c.label,
    borderColor: c.color,
    backgroundColor: c.color,
    data: Array(maxDataPoints).fill(0),
    tension: 0.4,
    borderWidth: 2,
    pointRadius: 0
}));

const ctx = document.getElementById('viewerChart').getContext('2d');
let viewerChart = new Chart(ctx, {
    type: 'line',
    data: { labels: liveLabels, datasets: liveDatasets },
    options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        scales: {
            x: { grid: { color: '#333' }, ticks: { color: '#a0a0a0' } },
            y: { grid: { color: '#333' }, ticks: { color: '#a0a0a0' }, beginAtZero: false }
        },
        plugins: { legend: { labels: { color: '#fff' } } }
    }
});

function updateLeaderboard() {
    let standings = channels.map((channel, i) => ({
        name: channel.label, color: channel.color,
        viewers: viewerChart.data.datasets[i].data[viewerChart.data.datasets[i].data.length - 1] 
    })).sort((a, b) => b.viewers - a.viewers);

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    standings.forEach((channel, rank) => {
        list.innerHTML += `
            <li style="border-left: 5px solid ${channel.color}">
                <span><span style="color:#a0a0a0; margin-right:10px;">#${rank + 1}</span> ${channel.name}</span>
                <span style="font-family: monospace;">${channel.viewers.toLocaleString()}</span>
            </li>
        `;
    });
}

function updateTimeAgo() {
    const el = document.getElementById('last-updated');
    if (!lastDbTimestamp) {
        el.innerHTML = '<span class="pulse-dot error"></span> Waiting for GitHub Action...';
        return;
    }
    const now = new Date();
    const diffMs = now - lastDbTimestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    let timeString = '';
    if (diffMins === 0) {
        timeString = `just now (${diffSecs}s ago)`;
    } else if (diffMins < 60) {
        timeString = `${diffMins} min ago`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        timeString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    el.innerHTML = `<span class="pulse-dot"></span> Last update: ${timeString}`;
}
setInterval(updateTimeAgo, 1000);

// Update data based on what's in data.json
async function fetchAndRenderRealData() {
    try {
        const response = await fetch('data.json');
        if (response.ok) {
            const db = await response.json();
            const latestEntry = db[db.length - 1];
            lastDbTimestamp = new Date(latestEntry.timestamp);
            
            const latestData = latestEntry.viewers;

            channels.forEach((channel, i) => {
                const count = latestData[channel.id] || 0;

                // Update number display
                const numElement = document.getElementById(`count-${i}`);
                if (numElement) {
                    const oldText = numElement.innerText;
                    numElement.innerText = count.toLocaleString();
                    
                    if (oldText !== 'Waiting...' && count !== parseInt(oldText.replace(/,/g, ''))) {
                        numElement.classList.remove('up', 'down');
                        void numElement.offsetWidth;
                        numElement.classList.add(count > parseInt(oldText.replace(/,/g, '')) ? 'up' : 'down');
                    }
                }

                // Update chart
                viewerChart.data.datasets[i].data.shift();
                viewerChart.data.datasets[i].data.push(count);
            });

            // Update Time stamps & graph
            viewerChart.data.labels.shift();
            viewerChart.data.labels.push(new Date(latestEntry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
            viewerChart.update();
            updateLeaderboard();
            updateTimeAgo();
        }
    } catch (e) {
        console.warn("Could not find data.json");
    }
}

function setMode(mode) {
    document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
    document.getElementById(mode === 'live' ? 'btn-live' : 'btn-historical').classList.add('active');

    if (mode === 'live') {
        viewerChart.options.animation.duration = 0;
        document.getElementById('live-scoreboard').style.display = 'flex';
        document.getElementById('leaderboard-section').style.display = 'block';
    } else {
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('leaderboard-section').style.display = 'none';
        loadHistoricalData();
    }
}

async function loadHistoricalData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("No data found");
        const db = await response.json();

        let histLabels = db.map(entry => new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        let histDatasets = channels.map((c, i) => ({
            ...liveDatasets[i],
            data: db.map(entry => entry.viewers[c.id] || 0),
            pointRadius: 2
        }));

        viewerChart.options.animation.duration = 800;
        viewerChart.data = { labels: histLabels, datasets: histDatasets };
        viewerChart.update();
    } catch (e) {
        alert("No historical data available. Run the GitHub Action first!");
    }
}

// Start running when the page loads
fetchAndRenderRealData();
setInterval(fetchAndRenderRealData, 10000); // Checks the database every 10 seconds for new updates

window.setMode = setMode;