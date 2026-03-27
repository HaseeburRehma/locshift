const fs = require('fs')
const path = require('path')

function walkDir(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file))
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file)
    }
  })
  return results
}

const apiDir = path.join(__dirname, 'app', 'api')
const files = walkDir(apiDir)

let modifiedFiles = 0

// Regex to catch standard single-line destructuring
const regexSingleLine = /const\s+\{\s*data\s*:\s*\{\s*user\s*\}\s*(?:,\s*error\s*:\s*[^}]+)?\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\)/g

// Regex to catch withTimeout Multi-Line
// e.g.
// const { data: { user: requester } } = await withTimeout(
//  supabase.auth.getUser(),
//  5000,
//  { data: { user: null }, error: null } as any
// )
const regexWithTimeout = /const\s+\{\s*data\s*:\s*\{\s*user(?:\s*:\s*[a-zA-Z0-9_]+)?\s*\}\s*\}\s*=\s*await\s+withTimeout\(\s*([a-zA-Z0-9_]+)\.auth\.getUser\(\)[\s\S]*?\)/g

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false

  // 1. Replace Single line calls
  if (content.includes('.auth.getUser()') && !content.includes('withTimeout')) {
    const newContent = content.replace(
      /const\s+\{\s*data\s*:\s*\{\s*user\s*\}\s*(?:,\s*error\s*:\s*[a-zA-Z0-9_]+\s*)?\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\)/g,
      (match, supabaseObj) => {
        return `const { data: { session } } = await ${supabaseObj}.auth.getSession()\n    const user = session?.user`
      }
    )
    
    // specifically handle the ones destructured with error
    const newContent2 = newContent.replace(
      /const\s+\{\s*data\s*:\s*\{\s*user\s*\}\s*,\s*error\s*:\s*([a-zA-Z0-9_]+)\s*\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\)/g,
      (match, errorVar, supabaseObj) => {
        return `const { data: { session }, error: ${errorVar} } = await ${supabaseObj}.auth.getSession()\n    const user = session?.user`
      }
    )

    if (content !== newContent2) {
      content = newContent2
      changed = true
    }
  }

  // 2. Replace withTimeout multi-line calls
  if (content.match(regexWithTimeout)) {
    content = content.replace(
      /const\s+\{\s*data\s*:\s*\{\s*user(?:\s*:\s*([a-zA-Z0-9_]+))?\s*\}\s*\}\s*=\s*await\s+withTimeout\(\s*([a-zA-Z0-9_]+)\.auth\.getUser\(\)[\s\S]*?\)/g,
      (match, alias, supabaseObj) => {
        const varName = alias || 'user'
        return `const { data: { session } } = await ${supabaseObj}.auth.getSession()\n    const ${varName} = session?.user`
      }
    )
    changed = true
  }
  
  // 3. Just replace any raw supabase.auth.getUser() with getSession() if not caught (e.g. multi-line without withTimeout)
  if (content.includes('auth.getUser()') && !content.includes('route.ts"')) {
     content = content.replace(
       /const\s+\{\s*data\s*:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+([a-zA-Z0-9_]+)\.auth\.getUser\(\)/g,
       (match, supabaseObj) => {
           return `const { data: { session } } = await ${supabaseObj}.auth.getSession()\n    const user = session?.user`
       }
     )
     changed = true
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8')
    modifiedFiles++
    console.log('Updated:', file)
  }
})

console.log(`\nComplete. Modified ${modifiedFiles} files.`)
