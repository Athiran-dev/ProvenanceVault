import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: parseInt(process.env.DB_PORT),
});

async function clean() {
    try {
        await pool.query('TRUNCATE TABLE decryption_events, distributions, documents, recipients RESTART IDENTITY CASCADE;');
        console.log('Database cleaned successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

clean();
