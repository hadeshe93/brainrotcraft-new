import { Saver } from './saver';
import fs from 'fs/promises';
import path from 'path';

interface MainParams {
  fileName: string;
  gameTitle: string;
}
async function main(params: MainParams) {
  const { fileName, gameTitle } = params;
  const saver = new Saver();
  const content = await fs.readFile(path.join(__dirname, `source/${fileName}.json`), 'utf-8');
  const contentJson = JSON.parse(content);
  await saver.saveContentFile(gameTitle, contentJson);
}

// npx tsx tools/save-rewrite-content/index.ts
main({
  fileName: 'guess-the-italian-brainrot-animals',
  gameTitle: 'Guess The Italian Brainrot Animals',
}).catch(console.error);