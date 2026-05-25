const fs = require('fs');
const glob = require('glob');
// Wait, glob is not natively in node without npm. Let's use standard fs.

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = dir + '/' + file;
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
          filelist.push(dirFile);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') {
        return;
      }
      throw err;
    }
  });
  return filelist;
};

const files = walkSync('./src/views');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Since converting Promise.all([getDocs(xxx), getDocs(yyy)]) to onSnapshot is hard via regex,
  // we can create a custom hook `useLiveQuery` inside src/lib/useLiveQuery.ts 
  // Wait, actually, the user wants "live" updates. If we just change standard admin tables, we can do it.
  
  // Let's print out files containing getDocs
  if (content.includes('getDocs(')) {
    console.log(file);
  }
});
