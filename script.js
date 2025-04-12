const fileInput = document.getElementById('csvFileInput');
const chartCanvas = document.getElementById('myChart');
const messageArea = document.getElementById('messageArea');
// 新增：獲取統計數據顯示元素的參照
const medianValueSpan = document.getElementById('medianValue');
const minValueSpan = document.getElementById('minValue');
const maxValueSpan = document.getElementById('maxValue');

let myChart = null; // 用於儲存 Chart.js 實例

// 監聽檔案選擇變化
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    clearChart(); // 清除舊圖表
    clearStats(); // 清除舊統計數據
    setMessage('','info'); // 清除訊息

    if (!file) {
        // setMessage('尚未選擇檔案。', 'info'); // 如果需要可以在這裡顯示訊息
        return;
    }

    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        setMessage('錯誤：請上傳 .csv 格式的檔案。', 'error');
        return;
    }

    setMessage('正在讀取檔案...', 'info');

    const reader = new FileReader();

    reader.onload = function(e) {
        const csvContent = e.target.result;
        parseAndPlot(csvContent);
    };

    reader.onerror = function() {
        setMessage('讀取檔案時發生錯誤。', 'error');
        clearChart();
        clearStats();
    };

    reader.readAsText(file); // 以文字格式讀取檔案
}

function parseAndPlot(csvData) {
    try {
        const lines = csvData.trim().split(/\r?\n/);

        if (lines.length <= 1) {
            setMessage('錯誤：CSV 檔案沒有資料行（至少需要標題和一行資料）。', 'error');
            clearChart();
            clearStats();
            return;
        }

        const dataRows = lines.slice(1);
        const plotData = [];
        const yValuesOnly = []; // 新增：只儲存 Y 值的陣列，用於計算統計
        let invalidRowCount = 0;
        let validRowCount = 0;

        dataRows.forEach((line, index) => {
            if (!line.trim()) return;

            const values = line.split(',');

            if (values.length !== 24) {
                console.warn(`第 ${index + 2} 行資料欄位數 (${values.length}) 不等於 24，已跳過。`);
                invalidRowCount++;
                return;
            }

            const yValueStr = values[11]?.trim();
            const yValue = parseFloat(yValueStr);

            if (yValueStr === undefined || yValueStr === '' || isNaN(yValue)) {
                console.warn(`第 ${index + 2} 行的第 12 個值 "${yValueStr}" 不是有效的數值，已跳過。`);
                invalidRowCount++;
                return;
            }

            const xValue = validRowCount + 1;
            plotData.push({ x: xValue, y: yValue });
            yValuesOnly.push(yValue); // 將有效的 Y 值加入陣列
            validRowCount++;
        });

        if (plotData.length === 0) {
            setMessage(`處理完成，但沒有找到有效的資料點可供繪製。共發現 ${invalidRowCount} 行無效資料。`, 'error');
            clearChart();
            clearStats();
            return;
        }

        setMessage(`成功處理 ${validRowCount} 行有效資料。${invalidRowCount > 0 ? `忽略了 ${invalidRowCount} 行無效或格式錯誤的資料。` : ''}`, 'success');

        // --- 新增：計算並顯示統計數據 ---
        calculateAndDisplayStats(yValuesOnly);
        // --- 結束：新增 ---

        drawChart(plotData); // 在計算完統計後繪製圖表

    } catch (error) {
        console.error("解析或繪製過程中發生錯誤:", error);
        setMessage(`處理檔案時發生錯誤：${error.message}`, 'error');
        clearChart();
        clearStats();
    }
}

// --- 新增：計算統計數據的函數 ---
function calculateAndDisplayStats(data) {
    if (!data || data.length === 0) {
        clearStats(); // 如果沒有數據，也清除顯示
        return;
    }

    // 排序以計算中位數
    const sortedData = [...data].sort((a, b) => a - b); // 使用展開運算符創建副本並排序

    // 計算最小值和最大值
    const minValue = sortedData[0];
    const maxValue = sortedData[sortedData.length - 1];

    // 計算中位數
    let medianValue;
    const midIndex = Math.floor(sortedData.length / 2);
    if (sortedData.length % 2 === 0) {
        // 偶數個數，取中間兩個數的平均值
        medianValue = (sortedData[midIndex - 1] + sortedData[midIndex]) / 2;
    } else {
        // 奇數個數，取中間的數
        medianValue = sortedData[midIndex];
    }

    // 更新 HTML 顯示 (保留兩位小數)
    medianValueSpan.textContent = medianValue.toFixed(2);
    minValueSpan.textContent = minValue.toFixed(2);
    maxValueSpan.textContent = maxValue.toFixed(2);
}
// --- 結束：新增 ---

// --- 新增：清除統計數據顯示的函數 ---
function clearStats() {
    medianValueSpan.textContent = '-';
    minValueSpan.textContent = '-';
    maxValueSpan.textContent = '-';
}
// --- 結束：新增 ---


function drawChart(plotData) {
    const ctx = chartCanvas.getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '第12欄數值',
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
                        text: '時間 (秒)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: '高度（m）'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `時間: ${context.parsed.x} 秒, 數值: ${context.parsed.y}`;
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

// --- 初始化 ---
// setMessage('請選擇一個 CSV 檔案開始。', 'info'); // 可以移除或保留
clearStats(); // 初始化時也清除統計數據
