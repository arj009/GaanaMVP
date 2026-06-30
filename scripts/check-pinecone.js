const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '.env.local' });

async function checkPinecone() {
  try {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      console.log('Pinecone credentials missing in .env.local');
      return;
    }

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.Index(process.env.PINECONE_INDEX);
    const stats = await index.describeIndexStats();
    
    console.log('--- Pinecone Stats ---');
    console.log(`Total Records: ${stats.totalRecordCount}`);
    console.log(`Dimension: ${stats.dimension}`);
    console.log(`Namespaces:`, stats.namespaces);
  } catch (err) {
    console.error('Failed to check Pinecone:', err.message);
  }
}

checkPinecone();
