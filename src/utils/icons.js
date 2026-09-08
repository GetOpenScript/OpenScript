import {
  createIcons,
  Terminal,
  Code,
  Plus,
  Trash2,
  Pencil,
  Key,
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileCode,
  Play,
  ExternalLink,
  RotateCcw,
  Sliders,
  Info
} from 'lucide';

const icons = {
  Terminal,
  Code,
  Plus,
  Trash2,
  Pencil,
  Key,
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileCode,
  Play,
  ExternalLink,
  RotateCcw,
  Sliders,
  Info
};

export const renderIcons = () => createIcons({ icons });

export const icon = (name, cls = 'w-3.5 h-3.5') => 
  `<i data-lucide="${name}" class="${cls} inline-block align-middle"></i>`;
