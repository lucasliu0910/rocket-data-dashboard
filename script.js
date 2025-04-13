const fileInput = document.getElementById('csvFileInput');
const chartCanvas = document.getElementById('myChart');
const messageArea = document.getElementById('messageArea');
const medianValueSpan = document.getElementById('medianValue');
const minValueSpan = document.getElementById('minValue');
const maxValueSpan = document.getElementById('maxValue');
const columnSelect = document.getElementById('columnSelect');

let myChart = null;
let parsedCSV = []; // 儲存整個 CSV 資料

fileInput.addEventListener('change', handleFileSelect);
columnSelect.addEventListener('change', updateChartFromSelectedColumn);

function handleFileSelect(event) {
    const file = event.target.files[0];
    clearChart();
    clearStats();
    setMessage('', 'info');

    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        setMessage('錯誤：請上傳 .csv 格式的檔案。', 'error');
        return;
    }

    setMessage('正在讀取檔案...', 'info');

    const reader = new FileReader();

    reader.onload = function (e) {
        const csvContent = e.target.result;
        parseAndStore(csvContent);
    };

    reader.onerror = function () {
        setMessage('讀取檔案時發生錯誤。', 'error');
        clearChart();
        clearStats();
    };

    reader.readAsText(file);
}

function parseAndStore(csvData) {
    const lines = csvData.trim().split(/\r?\n/);
    parsedCSV = lines.map(line => line.split(','));

    if (parsedCSV.length <= 1) {
        setMessage('錯誤：CSV 檔案沒有資料行。', 'error');
        return;
    }

    const columnCount = parsedCSV[0].length;
    columnSelect.innerHTML = '';
    for (let i = 0; i < columnCount; i++) {
        const option = document.createElement('option');
        const label = parsedCSV[0][i]?.trim() || `第 ${i + 1} 欄`;
        option.value = i;
        option.textContent = `${i + 1}. ${label}`;
        columnSelect.appendChild(option);
    }

    columnSelect.disabled = false;
    setMessage('CSV 讀取成功，請選擇要顯示的欄位。', 'info');

    // 自動選擇預設欄位（第 8 欄）
    if (columnSelect.options.length > 8) {
        columnSelect.selectedIndex = 7; // 選取索引為 7 的欄位（即第 8 欄）
        updateChartFromSelectedColumn(); // 自動載入圖表
    }
}

function updateChartFromSelectedColumn() {
    const selectedIndex = parseInt(columnSelect.value);
    if (isNaN(selectedIndex)) {
        setMessage('請選擇一個欄位。', 'error');
        return;
    }

    clearChart();
    clearStats();

    const dataRows = parsedCSV.slice(1);
    const plotData = [];
    const yValuesOnly = [];
    let invalidRowCount = 0;
    let validRowCount = 0;

    dataRows.forEach((row, index) => {
        if (!row || row.length < selectedIndex + 1) {
            invalidRowCount++;
            return;
        }

        const valueStr = row[selectedIndex]?.trim();
        const value = parseFloat(valueStr);
        if (valueStr === '' || isNaN(value)) {
            invalidRowCount++;
            return;
        }

        plotData.push({ x: validRowCount + 1, y: value });
        yValuesOnly.push(value);
        validRowCount++;
    });

    if (plotData.length === 0) {
        setMessage('選擇的欄位沒有有效的數據。', 'error');
        return;
    }

    calculateAndDisplayStats(yValuesOnly);
    drawChart(plotData);
    setMessage(`成功處理 ${validRowCount} 筆資料。忽略 ${invalidRowCount} 筆無效資料。`, 'success');
}

function drawChart(plotData) {
    const ctx = chartCanvas.getContext('2d');
    if (myChart) myChart.destroy();

    const selectedText = columnSelect.options[columnSelect.selectedIndex]?.text || '資料';

    myChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: selectedText,
                data: plotData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: '資料點序號'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: '數值'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `X: ${context.parsed.x}, Y: ${context.parsed.y}`;
                        }
                    }
                },
                legend: {
                    display: true
                }
            }
        }
    });
}

function calculateAndDisplayStats(data) {
    if (!data || data.length === 0) {
        clearStats();
        return;
    }

    const sortedData = [...data].sort((a, b) => a - b);
    const minValue = sortedData[0];
    const maxValue = sortedData[sortedData.length - 1];
    let medianValue;
    const midIndex = Math.floor(sortedData.length / 2);

    if (sortedData.length % 2 === 0) {
        medianValue = (sortedData[midIndex - 1] + sortedData[midIndex]) / 2;
    } else {
        medianValue = sortedData[midIndex];
    }

    medianValueSpan.textContent = medianValue.toFixed(2);
    minValueSpan.textContent = minValue.toFixed(2);
    maxValueSpan.textContent = maxValue.toFixed(2);
}

function clearStats() {
    medianValueSpan.textContent = '-';
    minValueSpan.textContent = '-';
    maxValueSpan.textContent = '-';
}

function clearChart() {
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
}

function setMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message ${type}`;
}
