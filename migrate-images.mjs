/**
 * migrate-images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://knwqqeylucrjwyoaxtsg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const BUCKET = 'product-images';

if (!SUPABASE_ANON_KEY) {
  console.error('Set VITE_SUPABASE_ANON_KEY environment variable before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrate() {
  console.log('Fetching all product_images IDs to avoid DB timeouts...');

  // Just fetch all IDs without WHERE clause, it will be fast
  let ids = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('product_images')
      .select('id')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error); process.exit(1); }
    if (!data || data.length === 0) break;
    ids = ids.concat(data.map(d => d.id));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`Found ${ids.length} total rows in table. Processing...`);
  if (ids.length === 0) return;

  let ok = 0, skip = 0, fail = 0;

  for (const id of ids) {
    try {
      const { data: rows, error: fetchErr } = await supabase
        .from('product_images')
        .select('id, product_id, url')
        .eq('id', id);
        
      if (fetchErr || !rows || rows.length === 0) {
        console.error(`Row ${id}: fetch failed`, fetchErr);
        fail++;
        continue;
      }
      
      const row = rows[0];

      if (!row.url.startsWith('data:')) {
         // Already a URL
         skip++;
         continue;
      }

      const match = row.url.match(/^data:([^;]+);base64,(.+)$/s);
      if (!match) { console.warn(`Row ${row.id}: unrecognised data URI format, skipping.`); fail++; continue; }

      const mimeType = match[1];
      const ext = mimeType.split('/')[1] || 'jpg';
      const b64 = match[2];
      const binary = Buffer.from(b64, 'base64');

      const path = `product-${row.product_id}/${row.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, binary, { contentType: mimeType, upsert: true });
        
      if (upErr) { 
        console.error(`Row ${row.id}: upload failed:`, upErr.message); 
        fail++; continue; 
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('product_images')
        .update({ url: publicUrl })
        .eq('id', row.id);
        
      if (updErr) { console.error(`Row ${row.id}: DB update failed:`, updErr.message); fail++; continue; }

      console.log(`✓ Row ${row.id} migrated -> ${path}`);
      ok++;
    } catch (e) {
      console.error(`Row ${id}: unexpected error:`, e.message);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} migrated, ${skip} already OK, ${fail} failed.`);
}

migrate();
