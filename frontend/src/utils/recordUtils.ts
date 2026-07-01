import { CarWashRecord } from '@/components/CarWashRecord';

/**
 * Adds a record to the state array, preventing duplicates based on record ID
 * @param records Current records array
 * @param newRecord New record to add
 * @returns Updated records array
 */
export const addRecordSafely = (records: CarWashRecord[], newRecord: CarWashRecord): CarWashRecord[] => {
  // Check if record already exists
  const exists = records.some(r => r.id === newRecord.id);
  if (exists) {
    console.log('Record already exists, skipping duplicate:', newRecord.id);
    return records;
  }
  
  // Add new record to the beginning of the array
  return [newRecord, ...records];
};

/**
 * Updates a record in the state array
 * @param records Current records array
 * @param updatedRecord Updated record
 * @returns Updated records array
 */
export const updateRecordSafely = (records: CarWashRecord[], updatedRecord: CarWashRecord): CarWashRecord[] => {
  return records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
};

/**
 * Removes a record from the state array
 * @param records Current records array
 * @param recordId ID of record to remove
 * @returns Updated records array
 */
export const removeRecordSafely = (records: CarWashRecord[], recordId: string): CarWashRecord[] => {
  return records.filter(r => r.id !== recordId);
};
