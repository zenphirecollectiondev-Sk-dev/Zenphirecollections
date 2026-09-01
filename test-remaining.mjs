import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  console.log('Querying product_images...');
  const { data, error } = await supabase.from('product_images').select('id, url');
  console.log('Error:', error);
  console.log('Total product_images:', data?.length);
  console.log('Still base64:', data?.filter(d => d.url.startsWith('data:')).length);
}
test();
