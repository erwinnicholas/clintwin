import JSZip from 'jszip';
import Papa from 'papaparse';

/**
 * Extracts the Patient ID from a filename (e.g., "PT-FB9D5BC1_clinical_note.pdf")
 * @param {string} filename 
 * @returns {string} The patient ID or 'PT-UNKNOWN'
 */
export const extractIdFromFilename = (filename) => {
  if (!filename) return 'PT-UNKNOWN';
  const match = filename.match(/^(PT-[A-Z0-9]+)_/i);
  if (match) return match[1];
  
  const justName = filename.split('/').pop();
  if (justName && justName.includes('_')) {
    const prefix = justName.split('_')[0];
    if (prefix.startsWith('PT-') && prefix.length > 3) return prefix;
  }
  
  return 'PT-UNKNOWN';
};

/**
 * Parses a File object (ZIP, PDF, TXT, CSV) to extract Patient IDs.
 * @param {File} file 
 * @returns {Promise<Array<{id: string, source: string}>>}
 */
export const parsePatientsFromFile = async (file) => {
  const results = [];
  const filename = file.name.toLowerCase();

  try {
    if (filename.endsWith('.zip')) {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      
      loadedZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && (relativePath.endsWith('.pdf') || relativePath.endsWith('.txt'))) {
          results.push({
            id: extractIdFromFilename(relativePath),
            source: relativePath
          });
        }
      });
    } 
    else if (filename.endsWith('.pdf') || filename.endsWith('.txt')) {
      results.push({
        id: extractIdFromFilename(file.name),
        source: file.name
      });
    }
    else if (filename.endsWith('.csv')) {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            result.data.forEach((row, idx) => {
              const id = row.patient_id || row.Patient_ID || row.id || extractIdFromFilename(file.name);
              results.push({
                id: id,
                source: `Row ${idx + 1}`
              });
            });
            resolve(results);
          },
          error: (error) => reject(error)
        });
      });
    }
  } catch (err) {
    console.error("Error parsing patient file:", err);
  }

  return results;
};
