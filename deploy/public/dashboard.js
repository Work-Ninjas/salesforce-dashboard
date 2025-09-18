// Dashboard JavaScript - Drill-through functionality with all fixes
let currentDetailData = [];
let currentDetailFilters = {};
let divisionData = [];
let leadData = [];
let originalDivisionData = [];
let originalLeadData = [];

// Initialize dashboard on page load
$(document).ready(function() {
    loadDivisionSummary();
    loadLeadSummary();
});

// Load Division Summary
async function loadDivisionSummary() {
    $('#divisionLoading').show();
    try {
        const response = await fetch('/api/division-summary');
        const data = await response.json();

        if (data.success) {
            divisionData = data.data;
            originalDivisionData = [...data.data]; // Keep original for filtering
            renderDivisionTable(data.data);
            updateMetrics();
            loadFilters();
        }
    } catch (error) {
        console.error('Error loading division summary:', error);
    }
    $('#divisionLoading').hide();
}

// Load Lead Summary
async function loadLeadSummary() {
    $('#leadLoading').show();
    try {
        const response = await fetch('/api/lead-summary');
        const data = await response.json();

        if (data.success) {
            leadData = data.data;
            originalLeadData = [...data.data]; // Keep original for filtering
            renderLeadTable(data.data);
        }
    } catch (error) {
        console.error('Error loading lead summary:', error);
    }
    $('#leadLoading').hide();
}

// Render Division Table with clickable cells matching the exact query columns
function renderDivisionTable(data) {
    const tbody = $('#divisionTable tbody');
    tbody.empty();

    data.forEach(row => {
        const isTotal = row.Division === 'TOTAL';
        const tr = $('<tr>').addClass(isTotal ? 'total-row' : '');

        // Year
        tr.append($('<td>').text(row.Year || ''));

        // Division
        tr.append($('<td>').text(row.Division || ''));

        // Total Opp - clickable
        tr.append(createDrillCell(row.TotalOpp, 'division', row.Year, row.Division, 'all'));

        // Approved - clickable
        tr.append(createDrillCell(row.Approved, 'division', row.Year, row.Division, 'Approved'));

        // Lost - clickable
        tr.append(createDrillCell(row.Lost, 'division', row.Year, row.Division, 'Lost'));

        // Open - clickable
        tr.append(createDrillCell(row.OpenOpp, 'division', row.Year, row.Division, 'Open'));

        // Close Rate % - clickable for drill-through of Approved
        tr.append(createDrillCell(row.CloseRate_Std, 'division', row.Year, row.Division, 'Approved', false, true));

        // Close Rate (Exclude Open) % - clickable for drill-through of Approved
        tr.append(createDrillCell(row.CloseRate_ExcludeOpen || row.CloseRate_NoLost, 'division', row.Year, row.Division, 'Approved', false, true));

        // Avg Ticket - clickable for drill-through of Approved with Amount > 0
        tr.append(createDrillCell(row.AverageTicket, 'division', row.Year, row.Division, 'Approved', true, false, true));

        // Revenue - clickable
        tr.append(createDrillCell(row.Revenue, 'division', row.Year, row.Division, 'Approved', true));

        // Lost Revenue - clickable
        tr.append(createDrillCell(row.LostRevenue, 'division', row.Year, row.Division, 'Lost', true));

        // Open Revenue - clickable
        tr.append(createDrillCell(row.OpenRevenue, 'division', row.Year, row.Division, 'Open', true));

        tbody.append(tr);
    });
}

// Render Lead Table with clickable cells matching the exact query columns
function renderLeadTable(data) {
    const tbody = $('#leadTable tbody');
    tbody.empty();

    data.forEach(row => {
        const isTotal = row.LeadType === 'TOTAL';
        const tr = $('<tr>').addClass(isTotal ? 'total-row' : '');

        // Year
        tr.append($('<td>').text(row.Year || ''));

        // Lead Type
        tr.append($('<td>').text(row.LeadType || ''));

        // Total Opp - clickable
        tr.append(createDrillCell(row.TotalOpp, 'lead', row.Year, row.LeadType, 'all'));

        // Approved - clickable
        tr.append(createDrillCell(row.Approved, 'lead', row.Year, row.LeadType, 'Approved'));

        // Lost - clickable
        tr.append(createDrillCell(row.Lost, 'lead', row.Year, row.LeadType, 'Lost'));

        // Open - clickable
        tr.append(createDrillCell(row.OpenOpp, 'lead', row.Year, row.LeadType, 'Open'));

        // Close Rate % - clickable for drill-through of Approved
        tr.append(createDrillCell(row.CloseRate_Std, 'lead', row.Year, row.LeadType, 'Approved', false, true));

        // Close Rate (Exclude Open) % - clickable for drill-through of Approved
        tr.append(createDrillCell(row.CloseRate_ExcludeOpen || row.CloseRate_NoLost, 'lead', row.Year, row.LeadType, 'Approved', false, true));

        // Avg Ticket - clickable for drill-through of Approved with Amount > 0
        tr.append(createDrillCell(row.AverageTicket, 'lead', row.Year, row.LeadType, 'Approved', true, false, true));

        // Revenue - clickable
        tr.append(createDrillCell(row.Revenue, 'lead', row.Year, row.LeadType, 'Approved', true));

        // Lost Revenue - clickable
        tr.append(createDrillCell(row.LostRevenue, 'lead', row.Year, row.LeadType, 'Lost', true));

        // Open Revenue - clickable
        tr.append(createDrillCell(row.OpenRevenue, 'lead', row.Year, row.LeadType, 'Open', true));

        tbody.append(tr);
    });
}

// Create a clickable cell for drill-through
function createDrillCell(value, type, year, dimension, stage, isRevenue = false, isPercentage = false, isAvgTicket = false) {
    const displayValue = value || (isRevenue ? '$0.00' : (isPercentage ? '0.00' : '0'));
    const td = $('<td>');

    // Skip drill-through for TOTAL rows or truly zero values
    // For percentages, check the numeric value not the string
    const numericValue = parseFloat(String(value).replace(/[$,]/g, ''));
    const isZero = numericValue === 0 || value === '$0.00' || value === '0.00';

    if (dimension === 'TOTAL' || (isZero && !isPercentage) || (isPercentage && isZero)) {
        td.text(displayValue);
        return td;
    }

    // Make cell clickable with visual indication
    td.addClass('drill-cell')
      .html(`<span class="clickable-value">${displayValue}</span>`)
      .css('cursor', 'pointer')
      .on('click', function() {
          drillThrough(type, year, dimension, stage, isAvgTicket);
      });

    return td;
}

// Drill-through function to get detail
async function drillThrough(type, year, dimension, stage, isAvgTicket = false) {
    const params = new URLSearchParams();

    // Add year filter if not TOTAL
    if (year && year !== 'TOTAL') {
        params.append('year', year);
    }

    // Add dimension filter (division or lead type)
    if (dimension && dimension !== 'TOTAL') {
        if (type === 'division') {
            params.append('division', dimension);
        } else {
            params.append('leadType', dimension);
        }
    }

    // Add stage filter - FIXED for Open
    if (stage && stage !== 'all') {
        if (stage === 'Open') {
            // Open means NOT Approved AND NOT Lost
            params.append('excludeStages', 'Approved,Lost');
        } else {
            params.append('stage', stage);
        }
    }

    try {
        // Show loading
        $('#detailModal .modal-body').html('<div class="text-center p-5"><div class="spinner-border" role="status"></div></div>');
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();

        const response = await fetch(`/api/opportunity-detail?${params}`);
        const data = await response.json();

        if (data.success) {
            // Filter for avg ticket if needed (only records with Amount > 0)
            let filteredData = data.data;
            if (isAvgTicket) {
                filteredData = data.data.filter(row => row.Amount > 0);
            }
            currentDetailData = filteredData;

            // Save filters for export
            currentDetailFilters = {
                year: year && year !== 'TOTAL' ? year : undefined,
                division: type === 'division' && dimension !== 'TOTAL' ? dimension : undefined,
                leadType: type === 'lead' && dimension !== 'TOTAL' ? dimension : undefined,
                stage: stage === 'Open' ? undefined : (stage !== 'all' ? stage : undefined),
                excludeStages: stage === 'Open' ? 'Approved,Lost' : undefined
            };

            showDetailModal(type, year, dimension, stage, filteredData);
        }
    } catch (error) {
        console.error('Error fetching detail:', error);
        $('#detailModal .modal-body').html('<div class="alert alert-danger">Error loading details</div>');
    }
}

// Show detail modal with data
function showDetailModal(type, year, dimension, stage, data) {
    // Set modal title
    let title = `Opportunity Details - `;
    if (year && year !== 'TOTAL') title += `Year: ${year}, `;
    if (dimension && dimension !== 'TOTAL') {
        title += `${type === 'division' ? 'Division' : 'Lead Type'}: ${dimension}, `;
    }
    if (stage && stage !== 'all') {
        title += `Stage: ${stage === 'Open' ? 'Open (Not Approved/Not Lost)' : stage}`;
    }
    title += ` (${data.length} records)`;

    $('#modalTitle').text(title);

    // Build modal body HTML
    let modalBodyHTML = `
        <div class="export-buttons mb-3">
            <button class="btn btn-success btn-sm" onclick="exportDetailToExcel()">
                Export Detail to Excel
            </button>
        </div>
        <div class="table-responsive">
            <table id="detailTable" class="table table-striped table-sm">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Stage</th>
                        <th>Amount</th>
                        <th>Division</th>
                        <th>Lead Type</th>
                        <th>Created Date</th>
                        <th>Last Stage Date</th>
                    </tr>
                </thead>
                <tbody>`;

    // Add data rows
    data.forEach(row => {
        modalBodyHTML += `
            <tr>
                <td><a href="http://workninjas.lightning.force.com/${row.Id}" target="_blank" style="color: #667eea;">${row.Id || ''}</a></td>
                <td>${row.Name || ''}</td>
                <td>${row.StageName || ''}</td>
                <td>${formatCurrency(row.Amount)}</td>
                <td>${row.Division || ''}</td>
                <td>${row.LeadType || ''}</td>
                <td>${formatDate(row.Created_Date)}</td>
                <td>${formatDate(row.LastStageChangeDate)}</td>
            </tr>`;
    });

    modalBodyHTML += `
                </tbody>
            </table>
        </div>`;

    // Update modal body
    $('#detailModal .modal-body').html(modalBodyHTML);

    // Initialize DataTable with sorting enabled
    $('#detailTable').DataTable({
        pageLength: 25,
        dom: 'Bfrtip',
        buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
        order: [[6, 'desc']], // Sort by Created Date descending
        ordering: true, // Enable sorting
        columnDefs: [
            { targets: 0, orderable: true }, // ID column sortable
            { targets: '_all', orderable: true } // All columns sortable
        ]
    });
}

// Format currency
function formatCurrency(value) {
    if (!value || value === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Load filters
function loadFilters() {
    // Load years
    const years = new Set();
    const divisions = new Set();
    const leadTypes = new Set();

    // Get unique values from both summaries
    [...originalDivisionData, ...originalLeadData].forEach(row => {
        if (row.Year && row.Year !== 'TOTAL') years.add(row.Year);
        if (row.Division && row.Division !== 'TOTAL') divisions.add(row.Division);
        if (row.LeadType && row.LeadType !== 'TOTAL') leadTypes.add(row.LeadType);
    });

    // Populate year filter - DESCENDING order
    const yearFilter = $('#yearFilter');
    yearFilter.empty();
    yearFilter.append('<option value="">All Years</option>');
    Array.from(years).sort((a, b) => b - a).forEach(year => {
        yearFilter.append(`<option value="${year}">${year}</option>`);
    });

    // Populate division filter
    const divisionFilter = $('#divisionFilter');
    divisionFilter.empty();
    divisionFilter.append('<option value="">All Divisions</option>');
    Array.from(divisions).sort().forEach(division => {
        divisionFilter.append(`<option value="${division}">${division}</option>`);
    });

    // Populate lead type filter
    const leadFilter = $('#leadFilter');
    leadFilter.empty();
    leadFilter.append('<option value="">All Lead Types</option>');
    Array.from(leadTypes).sort().forEach(leadType => {
        leadFilter.append(`<option value="${leadType}">${leadType}</option>`);
    });
}

// Apply filters - FIXED
function applyFilters() {
    const year = $('#yearFilter').val();
    const division = $('#divisionFilter').val();
    const leadType = $('#leadFilter').val();

    // Filter division data
    let filteredDivision = [...originalDivisionData];

    if (year) {
        // Keep only rows for the specific year (including TOTAL row for that year)
        filteredDivision = filteredDivision.filter(row => row.Year == year);
    }

    if (division) {
        // If a specific division is selected, filter by that division
        // But keep the TOTAL rows to show overall totals
        filteredDivision = filteredDivision.filter(row =>
            row.Division === division || row.Division === 'TOTAL'
        );
    }

    renderDivisionTable(filteredDivision);

    // Filter lead data
    let filteredLead = [...originalLeadData];

    if (year) {
        // Keep only rows for the specific year (including TOTAL row for that year)
        filteredLead = filteredLead.filter(row => row.Year == year);
    }

    if (leadType) {
        // If a specific lead type is selected, filter by that lead type
        // But keep the TOTAL rows to show overall totals
        filteredLead = filteredLead.filter(row =>
            row.LeadType === leadType || row.LeadType === 'TOTAL'
        );
    }

    renderLeadTable(filteredLead);

    // Update metrics based on filtered data
    updateMetrics(year, division, leadType);
}

// Clear filters
function clearFilters() {
    $('#yearFilter').val('');
    $('#divisionFilter').val('');
    $('#leadFilter').val('');

    // Restore original data
    renderDivisionTable(originalDivisionData);
    renderLeadTable(originalLeadData);

    // Update metrics to show grand total
    updateMetrics();
}

// Update key metrics - FIXED to show GRAND TOTAL or filtered year
function updateMetrics(filterYear = null, filterDivision = null, filterLeadType = null) {
    if (originalDivisionData.length === 0) return;

    let dataToCalculate = [...originalDivisionData];

    // Apply filters to data
    if (filterYear) {
        dataToCalculate = dataToCalculate.filter(row => row.Year == filterYear);
    }

    if (filterDivision) {
        dataToCalculate = dataToCalculate.filter(row =>
            row.Division === filterDivision || row.Division === 'TOTAL'
        );
    }

    // Find TOTAL row(s) in filtered data
    const totalRows = dataToCalculate.filter(row => row.Division === 'TOTAL');

    if (totalRows.length === 1) {
        // Single TOTAL row (e.g., specific year or division)
        const targetRow = totalRows[0];
        $('#totalOpportunities').text(formatNumber(targetRow.TotalOpp));
        $('#totalRevenue').text(targetRow.Revenue || '$0');
        $('#avgCloseRate').text((targetRow.CloseRate_Std || '0') + '%');
        $('#avgTicket').text(targetRow.AverageTicket || '$0');
    } else if (totalRows.length > 1) {
        // Multiple TOTAL rows - sum them up
        let totalOpp = 0;
        let totalApproved = 0;
        let totalRevenue = 0;

        totalRows.forEach(row => {
            totalOpp += parseInt(row.TotalOpp) || 0;
            totalApproved += parseInt(row.Approved) || 0;

            // Parse revenue removing $ and commas
            const revenue = parseFloat((row.Revenue || '$0').replace(/[$,]/g, ''));
            totalRevenue += revenue;
        });

        // Calculate overall metrics
        const avgCloseRate = totalOpp > 0 ? ((totalApproved / totalOpp) * 100).toFixed(2) : '0.00';
        const avgTicket = totalApproved > 0 ? (totalRevenue / totalApproved) : 0;

        // Update display
        $('#totalOpportunities').text(formatNumber(totalOpp));
        $('#totalRevenue').text(formatCurrency(totalRevenue));
        $('#avgCloseRate').text(avgCloseRate + '%');
        $('#avgTicket').text(formatCurrency(avgTicket));
    } else if (filterDivision && dataToCalculate.length > 0) {
        // No TOTAL row but we have division-specific data
        // Sum up the division data across years
        let totalOpp = 0;
        let totalApproved = 0;
        let totalRevenue = 0;

        dataToCalculate.forEach(row => {
            if (row.Division === filterDivision) {
                totalOpp += parseInt(row.TotalOpp) || 0;
                totalApproved += parseInt(row.Approved) || 0;

                // Parse revenue removing $ and commas
                const revenue = parseFloat((row.Revenue || '$0').replace(/[$,]/g, ''));
                totalRevenue += revenue;
            }
        });

        // Calculate overall metrics
        const avgCloseRate = totalOpp > 0 ? ((totalApproved / totalOpp) * 100).toFixed(2) : '0.00';
        const avgTicket = totalApproved > 0 ? (totalRevenue / totalApproved) : 0;

        // Update display
        $('#totalOpportunities').text(formatNumber(totalOpp));
        $('#totalRevenue').text(formatCurrency(totalRevenue));
        $('#avgCloseRate').text(avgCloseRate + '%');
        $('#avgTicket').text(formatCurrency(avgTicket));
    } else {
        // No data available - show zeros
        $('#totalOpportunities').text('0');
        $('#totalRevenue').text('$0.00');
        $('#avgCloseRate').text('0.00%');
        $('#avgTicket').text('$0.00');
    }
}

// Format number with commas
function formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Export functions
function exportToExcel(type) {
    const table = type === 'division' ? '#divisionTable' : '#leadTable';
    const filename = `${type}_summary_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Create download link (simplified version)
    const link = document.createElement('a');
    link.href = `/api/excel-report?type=${type}`;
    link.download = filename;
    link.click();
}

function exportToPDF(type) {
    const table = type === 'division' ? '#divisionTable' : '#leadTable';
    const filename = `${type}_summary_${new Date().toISOString().split('T')[0]}`;

    // Print functionality as PDF alternative
    window.print();
}

function exportDetailToExcel() {
    // Export current detail data
    if (!currentDetailData || currentDetailData.length === 0) {
        alert('No data to export');
        return;
    }

    // Build query params from current filters
    const params = new URLSearchParams();
    params.append('type', 'detail');

    if (currentDetailFilters) {
        if (currentDetailFilters.year) params.append('year', currentDetailFilters.year);
        if (currentDetailFilters.division) params.append('division', currentDetailFilters.division);
        if (currentDetailFilters.leadType) params.append('leadType', currentDetailFilters.leadType);
        if (currentDetailFilters.stage) params.append('stage', currentDetailFilters.stage);
        if (currentDetailFilters.excludeStages) params.append('excludeStages', currentDetailFilters.excludeStages);
    }

    // Create download link
    const link = document.createElement('a');
    link.href = `/api/excel-report?${params.toString()}`;
    link.download = `opportunity_detail_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
}

// Handle tab switching
$('#myTab button').on('click', function (e) {
    e.preventDefault();
    $(this).tab('show');
});