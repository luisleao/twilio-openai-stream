import fs from 'fs/promises';
import VectorDB from '@themaximalist/vectordb.js';

// Inicializa o VectorDB
const db = new VectorDB({});

export const loadData = async () => {
  const data = await fs.readFile('data.json', 'utf8');
  const questions = JSON.parse(data);
  for (const item of questions) {
    await db.add(item.question, item);
  }
};

export const searchQuery = async (query, num = 1) => {
  return await db.search(query, num);
};
