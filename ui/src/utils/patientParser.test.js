import { describe, it, expect } from 'vitest';
import { extractIdFromFilename, parsePatientsFromFile } from './patientParser';

describe('patientParser', () => {
  describe('extractIdFromFilename', () => {
    it('should extract correct ID from standard clinical note PDF', () => {
      expect(extractIdFromFilename('PT-FB9D5BC1_clinical_note.pdf')).toBe('PT-FB9D5BC1');
    });

    it('should extract correct ID from standard clinical note TXT', () => {
      expect(extractIdFromFilename('PT-918EC40D_clinical_note.txt')).toBe('PT-918EC40D');
    });

    it('should extract correct ID even if nested in folders', () => {
      expect(extractIdFromFilename('some_folder/PT-B8CE02A2_clinical_note.pdf')).toBe('PT-B8CE02A2');
    });

    it('should return PT-UNKNOWN if prefix is missing', () => {
      expect(extractIdFromFilename('clinical_note.pdf')).toBe('PT-UNKNOWN');
      expect(extractIdFromFilename('')).toBe('PT-UNKNOWN');
      expect(extractIdFromFilename(null)).toBe('PT-UNKNOWN');
    });

    it('should return PT-UNKNOWN if prefix is malformed', () => {
      expect(extractIdFromFilename('PTAB12_clinical_note.pdf')).toBe('PT-UNKNOWN');
      expect(extractIdFromFilename('PT-_clinical_note.pdf')).toBe('PT-UNKNOWN');
    });
  });

  describe('parsePatientsFromFile', () => {
    it('should parse PDF files', async () => {
      const file = new File(['mock content'], 'PT-FB9D5BC1_clinical_note.pdf', { type: 'application/pdf' });
      const results = await parsePatientsFromFile(file);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('PT-FB9D5BC1');
      expect(results[0].source).toBe('PT-FB9D5BC1_clinical_note.pdf');
    });

    it('should parse TXT files', async () => {
      const file = new File(['mock content'], 'PT-918EC40D_clinical_note.txt', { type: 'text/plain' });
      const results = await parsePatientsFromFile(file);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('PT-918EC40D');
    });
  });
});
