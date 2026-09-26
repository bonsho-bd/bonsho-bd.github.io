const fs = require('fs');

const files = [
  'src/components/PersonModal.tsx',
  'src/components/AddRelativeModal.tsx',
  'src/components/GoogleSyncModal.tsx',
  'src/components/QRCodeModal.tsx',
  'src/components/PasteModal.tsx',
  'src/components/EditPersonModal.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace the backdrop div
  content = content.replace(
    /(<div className="fixed inset-0[^>]+?)"(>)/,
    '$1" onClick={onClose}$2'
  );

  // Find the next inner div which is the modal content.
  content = content.replace(
    /onClick={onClose}>\s*(<div className="(?:bg-white|w-full bg-white|bg-white rounded-2xl)[^>]+?)"(>)/,
    'onClick={onClose}>\n      $1" onClick={(e) => e.stopPropagation()}$2'
  );

  fs.writeFileSync(file, content);
  console.log('Updated', file);
});
