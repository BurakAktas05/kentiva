const fs = require('fs');
const path = require('path');

// Turkish slugification mapping
function turkishSlugify(text) {
  const maps = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
    'â': 'a', 'Â': 'a',
    'î': 'i', 'Î': 'i',
    'û': 'u', 'Û': 'u'
  };
  
  let slug = text.trim().toLowerCase();
  
  // Replace Turkish characters
  for (const key in maps) {
    slug = slug.replaceAll(key, maps[key]);
  }
  
  // Clean special characters and make URL friendly
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except space/dash
    .replace(/\s+/g, '-')          // replace spaces with single dash
    .replace(/-+/g, '-');          // remove consecutive dashes
  
  return slug;
}

try {
  const jsonPath = path.join(__dirname, '../data.json');
  console.log(`Reading JSON from: ${jsonPath}`);
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const districtsData = JSON.parse(rawData);

  console.log(`Loaded ${districtsData.length} records from data.json.`);

  const seenMembers = new Set();
  const sqlLines = [];

  sqlLines.push('-- V97__seed_all_turkey_districts.sql');
  sqlLines.push('-- Seeding all 973 districts of Turkey');
  sqlLines.push('INSERT INTO turkey_districts (member_id, plate_code, district_slug, name_tr, boundary_status) VALUES');

  const insertValues = [];

  districtsData.forEach(item => {
    const districtName = item.ilce.trim();
    const plateCode = String(item.il_id).padStart(2, '0');
    const slug = turkishSlugify(districtName);
    const memberId = `${plateCode}-${slug}`;

    if (seenMembers.has(memberId)) {
      console.warn(`Duplicate found for memberId: ${memberId}, skipping.`);
      return;
    }
    seenMembers.add(memberId);

    // Escape single quotes for SQL
    const escapedName = districtName.replace(/'/g, "''");
    insertValues.push(`('${memberId}', '${plateCode}', '${slug}', '${escapedName}', 'PENDING')`);
  });

  sqlLines.push(insertValues.join(',\n') + '\nON CONFLICT (member_id) DO NOTHING;');

  const outputPath = path.join(__dirname, '../backend/src/main/resources/db/migration/V97__seed_all_turkey_districts.sql');
  fs.writeFileSync(outputPath, sqlLines.join('\n'), 'utf8');
  console.log(`Successfully generated SQL migration at: ${outputPath}`);
  console.log(`Total unique districts written: ${seenMembers.size}`);

} catch (error) {
  console.error('Error generating SQL:', error);
  process.exit(1);
}
