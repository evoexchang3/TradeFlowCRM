import { parse } from 'csv-parse/sync';
import bcrypt from 'bcrypt';
import { storage } from './storage';

export interface ImportPreview {
  headers: string[];
  rows: any[][];
  suggestedMapping: Record<string, string>;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

// Field mapping suggestions based on common column names
const FIELD_MAPPINGS: Record<string, Record<string, string[]>> = {
  clients: {
    firstName: ['first name', 'firstname', 'fname', 'given name'],
    lastName: ['last name', 'lastname', 'lname', 'surname', 'family name'],
    email: ['email', 'e-mail', 'email address'],
    phone: ['phone', 'telephone', 'mobile', 'phone number'],
    address: ['address', 'street', 'street address'],
    city: ['city', 'town'],
    country: ['country', 'nation'],
    dateOfBirth: ['dob', 'date of birth', 'birthday', 'birthdate'],
  },
};

function suggestMapping(headers: string[], type: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  const mappings = FIELD_MAPPINGS[type] || {};

  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [field, patterns] of Object.entries(mappings)) {
      if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
        mapping[header] = field;
        break;
      }
    }
  });

  return mapping;
}

export function parseCSV(fileContent: string): { headers: string[]; rows: any[][] } {
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    throw new Error('File is empty');
  }

  const headers = records[0];
  const rows = records.slice(1);

  return { headers, rows };
}

export function previewImport(fileContent: string, type: string): ImportPreview {
  const { headers, rows } = parseCSV(fileContent);
  const suggestedMapping = suggestMapping(headers, type);
  
  return {
    headers,
    rows: rows.slice(0, 10), // Preview first 10 rows
    suggestedMapping,
  };
}

function validateClientData(data: any, rowIndex: number): { valid: boolean; errors: Array<{ row: number; field: string; message: string }> } {
  const errors: Array<{ row: number; field: string; message: string }> = [];

  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'firstName', message: 'First name is required' });
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'lastName', message: 'Last name is required' });
  }

  if (!data.email || data.email.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
  }

  return { valid: errors.length === 0, errors };
}

async function generateAccountNumber(): Promise<string> {
  return 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
}

export async function executeImport(
  fileContent: string,
  type: string,
  mapping: Record<string, string>,
  userId?: string
): Promise<ImportResult> {
  const { headers, rows } = parseCSV(fileContent);
  
  const result: ImportResult = {
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (type === 'clients') {
    // Create reverse mapping (header -> field), filtering out "skip" values
    const headerToField: Record<string, string> = {};
    Object.entries(mapping).forEach(([header, field]) => {
      if (field && field !== 'skip' && field !== '') {
        headerToField[header] = field;
      }
    });

    // Check for duplicate emails in file
    const emailsInFile = new Set<string>();
    const duplicateEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data: any = {};
      
      headers.forEach((header, index) => {
        const field = headerToField[header];
        if (field) {
          data[field] = row[index];
        }
      });

      if (data.email) {
        const email = data.email.toLowerCase().trim();
        if (emailsInFile.has(email)) {
          duplicateEmails.add(email);
          result.errors.push({ row: i + 2, field: 'email', message: `Duplicate email in file: ${email}` });
          result.errorCount++;
        } else {
          emailsInFile.add(email);
        }
      }
    }

    // Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data: any = {};
      
      headers.forEach((header, index) => {
        const field = headerToField[header];
        if (field) {
          data[field] = row[index];
        }
      });

      // Validate
      const validation = validateClientData(data, i + 2);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.errorCount++;
        continue;
      }

      // Check for existing email in database
      const existing = await storage.getClientByEmail(data.email);
      if (existing) {
        result.errors.push({ row: i + 2, field: 'email', message: `Email already exists: ${data.email}` });
        result.errorCount++;
        continue;
      }

      // Skip if email was duplicate in file
      if (duplicateEmails.has(data.email.toLowerCase().trim())) {
        continue;
      }

      try {
        // Create client
        const hashedPassword = await bcrypt.hash('Welcome123!', 10);
        let client;
        
        try {
          client = await storage.createClient({
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: data.email.trim().toLowerCase(),
            password: hashedPassword,
            phone: data.phone?.trim(),
            address: data.address?.trim(),
            city: data.city?.trim(),
            country: data.country?.trim(),
            dateOfBirth: data.dateOfBirth?.trim(),
            kycStatus: 'pending',
            isActive: true,
            mustResetPassword: true,
          });

          // Create account - if this fails, rollback client
          await storage.createAccount({
            clientId: client.id,
            accountNumber: await generateAccountNumber(),
            currency: 'USD',
            balance: '10000',
            equity: '10000',
            margin: '0',
            freeMargin: '10000',
            leverage: 100,
            isActive: true,
          });

          // Log audit - if this fails, it's not critical (don't rollback)
          try {
            await storage.createAuditLog({
              userId,
              action: 'import',
              targetType: 'client',
              targetId: client.id,
              details: { source: 'csv_import', row: i + 2 },
            });
          } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
          }

          result.successCount++;
        } catch (innerError: any) {
          // Rollback: delete client if account creation failed
          if (client?.id) {
            try {
              await storage.deleteClient(client.id);
            } catch (rollbackError) {
              console.error('Failed to rollback client creation:', rollbackError);
            }
          }
          throw innerError;
        }
      } catch (error: any) {
        result.errors.push({ row: i + 2, field: 'general', message: error.message });
        result.errorCount++;
      }
    }
  }

  return result;
}
