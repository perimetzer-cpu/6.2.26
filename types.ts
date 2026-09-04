
export enum DocumentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  ESCALATED = 'ESCALATED'
}

export enum FieldType {
  SIGNATURE = 'SIGNATURE',
  INITIALS = 'INITIALS',
  TEXT = 'TEXT',
  DATE = 'DATE',
  ID_NUMBER = 'ID_NUMBER',
  ADDRESS = 'ADDRESS',
  AMOUNT = 'AMOUNT',
  CHECKBOX = 'CHECKBOX'
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  phone: string;
  order: number;
  hasSigned: boolean;
  signedAt?: Date;
  uniqueLink?: string; // לינק ייחודי לחותם
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
}

export interface DocumentField {
  id: string;
  type: FieldType;
  label: string;
  page: number;
  x: number;
  y: number;
  required: boolean;
  value?: string;
  signerId: string; // קישור לחותם ספציפי
}

export interface SmartDocument {
  id: string;
  title: string;
  fileName: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  signers: Signer[];
  fields: DocumentField[];
  signingOrder: 'SEQUENTIAL' | 'PARALLEL';
  remindersEnabled: boolean;
  fileUrl?: string;
}
