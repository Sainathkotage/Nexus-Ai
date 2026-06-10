import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDocumentFavicon(filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) {
    return 'https://www.google.com/s2/favicons?domain=adobe.com&sz=32';
  } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
    return 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=32';
  } else if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return 'https://www.google.com/s2/favicons?domain=office.com&sz=32';
  } else if (name.endsWith('.ppt') || name.endsWith('.pptx')) {
    return 'https://www.google.com/s2/favicons?domain=office.com&sz=32';
  } else if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.7z')) {
    return 'https://www.google.com/s2/favicons?domain=win-rar.com&sz=32';
  } else if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.svg') || name.endsWith('.webp')) {
    return 'https://www.google.com/s2/favicons?domain=figma.com&sz=32';
  } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return 'https://www.google.com/s2/favicons?domain=notion.so&sz=32';
  } else if (name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.html') || name.endsWith('.css')) {
    return 'https://www.google.com/s2/favicons?domain=github.com&sz=32';
  } else {
    return 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32';
  }
}

export function getWorkspaceFavicon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('google') || lower.includes('gmail') || lower.includes('drive')) {
    return 'https://www.google.com/s2/favicons?domain=google.com&sz=32';
  }
  if (lower.includes('notion')) {
    return 'https://www.google.com/s2/favicons?domain=notion.so&sz=32';
  }
  if (lower.includes('slack')) {
    return 'https://www.google.com/s2/favicons?domain=slack.com&sz=32';
  }
  if (lower.includes('figma')) {
    return 'https://www.google.com/s2/favicons?domain=figma.com&sz=32';
  }
  if (lower.includes('trello')) {
    return 'https://www.google.com/s2/favicons?domain=trello.com&sz=32';
  }
  if (lower.includes('github')) {
    return 'https://www.google.com/s2/favicons?domain=github.com&sz=32';
  }
  if (lower.includes('microsoft') || lower.includes('outlook') || lower.includes('office')) {
    return 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=32';
  }
  if (lower.includes('supabase')) {
    return 'https://www.google.com/s2/favicons?domain=supabase.com&sz=32';
  }
  if (lower.includes('vercel')) {
    return 'https://www.google.com/s2/favicons?domain=vercel.com&sz=32';
  }
  
  const domainRegex = /([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
  const match = lower.match(domainRegex);
  if (match) {
    return `https://www.google.com/s2/favicons?domain=${match[1]}&sz=32`;
  }
  
  return '/logo.png';
}

export function getAvatarStyle(avatar: string) {
  if (avatar && avatar.startsWith('avatar-')) {
    const index = parseInt(avatar.replace('avatar-', ''), 10);
    if (!isNaN(index) && index >= 0 && index < 25) {
      const x = (index % 5) * 25;
      const y = Math.floor(index / 5) * 25;
      return {
        backgroundImage: "url('/avatars-sheet.jpg')",
        backgroundSize: '500% 500%',
        backgroundPosition: `${x}% ${y}%`,
        backgroundRepeat: 'no-repeat'
      };
    }
  }
  return null;
}
