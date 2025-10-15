let extractedIds = [];
let organizationData = [];

// Load sample data
function loadSample() {
    const sampleText = `# Sample ROR Data
https://ror.org/03vek6s52 - Harvard University
MIT: https://ror.org/042nb2s44
Stanford University (00f54p054)
https://ror.org/03v76x132 - Yale University
Princeton (00hx57361)
Columbia University - https://ror.org/00hj8s172

The study included researchers from various institutions including
Oxford University (https://ror.org/052gg0110) and Cambridge (https://ror.org/013meh722).`;
    
    document.getElementById('inputText').value = sampleText;
    showSuccess('Sample data loaded! Click "Extract ROR IDs" to continue.');
}

// Extract ROR IDs from input text
function extractIds() {
    const inputText = document.getElementById('inputText').value;
    
    if (!inputText.trim()) {
        showError('Please paste some text containing ROR links or IDs.');
        return;
    }

    hideMessages();

    // Extract from full URLs
    const urlPattern = /https?:\/\/ror\.org\/([0-9a-z]{9})/gi;
    const urlMatches = [...inputText.matchAll(urlPattern)];
    const idsFromUrls = urlMatches.map(match => match[1].toLowerCase());

    // Extract standalone IDs (9-character alphanumeric)
    const idPattern = /(?:^|[\s\(\)\[\]\{\}:,;"|'`])([0-9a-z]{9})(?:[\s\(\)\[\]\{\}:,;"|'`]|$)/gim;
    const idMatches = [...inputText.matchAll(idPattern)];
    const standaloneIds = idMatches
        .map(match => match[1].toLowerCase())
        .filter(id => /\d/.test(id) && /[a-z]/.test(id)); // Must have both digits and letters

    // Combine and deduplicate
    const allIds = [...idsFromUrls, ...standaloneIds];
    extractedIds = [...new Set(allIds)].sort();

    if (extractedIds.length === 0) {
        showError('No valid ROR IDs found. Make sure your text contains ROR URLs or 9-character IDs.');
        return;
    }

    // Display results
    displayExtractedIds(allIds.length, extractedIds.length);
    showSuccess(`Successfully extracted ${extractedIds.length} unique ROR ID(s)!`);
}

// Display extracted IDs
function displayExtractedIds(total, unique) {
    document.getElementById('totalFound').textContent = total;
    document.getElementById('uniqueCount').textContent = unique;

    const idList = document.getElementById('idList');
    idList.innerHTML = '';

    extractedIds.forEach(id => {
        const item = document.createElement('div');
        item.className = 'id-item';
        item.innerHTML = `
            <span class="id-code">${id}</span>
            <a href="https://ror.org/${id}" target="_blank" class="link">View on ROR →</a>
        `;
        idList.appendChild(item);
    });

    document.getElementById('extractResults').classList.add('show');
}

// Fetch organization details from ROR API
async function fetchOrganizations() {
    if (extractedIds.length === 0) {
        showError('No ROR IDs to fetch. Please extract IDs first.');
        return;
    }

    hideMessages();
    document.getElementById('loading').classList.add('show');
    document.getElementById('orgResults').classList.remove('show');
    organizationData = [];

    for (let i = 0; i < extractedIds.length; i++) {
        const id = extractedIds[i];
        const progress = `Processing ${i + 1} of ${extractedIds.length}...`;
        document.getElementById('loadingProgress').textContent = progress;

        try {
            const response = await fetch(`https://api.ror.org/organizations/${id}`);
            if (response.ok) {
                const data = await response.json();
                organizationData.push({
                    id: id,
                    url: `https://ror.org/${id}`,
                    name: data.name || 'N/A',
                    country: data.country?.country_name || 'N/A',
                    countryCode: data.country?.country_code || 'N/A',
                    type: (data.types || []).join(', ') || 'N/A',
                    status: data.status || 'N/A',
                    website: (data.links || []).join(', ') || 'N/A',
                    city: data.addresses?.[0]?.city || 'N/A'
                });
            } else {
                organizationData.push({
                    id: id,
                    url: `https://ror.org/${id}`,
                    name: 'Error: Could not fetch',
                    country: 'N/A',
                    countryCode: 'N/A',
                    type: 'N/A',
                    status: 'N/A',
                    website: 'N/A',
                    city: 'N/A'
                });
            }
        } catch (error) {
            organizationData.push({
                id: id,
                url: `https://ror.org/${id}`,
                name: 'Error: Network issue',
                country: 'N/A',
                countryCode: 'N/A',
                type: 'N/A',
                status: 'N/A',
                website: 'N/A',
                city: 'N/A'
            });
        }

        // Small delay to be respectful to the API
        if (i < extractedIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    document.getElementById('loading').classList.remove('show');
    displayOrganizations();
    showSuccess(`Successfully fetched details for ${organizationData.length} organization(s)!`);
}

// Display organizations in a table
function displayOrganizations() {
    const tableContainer = document.getElementById('orgTable');
    
    let html = `
        <table class="org-table">
            <thead>
                <tr>
                    <th>ROR ID</th>
                    <th>Organization Name</th>
                    <th>Country</th>
                    <th>City</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Website</th>
                </tr>
            </thead>
            <tbody>
    `;

    organizationData.forEach(org => {
        const websiteLink = org.website !== 'N/A' ? 
            `<a href="${org.website.split(',')[0]}" target="_blank" class="link">Link</a>` : 
            'N/A';
        
        html += `
            <tr>
                <td><a href="${org.url}" target="_blank" class="link">${org.id}</a></td>
                <td><strong>${org.name}</strong></td>
                <td>${org.country}</td>
                <td>${org.city}</td>
                <td>${org.type}</td>
                <td>${org.status}</td>
                <td>${websiteLink}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = html;
    document.getElementById('orgResults').classList.add('show');
}

// Download IDs as text file
function downloadIds() {
    const content = extractedIds.join('\n');
    downloadFile('ror-ids-extracted.txt', content, 'text/plain');
    showSuccess('IDs downloaded successfully!');
}

// Copy IDs to clipboard
function copyIds() {
    const content = extractedIds.join('\n');
    navigator.clipboard.writeText(content).then(() => {
        showSuccess('IDs copied to clipboard!');
    }).catch(() => {
        showError('Failed to copy to clipboard. Please try manual copy.');
    });
}

// Download organizations as CSV
function downloadCSV() {
    if (organizationData.length === 0) {
        showError('No organization data to download. Fetch details first.');
        return;
    }

    let csv = 'ROR_ID,ROR_URL,Name,Country,Country_Code,City,Type,Status,Website\n';
    
    organizationData.forEach(org => {
        const row = [
            org.id,
            org.url,
            `"${org.name.replace(/"/g, '""')}"`,
            `"${org.country}"`,
            org.countryCode,
            `"${org.city}"`,
            `"${org.type}"`,
            org.status,
            `"${org.website}"`
        ].join(',');
        csv += row + '\n';
    });

    downloadFile('ror-organizations.csv', csv, 'text/csv');
    showSuccess('CSV downloaded successfully!');
}

// Download organizations as JSON
function downloadJSON() {
    if (organizationData.length === 0) {
        showError('No organization data to download. Fetch details first.');
        return;
    }

    const json = JSON.stringify(organizationData, null, 2);
    downloadFile('ror-organizations.json', json, 'application/json');
    showSuccess('JSON downloaded successfully!');
}

// Utility: Download file
function downloadFile(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Clear input
function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('extractResults').classList.remove('show');
    document.getElementById('orgResults').classList.remove('show');
    extractedIds = [];
    organizationData = [];
    hideMessages();
}

// Show error message
function showError(message) {
    const errorEl = document.getElementById('errorMsg');
    errorEl.textContent = message;
    errorEl.classList.add('show');
    document.getElementById('successMsg').classList.remove('show');
}

// Show success message
function showSuccess(message) {
    const successEl = document.getElementById('successMsg');
    successEl.textContent = message;
    successEl.classList.add('show');
    document.getElementById('errorMsg').classList.remove('show');
}

// Hide all messages
function hideMessages() {
    document.getElementById('errorMsg').classList.remove('show');
    document.getElementById('successMsg').classList.remove('show');
}
