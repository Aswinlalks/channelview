const channels = [
    { id: 's0LLVQeMmtU', label: 'Asianet News', color: '#ff3333', startViewers: 159000 },
    { id: '1wECsnGZcfc', label: '24 News', color: '#33cc33', startViewers: 1138000 },
    { id: 'nObUcHKZEGY', label: 'REPORTER LIVE', color: '#3333ff', startViewers: 252000 },
    { id: '3miKzKlmA-4', label: 'Manorama News', color: '#ff9900', startViewers: 58000 },
    { id: '281kTVNp8Wc', label: 'Mathrubhumi News', color: '#cc33cc', startViewers: 19000 },
    { id: 'AT0fo8Ty4jo', label: 'BIGTV24X7', color: '#00cccc', startViewers: 14000 }
];

// 1. Build the Live Scoreboard UI
const scoreboard = document.getElementById('live-scoreboard');
channels.forEach((channel, index) => {
    scoreboard.innerHTML += `
        <div class="stat-card" style="border-color: ${channel.color}">
            <h3>${channel.label}</h3>
            <div class="number" id="count-${index}">Loading...</div>
        </div>
    `;
});

// 2. Setup Chart.js Data Structures
let maxDataPoints = 15;
let liveLabels = Array.from({length: maxDataPoints}, () => new Date().toLocaleTimeString());
let liveDatasets = channels.map(c => ({
    label: c.label,
    borderColor: c.color,
    backgroundColor: c.color,
    data: Array(maxDataPoints).fill(c.startViewers),
    tension: 0.4,
    borderWidth: 2,
    pointRadius: 0
}));

// Initialize Chart
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

// 3. Leaderboard Updater
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

// 4. The Live Engine (Now using real DB data as a base!)
let liveInterval;

async function startLiveUpdates() {
    // A. Fetch REAL data from the Python database first
    try {
        const response = await fetch('data.json');
        if (response.ok) {
            const db = await response.json();
            const latestData = db[db.length - 1].viewers; // Grab the most recent timestamp's data
            
            // Overwrite default startViewers with real data
            channels.forEach((channel, i) => {
                if (latestData[channel.id] !== undefined) {
                    channel.startViewers = latestData[channel.id];
                    viewerChart.data.datasets[i].data.fill(channel.startViewers);
                }
            });
        }
    } catch (e) {
        console.log("Database not found yet. Using default fallback numbers for simulation.");
    }

    // B. Start the ticking simulation using those real numbers
    liveInterval = setInterval(() => {
        viewerChart.data.labels.shift();
        viewerChart.data.labels.push(new Date().toLocaleTimeString());

        channels.forEach((channel, i) => {
            let change = Math.floor(channel.startViewers * (Math.random() * 0.02 - 0.01));
            let newViewers = Math.max(0, viewerChart.data.datasets[i].data[maxDataPoints - 1] + change);
            
            let numElement = document.getElementById(`count-${i}`);
            let oldViewers = parseInt(numElement.innerText.replace(/,/g, '')) || 0;
            numElement.innerText = newViewers.toLocaleString();
            
            numElement.classList.remove('up', 'down');
            void numElement.offsetWidth; // Trigger CSS reflow
            if (newViewers > oldViewers) numElement.classList.add('up');
            else if (newViewers < oldViewers) numElement.classList.add('down');

            viewerChart.data.datasets[i].data.shift();
            viewerChart.data.datasets[i].data.push(newViewers);
        });
        viewerChart.update();
        updateLeaderboard();
    }, 2000);
}

// 5. Historical Data Viewer
async function loadHistoricalData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Database file not found yet.");
        const db = await response.json();
        
        let histLabels = db.map(entry => new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        let histDatasets = channels.map((c, i) => ({
            ...liveDatasets[i], 
            data: db.map(entry => entry.viewers[c.id] || 0),
            pointRadius: 2, // Show dots for historical points
            tension: 0.1 // Straighter lines for historical data
        }));

        viewerChart.options.animation.duration = 800; // Smooth transition
        viewerChart.data = { labels: histLabels, datasets: histDatasets };
        viewerChart.update();

    } catch (error) {
        alert("Historical data not available yet. The GitHub Action needs to run first!");
        console.error(error);
    }
}

// 6. Handle Button Modes
window.setMode = function(mode) {
    document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
    document.getElementById(mode === 'live' ? 'btn-live' : 'btn-historical').classList.add('active');
    
    if (mode === 'live') {
        viewerChart.options.animation.duration = 0;
        startLiveUpdates();
        document.getElementById('live-scoreboard').style.display = 'flex';
        document.getElementById('leaderboard-section').style.display = 'block';
    } else {
        clearInterval(liveInterval);
        document.getElementById('live-scoreboard').style.display = 'none';
        document.getElementById('leaderboard-section').style.display = 'none';
        loadHistoricalData();
    }
}

// Start the app on load
startLiveUpdates();