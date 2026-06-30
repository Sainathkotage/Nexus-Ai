import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper to recursively list files in directory
async function getFiles(dir: string, baseDir: string): Promise<any[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      const relativePath = path.relative(baseDir, res).replace(/\\/g, '/');
      
      // Skip heavy build directories
      if (
        dirent.name === 'node_modules' ||
        dirent.name === '.next' ||
        dirent.name === '.git' ||
        dirent.name === '.agents' ||
        dirent.name === '.gemini'
      ) {
        return null;
      }

      if (dirent.isDirectory()) {
        const children = await getFiles(res, baseDir);
        // Only return directory if it has children
        if (children.length === 0) return null;
        return {
          name: dirent.name,
          path: relativePath,
          type: 'directory',
          children: children.filter(Boolean),
        };
      } else {
        // Only return source code files
        const ext = path.extname(dirent.name);
        const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.css', '.md'];
        if (!allowedExts.includes(ext)) return null;

        return {
          name: dirent.name,
          path: relativePath,
          type: 'file',
        };
      }
    })
  );
  return files.filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    const projectRoot = path.resolve(process.cwd());

    // 1. Read specific file content
    if (filePath) {
      const targetPath = path.resolve(projectRoot, filePath);
      
      // Security check: ensure path is within project root
      if (!targetPath.startsWith(projectRoot)) {
        return NextResponse.json({ error: 'Access denied: outside project scope' }, { status: 403 });
      }

      const content = await fs.readFile(targetPath, 'utf-8');
      return NextResponse.json({ content });
    }

    // 2. Otherwise list files in src/ and supabase/
    const srcDir = path.resolve(projectRoot, 'src');
    const supabaseDir = path.resolve(projectRoot, 'supabase');
    
    const srcFiles = await getFiles(srcDir, projectRoot);
    let supabaseFiles: any[] = [];
    try {
      supabaseFiles = await getFiles(supabaseDir, projectRoot);
    } catch (e) {}

    const fileTree = [
      {
        name: 'src',
        path: 'src',
        type: 'directory',
        children: srcFiles,
      },
      ...(supabaseFiles.length > 0 ? [{
        name: 'supabase',
        path: 'supabase',
        type: 'directory',
        children: supabaseFiles,
      }] : []),
    ];

    return NextResponse.json({ files: fileTree });
  } catch (error: any) {
    console.error('[CodeWriter API] Read Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { path: filePath, content } = await req.json();
    
    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'Missing path or content parameters' }, { status: 400 });
    }

    const projectRoot = path.resolve(process.cwd());
    const targetPath = path.resolve(projectRoot, filePath);

    // Security check: ensure path is within project root
    if (!targetPath.startsWith(projectRoot)) {
      return NextResponse.json({ error: 'Access denied: outside project scope' }, { status: 403 });
    }

    await fs.writeFile(targetPath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CodeWriter API] Write Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
