import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Database } from './types';

const adapter = new JSONFile<Database>('db.json');
const db = new Low<Database>(adapter, {} as Database);

export default db;
