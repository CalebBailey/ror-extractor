let extractedIds = [];
let organisationData = [];

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
Oxford University (https://ror.org/052gg0110) and Cambridge (https://ror.org/013meh722).

You can paste any text containing ROR URLs or IDs above.`;
    
    document.getElementById('inputText').value = sampleText;
    showSuccess('Sample data loaded!');
}

// Download organisations as JSON
function downloadJSON() {
    if (organisationData.length === 0) {
        showError('No organisation data to download. Fetch details first.');
        return;
    }

    const jsonData = organisationData.map(org => {
        // Clean website URL for JSON (remove https://)
        let cleanWebsite = org.website;
        if (cleanWebsite !== 'N/A' && cleanWebsite.trim()) {
            cleanWebsite = cleanWebsite.replace(/^https?:\/\//, '');
        }

        const isActive = org.status && org.status.toLowerCase() === 'active' ? 'Yes' : 'No';

        return {
            name: org.name,
            website: cleanWebsite,
            location: org.city,
            country: org.country,
            active: isActive
        };
    });

    const jsonString = JSON.stringify(jsonData, null, 2);
    downloadFile('ror-organisations.json', jsonString, 'application/json');
    showSuccess('JSON downloaded successfully!');
}

// Download organisations as CSV
function downloadCSV() {
    if (organisationData.length === 0) {
        showError('No organisation data to download. Fetch details first.');
        return;
    }

    let csv = 'Name,Website,Location,Country,Active\n';
    
    organisationData.forEach(org => {
        // Properly escape CSV fields
        const escapeCsvField = (field) => {
            if (field === null || field === undefined) return '""';
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Clean website URL for CSV (remove https://)
        let cleanWebsite = org.website;
        if (cleanWebsite !== 'N/A' && cleanWebsite.trim()) {
            cleanWebsite = cleanWebsite.replace(/^https?:\/\//, '');
        }

        const isActive = org.status && org.status.toLowerCase() === 'active' ? 'Yes' : 'No';

        const row = [
            escapeCsvField(org.name),
            escapeCsvField(cleanWebsite),
            escapeCsvField(org.city),
            escapeCsvField(org.country),
            escapeCsvField(isActive)
        ].join(',');
        csv += row + '\n';
    });

    downloadFile('ror-organisations.csv', csv, 'text/csv');
    showSuccess('CSV downloaded successfully!');
}

// One-click function to extract IDs and fetch organisation data
async function extractAndFetch() {
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
        .filter(id => !idsFromUrls.includes(id)); // Exclude those already found in URLs

    // Combine and remove duplicates
    const allIds = [...new Set([...idsFromUrls, ...standaloneIds])];
    
    if (allIds.length === 0) {
        showError('No ROR IDs found in the text. Please check your input format.');
        return;
    }

    extractedIds = allIds;
    
    // Update UI with found IDs
    document.getElementById('totalFound').textContent = allIds.length;
    document.getElementById('uniqueCount').textContent = allIds.length;
    
    // Display the IDs
    const idListHtml = allIds.map(id => 
        `<span class="id-item">${id}</span>`
    ).join('');
    document.getElementById('idList').innerHTML = idListHtml;
    
    // Show results section
    document.getElementById('extractResults').style.display = 'block';
    
    showSuccess(`Found ${allIds.length} unique ROR ID(s)! Now fetching organisation details...`);
    
    // Immediately fetch organisation data
    await fetchOrganisations();
}

// Extract ROR IDs from text
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
        .filter(id => !idsFromUrls.includes(id)); // Exclude those already found in URLs

    // Combine and remove duplicates
    const allIds = [...new Set([...idsFromUrls, ...standaloneIds])];
    
    if (allIds.length === 0) {
        showError('No ROR IDs found in the text. Please check your input format.');
        return;
    }

    extractedIds = allIds;
    
    // Update UI
    document.getElementById('totalFound').textContent = allIds.length;
    document.getElementById('uniqueCount').textContent = allIds.length;
    
    // Display the IDs
    const idListHtml = allIds.map(id => 
        `<span class="id-item">${id}</span>`
    ).join('');
    document.getElementById('idList').innerHTML = idListHtml;
    
    // Show results section
    document.getElementById('extractResults').style.display = 'block';
    
    showSuccess(`Found ${allIds.length} unique ROR ID(s)!`);
}

// Fetch organisation details from ROR API
async function fetchOrganisations() {
    if (extractedIds.length === 0) {
        showError('No ROR IDs to fetch. Extract IDs first.');
        return;
    }

    hideMessages();
    showLoading(true);

    // Clear previous data
    organisationData = [];
    
    // Use ROR API v2
    const API_BASE = 'https://api.ror.org/v2/organizations';
    
    let successCount = 0;
    let failCount = 0;
    
    // Rate limit warning
    if (extractedIds.length > 100) {
        updateLoadingProgress(`Processing ${extractedIds.length} IDs. Note: ROR API allows 2000 requests per 5 minutes.`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause to show message
    }

    for (let i = 0; i < extractedIds.length; i++) {
        const id = extractedIds[i];
        updateLoadingProgress(`Fetching ${i + 1} of ${extractedIds.length}: ${id}`);
        
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        
        while (!success && retryCount < maxRetries) {
            try {
                const response = await fetch(`${API_BASE}/${id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Extract organisation types
                    const types = data.types?.map(type => type.label)?.join(', ') || 'N/A';
                    
                    // Extract primary website
                    let website = 'N/A';
                    if (data.links && data.links.length > 0) {
                        const websiteLink = data.links.find(link => link.type === 'website');
                        if (websiteLink) {
                            website = websiteLink.value;
                        } else if (data.links[0]) {
                            website = data.links[0].value;
                        }
                    }

                    organisationData.push({
                        id: id,
                        url: `https://ror.org/${id}`,
                        name: data.names?.find(name => name.types?.includes('ror_display'))?.value || 
                              data.names?.[0]?.value || 'N/A',
                        country: data.locations?.[0]?.geonames_details?.country_name || 'N/A',
                        countryCode: data.locations?.[0]?.geonames_details?.country_code || 'N/A',
                        city: data.locations?.[0]?.geonames_details?.name || 'N/A',
                        type: types,
                        status: data.status || 'N/A',
                        established: data.established || 'N/A',
                        website: website
                    });
                    successCount++;
                    success = true;
                    
                } else if (response.status === 429) {
                    // Rate limit exceeded
                    retryCount++;
                    if (retryCount < maxRetries) {
                        updateLoadingProgress(`Rate limit exceeded. Waiting 5 minutes before retry ${retryCount}/${maxRetries} for ${id}...`);
                        showError(`ROR API rate limit exceeded (2000 requests per 5 minutes). Waiting 5 minutes before retry...`);
                        
                        // Wait 5 minutes (300 seconds)
                        for (let countdown = 300; countdown > 0; countdown--) {
                            const minutes = Math.floor(countdown / 60);
                            const seconds = countdown % 60;
                            updateLoadingProgress(`Rate limit exceeded. Retrying in ${minutes}:${seconds.toString().padStart(2, '0')} (${retryCount}/${maxRetries}) for ${id}`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } else {
                        // Max retries exceeded
                        console.warn(`Rate limit exceeded and max retries reached for ${id}`);
                        organisationData.push({
                            id: id,
                            url: `https://ror.org/${id}`,
                            name: 'Rate limit exceeded - max retries reached',
                            country: 'N/A',
                            countryCode: 'N/A',
                            city: 'N/A',
                            type: 'N/A',
                            status: 'N/A',
                            established: 'N/A',
                            website: 'N/A'
                        });
                        failCount++;
                        success = true; // Stop retrying
                    }
                } else {
                    // Other HTTP errors
                    console.warn(`Failed to fetch data for ${id}: ${response.status} ${response.statusText}`);
                    organisationData.push({
                        id: id,
                        url: `https://ror.org/${id}`,
                        name: `Error ${response.status}: ${response.statusText}`,
                        country: 'N/A',
                        countryCode: 'N/A',
                        city: 'N/A',
                        type: 'N/A',
                        status: 'N/A',
                        established: 'N/A',
                        website: 'N/A'
                    });
                    failCount++;
                    success = true; // Don't retry for non-rate-limit errors
                }
            } catch (error) {
                retryCount++;
                console.error(`Error fetching ${id} (attempt ${retryCount}):`, error);
                
                if (retryCount < maxRetries) {
                    updateLoadingProgress(`Network error. Retrying ${retryCount}/${maxRetries} for ${id} in 10 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
                } else {
                    organisationData.push({
                        id: id,
                        url: `https://ror.org/${id}`,
                        name: 'Network error - max retries reached',
                        country: 'N/A',
                        countryCode: 'N/A',
                        city: 'N/A',
                        type: 'N/A',
                        status: 'N/A',
                        established: 'N/A',
                        website: 'N/A'
                    });
                    failCount++;
                    success = true; // Stop retrying
                }
            }
        }

        // Add delay between requests to be respectful to the API (only if not rate limited)
        if (i < extractedIds.length - 1 && success && retryCount === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    showLoading(false);
    displayOrganisations();
    
    // Show comprehensive success/failure message
    let message = `Successfully fetched details for ${successCount} organisation(s)!`;
    if (failCount > 0) {
        message += ` ${failCount} request(s) failed (see table for details).`;
    }
    if (extractedIds.length > 1000) {
        message += ` Note: Large batches may hit ROR API rate limits (2000 requests per 5 minutes).`;
    }
    
    showSuccess(message);
}

// Display organisations in a table
function displayOrganisations() {
    const tableContainer = document.getElementById('orgTable');
    
    let html = `
        <table class="org-table">
            <thead>
                <tr>
                    <th>Organisation Name</th>
                    <th>Website</th>
                    <th>Location</th>
                    <th>Country</th>
                    <th>Active</th>
                </tr>
            </thead>
            <tbody>
    `;

    organisationData.forEach(org => {
        // Handle multiple websites and remove https://
        let websiteDisplay = 'N/A';
        if (org.website !== 'N/A' && org.website.trim()) {
            const websites = org.website.split(',').map(w => w.trim());
            if (websites.length === 1) {
                const cleanUrl = websites[0].replace(/^https?:\/\//, '');
                websiteDisplay = `<a href="${websites[0]}" target="_blank" class="link" rel="noopener">${cleanUrl.length > 40 ? cleanUrl.substring(0, 40) + '...' : cleanUrl}</a>`;
            } else {
                websiteDisplay = websites.map((site, index) => {
                    const cleanUrl = site.replace(/^https?:\/\//, '');
                    return `<a href="${site}" target="_blank" class="link" rel="noopener">${cleanUrl.length > 20 ? cleanUrl.substring(0, 20) + '...' : cleanUrl}</a>`;
                }).join(', ');
            }
        }

        // Determine if organisation is active
        const isActive = org.status && org.status.toLowerCase() === 'active' ? 'Yes' : 'No';
        
        html += `
            <tr>
                <td><strong>${org.name}</strong></td>
                <td>${websiteDisplay}</td>
                <td>${org.city}</td>
                <td>${org.country}</td>
                <td>${isActive}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = html;
    document.getElementById('orgResults').style.display = 'block';
}

// Download extracted IDs as text file
function downloadIds() {
    if (extractedIds.length === 0) {
        showError('No IDs to download. Extract IDs first.');
        return;
    }

    const content = extractedIds.join('\n');
    downloadFile('ror-ids.txt', content, 'text/plain');
    showSuccess('IDs downloaded successfully!');
}

// Copy IDs to clipboard
async function copyIds() {
    if (extractedIds.length === 0) {
        showError('No IDs to copy. Extract IDs first.');
        return;
    }

    try {
        await navigator.clipboard.writeText(extractedIds.join('\n'));
        showSuccess('IDs copied to clipboard!');
    } catch (err) {
        showError('Failed to copy to clipboard. Please try downloading instead.');
    }
}

// Clear input and results
function clearInput() {
    document.getElementById('inputText').value = '';
    clearResults();
}

// Clear all results
function clearResults() {
    extractedIds = [];
    organisationData = [];
    
    document.getElementById('extractResults').style.display = 'none';
    document.getElementById('orgResults').style.display = 'none';
    document.getElementById('totalFound').textContent = '0';
    document.getElementById('uniqueCount').textContent = '0';
    document.getElementById('idList').innerHTML = '';
    document.getElementById('orgTable').innerHTML = '';
    
    hideMessages();
    showSuccess('Results cleared!');
}

// Utility functions
function downloadFile(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = show ? 'block' : 'none';
}

function updateLoadingProgress(message) {
    document.getElementById('loadingProgress').textContent = message;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(hideMessages, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMsg');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(hideMessages, 3000);
}

function hideMessages() {
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('successMsg').style.display = 'none';
}
