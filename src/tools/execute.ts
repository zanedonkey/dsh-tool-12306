import { publicError } from '../errors.js';
export async function executeQuery<T>(query: () => Promise<T>): Promise<T> {
  try { return await query(); }
  catch (error) { throw publicError(error); }
}
